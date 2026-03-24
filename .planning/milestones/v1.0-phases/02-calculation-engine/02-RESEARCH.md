# Phase 2: Calculation Engine - Research

**Researched:** 2026-03-24
**Domain:** ZIP-based tax calculation engine with jurisdiction breakdown, origin/destination logic, and product taxability
**Confidence:** HIGH

## Summary

Phase 2 transforms the current state-dropdown calculator into a full ZIP-code-based tax calculation engine. The Phase 1 data pipeline infrastructure (`build-tax-data.mjs`, `types.ts`, `taxRules.ts`) is in place but has **no source Avalara CSV data downloaded yet** -- the manifest shows 0 states, 0 ZIPs. This means Phase 2 must first ensure the pipeline has data to work with (either by downloading Avalara CSVs or creating sample/test data), then build three new modules: a ZIP-to-state resolver, a lazy-loading rate lookup service, and a jurisdiction-aware calculation engine that integrates origin/destination logic and product taxability.

The existing `calculateTax()` in `taxRules.ts` already accepts `StateTaxData` and handles `applyTaxability()` with the data-driven pattern. However, it only computes a single combined rate -- it does not break down tax by jurisdiction level (state/county/city/special). The new engine must provide per-jurisdiction tax amounts. The `Product` type currently has 6 categories but the user decided on 5 for the calculator UI (General, Groceries, Clothing, Medicine, Prepared Food -- dropping "candy" and "electronics" as standalone, adding "Prepared Food"). The existing `taxability.json` covers groceries, clothing, medicine, and candy but not prepared food.

**Primary recommendation:** Build three new files (`src/lib/zipUtils.ts`, `src/lib/rateLookup.ts`, `src/lib/taxCalculator.ts`) plus redesign `CalculatorPage.tsx`. Keep `taxRules.ts` as backward-compat wrapper. The calculator should work end-to-end with whatever per-state JSON data the pipeline produces -- even if only a few sample states are available during development.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Single search/input field for ZIP code with instant results. User types a ZIP, sees combined rate + full breakdown immediately.
- D-02: Per-state JSON files are fetched on demand via `fetch()` from `public/tax-data/{state}.json`. Cached in memory after first load.
- D-03: ZIP-to-state mapping needed -- either a lightweight index file or derive from the first lookup. Manifest.json from Phase 1 can include ZIP-to-state mapping.
- D-04: Two ZIP fields side-by-side: "Seller ZIP" and "Buyer ZIP". Seller defaults to empty (optional).
- D-05: 11 origin-based states: AZ, CA, IL, MS, MO, OH, PA, TN, TX, UT, VA. All others are destination-based. This is a static map in code.
- D-06: When both ZIPs provided: if buyer state is origin-based AND seller is in-state, use seller's rate. Otherwise use buyer's rate. Remote/interstate sales always use destination.
- D-07: California hybrid rules (origin for state/county/city, destination for district) -- defer to v2. Use simplified origin-based for CA in v1.
- D-08: Dropdown/select with 5 categories: General, Groceries, Clothing, Medicine, Prepared Food. Default to "General".
- D-09: Taxability rules from `data/taxability.json` applied via `applyTaxability()` function already in `taxRules.ts`.
- D-10: The existing `calculateTax()` function signature extends to accept `StateTaxData` (already supports this from Phase 1 refactor). Phase 2 passes actual per-state data.
- D-11: Table/stacked display showing each jurisdiction level as a separate row: State rate, County rate, City rate, Special District rate, with amounts for each.
- D-12: Combined rate prominently displayed at top. Individual jurisdiction rows below.
- D-13: If a ZIP has multiple possible jurisdictions (ambiguous), show the primary/default rate with a note.
- D-14: Replace the current state-dropdown calculator with ZIP-based lookup. Keep the existing demo cart UI pattern but upgrade the input method.
- D-15: Amount input field + product category dropdown + ZIP fields -> calculate button -> breakdown table.
- D-16: Lazy loading: show a brief loading state while fetching per-state data. No full-page spinner -- just the results area.

