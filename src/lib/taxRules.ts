/**
 * Tax calculation engine.
 *
 * Uses the structured state data (from states.json) plus per-state
 * taxability rules from the data pipeline. When StateTaxData is provided,
 * all category logic is data-driven; otherwise falls back to state-rate
 * defaults for backward compatibility.
 */

import type { Product } from "../data/products";
import type { StateEntry, TaxabilityRule, TaxLineItem, TaxSummary, StateTaxData } from "../data/types";

// Re-export for backward compatibility
export type { StateEntry as StateData, TaxLineItem, TaxSummary };

/**
 * Apply a taxability rule to compute taxable amount, rate, explanation,
 * and exemption status for a single line item.
 */
function applyTaxability(
  rule: TaxabilityRule,
  subtotal: number,
  price: number,
  quantity: number,
  stateRate: number,
): { taxableAmount: number; taxRate: number; explanation: string; isExempt: boolean } {
  if (rule.status === "exempt") {
    return { taxableAmount: 0, taxRate: 0, explanation: rule.note, isExempt: true };
  }
  if (rule.status === "reduced" && rule.rate !== undefined) {
    return { taxableAmount: subtotal, taxRate: rule.rate, explanation: rule.note, isExempt: false };
  }
  if (rule.status === "reduced" && rule.threshold !== undefined) {
    if (price <= rule.threshold) {
      return { taxableAmount: 0, taxRate: 0, explanation: `${rule.note} -- this item qualifies`, isExempt: true };
    }
    if (rule.thresholdType === "tax_excess") {
      const excess = (price - rule.threshold) * quantity;
      return { taxableAmount: excess, taxRate: stateRate, explanation: rule.note, isExempt: false };
    }
    // exempt_below: items over threshold are fully taxable
    return { taxableAmount: subtotal, taxRate: stateRate, explanation: `${rule.note} -- exceeds threshold`, isExempt: false };
  }
  // taxable (default)
  return { taxableAmount: subtotal, taxRate: stateRate, explanation: "Taxable at state rate", isExempt: false };
}

export function calculateTax(
  items: { product: Product; quantity: number }[],
  state: StateEntry,
  taxData?: StateTaxData,
): TaxSummary {
  const notes: string[] = [];

  if (!state.hasSalesTax) {
    const lineItems: TaxLineItem[] = items.map(({ product, quantity }) => ({
      product,
      quantity,
      subtotal: product.price * quantity,
      taxableAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      explanation: `${state.name} has no sales tax`,
      isExempt: true,
    }));
    const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
    return {
      state,
      items: lineItems,
      subtotal,
      totalTax: 0,
      total: subtotal,
      effectiveRate: 0,
      notes: [`${state.name} does not impose a sales tax.`],
    };
  }

  const baseRate = state.stateRateNum;

  if (state.hasLocalTax) {
    notes.push(
      `${state.name} has local taxes (${state.localTaxRange}). This calculator uses only the state rate of ${state.stateRate}. Actual tax may be higher depending on the delivery address.`
    );
  }

  const lineItems: TaxLineItem[] = items.map(({ product, quantity }) => {
    const subtotal = product.price * quantity;
    let taxableAmount = subtotal;
    let taxRate = baseRate;
    let explanation = "";
    let isExempt = false;

    const category = product.category;
    if (category === "electronics" || category === "general") {
      explanation = `Taxable at the state rate of ${state.stateRate}`;
    } else if (taxData) {
      // Data-driven path: use taxability rules from per-state JSON
      const rule = taxData.taxability[category as keyof typeof taxData.taxability];
      if (rule) {
        const result = applyTaxability(rule, subtotal, product.price, quantity, baseRate);
        taxableAmount = result.taxableAmount;
        taxRate = result.taxRate;
        explanation = result.explanation;
        isExempt = result.isExempt;
      } else {
        explanation = `Taxable at the state rate of ${state.stateRate}`;
      }
    } else {
      // Fallback: no taxData available yet (pre-Phase 2 calculator)
      // Default behavior: tax at state rate
      explanation = `Taxable at the state rate of ${state.stateRate}`;
    }

    const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;

    return {
      product,
      quantity,
      subtotal,
      taxableAmount,
      taxRate,
      taxAmount,
      explanation,
      isExempt,
    };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
  const totalTax = lineItems.reduce((s, i) => s + i.taxAmount, 0);
  const effectiveRate = subtotal > 0 ? totalTax / subtotal : 0;

  if (state.taxType === "get") {
    notes.push("Hawaii uses a General Excise Tax (GET) instead of a traditional sales tax. The GET is levied on businesses but may be passed on to customers.");
  } else if (state.taxType === "grt") {
    notes.push("New Mexico uses a Gross Receipts Tax (GRT) instead of a traditional sales tax.");
  } else if (state.taxType === "tpt") {
    notes.push("Arizona uses a Transaction Privilege Tax (TPT) instead of a traditional sales tax.");
  }

  return {
    state,
    items: lineItems,
    subtotal,
    totalTax,
    total: subtotal + totalTax,
    effectiveRate,
    notes,
  };
}
