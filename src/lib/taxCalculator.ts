/**
 * Tax calculation engine with origin/destination resolution and
 * per-jurisdiction breakdown.
 *
 * Ties together ZIP-to-state mapping (zipUtils), lazy data loading
 * (rateLookup), and product taxability rules (from StateTaxData) to
 * produce a complete TaxBreakdownResult for any US purchase.
 */

import type {
  JurisdictionBreakdown,
  ProductCategory,
  StateTaxData,
  TaxBreakdownResult,
  TaxabilityRule,
  ZipEntry,
} from "../data/types";
import { zipToState } from "./zipUtils";
import { loadStateData, lookupZip, hasMultipleJurisdictions } from "./rateLookup";

/**
 * States that use origin-based tax sourcing for intrastate sales.
 * All other states (and all interstate sales) use destination-based sourcing.
 *
 * Note: CA is simplified as origin-based for v1. Real CA rules are hybrid
 * (origin for state/county/city, destination for district) -- deferred to v2.
 */
export const ORIGIN_STATES = new Set([
  "AZ", "CA", "IL", "MS", "MO", "OH", "PA", "TN", "TX", "UT", "VA",
]);

/**
 * Determines which location's tax rates to use based on origin/destination rules.
 */
function resolveTaxJurisdiction(
  buyerState: string,
  buyerZip: string,
  sellerState?: string,
  sellerZip?: string,
): { rateState: string; rateZip: string; sourcingRule: "origin" | "destination" } {
  // No seller info: always use buyer (destination)
  if (!sellerState || !sellerZip) {
    return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
  }

  // Interstate: always destination (buyer's state collects tax)
  if (sellerState !== buyerState) {
    return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
  }

  // Intrastate in origin-based state: use seller's location rates
  if (ORIGIN_STATES.has(buyerState)) {
    return { rateState: sellerState, rateZip: sellerZip, sourcingRule: "origin" };
  }

  // Intrastate in destination-based state: use buyer's location rates
  return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
}

/**
 * Applies product taxability rules from StateTaxData to determine
 * the taxable amount and effective rate for a given category.
 *
 * This is the data-driven equivalent of the hardcoded switch logic
 * in the legacy taxRules.ts. All rules come from the per-state JSON
 * (originally sourced from data/taxability.json via the build pipeline).
 */
function applyProductTaxability(
  category: ProductCategory,
  stateData: StateTaxData,
  subtotal: number,
): { taxableAmount: number; effectiveRate: number; explanation: string } {
  // "general" category is always fully taxable at state rate
  if (category === "general") {
    return {
      taxableAmount: subtotal,
      effectiveRate: stateData.stateRate,
      explanation: "Taxable at state rate",
    };
  }

  // Look up the taxability rule for this product category
  const rule: TaxabilityRule | undefined = stateData.taxability[category];

  // If no rule exists, default to fully taxable
  if (!rule) {
    return {
      taxableAmount: subtotal,
      effectiveRate: stateData.stateRate,
      explanation: "Taxable at state rate",
    };
  }

  switch (rule.status) {
    case "exempt":
      return {
        taxableAmount: 0,
        effectiveRate: 0,
        explanation: rule.note,
      };

    case "reduced": {
      // Reduced rate with a specific rate value
      if (rule.rate !== undefined) {
        return {
          taxableAmount: subtotal,
          effectiveRate: rule.rate,
          explanation: rule.note,
        };
      }

      // Threshold-based exemption
      if (rule.threshold !== undefined) {
        if (rule.thresholdType === "exempt_below") {
          // Items under threshold are exempt; at or above are fully taxable
          if (subtotal <= rule.threshold) {
            return {
              taxableAmount: 0,
              effectiveRate: 0,
              explanation: rule.note,
            };
          }
          return {
            taxableAmount: subtotal,
            effectiveRate: stateData.stateRate,
            explanation: `${rule.note} -- exceeds $${rule.threshold} threshold, fully taxable`,
          };
        }

        if (rule.thresholdType === "tax_excess") {
          // Only the amount exceeding the threshold is taxable
          if (subtotal <= rule.threshold) {
            return {
              taxableAmount: 0,
              effectiveRate: 0,
              explanation: rule.note,
            };
          }
          const excess = subtotal - rule.threshold;
          return {
            taxableAmount: excess,
            effectiveRate: stateData.stateRate,
            explanation: `${rule.note} -- tax applies to $${excess.toFixed(2)} over $${rule.threshold} threshold`,
          };
        }
      }

      // Fallback for reduced without rate or threshold (shouldn't happen)
      return {
        taxableAmount: subtotal,
        effectiveRate: stateData.stateRate,
        explanation: rule.note,
      };
    }

    case "taxable":
    default:
      return {
        taxableAmount: subtotal,
        effectiveRate: stateData.stateRate,
        explanation: rule.note || "Taxable at state rate",
      };
  }
}

/**
 * Calculates full tax breakdown for a purchase at a given location.
 *
 * This is the main entry point for the calculation engine. It resolves
 * the buyer's state from their ZIP, determines origin vs destination
 * sourcing, fetches the per-state rate data, and computes per-jurisdiction
 * tax amounts with product taxability applied.
 */