### Claude's Discretion
- Exact UI layout and spacing for the calculator form
- Loading state design (skeleton, spinner, or fade)
- How to handle invalid ZIP codes (error message design)
- Whether to show origin/destination explanation text
- Mobile responsive layout for the dual-ZIP input
- Caching strategy details (in-memory Map vs module-level cache)

### Deferred Ideas (OUT OF SCOPE)
- California hybrid origin rules (origin for state/county/city, destination for district) -- v2 enhancement
- Multi-jurisdiction ZIP disambiguation UI -- v2 (show all possible rates)
- Tax holiday awareness in calculator -- Phase 3 or later
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CALC-01 | User can enter a ZIP code and get the full combined tax rate for that location | ZIP-to-state resolver (`zipUtils.ts`) + lazy-loading rate lookup (`rateLookup.ts`) + per-state JSON data |
| CALC-02 | Tax rate displayed as breakdown: state rate, county rate, city rate, special district rate | New `TaxBreakdownResult` type with per-jurisdiction amounts; `ZipEntry` already has county/city/special fields |
| CALC-03 | User can enter a purchase amount and get exact tax calculation with per-jurisdiction breakdown | New `taxCalculator.ts` that computes tax amount per jurisdiction level, not just a single combined rate |
| CALC-04 | Calculator handles origin vs destination taxation -- 11 origin-based states use seller location, 39 destination-based use buyer location | Static `ORIGIN_STATES` set + `resolveTaxJurisdiction()` function in `taxCalculator.ts` |
| CALC-05 | User can enter both seller address (origin) and buyer address (destination) for accurate cross-state calculation | Two ZIP input fields in calculator UI; `resolveTaxJurisdiction()` logic handles intrastate vs interstate |
| CALC-06 | Per-state JSON files are lazy-loaded on demand (not bundled in initial page load) | `rateLookup.ts` with `fetch()` + in-memory `Map` cache; files already live in `public/tax-data/` |
| TAXB-01 | Calculator applies grocery exemptions -- tax-free or reduced rate in applicable states | Existing `taxability.json` has grocery rules; `applyTaxability()` in `taxRules.ts` already implements this |
| TAXB-02 | Calculator applies clothing exemptions -- tax-free in NY, PA, NJ, MN, and other applicable states | Existing `taxability.json` has clothing rules with thresholds; `applyTaxability()` handles threshold logic |
| TAXB-03 | Calculator applies medicine/pharmaceutical exemptions per state rules | Existing `taxability.json` has medicine rules; virtually all states exempt Rx drugs |
| TAXB-04 | Calculator handles prepared food category -- separate (usually higher) rate where applicable | Need to add "prepared_food" category to `taxability.json` and `Product` type; new taxability rules needed |
| TAXB-05 | Product taxability rules are data-driven (JSON config, not hardcoded logic) for easy updates | Already achieved in Phase 1 with `taxability.json` + `applyTaxability()` pattern; extend for prepared food |
</phase_requirements>

## Standard Stack

### Core (existing -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI rendering | Already installed |
| React Router DOM | 7.13.1 | Client-side routing | Already installed, calculator route exists at `/calculator` |
| TypeScript | 5.9.3 | Type safety | Already installed |
| Vite | 6.4.1 | Build tool + dev server | Already installed |
| Tailwind CSS | 4.2.1 | Styling | Already installed |

### Supporting (no new npm packages needed)

This phase requires **zero new npm dependencies**. Everything is built with native browser APIs (`fetch`, `Map`, `Promise`) and the existing React stack. The per-state JSON files are static assets served from `public/tax-data/` and fetched at runtime.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Module-level `Map` cache | React Query / SWR for data fetching | Overkill for this use case -- we fetch one JSON file per state, cache forever. No stale data, no refetching. A simple `Map<string, Promise<StateTaxData>>` is the right tool. |
| Plain `fetch()` | Bundling all state data in JS | Violates D-06 (lazy loading). Would add ~1.5MB to initial bundle. |
| Custom ZIP validation | `postal-codes-js` npm package | Unnecessary dependency for simple 5-digit regex check |

## Architecture Patterns

### Recommended Project Structure

