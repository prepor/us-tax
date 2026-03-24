# Phase 1: Data Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 5 known data inconsistencies, eliminate the dual source of truth between markdown files and taxRules.ts, build a pipeline that ingests Avalara CSV rate tables and produces per-state JSON files with state/county/city/district breakdowns, add build-time validation, and display a "Rates as of" freshness indicator. GitHub Actions monthly auto-refresh of data.

</domain>

<decisions>
## Implementation Decisions

### Data Source Strategy
- **D-01:** Avalara CSV files are downloaded manually and committed to the repository. No automated CI fetch for initial data acquisition.
- **D-02:** GitHub Actions cron job (DATA-04) handles monthly refresh — downloads fresh CSVs, rebuilds, and deploys automatically. The committed CSV serves as fallback if fetch fails.

### Single Source of Truth
- **D-03:** The build pipeline produces a single comprehensive JSON output containing rates AND taxability rules for all jurisdictions. taxRules.ts becomes a thin calculation layer that reads from the generated JSON — no more hardcoded rate constants.
- **D-04:** The existing markdown files (state-taxes/*.md) remain as human-readable reference content for state guide pages, but they are NOT the source of truth for rates. Avalara CSV is the authoritative rate source.
- **D-05:** The 5 known data inconsistencies (AL, AR, KS, MS, ID) must be fixed as part of the pipeline migration — when taxRules.ts reads from the pipeline output, these conflicts disappear by design.

### Data Pipeline Architecture
- **D-06:** Build pipeline flow: Avalara CSV → parse/normalize → per-state JSON files in public/tax-data/ (lazy-loaded at runtime) + a manifest JSON with metadata (date, state list, combined rates summary)
- **D-07:** Per-state JSON files contain: state rate, county rates (with names), city rates (with names), special district rates, combined rates per ZIP code
- **D-08:** Build-time validation must catch: missing states, rate anomalies (negative, >15%), duplicate ZIPs, and schema violations. Pipeline fails loudly on bad data.

### Freshness Display
- **D-09:** Single global footer badge showing "Rates as of [month year]" — visible on all pages, not intrusive. Date extracted from Avalara CSV metadata or build timestamp.

### Rounding Fix
- **D-10:** Tax calculations must use correct rounding — either integer cents arithmetic or explicit per-line rounding to 2 decimal places. No floating-point artifacts in any displayed result.

### Type Consolidation
- **D-11:** Create a single shared StateEntry/TaxData type definition (e.g., src/data/types.ts) imported everywhere. Eliminate the 3 duplicated interface definitions.

### Claude's Discretion
- Exact CSV parsing library choice (or raw Node.js parsing)
- JSON schema design for per-state files
- Validation threshold values for anomaly detection
- File naming convention for per-state JSON files
- How to handle states with no sales tax in the pipeline output

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current data pipeline
- `scripts/build-data.mjs` — Current build script that parses markdown → states.json
- `src/lib/taxRules.ts` — Current tax calculation engine with hardcoded rules (to be refactored)
- `src/data/products.ts` — Product type definitions used by calculator

### Data inconsistencies
- `.planning/codebase/CONCERNS.md` — Detailed documentation of 5 rate inconsistencies and tech debt

### Research findings
- `.planning/research/STACK.md` — Avalara CSV format, data sources, delivery strategy
- `.planning/research/ARCHITECTURE.md` — Pipeline design, per-state chunking, lazy loading architecture
- `.planning/research/PITFALLS.md` — Data staleness risks, ZIP boundary issues, rounding pitfalls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/build-data.mjs` — Existing build pipeline for markdown parsing. Structure can be extended for CSV ingestion.
- `src/lib/taxRules.ts` — Calculation logic to refactor. The calculateTax function's interface can remain stable while internals change.
- `src/lib/formatters.ts` — Currency and percentage formatting utilities.

### Established Patterns
- Build-time data pipeline: markdown files → Node.js script → JSON → Vite bundles
- Per-state data already exists as `states.json` (single file). Phase 1 splits this into per-state chunks.
- Package.json has `build:data` and `prebuild` scripts already wired up.

### Integration Points
- `src/components/Layout.tsx` — Footer component where freshness badge will be added
- `src/pages/CalculatorPage.tsx` — Consumes taxRules.ts; will need to work with refactored version
- `src/pages/StatePage.tsx` — Consumes states.json; will need to handle new data structure
- `vite.config.ts` — May need adjustments for public/ directory assets if per-state JSON goes there

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the data pipeline implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-03-24*