export async function calculateFullTax(params: {
  buyerZip: string;
  sellerZip?: string;
  amount: number;
  category: ProductCategory;
}): Promise<TaxBreakdownResult> {
  const { buyerZip, sellerZip, amount, category } = params;
  const notes: string[] = [];

  // 1. Resolve buyer state
  const buyerState = zipToState(buyerZip);
  if (!buyerState) {
    throw new Error(`Could not determine state for ZIP: ${buyerZip}`);
  }

  // 2. Resolve seller state (if provided)
  let sellerState: string | undefined;
  if (sellerZip) {
    sellerState = zipToState(sellerZip) ?? undefined;
  }

  // 3. Determine which location's rates to use
  const { rateState, rateZip, sourcingRule } = resolveTaxJurisdiction(
    buyerState,
    buyerZip,
    sellerState,
    sellerZip,
  );

  // 4. Fetch per-state tax data
  const stateData = await loadStateData(rateState);

  // 11. Early return for no-tax states
  if (!stateData.hasSalesTax) {
    notes.push(`${stateData.stateName} does not impose a sales tax.`);
    if (!sellerZip) {
      notes.push("Destination-based calculation (no seller location specified).");
    }
    return {
      buyerZip,
      sellerZip,
      stateName: stateData.stateName,
      stateAbbr: stateData.state,
      sourcingRule,
      combinedRate: 0,
      jurisdictions: [],
      productCategory: category,
      subtotal: amount,
      taxableAmount: 0,
      totalTax: 0,
      total: amount,
      notes,
      hasMultipleJurisdictions: false,
    };
  }

  // 5. Look up ZIP-level rates
  let zipEntry: ZipEntry | null = lookupZip(stateData, rateZip);
  if (!zipEntry) {
    // Graceful fallback: use state-level rate only
    notes.push(
      `ZIP code ${rateZip} not found in rate data for ${stateData.stateName}; using state-level rate only.`,
    );
    zipEntry = {
      region: stateData.stateName,
      combined: stateData.stateRate,
      county: 0,
      city: 0,
      special: 0,
    };
  }

  // 6. Apply product taxability
  const taxability = applyProductTaxability(category, stateData, amount);
  const { taxableAmount, effectiveRate, explanation } = taxability;

  // 7. Build per-jurisdiction breakdown
  const jurisdictions: JurisdictionBreakdown[] = [];

  if (taxableAmount === 0) {
    // Exempt: all jurisdiction amounts are 0, but still show state for context
    jurisdictions.push({
      jurisdiction: "State",
      name: stateData.stateName,
      rate: stateData.stateRate,
      taxAmount: 0,
    });
  } else {
    // Determine adjustment factor for reduced-rate categories
    // When a category has a reduced effective rate, we proportionally reduce
    // all jurisdiction amounts. This is a v1 simplification.
    let adjustmentFactor = 1;
    if (effectiveRate < stateData.stateRate && stateData.stateRate > 0) {
      adjustmentFactor = effectiveRate / stateData.stateRate;
    }

    // State
    if (stateData.stateRate > 0) {
      const adjustedRate = stateData.stateRate * adjustmentFactor;
      jurisdictions.push({
        jurisdiction: "State",
        name: stateData.stateName,
        rate: adjustedRate,
        taxAmount: Math.round(taxableAmount * adjustedRate * 100) / 100,
      });
    }

    // County
    if (zipEntry.county > 0) {
      const adjustedRate = zipEntry.county * adjustmentFactor;
      jurisdictions.push({
        jurisdiction: "County",
        name: zipEntry.region,
        rate: adjustedRate,
        taxAmount: Math.round(taxableAmount * adjustedRate * 100) / 100,
      });
    }

    // City
    if (zipEntry.city > 0) {
      const adjustedRate = zipEntry.city * adjustmentFactor;
      jurisdictions.push({
        jurisdiction: "City",
        name: zipEntry.region,
        rate: adjustedRate,
        taxAmount: Math.round(taxableAmount * adjustedRate * 100) / 100,
      });
    }

    // Special District
    if (zipEntry.special > 0) {
      const adjustedRate = zipEntry.special * adjustmentFactor;
      jurisdictions.push({
        jurisdiction: "Special District",
        name: zipEntry.region,
        rate: adjustedRate,
        taxAmount: Math.round(taxableAmount * adjustedRate * 100) / 100,
      });
    }
  }

  // Compute totalTax from the combined rate (per pitfall 3: do NOT sum
  // jurisdiction amounts -- use the stored combined rate for accuracy)
  const combinedRate = taxableAmount === 0
    ? 0
    : zipEntry.combined * (effectiveRate < stateData.stateRate && stateData.stateRate > 0
        ? effectiveRate / stateData.stateRate
        : 1);
  const totalTax = Math.round(taxableAmount * combinedRate * 100) / 100;

  // 8. Check for multi-jurisdiction ZIPs
  const multiJurisdiction = hasMultipleJurisdictions(stateData, rateZip);
  if (multiJurisdiction) {
    notes.push(
      "This ZIP code spans multiple tax jurisdictions. Showing the primary rate.",
    );
  }

  // 9. Add taxability explanation
  notes.push(explanation);

  // 10. Note when no seller ZIP was provided
  if (!sellerZip) {
    notes.push("Destination-based calculation (no seller location specified).");
  }

  return {
    buyerZip,
    sellerZip,
    stateName: stateData.stateName,
    stateAbbr: stateData.state,
    sourcingRule,
    combinedRate,
    jurisdictions,
    productCategory: category,
    subtotal: amount,
    taxableAmount,
    totalTax,
    total: amount + totalTax,
    notes,
    hasMultipleJurisdictions: multiJurisdiction,
  };
}