```
src/
  lib/
    zipUtils.ts           NEW  -- ZIP validation, ZIP-to-state mapping
    rateLookup.ts         NEW  -- lazy-load per-state JSON, cache, lookup ZIP
    taxCalculator.ts      NEW  -- jurisdiction resolution, per-jurisdiction tax calc
    taxRules.ts           KEEP -- backward-compat wrapper (used by existing pages)
    formatters.ts         KEEP
  pages/
    CalculatorPage.tsx    REWRITE -- ZIP input, dual-address, breakdown table
  data/
    types.ts              EXTEND -- add TaxBreakdownResult, PreparedFood category
    products.ts           KEEP
data/
  taxability.json         EXTEND -- add prepared_food category
```

### Pattern 1: Lazy Data Loading with Promise Cache

**What:** Store the `Promise` (not the resolved value) in the cache to prevent duplicate concurrent fetches.
**When to use:** Any time a state's rate data is requested.
**Why:** If user types a ZIP and two lookups fire before the first fetch completes, both get the same Promise. No duplicate network requests.

```typescript
// src/lib/rateLookup.ts
const cache = new Map<string, Promise<StateTaxData>>();

export function loadStateData(stateAbbr: string): Promise<StateTaxData> {
  const key = stateAbbr.toUpperCase();
  if (!cache.has(key)) {
    const url = `${import.meta.env.BASE_URL}tax-data/${key}.json`;
    cache.set(key, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to load tax data for ${key}`);
      return r.json() as Promise<StateTaxData>;
    }));
  }
  return cache.get(key)!;
}
```

### Pattern 2: ZIP Prefix Lookup (Bundled, No Network)

**What:** A static array of `[startPrefix, endPrefix, stateAbbr]` tuples that maps the first 3 digits of any ZIP code to a state. ~150 entries, ~3KB.
**When to use:** Immediately when user enters a ZIP, before any network fetch.
**Why:** Enables instant state identification without loading any per-state data. The state abbreviation is then used to determine which JSON file to fetch.

```typescript
// src/lib/zipUtils.ts
const ZIP_PREFIX_MAP: [number, number, string][] = [
  [5, 5, "NY"], [6, 6, "PR"], [7, 9, "PR"],
  [10, 14, "MA"], [15, 15, "MA"], // ... etc
  [995, 999, "AK"],
];

export function zipToState(zip: string): string | null {
  const prefix = Math.floor(parseInt(zip, 10) / 100);
  for (const [start, end, state] of ZIP_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) return state;
  }
  return null;
}
```

### Pattern 3: Per-Jurisdiction Tax Breakdown

**What:** The calculation engine returns tax amounts broken down by jurisdiction level, not just a single combined amount.
**When to use:** For the breakdown display table (D-11, D-12).
**Why:** Users need to see exactly which jurisdiction charges what. The `ZipEntry` from per-state JSON already has `county`, `city`, and `special` rate fields.

```typescript
// src/lib/taxCalculator.ts
interface JurisdictionBreakdown {
  jurisdiction: string;   // "State" | "County" | "City" | "Special District"
  name: string;           // "California" | "Los Angeles County" | etc.
  rate: number;           // 0.0725
  taxAmount: number;      // 7.25
}

