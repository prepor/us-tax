# Phase 1: Data Foundation - Research

**Researched:** 2026-03-24
**Domain:** Build-time data pipeline, CSV ingestion, static JSON generation, type consolidation, floating-point fix
**Confidence:** HIGH

## Summary

Phase 1 transforms the project from a dual-source-of-truth architecture (markdown files + hardcoded `taxRules.ts` constants) into a single-source-of-truth pipeline: Avalara CSV files are parsed at build time into per-state JSON files containing rates AND taxability rules. The existing `taxRules.ts` becomes a thin calculation layer that reads from generated data instead of hardcoded constants.

The core technical work is: (1) create a new build script that parses Avalara CSVs, (2) produce per-state JSON files in `public/tax-data/`, (3) produce a manifest JSON with metadata, (4) add build-time validation, (5) fix floating-point rounding in `taxRules.ts`, (6) create shared type definitions, (7) refactor `taxRules.ts` to read taxability rules from generated data, (8) add a freshness badge to the footer, and (9) set up a GitHub Actions cron job for monthly refresh.

**Primary recommendation:** Build the pipeline in a new `scripts/build-tax-data.mjs` script that runs before the existing `build-data.mjs`. Start with the Avalara CSV as the single authoritative source. Per-state JSON files go in `public/tax-data/` (served as static assets by Vite, not bundled into JS). The manifest file provides the freshness date used by the footer badge. Taxability rules (grocery/clothing/medicine exemptions) are embedded directly in each state's JSON file, eliminating the need for separate hardcoded constants.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Avalara CSV files are downloaded manually and committed to the repository. No automated CI fetch for initial data acquisition.
- **D-02:** GitHub Actions cron job (DATA-04) handles monthly refresh -- downloads fresh CSVs, rebuilds, and deploys automatically. The committed CSV serves as fallback if fetch fails.
- **D-03:** The build pipeline produces a single comprehensive JSON output containing rates AND taxability rules for all jurisdictions. taxRules.ts becomes a thin calculation layer that reads from the generated JSON -- no more hardcoded rate constants.
- **D-04:** The existing markdown files (state-taxes/*.md) remain as human-readable reference content for state guide pages, but they are NOT the source of truth for rates. Avalara CSV is the authoritative rate source.
- **D-05:** The 5 known data inconsistencies (AL, AR, KS, MS, ID) must be fixed as part of the pipeline migration -- when taxRules.ts reads from the pipeline output, these conflicts disappear by design.
- **D-06:** Build pipeline flow: Avalara CSV -> parse/normalize -> per-state JSON files in public/tax-data/ (lazy-loaded at runtime) + a manifest JSON with metadata (date, state list, combined rates summary)
- **D-07:** Per-state JSON files contain: state rate, county rates (with names), city rates (with names), special district rates, combined rates per ZIP code
- **D-08:** Build-time validation must catch: missing states, rate anomalies (negative, >15%), duplicate ZIPs, and schema violations. Pipeline fails loudly on bad data.
- **D-09:** Single global footer badge showing "Rates as of [month year]" -- visible on all pages, not intrusive. Date extracted from Avalara CSV metadata or build timestamp.
- **D-10:** Tax calculations must use correct rounding -- either integer cents arithmetic or explicit per-line rounding to 2 decimal places. No floating-point artifacts in any displayed result.
- **D-11:** Create a single shared StateEntry/TaxData type definition (e.g., src/data/types.ts) imported everywhere. Eliminate the 3 duplicated interface definitions.

### Claude's Discretion
- Exact CSV parsing library choice (or raw Node.js parsing)
- JSON schema design for per-state files
- Validation threshold values for anomaly detection
- File naming convention for per-state JSON files
- How to handle states with no sales tax in the pipeline output

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FNDX-01 | Fix 5 data inconsistencies between state markdown files and taxRules.ts (AL, AR, KS, MS, ID) | Resolved by design: pipeline generates data from Avalara CSV, taxRules.ts reads from generated JSON. Dual source of truth eliminated. See "Architecture Patterns" section. |
| FNDX-02 | Fix floating-point rounding -- use integer cents or per-line rounding for tax calculations | Per-line `Math.round(amount * rate * 100) / 100` on taxRules.ts line 235. See "Common Pitfalls" section. |
| FNDX-03 | Eliminate dual source of truth -- single authoritative data source feeds both guide pages and calculator | Avalara CSV is sole rate authority. Pipeline produces per-state JSON with rates AND taxability rules. taxRules.ts reads from these. Markdown files remain for guide content only. |
| FNDX-04 | Display "Rates as of [date]" freshness indicator on all pages showing tax rates | Manifest JSON stores build date. Footer badge in Layout.tsx reads from manifest. See "Architecture Patterns" section. |
| DATA-01 | Build-time pipeline ingests Avalara free CSV rate tables covering all 50 states + DC | New `scripts/build-tax-data.mjs` parses CSVs from `data/avalara/` directory. See "Standard Stack" and "Architecture Patterns". |
| DATA-02 | Pipeline normalizes CSV data into per-state JSON files with state/county/city/district rate breakdown | Per-state JSON files in `public/tax-data/{state}.json` with ZIP-keyed rate entries containing county/city/special breakdown. |
| DATA-03 | Pipeline validates ingested rates against known reference values during build | Build-time validation: state count check (45 taxable + 5 no-tax + DC = 51), rate range check (0-15%), duplicate ZIP detection, schema validation. See "Don't Hand-Roll". |
| DATA-04 | GitHub Actions cron job refreshes tax rate data monthly and rebuilds/deploys automatically | New workflow file `.github/workflows/refresh-tax-data.yml` with monthly cron, CSV download, build, auto-commit or PR. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Don't add "Generated with Claude Code" or co-authored things to commit/PR messages
- Don't add "files affected" or "test plan" to commit/PR messages
- GitHub username: prepor
- Stack: React 19 / TypeScript 5.9 / Vite 6.4 / Tailwind 4.2
- No ESLint, Prettier, or test framework configured
- All build scripts use ESM (`.mjs` extension)
- 2-space indentation, double quotes, semicolons
- Default exports for pages/components, named exports for utilities

## Standard Stack

### Core (No new runtime dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `fs/promises` | Built-in | Read CSV files, write JSON files | Already used in `build-data.mjs`. Zero dependency approach for simple CSV. |
| Node.js `String.split()` | Built-in | Parse Avalara CSV rows | Avalara CSVs are simple: no quoted fields with embedded commas, no multi-line values. Manual splitting is sufficient. |
| Vite `public/` directory | 6.4.1 | Serve per-state JSON as static assets | Files in `public/` are served as-is, not bundled into JS. Perfect for lazy-loaded data. |
| `fetch()` + `JSON.parse()` | Browser built-in | Load per-state JSON at runtime | No library needed. Native browser APIs. |

### Supporting (Dev dependencies -- optional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `csv-parse/sync` | 6.2.1 | CSV parsing with proper RFC 4180 handling | Only if Avalara CSVs contain quoted fields or edge cases that break simple `split(",")`. Start without it; add only if needed. |

**Recommendation on CSV parsing:** Start with raw `String.split(",")` per line. The Avalara CSV format has 9 simple columns with no quoted commas in field values (state abbreviations, ZIP codes, region names, and decimal numbers). The existing `build-data.mjs` uses regex-based parsing for markdown, which is far more complex. If edge cases surface (e.g., region names containing commas like "PORTLAND, OR"), add `csv-parse` as a dev dependency.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `split(",")` | `csv-parse` (npm) | More robust RFC 4180 handling, but adds a dependency for a simple format |
| Raw `split(",")` | `papaparse` (npm) | Browser-focused CSV parser -- overkill for a build-time Node.js script |
| `public/` static files | Vite dynamic `import()` of JSON | Dynamic import bundles JSON into JS chunks; `public/` keeps them as plain fetchable files, better for cache control |

**Installation:**
```bash
# No new dependencies needed for Phase 1 baseline
# If CSV edge cases arise:
npm install -D csv-parse
```

## Architecture Patterns

### Recommended Project Structure (new/modified files)

```
us-tax/
├── data/
│   └── avalara/              # NEW: Committed Avalara CSV source files
│       ├── TAXRATES_ZIP5_AL202603.csv
│       ├── TAXRATES_ZIP5_CA202603.csv
│       └── ...               # One CSV per state (51 files)
├── public/
│   └── tax-data/             # NEW: Generated per-state JSON (served as static assets)
│       ├── manifest.json     # Build metadata: date, state list, rate summaries
│       ├── AL.json
│       ├── CA.json
│       └── ...               # 51 files (50 states + DC)
├── scripts/
│   ├── build-data.mjs        # EXISTING: Markdown -> states.json (keep as-is)
│   └── build-tax-data.mjs    # NEW: Avalara CSV -> per-state JSON + manifest
├── src/
│   ├── data/
│   │   ├── types.ts          # NEW: Shared type definitions (D-11)
│   │   ├── states.json       # EXISTING: Generated from markdown (keep)
│   │   └── products.ts       # EXISTING: Keep as-is
│   ├── lib/
│   │   ├── taxRules.ts       # MODIFY: Remove hardcoded constants, read from data
│   │   └── formatters.ts     # EXISTING: Keep as-is
│   ├── components/
│   │   └── Layout.tsx         # MODIFY: Add freshness badge in footer
│   └── pages/
│       ├── HomePage.tsx       # MODIFY: Import types from src/data/types.ts
│       ├── StatePage.tsx      # MODIFY: Import types from src/data/types.ts
│       └── CalculatorPage.tsx # MODIFY: Import types from src/data/types.ts
└── .github/
    └── workflows/
        ├── deploy.yml         # EXISTING: Keep as-is
        └── refresh-tax-data.yml  # NEW: Monthly cron for data refresh (DATA-04)
```

### Pattern 1: Build-Time CSV Pipeline

**What:** A Node.js ESM script (`scripts/build-tax-data.mjs`) that reads Avalara CSV files, normalizes the data, validates it, and writes per-state JSON files and a manifest.

**When to use:** Runs as part of `npm run build` and `npm run dev`, before the Vite build.

**Pipeline flow:**
```
data/avalara/*.csv
  |
  v
[1. Read & Parse CSV]
  - Read each CSV file from data/avalara/
  - Split by newline, then by comma
  - Skip header row
  - Extract: State, ZipCode, TaxRegionName, EstimatedCombinedRate,
             StateRate, EstimatedCountyRate, EstimatedCityRate, SpecialRate
  |
  v
[2. Normalize]
  - Parse rates from strings to numbers (parseFloat)
  - Group records by state abbreviation
  - Within each state, group by ZIP code
  - For each ZIP: store array of tax regions (handles multi-jurisdiction ZIPs)
  - Merge taxability rules from a curated data source (see below)
  |
  v
[3. Validate]
  - Check: all 51 state/territory files present (45 taxable + 5 no-tax + DC)
  - Check: no rates < 0 or > 0.15
  - Check: no duplicate ZIP entries within same region
  - Check: state rate is consistent across all ZIPs within a state
  - Fail build with descriptive error on any violation
  |
  v
[4. Write Output]
  - Per-state JSON to public/tax-data/{STATE}.json
  - Manifest to public/tax-data/manifest.json
  - Console summary: state count, total ZIP count, any warnings
```

### Pattern 2: Per-State JSON Schema

**What:** Each state file contains rates and taxability rules in a single JSON structure.

**Recommended schema:**
```typescript
// public/tax-data/CA.json
interface StateTaxData {
  state: string;           // "CA"
  stateName: string;       // "California"
  stateRate: number;       // 0.0725
  hasSalesTax: boolean;    // true
  updated: string;         // "2026-03" (from CSV date or build date)
  taxability: {
    groceries: TaxabilityRule;
    clothing: TaxabilityRule;
    medicine: TaxabilityRule;
    candy: TaxabilityRule;
  };
  zips: Record<string, ZipEntry[]>;  // keyed by 5-digit ZIP string
}

interface TaxabilityRule {
  status: "taxable" | "exempt" | "reduced";
  rate?: number;           // for reduced rate (e.g., 0.02 for AL groceries)
  threshold?: number;      // for partial exemption (e.g., 110 for NY clothing)
  thresholdType?: "exempt_below" | "tax_excess";
  note: string;            // human-readable explanation
}

interface ZipEntry {
  region: string;          // "LOS ANGELES"
  combined: number;        // 0.095 (total combined rate)
  county: number;          // 0.0025
  city: number;            // 0.0
  special: number;         // 0.025
}
```

**Why this schema:**
- `state` + `stateRate` at top level avoids repeating in every ZIP entry
- `taxability` embedded in state file satisfies D-03 (rates AND taxability rules in one output)
- `zips` keyed by string (not number) to preserve leading zeros (e.g., "01001")
- Array of `ZipEntry` per ZIP handles multi-jurisdiction ZIPs naturally
- `region` names allow UI to show "LOS ANGELES" in rate breakdown

**Design decisions:**
- **ZIP keys as strings:** ZIP codes like "01001" would lose the leading zero as numbers. Keep as strings.
- **No parallel arrays:** The architecture research suggested parallel arrays for compression, but for Phase 1, readability and simplicity take priority. Per-state files are small enough (20-150KB uncompressed, 5-40KB gzipped) that the compression benefit is negligible.
- **Taxability rules per state, not per ZIP:** Product taxability varies at the state level, not the ZIP level. No need to duplicate rules per ZIP.

### Pattern 3: Manifest for Freshness Badge

**What:** A `public/tax-data/manifest.json` file generated by the build pipeline.

```typescript
interface TaxDataManifest {
  generated: string;       // "2026-03-24T12:00:00Z" ISO timestamp
  ratesAsOf: string;       // "March 2026" human-readable
  stateCount: number;      // 51
  totalZipCodes: number;   // ~41,000
  states: string[];        // ["AL", "AK", "AZ", ...]
}
```

**Usage in Layout.tsx:** Fetch `manifest.json` once at app init (small file, ~200 bytes), display `ratesAsOf` in footer.

### Pattern 4: Taxability Data Source

**What:** Since Avalara CSVs contain only rate data (no product taxability info), taxability rules must come from a separate source. The current hardcoded constants in `taxRules.ts` are the most accurate source available in the codebase (despite the 5 inconsistencies, which we fix).

**Recommended approach:** Create a static `data/taxability.json` file (hand-curated, committed to repo) containing per-state taxability rules for each product category. The build pipeline reads this file and embeds the rules into each state's output JSON. This replaces the hardcoded constants in `taxRules.ts`.

```json
{
  "groceries": {
    "default": "exempt",
    "overrides": {
      "AL": { "status": "reduced", "rate": 0.02, "note": "State taxes groceries at reduced 2% rate" },
      "HI": { "status": "taxable", "note": "GET applies to groceries at the full 4.0% rate" },
      "ID": { "status": "taxable", "note": "Groceries taxable at full rate (income tax credit available)" },
      "IL": { "status": "reduced", "rate": 0.01, "note": "Groceries taxed at reduced 1% state rate" },
      "MO": { "status": "reduced", "rate": 0.01225, "note": "Groceries taxed at reduced 1.225% state rate" },
      "MS": { "status": "reduced", "rate": 0.05, "note": "Groceries taxed at reduced 5% rate" },
      "SD": { "status": "taxable", "note": "Groceries taxed at the full 4.2% state rate" },
      "TN": { "status": "reduced", "rate": 0.04, "note": "Groceries taxed at reduced 4% state rate" },
      "UT": { "status": "reduced", "rate": 0.03, "note": "Groceries taxed at reduced 3.0% combined rate" },
      "VA": { "status": "reduced", "rate": 0.01, "note": "Groceries taxed at reduced 1% state rate" }
    }
  },
  "clothing": {
    "default": "taxable",
    "overrides": {
      "PA": { "status": "exempt", "note": "Clothing exempt from sales tax" },
      "NJ": { "status": "exempt", "note": "Clothing exempt from sales tax" },
      "MN": { "status": "exempt", "note": "Clothing exempt from sales tax" },
      "VT": { "status": "exempt", "note": "Clothing exempt from sales tax" },
      "NY": { "status": "reduced", "threshold": 110, "thresholdType": "exempt_below", "note": "Items under $110 exempt from state sales tax" },
      "RI": { "status": "reduced", "threshold": 250, "thresholdType": "tax_excess", "note": "Tax applies to amount over $250" },
      "MA": { "status": "reduced", "threshold": 175, "thresholdType": "tax_excess", "note": "First $175 exempt; tax applies to amount over $175" }
    }
  },
  "medicine": {
    "default": "exempt",
    "overrides": {
      "IL": { "status": "exempt", "note": "Prescription drugs exempt (1% rate for medical appliances only)" }
    }
  },
  "candy": {
    "default": "taxable",
    "overrides": {
      "OK": { "status": "exempt", "note": "Oklahoma exempts candy (included in food exemption)" }
    }
  }
}
```

**Fixing the 5 inconsistencies (FNDX-01):**
- AL: Use 0.02 rate (not 0.03) -- corrected in taxability.json above
- AR: Remove entirely from reduced rate list -- groceries exempt as of Jan 2026
- KS: Remove entirely from reduced rate list -- groceries exempt as of Jan 2025
- MS: Use 0.05 rate (not 0.07) -- corrected in taxability.json above
- ID: Classify as "taxable" at full rate (not "exempt") -- corrected above

### Pattern 5: No-Sales-Tax States

**Design decision:** States with no sales tax (DE, MT, NH, OR) and Alaska (local-only) still get per-state JSON files. Their files have `hasSalesTax: false`, empty `zips` objects, and all taxability rules set to "exempt" (or rather, "not applicable"). This keeps the pipeline uniform -- every state has a file, no special-casing in runtime code.

### Anti-Patterns to Avoid

- **Don't bundle per-state JSON into the JS bundle:** Files must go in `public/` (served as static assets), not `src/` (which Vite would bundle). This is critical for lazy loading.
- **Don't keep hardcoded constants in taxRules.ts:** After this phase, taxRules.ts should have zero hardcoded rate data. All data comes from the pipeline output.
- **Don't parse CSV at runtime:** All CSV parsing happens at build time. The browser never sees CSV data.
- **Don't use numeric ZIP keys:** ZIP codes like 01001 lose the leading zero. Always use string keys.
- **Don't skip validation:** The pipeline must fail loudly on bad data. Silent data corruption is worse than a build failure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing with edge cases | Custom parser handling quotes, escapes, newlines | `csv-parse` (npm, dev-only) | RFC 4180 has many edge cases. But only use if Avalara CSVs actually need it. |
| Currency formatting | `Number.toFixed(2)` with manual `$` prefix | Existing `formatCurrency()` using `Intl.NumberFormat` | Already in codebase, handles locale, edge cases, negative amounts |
| Rate percentage display | `(rate * 100).toFixed(2) + "%"` manual string | Existing `formatPercent()` in formatters.ts | Already in codebase |
| State name lookup | Switch statement or if-else chain | Lookup object (already exists in `build-data.mjs` as `STATE_NAMES`) | Copy the lookup to shared location |
| GitHub Actions cron | Custom shell script for scheduling | GitHub Actions `schedule` trigger with `cron` syntax | Built-in, reliable, free for public repos |

**Key insight:** The project already has a working build pipeline (`build-data.mjs`) and formatting utilities (`formatters.ts`). Phase 1 extends these patterns rather than replacing them.

## Common Pitfalls

### Pitfall 1: Floating-Point Tax Rounding (FNDX-02)

**What goes wrong:** `taxableAmount * taxRate` produces values like `3.5000000000000003` instead of `3.50`. When multiple such values are summed, the total can round to a different cent than the sum of individually rounded items.

**Why it happens:** JavaScript uses IEEE 754 double-precision floats. The current code on `taxRules.ts` line 235 does `taxableAmount * taxRate` with no rounding.

**How to avoid:** Round each line item immediately after calculation:
```typescript
const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
```
Then sum the already-rounded amounts for the total:
```typescript
const totalTax = lineItems.reduce((s, i) => s + i.taxAmount, 0);
```

**Warning signs:** `taxAmount` values with more than 2 decimal places in the TaxLineItem objects.

### Pitfall 2: Leading Zeros in ZIP Codes

**What goes wrong:** ZIP codes in New England start with 0 (e.g., 01001). If stored as numbers, the leading zero is lost. JSON `01001` parses as `1001`. A lookup for "01001" fails.

**Why it happens:** JavaScript/JSON treat numeric literals as numbers; `JSON.parse("01001")` is `1001`.

**How to avoid:** Always use string keys for ZIP codes in the per-state JSON. In the schema: `"zips": { "01001": [...], "01002": [...] }`. Never `parseInt()` a ZIP code for use as a key.

**Warning signs:** Missing rate data for Connecticut, Massachusetts, Maine, New Hampshire, Vermont, and other New England states.

### Pitfall 3: Avalara CSV Has Multiple Rows Per ZIP

**What goes wrong:** A single ZIP code can appear multiple times in the Avalara CSV with different TaxRegionName values and different rates. If the parser takes only the first (or last) row, it silently drops valid rate data.

**Why it happens:** ZIP codes cross jurisdiction boundaries. ZIP 80111 in Colorado has 4 different rate entries.

**How to avoid:** Group all CSV rows by ZIP code. Store as an array: `"80111": [{ region: "CENTENNIAL", ... }, { region: "GREENWOOD VILLAGE", ... }]`. The per-state JSON schema already accounts for this with `ZipEntry[]` per ZIP.

**Warning signs:** Every ZIP has exactly one entry. Test with known multi-jurisdiction ZIPs: 80111 (CO), 30052 (GA), 05495 (VT).

### Pitfall 4: public/ Directory Missing from Git

**What goes wrong:** The `public/` directory does not exist yet in the project. If per-state JSON files in `public/tax-data/` are gitignored (treated as generated), then `npm run build` in CI will fail because the CSV source files and build step must run first.

**Why it happens:** The current project has no `public/` directory.

**How to avoid:** Two approaches (choose one):
1. **Generated and committed:** Run `build-tax-data.mjs` locally, commit the `public/tax-data/` output to git. CI just does `npm run build` as before. Simpler but adds ~2-4MB of JSON to the repo.
2. **Generated at build time:** Add `build-tax-data.mjs` to the `build` script in package.json so it runs before `vite build`. The `data/avalara/*.csv` source files are committed. The JSON output in `public/tax-data/` is gitignored.

**Recommended:** Option 2 (generated at build time). Commit the CSV source files in `data/avalara/`, gitignore `public/tax-data/`, and update the build script:
```json
"build": "node scripts/build-tax-data.mjs && node scripts/build-data.mjs && tsc -b && vite build"
```
This keeps the repo clean and ensures the JSON always matches the latest CSV.

### Pitfall 5: Stale Taxability Data After Pipeline Migration

**What goes wrong:** The taxability rules in the new `data/taxability.json` are copied from the current hardcoded constants. If the current constants are wrong (they are -- 5 known issues), the new file inherits those errors.

**Why it happens:** Copy-paste migration without verification.

**How to avoid:** When creating `data/taxability.json`, fix all 5 known inconsistencies simultaneously. The corrected values are documented in the "Pattern 4: Taxability Data Source" section above and in `.planning/codebase/CONCERNS.md`.

### Pitfall 6: GitHub Actions Cron Fetch Failure

**What goes wrong:** The monthly cron job fails to download fresh CSVs from Avalara (rate limiting, format change, URL change, etc.) and silently deploys stale data.

**Why it happens:** External dependency in CI. Avalara could change their download mechanism.

**How to avoid:** Per D-02, the committed CSV serves as fallback. The cron job should: (1) attempt fresh download, (2) if download fails, log a warning but do NOT fail the build -- use committed CSVs, (3) only commit new CSVs if download succeeded and data differs from committed version.

## Code Examples

### Example 1: CSV Parsing (build script)

```javascript
// scripts/build-tax-data.mjs
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const CSV_DIR = join(__dirname, "..", "data", "avalara");
const OUTPUT_DIR = join(__dirname, "..", "public", "tax-data");

function parseAvalaraCsv(content) {
  const lines = content.trim().split("\n");
  const header = lines[0].split(",");
  // Expected: State,ZipCode,TaxRegionName,EstimatedCombinedRate,
  //           StateRate,EstimatedCountyRate,EstimatedCityRate,SpecialRate,RiskLevel

  return lines.slice(1).map(line => {
    const cols = line.split(",");
    return {
      state: cols[0].trim(),
      zip: cols[1].trim().padStart(5, "0"),  // Preserve leading zeros
      region: cols[2].trim(),
      combined: parseFloat(cols[3]) || 0,
      stateRate: parseFloat(cols[4]) || 0,
      county: parseFloat(cols[5]) || 0,
      city: parseFloat(cols[6]) || 0,
      special: parseFloat(cols[7]) || 0,
    };
  });
}
```

### Example 2: Floating-Point Fix (taxRules.ts line 235)

```typescript
// BEFORE (current -- has floating-point bug):
const taxAmount = taxableAmount * taxRate;

// AFTER (fixed):
const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
```

### Example 3: Shared Type Definitions (src/data/types.ts)

```typescript
// src/data/types.ts -- Single source of truth for state data types

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
}

// Replaces StateData in taxRules.ts -- same data, one definition
export type StateData = StateEntry;
```

### Example 4: Freshness Badge in Footer (Layout.tsx)

```tsx
// In Layout.tsx footer section
const [ratesDate, setRatesDate] = useState<string>("");

useEffect(() => {
  fetch(`${import.meta.env.BASE_URL}tax-data/manifest.json`)
    .then(r => r.json())
    .then(data => setRatesDate(data.ratesAsOf))
    .catch(() => setRatesDate(""));
}, []);

// In JSX:
{ratesDate && (
  <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
    Rates as of {ratesDate}
  </p>
)}
```

### Example 5: Refactored taxRules.ts (reading from data)

```typescript
// The taxability rules are now loaded from per-state JSON
// taxRules.ts no longer contains CLOTHING_FULLY_EXEMPT, GROCERY_REDUCED_RATE, etc.

import type { StateTaxData, TaxabilityRule } from "../data/types";

function applyTaxability(
  category: string,
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
  // taxable
  return { taxableAmount: subtotal, taxRate: stateRate, explanation: `Taxable at state rate`, isExempt: false };
}
```

### Example 6: GitHub Actions Monthly Refresh

```yaml
# .github/workflows/refresh-tax-data.yml
name: Monthly Tax Data Refresh

on:
  schedule:
    - cron: "0 9 1 * *"  # 1st of every month at 9am UTC
  workflow_dispatch:        # Allow manual trigger

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      # Download fresh Avalara CSVs
      # (The exact download mechanism depends on Avalara's current interface)
      # For now, just rebuild from committed CSVs
      - run: node scripts/build-tax-data.mjs

      # Rebuild everything
      - run: npm run build

      # Check if anything changed
      - name: Check for changes
        id: changes
        run: |
          git diff --quiet data/avalara/ || echo "changed=true" >> $GITHUB_OUTPUT

      # Commit updated data if changed
      - name: Commit updated data
        if: steps.changes.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/avalara/
          git commit -m "chore: refresh Avalara tax rate data"
          git push
```

## State of the Art

| Old Approach (current) | New Approach (Phase 1) | Impact |
|------------------------|------------------------|--------|
| Markdown files as rate source | Avalara CSV as rate source | Higher accuracy, machine-readable, monthly updates |
| Hardcoded exemption constants in taxRules.ts | Data-driven taxability.json | Single source of truth, easier to update |
| Single states.json with all data | Per-state JSON files in public/ | Enables lazy loading in Phase 2 |
| No freshness indicator | Footer badge "Rates as of [month year]" | Users know data vintage |
| Floating-point multiplication without rounding | Per-line Math.round() | Correct cent-level calculations |
| 3 duplicate StateEntry interfaces | Shared types.ts | Type consistency, easier maintenance |
| No build validation | Build-time rate/schema validation | Bad data caught before deployment |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build scripts | Yes | 25.1.0 (local), 20 (CI) | -- |
| npm | Package management | Yes | 11.6.2 | -- |
| gh CLI | GitHub Actions setup | Yes | 2.83.2 | -- |
| GitHub Actions | DATA-04 (monthly cron) | Yes | Active on repo | Manual rebuild |
| Avalara CSV files | DATA-01 (data source) | Manual download required | -- | Use existing markdown data |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Avalara CSV files are not yet in the repo. Must be downloaded manually and committed before the pipeline can run. The existing markdown data serves as the current (degraded) fallback.

## Open Questions

1. **Avalara CSV exact download mechanism**
   - What we know: Avalara provides free CSV rate tables per state at their download page. Registration with email required.
   - What's unclear: The exact URL pattern for automated download in CI. The monthly cron job (DATA-04) needs a programmatic way to fetch fresh CSVs.
   - Recommendation: For Phase 1, download manually and commit. The cron job initially just rebuilds from committed CSVs. Automated download can be added later once the Avalara download flow is reverse-engineered or their API is used.

2. **Avalara redistribution terms**
   - What we know: Avalara provides the CSVs for free. STATE.md notes "redistribution terms unclear."
   - What's unclear: Whether committing processed rate data derived from Avalara CSVs to a public repo violates their terms.
   - Recommendation: The per-state JSON files are derived/transformed data, not raw Avalara files. This is likely acceptable for a non-commercial project. If concerns arise, the raw CSVs could be gitignored while the derived JSON is committed.

3. **TaxRegionName field -- can it contain commas?**
   - What we know: Region names are typically city/area names like "LOS ANGELES", "SEATTLE".
   - What's unclear: Whether any region name contains a comma (e.g., "PORTLAND, OR").
   - Recommendation: Start with simple `split(",")`. If a parsing test reveals comma-in-field issues, add `csv-parse` as a dev dependency.

## Sources

### Primary (HIGH confidence)
- **Project codebase** -- `scripts/build-data.mjs`, `src/lib/taxRules.ts`, `package.json`, `.planning/codebase/CONCERNS.md` -- direct inspection of current code and documented issues
- **Project research** -- `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` -- prior research on data sources, pipeline design, and known pitfalls
- **Vite documentation** -- `public/` directory serves static assets without bundling (standard Vite behavior, verified by existing project usage)

### Secondary (MEDIUM confidence)
- [Avalara Free Tax Rate Tables](https://www.avalara.com/taxrates/en/download-tax-tables.html) -- CSV format with columns: State, ZipCode, TaxRegionName, EstimatedCombinedRate, StateRate, EstimatedCountyRate, EstimatedCityRate, SpecialRate, RiskLevel (verified via multiple sources including Adobe Commerce docs)
- [npm csv-parse 6.2.1](https://www.npmjs.com/package/csv-parse) -- verified current version via `npm view`

### Tertiary (LOW confidence)
- Avalara CSV redistribution terms -- not found in public documentation; assumed acceptable for non-commercial use
- Exact Avalara download URL pattern for CI automation -- not publicly documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies needed; extends existing patterns
- Architecture: HIGH -- pipeline design follows existing `build-data.mjs` pattern; JSON schema verified against Avalara CSV format
- Pitfalls: HIGH -- all pitfalls are documented in project's own CONCERNS.md or verified in PITFALLS.md research
- GitHub Actions cron: MEDIUM -- basic setup is standard, but automated Avalara download mechanism is unclear

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable domain -- tax data pipeline patterns don't change frequently)
