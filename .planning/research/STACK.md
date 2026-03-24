# Technology Stack: Local Tax Jurisdiction Data Layer

**Project:** US Sales Tax Calculator -- Full Jurisdiction Coverage
**Researched:** 2026-03-24
**Scope:** Data sources, formats, and tooling for adding ~13,000 local tax jurisdictions to an existing React/TypeScript/Vite SPA on GitHub Pages

## Recommended Stack

### Primary Data Source: Avalara Free Tax Rate Tables

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Avalara Tax Rate CSV | Monthly updates | ZIP-to-rate mapping with jurisdiction breakdown | Free, covers all 50 states + DC, updated monthly, provides state/county/city/special district rate breakdown per ZIP code. No API key needed for the CSV download. |

**Confidence:** HIGH -- verified through multiple sources including Avalara developer docs and community usage.

**How it works:** Register email at https://www.avalara.com/taxrates/en/download-tax-tables.html, receive CSV files per state. Each file contains:

| Column | Description |
|--------|-------------|
| State | Two-letter state abbreviation |
| ZipCode | 5-digit ZIP code |
| TaxRegionName | Human-readable jurisdiction name (e.g., "SEATTLE") |
| EstimatedCombinedRate | Total sales tax rate (state + county + city + special) |
| StateRate | State-level rate component |
| EstimatedCountyRate | County-level rate component |
| EstimatedCityRate | City-level rate component |
| SpecialRate | Special taxing district rate component (transit, etc.) |
| RiskLevel | Avalara's confidence indicator for the rate |

**Key limitation:** One ZIP code can span multiple tax jurisdictions. Avalara picks the "best" rate per ZIP but warns this is an estimate. For ~77% of ZIP codes this is accurate. For the remaining ~23% that cross jurisdiction boundaries, the rate shown may not match the exact address. This is an acceptable tradeoff for a static client-side tool -- even commercial products like WooCommerce use ZIP-level data.

### Supplementary Data Source: SST Rate & Boundary Files

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Streamlined Sales Tax Rate/Boundary Files | Quarterly updates | Higher-accuracy ZIP+4 to jurisdiction mapping for 24 member states | Free, government-mandated, includes ZIP+4 precision for finer granularity than 5-digit ZIP |

**Confidence:** HIGH -- official government data, verified at https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files

**Coverage:** 24 full member states + 1 associate (Tennessee): Arkansas, Georgia, Indiana, Iowa, Kansas, Kentucky, Michigan, Minnesota, Nebraska, Nevada, New Jersey, North Carolina, North Dakota, Ohio, Oklahoma, Rhode Island, South Dakota, Utah, Vermont, Washington, West Virginia, Wisconsin, Wyoming.

**Structure:** Two CSV files per state:
- **Boundary file**: Maps ZIP codes (5-digit and 9-digit) to jurisdiction FIPS codes and tax code identifiers
- **Rate file**: Maps tax codes to actual tax rates with effective dates

**When to use:** Phase 2+ enhancement. Start with Avalara 5-digit ZIP data for all states, then layer SST boundary files on top for member states to improve accuracy. The SST data is more complex to parse (no headers, FIPS-code-based, 20+ special district fields) but provides the highest accuracy available without geocoding.

### Supplementary Data Source: State Department of Revenue Downloads

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| State-specific DOR databases | Varies (quarterly) | Fill gaps for non-SST states with complex local taxes | States like Washington, Colorado, and Louisiana provide their own downloadable rate databases. Washington's is notably comprehensive with ZIP+4 data. |