interface TaxBreakdownResult {
  buyerZip: string;
  sellerZip?: string;
  sourcingRule: "origin" | "destination";
  combinedRate: number;
  jurisdictions: JurisdictionBreakdown[];
  productCategory: string;
  subtotal: number;
  taxableAmount: number;
  totalTax: number;
  total: number;
  notes: string[];
}
```

### Anti-Patterns to Avoid

- **Loading all states at once:** Per-state JSON files must be lazy-loaded per D-02. Never `Promise.all()` all 50 states.
- **Recalculating on every keystroke:** Only trigger calculation when the ZIP is a valid 5-digit code, not on each character input. Use debounce or explicit calculate action.
- **Hardcoding taxability rules in TypeScript:** All product category rules must come from `taxability.json` (TAXB-05). The `applyTaxability()` function reads from data, not from code.
- **Blocking render on data fetch:** Show the calculator form immediately. Only the results area should show a loading state while data is being fetched (D-16).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP code validation | Custom regex parser for edge cases | Simple regex `/^\d{5}$/` + check against loaded data | ZIP codes are exactly 5 digits. No need for a validation library. |
| Currency formatting | Manual `toFixed(2)` with `$` prefix | Existing `formatCurrency()` from `formatters.ts` | Already handles locale-aware formatting via `Intl.NumberFormat` |
| Percentage formatting | Manual string concatenation | Existing `formatPercent()` from `formatters.ts` | Already exists and handles precision |
| Taxability logic | Switch statements per state | Existing `applyTaxability()` from `taxRules.ts` + `taxability.json` | Data-driven approach already built in Phase 1 |

## Common Pitfalls

### Pitfall 1: No Avalara Data Available

**What goes wrong:** The build pipeline exists (`build-tax-data.mjs`) but the `data/avalara/` directory is empty. There are 0 per-state JSON files in `public/tax-data/` (only `manifest.json` with `stateCount: 0`). The calculator has nothing to look up.
**Why it happens:** Phase 1 built the pipeline infrastructure but Avalara CSVs must be manually downloaded (they require email registration).
**How to avoid:** Phase 2 must either (a) include a task to download and place Avalara CSV files, or (b) create representative sample data for development/testing. The pipeline is ready and tested -- it just needs input files.
**Warning signs:** `manifest.json` showing `stateCount: 0`.

### Pitfall 2: Multi-Region ZIPs

**What goes wrong:** A single ZIP can have multiple entries in the per-state JSON (`zips` is `Record<string, ZipEntry[]>` -- note the array). If code assumes `zips[zip]` returns a single entry, it will break or show incorrect data.
**Why it happens:** ZIP codes are postal routes, not tax boundaries. ZIP 30052 covers 4 counties with 4 different rates.
**How to avoid:** Per D-13, show the first/primary rate and add a note when `zips[zip].length > 1`. The `ZipEntry[]` array is already designed for this.
**Warning signs:** Results showing different combined rates for the same ZIP depending on which array element is used.

### Pitfall 3: Floating-Point Rate Arithmetic

**What goes wrong:** Adding `stateRate + countyRate + cityRate + specialRate` does not equal the stored `combinedRate` due to floating-point precision. E.g., `0.0625 + 0.01 + 0.0125 = 0.08499999999999999` instead of `0.085`.
**Why it happens:** IEEE 754 floating-point representation.
**How to avoid:** Use the stored `combined` rate from `ZipEntry` for the total. For per-jurisdiction amounts, compute each independently: `Math.round(subtotal * rate * 100) / 100`. Do NOT compute total tax as sum of per-jurisdiction amounts -- compute it from the combined rate, then show the breakdown as informational.
**Warning signs:** "Rounding error" where jurisdiction amounts don't sum to total (off by $0.01).

### Pitfall 4: Origin/Destination When Seller ZIP is Empty

**What goes wrong:** D-04 says seller ZIP is optional (defaults empty). If the code requires seller ZIP for the origin/destination logic, it throws or produces incorrect results.
**Why it happens:** The origin/destination resolution function expects both ZIPs.
**How to avoid:** When seller ZIP is empty, default to destination-based calculation using buyer ZIP only. This is correct for the common case (consumer shopping online, seller location unknown). Origin-based logic only kicks in when both ZIPs are provided.
**Warning signs:** Error state when only buyer ZIP is entered.

### Pitfall 5: Product Category Mismatch

**What goes wrong:** D-08 specifies 5 categories: General, Groceries, Clothing, Medicine, Prepared Food. But the existing `Product` type has `"electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general"`. There is no `"prepared_food"` category, and the decision drops "electronics" and "candy" as standalone options.
**Why it happens:** Phase 1 designed product categories for the demo cart. Phase 2 pivots to a user-facing category selector with different groupings.
**How to avoid:** The calculator's category dropdown is independent of the `Product` type. Map "electronics" to "general" for the demo cart. Add "prepared_food" to `taxability.json`. The Product type can stay as-is for backward compat; the calculator dropdown uses its own union type.
**Warning signs:** Missing taxability rules for "prepared_food" causing it to be taxed at full rate with no special handling.

### Pitfall 6: BASE_URL in Fetch Paths

**What goes wrong:** The app is deployed to `https://prepor.github.io/us-tax/` so `BASE_URL` is `/us-tax/`. Forgetting to include this prefix when fetching `tax-data/{state}.json` causes 404 errors in production.
**Why it happens:** Works in dev (base is `/`) but breaks in production.
**How to avoid:** Always use `${import.meta.env.BASE_URL}tax-data/${state}.json` for fetch URLs. Vite sets `BASE_URL` from the `base` config in `vite.config.ts`.
**Warning signs:** Calculator works in `npm run dev` but returns errors on GitHub Pages.

