---
phase: 02-calculation-engine
verified: 2026-03-24T20:01:05Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Enter buyer ZIP 90210, amount 100, General category, click Calculate"
    expected: "CA combined rate ~9.5% with state/county/city breakdown, total ~$109.50"
    why_human: "Cannot test browser rendering and async fetch from static files without running dev server"
  - test: "Enter buyer ZIP 97201 (OR), amount 100, General category"
    expected: "0% combined rate with note 'Oregon does not impose a sales tax'"
    why_human: "No-tax state behavior requires runtime fetch and UI rendering"
  - test: "Enter buyer ZIP 90210, seller ZIP 94102 (both CA intrastate)"
    expected: "Origin-based badge shown, seller's SF rates used"
    why_human: "Origin/destination badge and rate switching requires visual verification"
  - test: "Enter buyer ZIP 10001 (NY), seller ZIP 90210 (CA interstate)"
    expected: "Destination-based badge shown, NY buyer rates used"
    why_human: "Interstate sourcing logic requires runtime verification"
  - test: "Toggle dark mode on calculator page"
    expected: "All elements render with correct dark styling, no unstyled elements"
    why_human: "Visual dark mode verification requires browser"
  - test: "Resize browser to mobile width"
    expected: "Form and results stack vertically in single column"
    why_human: "Responsive layout requires visual browser testing"
---

# Phase 2: Calculation Engine Verification Report

