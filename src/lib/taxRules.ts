/**
 * Tax calculation engine.
 *
 * Uses the structured state data (from states.json) plus hand-coded
 * per-category exemption rules to compute tax on each cart item and
 * provide a human-readable explanation.
 */

import type { Product } from "../data/products";

export interface StateData {
  abbreviation: string;
  name: string;
  hasSalesTax: boolean;
  stateRate: string;
  stateRateNum: number;
  taxType: string;
  exemptions: {
    groceries: string;
    groceryNote: string;
    clothing: string;
    clothingNote: string;
    prescriptionDrugs: string;
    prescriptionNote: string;
  };
  hasLocalTax: boolean;
  localTaxRange: string;
  [key: string]: unknown;
}

export interface TaxLineItem {
  product: Product;
  quantity: number;
  subtotal: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  explanation: string;
  isExempt: boolean;
}

export interface TaxSummary {
  state: StateData;
  items: TaxLineItem[];
  subtotal: number;
  totalTax: number;
  total: number;
  effectiveRate: number;
  notes: string[];
}

// States where clothing is fully exempt (year-round).
// Note: CT only exempts clothing during August sales tax-free week, so it's excluded here.
const CLOTHING_FULLY_EXEMPT = new Set(["PA", "NJ", "MN", "VT"]);

// States with partial clothing exemption (threshold-based)
const CLOTHING_PARTIAL: Record<string, { threshold: number; note: string }> = {
  NY: { threshold: 110, note: "Items under $110 are exempt from state sales tax" },
  RI: { threshold: 250, note: "Items at or under $250 are exempt; tax applies to amount over $250" },
  MA: { threshold: 175, note: "First $175 is exempt; tax applies to amount over $175" },
};

// States where groceries are taxed at a reduced rate
const GROCERY_REDUCED_RATE: Record<string, { rate: number; note: string }> = {
  UT: { rate: 0.03, note: "Groceries taxed at reduced 3.0% combined rate" },
  AL: { rate: 0.03, note: "State taxes groceries at reduced 3% rate (local taxes may add more)" },
  AR: { rate: 0.0065, note: "Groceries taxed at reduced 0.125% state rate (plus local taxes)" },
  HI: { rate: 0.04, note: "GET applies to groceries at the full 4.0% rate" },
  ID: { rate: 0.06, note: "Groceries are taxable at the full 6% rate (grocery tax credit available on income tax)" },
  IL: { rate: 0.01, note: "Groceries taxed at reduced 1% state rate" },
  KS: { rate: 0.04, note: "Groceries taxed at reduced 4% state rate (down from 6.5%, phasing out)" },
  MS: { rate: 0.07, note: "Groceries taxed at full 7% rate" },
  MO: { rate: 0.01225, note: "Groceries taxed at reduced 1.225% state rate" },
  SD: { rate: 0.042, note: "Groceries taxed at the full 4.2% state rate" },
  TN: { rate: 0.04, note: "Groceries taxed at reduced 4% state rate (plus local taxes)" },
  VA: { rate: 0.01, note: "Groceries taxed at reduced 1% state rate (plus local 1% = 2.5% total)" },
};

// States where groceries are fully taxable at normal rate (no exemption, no reduced rate)
const GROCERY_FULL_TAX = new Set(["HI", "ID", "MS", "SD"]);

// States where candy is taxable even though groceries are exempt
// (Most states with food exemptions exclude candy)
const CANDY_TAXABLE_WITH_FOOD_EXEMPT = new Set([
  "CA", "CO", "CT", "FL", "GA", "IA", "IN", "KY", "LA", "MA", "MD",
  "ME", "MI", "MN", "NC", "ND", "NE", "NJ", "NM", "NV", "NY", "OH",
  "OK", "PA", "RI", "SC", "TX", "VT", "WA", "WI", "WV", "WY", "DC",
]);

export function calculateTax(
  items: { product: Product; quantity: number }[],
  state: StateData
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

  const abbr = state.abbreviation;
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

    // Category-based exemption logic
    switch (product.category) {
      case "medicine": {
        // Prescription drugs are exempt in virtually every state
        taxableAmount = 0;
        taxRate = 0;
        isExempt = true;
        explanation = "Prescription drugs are exempt from sales tax";
        if (abbr === "IL") {
          explanation = "Prescription drugs are exempt (1% rate for medical appliances only)";
        }
        break;
      }

      case "groceries": {
        if (GROCERY_FULL_TAX.has(abbr)) {
          // Fully taxable at normal rate
          taxRate = baseRate;
          explanation = GROCERY_REDUCED_RATE[abbr]?.note ?? `Groceries are taxable at the full ${state.stateRate} rate`;
        } else if (GROCERY_REDUCED_RATE[abbr]) {
          taxRate = GROCERY_REDUCED_RATE[abbr].rate;
          explanation = GROCERY_REDUCED_RATE[abbr].note;
        } else {
          // Exempt
          taxableAmount = 0;
          taxRate = 0;
          isExempt = true;
          explanation = "Unprepared food/groceries are exempt from sales tax";
        }
        break;
      }

      case "clothing": {
        if (CLOTHING_FULLY_EXEMPT.has(abbr)) {
          taxableAmount = 0;
          taxRate = 0;
          isExempt = true;
          explanation = "Clothing is exempt from sales tax";
        } else if (CLOTHING_PARTIAL[abbr]) {
          const { threshold, note } = CLOTHING_PARTIAL[abbr];
          if (product.price <= threshold) {
            taxableAmount = 0;
            taxRate = 0;
            isExempt = true;
            explanation = `${note} — this item qualifies`;
          } else {
            if (abbr === "RI" || abbr === "MA") {
              // Tax only on amount exceeding threshold
              taxableAmount = (product.price - threshold) * quantity;
              explanation = `${note} — tax applies to $${(product.price - threshold).toFixed(2)} over the threshold`;
            } else {
              // NY: items over $110 are fully taxable
              taxableAmount = subtotal;
              explanation = `${note} — this item exceeds the threshold and is fully taxable`;
            }
          }
        } else {
          // Fully taxable
          explanation = `Clothing is taxable at the full ${state.stateRate} rate`;
        }
        break;
      }

      case "candy": {
        if (!state.hasSalesTax) {
          taxableAmount = 0;
          taxRate = 0;
          isExempt = true;
          explanation = `${state.name} has no sales tax`;
        } else if (CANDY_TAXABLE_WITH_FOOD_EXEMPT.has(abbr)) {
          taxRate = baseRate;
          explanation = "Candy is excluded from the food exemption and is taxable";
        } else if (GROCERY_REDUCED_RATE[abbr]) {
          taxRate = GROCERY_REDUCED_RATE[abbr].rate;
          explanation = `Candy taxed at the grocery rate: ${GROCERY_REDUCED_RATE[abbr].note}`;
        } else if (GROCERY_FULL_TAX.has(abbr)) {
          taxRate = baseRate;
          explanation = `Candy is taxable at the full ${state.stateRate} rate`;
        } else {
          // Some states include candy in food exemption (OK includes candy)
          if (abbr === "OK") {
            taxableAmount = 0;
            taxRate = 0;
            isExempt = true;
            explanation = "Oklahoma exempts candy (included in food exemption)";
          } else {
            taxRate = baseRate;
            explanation = `Candy is taxable at ${state.stateRate}`;
          }
        }
        break;
      }

      default: {
        // electronics, general — always taxable
        explanation = `Taxable at the state rate of ${state.stateRate}`;
        break;
      }
    }

    const taxAmount = taxableAmount * taxRate;

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