## Code Examples

### ZIP-to-State Resolution (Complete Implementation)

```typescript
// src/lib/zipUtils.ts
// Source: USPS ZIP prefix assignment tables

// Format: [startPrefix3, endPrefix3, stateAbbr]
// ~150 entries covering all 3-digit ZIP prefixes
const ZIP_PREFIX_MAP: [number, number, string][] = [
  [5, 5, "NY"], [6, 9, "PR"],
  [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 54, "VT"], [55, 59, "MA"],
  [60, 69, "CT"], [70, 89, "NJ"], [90, 99, "NJ"],
  // 1xx
  [100, 149, "NY"], [150, 196, "PA"],
  // 2xx
  [200, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"],
  [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  // 3xx
  [300, 319, "GA"], [320, 339, "FL"], [340, 349, "AA"], // APO
  [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"],
  [398, 399, "GA"],
  // 4xx
  [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"],
  [480, 499, "MI"],
  // 5xx
  [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"],
  [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"],
  // 6xx
  [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"],
  [680, 693, "NE"],
  // 7xx
  [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"],
  [750, 799, "TX"],
  // 8xx
  [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"],
  [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"],
  [889, 898, "NV"],
  // 9xx
  [900, 966, "CA"], [967, 968, "HI"], [970, 979, "OR"],
  [980, 994, "WA"], [995, 999, "AK"],
];

export function zipToState(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const prefix = Math.floor(parseInt(zip, 10) / 100);
  for (const [start, end, state] of ZIP_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) return state;
  }
  return null;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}
```

**Note:** The above ZIP prefix map is a reasonable approximation. The full map should be compiled from USPS postal data. Some prefixes span states or have gaps. For v1, this covers the vast majority of real ZIP codes. Edge cases (military APO/FPO, territories) can be handled as "unknown state."

### Rate Lookup with Promise Cache

```typescript
// src/lib/rateLookup.ts
import type { StateTaxData, ZipEntry } from "../data/types";

const cache = new Map<string, Promise<StateTaxData>>();

export function loadStateData(stateAbbr: string): Promise<StateTaxData> {
  const key = stateAbbr.toUpperCase();
  if (!cache.has(key)) {
    const url = `${import.meta.env.BASE_URL}tax-data/${key}.json`;
    cache.set(key, fetch(url).then(r => {
      if (!r.ok) throw new Error(`Tax data not available for ${key}`);
      return r.json() as Promise<StateTaxData>;
    }));
  }
  return cache.get(key)!;
}

export function lookupZip(
  stateData: StateTaxData,
  zip: string,
): ZipEntry | null {
  const entries = stateData.zips[zip];
  if (!entries || entries.length === 0) return null;
  // Return first entry (primary/most common jurisdiction for this ZIP)
  return entries[0];
}

export function hasMultipleJurisdictions(
  stateData: StateTaxData,
  zip: string,
): boolean {
  const entries = stateData.zips[zip];
  return !!entries && entries.length > 1;
}
```

### Origin/Destination Resolution

```typescript
// src/lib/taxCalculator.ts (partial)

const ORIGIN_STATES = new Set([
  "AZ", "CA", "IL", "MS", "MO", "OH", "PA", "TN", "TX", "UT", "VA",
]);

interface JurisdictionResolution {
  rateState: string;
  rateZip: string;
  sourcingRule: "origin" | "destination";
}

function resolveTaxJurisdiction(
  buyerState: string,
  buyerZip: string,
  sellerState?: string,
  sellerZip?: string,
): JurisdictionResolution {
  // No seller info: always use buyer (destination)
  if (!sellerState || !sellerZip) {
    return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
  }

  // Interstate: always destination
  if (sellerState !== buyerState) {
    return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
  }

  // Intrastate in origin-based state: use seller location
  if (ORIGIN_STATES.has(buyerState)) {
    return { rateState: sellerState, rateZip: sellerZip, sourcingRule: "origin" };
  }

  // Intrastate in destination-based state: use buyer location
  return { rateState: buyerState, rateZip: buyerZip, sourcingRule: "destination" };
}
```