**Confidence:** MEDIUM -- verified for Washington state (https://dor.wa.gov/taxes-rates/sales-use-tax-rates/downloadable-database). Other states vary in availability and format.

**Priority states for direct DOR data:**
- Washington (already an SST member, but provides excellent ZIP+4 data directly)
- Colorado (home-rule state, highly complex, not an SST member)
- Louisiana (highest combined rates, complex parish system)
- Alabama (self-administered localities)
- Illinois (home-rule complexity)

### Product Taxability Data Source

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Hand-curated state exemption table | Static, updatable | Grocery/clothing/medicine exemptions by state | No free machine-readable source exists. The SST Taxability Matrix covers only 24 states and is web-based (not downloadable CSV). Must be compiled from state DOR sites. |

**Confidence:** HIGH that this approach is correct; MEDIUM on the specific data (must be manually verified).

The existing `states.json` already contains exemption fields (`groceries`, `clothing`, `prescriptionDrugs`) for all states. These should be extended with more granular categories and verified against current state law. Key categories:

| Category | Typical Tax Treatment | Notable Exceptions |
|----------|----------------------|-------------------|
| Groceries (unprepared food) | Exempt in 37+ states | AL, MS, SD tax at full rate; several states tax at reduced rate |
| Clothing | Taxable in most states | Exempt in MN, NJ, PA, VT; capped exemption in MA ($175), NY ($110), RI ($250) |
| Prescription drugs | Exempt in 49 states | IL taxes at reduced 1% rate |
| OTC medicine | Taxable in most states | Exempt in CT, FL, and a few others |
| Prepared food | Taxable in nearly all states | Rates sometimes differ from general rate |

### Origin vs. Destination Taxation Data

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Static lookup table in code | N/A | Determine which tax rate to apply based on seller/buyer locations | 11 origin-based states vs 39 destination-based states. Small enough to hardcode. |

**Confidence:** HIGH -- verified via TaxJar (https://www.taxjar.com/sales-tax/origin-based-and-destination-based-sales-tax).

**Origin-based states (11):** AZ, CA*, IL, MS, MO, OH, PA, TN, TX, UT, VA
(*CA is "modified origin" -- state/county/city are origin-based but district taxes are destination-based)

**Destination-based states (39):** All remaining states with sales tax.

This is a simple TypeScript enum/map, not a data source issue.

## Data Format & Delivery Strategy

### Build-Time Pipeline (Recommended)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js build script | Existing (ESM) | Transform CSV source data into optimized JSON at build time | Extends the existing `scripts/build-data.mjs` pattern. CSV parsing is trivial in Node. No new runtime dependencies. |
| Per-state JSON chunks | N/A | Split data into 51 files (50 states + DC) loaded on demand | Avoids loading all ~41,000 ZIP code records upfront. User only needs data for 1-2 states at a time. |
| Vite dynamic imports | Existing (6.4.1) | Lazy-load state data chunks via `import()` | Vite automatically code-splits dynamic imports into separate chunks. Built-in, zero config. |

**Confidence:** HIGH -- this is standard Vite usage, verified via Vite docs.

### Data Size Estimates

**Raw data (all states, CSV):**
- ~41,000 unique 5-digit ZIP codes in the US
- Avalara CSVs contain multiple rows per ZIP (one per tax region), roughly 100,000-120,000 total rows across all states
- Raw CSV: ~8-12 MB estimated

**Optimized JSON (build output):**
- Strip redundant fields (State column, RiskLevel), compact field names
- Per-state chunks: largest states (CA, TX, NY) will have ~2,000-4,000 ZIP entries each
- Estimated per-state JSON: 20-150 KB depending on state complexity
- Total across all states: ~2-4 MB uncompressed JSON

**After Brotli/gzip compression (served by GitHub Pages):**
- GitHub Pages serves with gzip automatically
- JSON compresses extremely well (70%+ reduction) due to repetitive structure
- Per-state chunk delivered to browser: ~5-40 KB compressed
- Acceptable for on-demand loading. No user downloads more than 1-2 states.

### Data Schema (Build Output)

```typescript
// Per-state file: src/data/jurisdictions/CA.json
interface StateJurisdictionData {
  state: string;           // "CA"
  updated: string;         // "2026-03-01" (from Avalara CSV date)
  defaultRate: number;     // state-level rate
  originBased: boolean;    // true for origin states
  zips: Record<string, ZipTaxEntry[]>;  // keyed by 5-digit ZIP
}

interface ZipTaxEntry {
  region: string;          // "LOS ANGELES" (TaxRegionName)
  combined: number;        // 0.095 (EstimatedCombinedRate)
  county: number;          // 0.0025
  city: number;            // 0.0
  special: number;         // 0.025
}
```

**Why this schema:**
- Keyed by ZIP for O(1) lookup -- the primary use case
- Multiple entries per ZIP when a ZIP spans jurisdictions (user can pick or we show highest/average)
- Numeric rates (not strings) for direct calculation
- Region name for display in the UI breakdown

### Alternative Data Format: NOT Recommended

| Format | Why Not |
|--------|---------|
| MessagePack/binary | Negligible size improvement over gzipped JSON. Adds parsing dependency. JSON.parse is already the fastest deserialization in browsers. |
| SQLite in browser (sql.js) | 500KB+ WASM overhead for sql.js. Overkill for simple key-value lookup by ZIP. |
| IndexedDB cache | Good for caching fetched data, but unnecessary for initial implementation. Add later if needed for offline support. |
| Single monolithic JSON | Would force loading all 2-4 MB upfront. Per-state splitting is strictly better. |
| CSV in browser | Requires a CSV parser at runtime. JSON is native to JavaScript. Transform at build time instead. |

## Supporting Libraries

### Build-Time Dependencies (Dev Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | -- | CSV parsing | Node.js can parse simple CSV with `String.split()`. Avalara CSVs are simple enough to not need a library. If edge cases arise, use `csv-parse` (npm). |

The existing build pipeline (`scripts/build-data.mjs`) already demonstrates the pattern: read source files, parse, transform, write JSON. The same pattern extends to CSV processing with zero new dependencies.

### Runtime Dependencies

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | -- | ZIP code lookup, data loading | Use native `fetch()` + `JSON.parse()` via Vite dynamic imports. The browser provides everything needed. |

**Why no new runtime dependencies:** The entire data layer is:
1. Build script transforms CSV to JSON chunks (Node.js, dev only)
2. Vite bundles JSON chunks as separate assets
3. At runtime: `const data = await import(`./data/jurisdictions/${state}.json`)` -- native dynamic import, zero library overhead
4. Lookup: `data.zips[zipCode]` -- plain object property access

### Optional Future Enhancement

| Library | Purpose | When |
|---------|---------|------|
| `DecompressionStream` (browser native) | Client-side decompression if serving pre-compressed chunks | Only if GitHub Pages gzip isn't sufficient. Available in all modern browsers (2023 Baseline). No library needed -- it's a browser API. |
| `fflate` (npm) | Lightweight gzip/brotli if DecompressionStream browser support is insufficient | Only if targeting older browsers. 8KB minified. |

## Build Pipeline Design

```
Source Data (CSV)                    Build Step                      Runtime
-------------------                  ----------                      -------
Avalara CSVs (per state)    -->    build-tax-data.mjs    -->    src/data/jurisdictions/*.json
  downloaded monthly                 (Node.js script)              (51 files, lazy-loaded)
  stored in data/raw/

State exemption data        -->    Already in states.json  -->    Enriched states.json
  (manual curation)                  (existing pipeline)           (existing, extended)

Origin/destination map      -->    Hardcoded in TypeScript -->    taxRules.ts
  (11 origin states)                 (existing pattern)            (existing, extended)
```

### Build Script: `scripts/build-tax-data.mjs`

New script (parallel to existing `build-data.mjs`) that:
1. Reads all CSV files from `data/raw/avalara/*.csv`
2. Parses each state's ZIP-to-rate data
3. Writes per-state JSON to `src/data/jurisdictions/{STATE}.json`
4. Generates a manifest file `src/data/jurisdictions/index.json` with metadata (update date, state list, record counts)
5. Validates data integrity (no missing states, rate ranges sensible)

### Data Refresh Strategy

| Cadence | Action | How |
|---------|--------|-----|
| Monthly | Re-download Avalara CSVs | Manual or automated script. Avalara emails monthly when rates change. |
| Quarterly | Check SST boundary files for member states | Manual. Updates published quarterly. |
| On demand | Re-run build script, commit updated JSON | `npm run build:tax-data` |
| Future | GitHub Actions cron job | Automate CSV download + build + PR creation. Low priority. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Primary data | Avalara CSV (free) | SalesTaxHandbook CSV | Paid ($100+/yr). Avalara free tier provides same ZIP-level granularity. |
| Primary data | Avalara CSV (free) | Avalara API (free tier) | Requires authentication, rate-limited (5 req/min free), CORS issues for client-side, may no longer be available. CSV download is simpler and fully offline. |
| Primary data | Avalara CSV (free) | TaxJar/TaxCloud API | Requires API keys, paid plans, server-side only. Violates the static/self-contained constraint. |
| Primary data | Avalara CSV (free) | Scraping state DOR sites | Fragile, 50 different formats, legally questionable, maintenance nightmare. |
| Data format | Per-state JSON via dynamic import | Single SQLite WASM DB | 500KB+ overhead, complex querying not needed, simple key-value lookup suffices. |
| Data format | Per-state JSON via dynamic import | LocalStorage/IndexedDB | Good for caching, but initial data still needs to come from somewhere. Use as cache layer later if needed. |
| Delivery | Vite code-split JSON chunks | CDN-hosted separate data files | Unnecessary complexity. Vite handles chunking natively. GitHub Pages serves static assets fine. |
| ZIP mapping | 5-digit ZIP lookup | Full address geocoding | Requires geocoding API (Google, Mapbox), not static/offline, costs money. ZIP is "good enough" for 77%+ of cases. |

## Installation

```bash
# No new npm dependencies needed for Phase 1

# Data acquisition (manual, one-time setup + monthly refresh):
# 1. Register at https://www.avalara.com/taxrates/en/download-tax-tables.html
# 2. Download CSVs for all states
# 3. Place in data/raw/avalara/
# 4. Run: npm run build:tax-data

# Add build script to package.json:
# "build:tax-data": "node scripts/build-tax-data.mjs"
# Update "build" to include: "build:tax-data && build:data && tsc -b && vite build"
```

## Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Avalara discontinues free CSV download | Medium | SST files provide backup for 24 states. State DOR sites provide backup for key states. Data format is stable -- could switch sources without changing runtime code. |
| ZIP-level accuracy insufficient for some users | Low | Clearly communicate that rates are estimates for addresses near jurisdiction boundaries. Link to official state lookup tools. Phase 2 could add SST ZIP+4 data for higher accuracy. |
| Monthly data refresh becomes stale | Low | Tax rates change quarterly at most (many annually). Even slightly stale data is more useful than no local tax data. |
| Avalara CSVs have multiple rows per ZIP | None (expected) | Build script handles this by storing array of entries per ZIP. UI shows all options or uses heuristics (population-weighted, most common, etc.) |

## Sources

- [Avalara Free Tax Rate Tables Download](https://www.avalara.com/taxrates/en/download-tax-tables.html) -- verified accessible 2026-03-24
- [Streamlined Sales Tax Rate & Boundary Files](https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files) -- verified accessible 2026-03-24
- [SST Member States (24 full + 1 associate)](https://www.streamlinedsalestax.org/Shared-Pages/faqs/faqs---about-streamlined) -- verified 2026-03-24
- [SST Taxability Matrix](https://www.streamlinedsalestax.org/Shared-Pages/State-taxability-matrix) -- web-based, per-state product taxability data
- [Washington State DOR Downloadable Database](https://dor.wa.gov/taxes-rates/sales-use-tax-rates/downloadable-database) -- verified accessible, quarterly updates through Q2 2026
- [TaxJar Origin vs Destination Guide](https://www.taxjar.com/sales-tax/origin-based-and-destination-based-sales-tax) -- complete state-by-state classification
- [Avalara: ZIP Codes Are the Wrong Tool](https://www.avalara.com/us/en/learn/whitepapers/zip-codes-the-wrong-tool-for-the-job.html) -- explains 23% of ZIPs cross jurisdiction boundaries
- [TaxConnex: States with Most Local Jurisdictions](https://www.taxconnex.com/blog-/states-with-most-local-jurisdictions) -- TX, IA, MO each have 1,000+ local jurisdictions
- [Tax Foundation: 2026 State & Local Sales Tax Rates](https://taxfoundation.org/data/all/state/sales-tax-rates/) -- state-level combined rate reference data
- [USPS ZIP Code Count](https://facts.usps.com/42000-zip-codes/) -- ~41,557 ZIP codes in the US
- [MDN: DecompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream) -- native browser gzip, 2023 Baseline
- [Vite Dynamic Imports / Code Splitting](https://vite.dev/guide/features) -- `import.meta.glob` for lazy loading

---

*Stack research: 2026-03-24*
