/**
 * Shared type definitions for US sales tax data.
 *
 * Single source of truth for all interfaces used across
 * pages, the calculator, and the build pipeline.
 */

import type { Product } from "./products";

// StateEntry -- used by pages that import states.json (guide data from markdown pipeline)
export interface StateEntry {
  abbreviation: string;
  name: string;
  hasSalesTax: boolean;
  stateRate: string;
  stateRateNum: number;
  combinedAvgRate: string;
  combinedRateRange: string;
  taxType: string;
  nexus: {
    revenueThreshold: string | null;
    transactionThreshold: string | null;
    bothRequired: boolean;
    effectiveDate: string;
    note: string;
  } | null;
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
  filingFrequency: string;
  filingDeadline: string;
  officialWebsite: string;
  salesTaxPage: string;
  registrationUrl: string;
  contactPhone: string;
  [key: string]: unknown;
}

// Keep backward compat alias
export type StateData = StateEntry;

// TaxabilityRule -- per-category tax treatment for a state
export interface TaxabilityRule {
  status: "taxable" | "exempt" | "reduced";
  rate?: number;
  threshold?: number;
  thresholdType?: "exempt_below" | "tax_excess";
  note: string;
}

// ZipEntry -- one tax jurisdiction within a ZIP code
export interface ZipEntry {
  region: string;
  combined: number;
  county: number;
  city: number;
  special: number;
}

// StateTaxData -- per-state JSON file produced by build pipeline
export interface StateTaxData {
  state: string;
  stateName: string;
  stateRate: number;
  hasSalesTax: boolean;
  updated: string;
  taxability: {
    groceries: TaxabilityRule;
    clothing: TaxabilityRule;
    medicine: TaxabilityRule;
    candy: TaxabilityRule;
  };
  zips: Record<string, ZipEntry[]>;
}

// TaxDataManifest -- manifest.json produced by build pipeline
export interface TaxDataManifest {
  generated: string;
  ratesAsOf: string;
  stateCount: number;
  totalZipCodes: number;
  states: string[];
}

// TaxLineItem and TaxSummary -- used by calculator
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
  state: StateEntry;
  items: TaxLineItem[];
  subtotal: number;
  totalTax: number;
  total: number;
  effectiveRate: number;
  notes: string[];
}