### Calculator UI Skeleton

```typescript
// src/pages/CalculatorPage.tsx (conceptual structure)
// Two ZIP fields + category dropdown + amount input -> breakdown table

function CalculatorPage() {
  const [buyerZip, setBuyerZip] = useState("");
  const [sellerZip, setSellerZip] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ProductCategory>("general");
  const [result, setResult] = useState<TaxBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    // 1. Validate buyer ZIP
    // 2. Resolve buyer state via zipToState()
    // 3. Optionally resolve seller state
    // 4. Determine jurisdiction via resolveTaxJurisdiction()
    // 5. Load state data via loadStateData() (async, show loading)
    // 6. Look up ZIP rates via lookupZip()
    // 7. Apply taxability for the selected category
    // 8. Compute per-jurisdiction breakdown
    // 9. Set result
  }
  // ... render form + breakdown table
}
```

## State of the Art

| Old Approach (current) | New Approach (Phase 2) | Impact |
|------------------------|------------------------|--------|
| State dropdown selector | ZIP code input with auto-state detection | Users get exact local rates instead of just state rate |
| Single combined tax rate | Per-jurisdiction breakdown (state/county/city/special) | Full transparency into where tax comes from |
| `calculateTax()` returns `TaxSummary` with single `taxRate` | `calculateFullTax()` returns `TaxBreakdownResult` with `JurisdictionBreakdown[]` | CALC-02 satisfied |
| All data bundled in `states.json` (354KB) | Per-state lazy loading (~8KB gzipped per state on demand) | CALC-06 satisfied, faster initial load |
| Only state-level taxability rules | Full jurisdiction-aware rules + prepared food category | TAXB-01 through TAXB-05 satisfied |

## Key Implementation Decisions

### Data Availability Issue

The `data/avalara/` directory is empty. The pipeline (`build-tax-data.mjs`) works but has nothing to process. Options:

1. **Download Avalara CSVs** -- Requires visiting https://www.avalara.com/taxrates/en/download-tax-tables.html and providing an email address. This produces real data for all 50 states.
2. **Create sample test data** -- Generate a few synthetic per-state JSON files (e.g., CA, NY, TX, FL) with representative rate data for development. Replace with real data before deployment.

**Recommendation:** The planner should include a data acquisition task early in the plan. The calculator engine can be developed and tested with sample data, but real Avalara CSVs are needed for production.

### Prepared Food Category

D-08 introduces "Prepared Food" which does not exist in `taxability.json`. Prepared food is taxable in nearly all states (even those that exempt groceries). The implementation needs:
- Add `"prepared_food"` entry to `taxability.json` with `"default": "taxable"` and minimal overrides
- Update the `StateTaxData.taxability` type to include `prepared_food`
- The calculator category dropdown maps to these keys

### Product Type vs Calculator Categories

The calculator's 5 categories (D-08: General, Groceries, Clothing, Medicine, Prepared Food) differ from the `Product` type's 6 categories (electronics, clothing, groceries, medicine, candy, general). Resolution:
- The calculator dropdown uses its own `ProductCategory` type: `"general" | "groceries" | "clothing" | "medicine" | "prepared_food"`
- "electronics" maps to "general" when used with demo cart
- "candy" maps to "general" in the calculator UI (or could be kept as a hidden mapping)
- The existing demo cart products continue to work but are secondary to the new amount+category input

### TaxSummary vs TaxBreakdownResult

The existing `TaxSummary` type returns a single `taxRate` and `taxAmount` per line item. Phase 2 needs per-jurisdiction amounts. Two approaches:
- **Extend `TaxSummary`:** Add jurisdiction breakdown fields. Risk: breaks backward compatibility.
- **New `TaxBreakdownResult` type:** Separate type for the new calculator. `TaxSummary` remains for demo cart compatibility.