**Phase Goal:** Users can enter a ZIP code and purchase details, and get an exact tax calculation with full jurisdiction breakdown, product taxability, and origin/destination awareness
**Verified:** 2026-03-24T20:01:05Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can enter a ZIP code and instantly see the combined tax rate with state, county, city, and district rates shown separately | VERIFIED | CalculatorPage.tsx has buyer ZIP input (line 80-88), calls calculateFullTax (line 46), renders combined rate (line 178-183), jurisdiction breakdown table with State/County/City/Special District rows (lines 214-233) |
| 2 | User can enter a purchase amount with product category and get exact tax with per-jurisdiction breakdown | VERIFIED | Amount input (lines 118-127), category select with 5 options (lines 133-143), jurisdiction breakdown table (lines 200-251), order summary with subtotal/tax/total (lines 253-280) |
| 3 | User can specify seller and buyer locations, and the calculator correctly applies origin-based or destination-based rules per state | VERIFIED | Seller ZIP input (lines 97-108), resolveTaxJurisdiction() in taxCalculator.ts (lines 35-58) with interstate=destination, intrastate+origin-state=origin logic, sourcing badge displayed (lines 188-196) |
| 4 | Grocery, clothing, medicine, and prepared food categories apply correct exemptions or reduced rates per jurisdiction | VERIFIED | applyProductTaxability() in taxCalculator.ts (lines 68-164) handles exempt/reduced/threshold cases, reads from StateTaxData.taxability (data-driven), CATEGORY_OPTIONS in CalculatorPage includes all 5 categories (lines 7-13), taxability.json has prepared_food with overrides |
| 5 | Per-state rate data loads on demand (not bundled in initial page load) with no perceptible delay | VERIFIED | rateLookup.ts uses fetch() with import.meta.env.BASE_URL (line 23), Promise cache (line 12), loadStateData called only on calculateFullTax invocation; public/tax-data/*.json are separate files not bundled |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/taxability.json` | Prepared food taxability rules | VERIFIED | 82 lines, has prepared_food category with default=taxable and 4 state overrides (UT, AR, IL, VA) |
| `src/data/types.ts` | TaxBreakdownResult, JurisdictionBreakdown, ProductCategory types | VERIFIED | 142 lines, exports all three types plus StateTaxData with prepared_food in taxability |
| `scripts/generate-sample-data.mjs` | Sample per-state JSON generator | VERIFIED | Generates 6 states (CA, NY, TX, FL, OR, PA) with 52 ZIPs, includes multi-jurisdiction entries |
| `scripts/build-tax-data.mjs` | Updated pipeline with prepared_food resolution | VERIFIED | prepared_food in resolveTaxability categories array (line 94), createNoTaxStateData (line 221), inline no-tax block (line 385) |
| `src/lib/zipUtils.ts` | ZIP validation and ZIP-to-state mapping | VERIFIED | 104 lines, exports isValidZip and zipToState, ZIP_PREFIX_MAP covers all 50 states + DC + PR + AA |
| `src/lib/rateLookup.ts` | Lazy-loading state data with Promise cache and ZIP lookup | VERIFIED | 67 lines, exports loadStateData (Promise cache), lookupZip (first entry), hasMultipleJurisdictions |
| `src/lib/taxCalculator.ts` | Origin/destination resolution and per-jurisdiction tax calculation | VERIFIED | 356 lines, exports calculateFullTax (async) and ORIGIN_STATES (11 states), handles all sourcing rules |
| `src/pages/CalculatorPage.tsx` | Complete calculator UI with ZIP input, category selector, breakdown table | VERIFIED | 307 lines, fully rewritten with two ZIP inputs, amount, 5-category dropdown, jurisdiction table, summary, notes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `data/taxability.json` | `scripts/build-tax-data.mjs` | resolveTaxability reads prepared_food | WIRED | grep confirms "prepared_food" in categories array (line 94) |
| `src/data/types.ts` | `src/lib/taxCalculator.ts` | TaxBreakdownResult type import | WIRED | Multi-line import at line 14, used as return type at line 179 |
| `src/lib/zipUtils.ts` | `src/lib/taxCalculator.ts` | zipToState() called | WIRED | Import at line 18, used at lines 184, 192 |
| `src/lib/rateLookup.ts` | `src/lib/taxCalculator.ts` | loadStateData + lookupZip | WIRED | Import at line 19, used at lines 204, 231, 325 |
| `src/pages/CalculatorPage.tsx` | `src/lib/taxCalculator.ts` | calculateFullTax on form submit | WIRED | Import at line 3, called at line 46 in handleCalculate |
| `src/pages/CalculatorPage.tsx` | `src/lib/zipUtils.ts` | isValidZip for validation | WIRED | Import at line 4, used at lines 28, 39 |
| `src/pages/CalculatorPage.tsx` | `src/lib/formatters.ts` | formatCurrency + formatPercent | WIRED | Import at line 5, used 15+ times in template |
| `src/pages/CalculatorPage.tsx` | `src/data/types.ts` | TaxBreakdownResult, ProductCategory types | WIRED | Import at line 2, used in useState hooks and template |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CalculatorPage.tsx` | `result` (TaxBreakdownResult) | `calculateFullTax()` via async handler | Yes -- fetches per-state JSON, computes real jurisdiction breakdown | FLOWING |
| `taxCalculator.ts` | `stateData` (StateTaxData) | `loadStateData()` -> fetch from public/tax-data/ | Yes -- sample data files exist with real rates for 6 states (52 ZIPs) | FLOWING |
| `taxCalculator.ts` | `zipEntry` (ZipEntry) | `lookupZip()` from stateData.zips | Yes -- per-state JSON contains ZIP-keyed rate entries with county/city/special breakdown | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sample data generator runs | `node scripts/generate-sample-data.mjs` | 6 states, 52 ZIPs generated | PASS |
| TypeScript compiles | `npx tsc --noEmit` | No errors | PASS |
| Production build | `npm run build` | Built in 750ms, dist/ produced | PASS |
| Multi-jurisdiction ZIP exists | Check CA.json for ZipEntry[] > 1 | ZIP 90501 has 2 entries (Torrance + unincorporated LA County) | PASS |
| No-tax state data correct | Check OR.json | hasSalesTax=false, stateRate=0, prepared_food=exempt | PASS |
| Manifest reflects data | Check manifest.json (after generation) | stateCount=6, totalZipCodes=52 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CALC-01 | 02-02, 02-03 | User can enter a ZIP code and get the full combined tax rate | SATISFIED | Buyer ZIP input in CalculatorPage, zipToState + lookupZip returns combined rate |
| CALC-02 | 02-02, 02-03 | Tax rate displayed as breakdown: state, county, city, special district | SATISFIED | JurisdictionBreakdown table in CalculatorPage with 4 jurisdiction levels |
| CALC-03 | 02-02, 02-03 | User can enter purchase amount and get exact tax with per-jurisdiction breakdown | SATISFIED | Amount input, calculateFullTax computes per-jurisdiction amounts with Math.round |
| CALC-04 | 02-02, 02-03 | Calculator handles origin vs destination taxation (11 origin-based states) | SATISFIED | ORIGIN_STATES set (11 states), resolveTaxJurisdiction logic, sourcing badge in UI |
| CALC-05 | 02-02, 02-03 | User can enter both seller and buyer addresses | SATISFIED | Two ZIP inputs (buyer required, seller optional), both feed into calculateFullTax |
| CALC-06 | 02-01, 02-02 | Per-state JSON files lazy-loaded on demand | SATISFIED | rateLookup.ts uses fetch() with Promise cache, not bundled at build time |
| TAXB-01 | 02-02 | Calculator applies grocery exemptions | SATISFIED | applyProductTaxability reads stateData.taxability.groceries, CA sample shows exempt |
| TAXB-02 | 02-02 | Calculator applies clothing exemptions | SATISFIED | NY sample has threshold-based reduced clothing rule, PA has exempt |
| TAXB-03 | 02-02 | Calculator applies medicine exemptions | SATISFIED | applyProductTaxability handles medicine category from StateTaxData |
| TAXB-04 | 02-01, 02-03 | Calculator handles prepared food category | SATISFIED | prepared_food in taxability.json with 4 state overrides, category option in UI dropdown |
| TAXB-05 | 02-01 | Product taxability rules are data-driven | SATISFIED | Rules read from StateTaxData.taxability (sourced from taxability.json via pipeline), no hardcoded per-state logic |

No orphaned requirements found. All 11 requirements mapped to Phase 2 in REQUIREMENTS.md are covered by plans and verified in code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected |

No TODO/FIXME/PLACEHOLDER comments found. No empty implementations. No hardcoded empty data. No stub handlers. All files are substantive implementations.

### Human Verification Required

### 1. End-to-end calculator with sample data

**Test:** Run `npm run dev`, visit /us-tax/calculator, enter buyer ZIP "90210", amount "100", category "General", click Calculate
**Expected:** CA combined rate ~9.5% displayed with state/county/city breakdown, total ~$109.50
**Why human:** Requires running dev server, browser rendering, and async fetch from static files

### 2. No-tax state behavior

**Test:** Enter buyer ZIP "97201" (OR), amount "100"
**Expected:** 0% combined rate, note "Oregon does not impose a sales tax"
**Why human:** Runtime behavior with no-tax state data and UI rendering

### 3. Origin-based intrastate calculation

**Test:** Enter buyer ZIP "90210" (CA), seller ZIP "94102" (CA SF)
**Expected:** Purple "Origin-based" badge, seller's SF rates used
**Why human:** Sourcing logic and badge rendering require visual verification

### 4. Interstate (destination-based) calculation

**Test:** Enter buyer ZIP "10001" (NY), seller ZIP "90210" (CA)
**Expected:** Blue "Destination-based" badge, NY buyer rates used
**Why human:** Cross-state sourcing requires runtime verification

### 5. Product taxability (groceries exempt)

**Test:** Enter buyer ZIP "90210" (CA), category "Groceries", amount "100"
**Expected:** Exempt -- $0 tax, note about grocery exemption
**Why human:** Taxability adjustment on exempt category requires UI verification

### 6. Dark mode and responsive layout

**Test:** Toggle dark mode; resize to mobile width
**Expected:** All elements styled correctly in dark mode; form and results stack vertically on mobile
**Why human:** Visual/layout verification only possible in browser

### Gaps Summary

No automated verification gaps found. All 11 requirements are satisfied at the code level. All artifacts exist, are substantive (not stubs), are properly wired, and data flows from taxability.json through the build pipeline into per-state JSON, through the calculator engine, and into the UI.

The only outstanding items are human verification of runtime behavior (async fetch, browser rendering, visual styling). The code structure, types, wiring, and data flow are all verified correct.

Note: `public/tax-data/` is gitignored, so per-state JSON files must be generated with `npm run generate:sample-data` before running the dev server. The generator was tested and produces correct output for 6 states with 52 ZIP codes.

---

_Verified: 2026-03-24T20:01:05Z_
_Verifier: Claude (gsd-verifier)_
