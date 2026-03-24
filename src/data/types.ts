/**
 * Shared type definitions for the US Sales Tax Calculator.
 *
 * These types are used across the calculation engine, data pipeline,
 * and UI components.
 */

export interface TaxabilityRule {
  status: "taxable" | "exempt" | "reduced";
  rate?: number;
  threshold?: number;
  thresholdType?: "exempt_below" | "tax_excess";
  note: string;
}

export interface ZipEntry {
  region: string;
  combined: number;
  county: number;
  city: number;
  special: number;
}

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
    prepared_food: TaxabilityRule;
  };
  zips: Record<string, ZipEntry[]>;
}

export type ProductCategory =
  | "general"
  | "groceries"
  | "clothing"
  | "medicine"
  | "prepared_food";

export interface JurisdictionBreakdown {
  jurisdiction: "State" | "County" | "City" | "Special District";
  name: string;
  rate: number;
  taxAmount: number;
}

export interface TaxBreakdownResult {
  buyerZip: string;
  sellerZip?: string;
  stateName: string;
  stateAbbr: string;
  sourcingRule: "origin" | "destination";
  combinedRate: number;
  jurisdictions: JurisdictionBreakdown[];
  productCategory: ProductCategory;
  subtotal: number;
  taxableAmount: number;
  totalTax: number;
  total: number;
  notes: string[];
  hasMultipleJurisdictions: boolean;
}