**Recommendation:** Create `TaxBreakdownResult` as a new type. The demo cart pattern on the calculator page can be removed or adapted. The old `calculateTax()` in `taxRules.ts` stays untouched for any backward-compat usage.

## Open Questions

1. **Avalara CSV Availability**
   - What we know: The pipeline is built and tested. The download requires email registration at Avalara.
   - What's unclear: Whether Avalara terms allow redistribution in an open-source project. The `data/avalara/` directory is gitignored to avoid this issue.
   - Recommendation: Download CSVs locally for development. Do NOT commit them to git. The build pipeline produces the per-state JSON files which are committed. Add a note in the README about data sourcing.

2. **Demo Cart vs Amount Input**
   - What we know: D-15 specifies "Amount input field + product category dropdown + ZIP fields". The current page has a demo cart with quantity controls.
   - What's unclear: Whether to keep the demo cart alongside the new input, or fully replace it.
   - Recommendation: Replace the demo cart with the simpler amount+category input. The demo cart pattern has served its purpose as a Phase 1 proof-of-concept.

3. **ZIP Prefix Map Completeness**
   - What we know: USPS publishes ~150 three-digit SCF prefix ranges. Most map cleanly to states.
   - What's unclear: Edge cases around military/APO ZIPs, territories, and a few prefixes that span states.
   - Recommendation: Start with the well-documented prefix ranges. Return `null` for unknown prefixes and show an error message. This covers 99%+ of real US ZIP codes.

## Project Constraints (from CLAUDE.md)

- **Hosting:** GitHub Pages -- no server, no database, everything client-side
- **Data:** Static bundled dataset -- per-state JSON in `public/tax-data/`
- **Stack:** React 19 / TypeScript 5.9 / Vite 6.4 / Tailwind CSS 4.2 (no new dependencies)
- **Naming:** Pages use PascalCase with `Page` suffix; utility modules use camelCase; constants use SCREAMING_SNAKE_CASE
- **Code style:** 2-space indentation, double quotes, semicolons, trailing commas
- **Imports:** Relative paths, `type` keyword for type-only imports
- **Components:** Default exports for pages, inline Tailwind classes, dark mode via `dark:` variants
- **No linter/formatter configured** -- rely on TypeScript strict mode
- **Build pipeline:** `npm run build:tax-data` produces per-state JSON; `npm run build:data` produces `states.json`
- **Base path:** `/us-tax/` -- all fetch URLs must include `import.meta.env.BASE_URL`
- **No commit co-author lines or "Generated with Claude Code" messages per user instructions**

## Sources

### Primary (HIGH confidence)
- `src/data/types.ts` -- Existing type definitions: `StateTaxData`, `ZipEntry`, `TaxabilityRule`, `TaxLineItem`, `TaxSummary`
- `src/lib/taxRules.ts` -- Existing `calculateTax()` and `applyTaxability()` implementation
- `scripts/build-tax-data.mjs` -- Existing Avalara CSV pipeline, output format
- `data/taxability.json` -- Existing taxability rules for 4 categories
- `.planning/research/ARCHITECTURE.md` -- Lazy loading strategy, lookup engine design, binary vs JSON analysis
- `.planning/research/FEATURES.md` -- Origin vs destination rules by state, product taxability categories

### Secondary (MEDIUM confidence)
- [List of ZIP Code prefixes - Wikipedia](https://simple.wikipedia.org/wiki/List_of_ZIP_Code_prefixes) -- ZIP prefix to state mapping reference
- [USPS L002 3-Digit ZIP Code Prefix Matrix](https://pe.usps.com/archive/html/dmmarchive20050106/print/L002.htm) -- Official USPS prefix assignments

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, existing stack fully sufficient
- Architecture: HIGH -- patterns well-documented in ARCHITECTURE.md research, types already defined
- Pitfalls: HIGH -- data availability issue identified from direct inspection of `data/avalara/` and `manifest.json`
- Taxability: HIGH -- existing `applyTaxability()` pattern proven in Phase 1, only needs prepared food addition

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain, no rapidly changing dependencies)
