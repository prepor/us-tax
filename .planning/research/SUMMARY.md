# Project Research Summary

**Project:** US Sales Tax Calculator -- Full Jurisdiction Coverage
**Domain:** Client-side US sales tax calculator expanding from state-level to ~13,000 local jurisdictions
**Researched:** 2026-03-24
**Confidence:** HIGH

## Executive Summary

This project extends an existing React/TypeScript/Vite static SPA (hosted on GitHub Pages) from state-level sales tax rates to full jurisdiction coverage -- approximately 13,000 local tax jurisdictions encompassing county, city, and special district rates. The established approach for this type of tool is a build-time data pipeline that ingests free government and commercial CSV rate tables, transforms them into compact per-state JSON files, and serves them as static assets loaded on demand. No new runtime dependencies are needed. The existing Vite build pipeline, dynamic imports, and `public/` directory pattern handle everything. The primary data source is Avalara's free monthly CSV rate tables (all 50 states + DC), supplemented by Streamlined Sales Tax boundary files (24 member states) for higher accuracy, and state Department of Revenue downloads for complex states like Colorado and Louisiana.

The recommended approach is a phased build: first fix existing technical debt (floating-point rounding, dual source of truth between markdown and code), then build the data pipeline and lookup engine, then upgrade the calculator UI with ZIP-code input and full jurisdiction breakdowns, and finally enrich the existing state guide pages. The architecture follows a clean separation: data pipeline (build-time Node.js), rate lookup engine (lazy-loading per-state files into in-memory Maps), calculation engine (origin/destination resolution + product taxability), and UI layer. Each layer is independently testable and the data format can evolve without touching the UI.

The key risks are: ZIP-code granularity limitations (a single ZIP can span multiple tax jurisdictions, affecting ~23% of lookups), data staleness in a static dataset (408 rate changes in H1 2025 alone), and the existing dual-source-of-truth problem where tax rules live in both markdown files and hardcoded TypeScript. All are manageable: ZIP ambiguity is handled with disclaimers and multi-rate display, staleness is mitigated with prominent "rates as of" dating and an automated refresh pipeline, and the source-of-truth problem is solved by making the calculation engine fully data-driven before expanding jurisdictions.

## Key Findings

### Recommended Stack

No new runtime dependencies are required. The entire expansion uses the existing Vite/React/TypeScript stack with a new build-time Node.js script that transforms CSV source data into optimized per-state JSON chunks served as static assets. Data flows from CSV sources through `scripts/build-tax-data.mjs` into `public/tax-data/rates-{STATE}.json` files, fetched on demand via native `fetch()` and cached in memory.

**Core technologies:**
- **Avalara Free CSV Rate Tables**: Primary data source for all 50 states + DC -- free, monthly updates, ZIP-level breakdown of state/county/city/special rates
- **SST Boundary/Rate Files**: Supplementary source for 24 member states -- free, government-mandated, quarterly updates, ZIP+4 precision for higher accuracy
- **Per-state JSON via Vite dynamic imports**: Data delivery -- per-state files (~5-50KB gzipped each), lazy-loaded on demand, zero-config code splitting
- **Node.js build script**: Data pipeline -- extends existing `build-data.mjs` pattern, CSV parsing, normalization, validation, no new npm dependencies needed

**Critical version/format details:**
- Parallel-array JSON format (not array-of-objects) for ~60% better gzip compression
- Rates stored as integers (rate * 10000, e.g., 10.25% = 1025) to avoid floating-point issues in data
- Total compressed transfer per state: ~5-40KB. Total across all states: ~400KB. Never loaded all at once.

### Expected Features

**Must have (table stakes):**
- Full jurisdiction coverage (~13,000 jurisdictions) with state/county/city/special district breakdown
- ZIP code rate lookup -- user enters 5-digit ZIP, gets combined rate with full breakdown
- Rate breakdown display showing each jurisdiction layer separately
- Product taxability categories (6 existing: electronics, clothing, groceries, medicine, candy, general)
- Origin vs. destination sourcing awareness (11 origin-based states, 34+DC destination-based)
- Data freshness stamp ("rates as of [date]") on every calculation result
- Fix 5 existing data inconsistencies between markdown and taxRules.ts (AL, AR, KS, MS, ID)

**Should have (differentiators):**
- Fully offline / no-API-dependency (core value prop, already achieved)
- Transparent, inspectable dataset with source attribution
- Enriched state guide pages with local jurisdiction details (county/city rates, special rules)
- Cart calculator with full jurisdiction breakdown per item per product category
- Comparison mode (same cart across different ZIPs)
- Sales tax holiday reference info on state pages

**Defer (v2+):**
- Prepared food category (complex boundary definitions)
- Digital goods/SaaS taxability (50 different state answers)
- Full address geocoding (requires API, violates static constraint)
- Automated monthly data refresh via GitHub Actions
- Embeddable widget
- ZIP+4 support (much larger dataset)

### Architecture Approach

The system adds three layers to the existing app: a build-time data pipeline (multi-source CSV ingestion, normalization, validation, encoding), a runtime rate lookup engine (per-state lazy loading with in-memory Map cache), and a calculation engine (origin/destination resolution + product taxability applied per item). All tax data lives in `public/tax-data/` as static assets fetched on demand -- Vite does not bundle them into JS. Initial overhead is ~3.5KB gzipped (metadata files bundled with app). Per-lookup overhead is ~8KB gzipped (one state file, cached after first load).

**Major components:**
1. **Data Pipeline** (`scripts/build-tax-data.ts`) -- Ingest CSVs from multiple sources (SST, state DOR, Avalara), normalize to common schema, validate, write per-state JSON files + metadata
2. **Rate Lookup Engine** (`src/lib/rateLookup.ts`) -- Lazy-load per-state rate data via fetch(), decode parallel-array JSON, cache in Map for O(1) ZIP lookup
3. **Calculation Engine** (`src/lib/taxCalculator.ts`) -- Resolve origin vs. destination jurisdiction, apply product taxability rules from data (not code), produce full per-item per-jurisdiction breakdown
4. **ZIP Utilities** (`src/lib/zipUtils.ts`) -- ZIP prefix-to-state resolution (~3KB bundled), validation, auto-state detection from ZIP input
5. **UI Components** -- ZipInput (with auto-state detection), TaxBreakdown (jurisdiction-level display), updated CalculatorPage with dual-address support

### Critical Pitfalls

1. **Dual source of truth (data vs. code)** -- The current codebase has tax rules in both markdown/JSON and hardcoded TypeScript with 5 known inconsistencies. This MUST be resolved before expanding to 13,000 jurisdictions. Make the calculation engine fully data-driven; zero hardcoded tax rates in application code.

2. **ZIP code granularity** -- ~23% of 5-digit ZIPs span multiple tax jurisdictions. Use ZIP as primary lookup but show multiple rates for ambiguous ZIPs, default to lowest rate per SST rules, and display confidence indicators. This is a data model decision that cannot be easily changed later.

3. **Data staleness** -- 408 rate changes in H1 2025. Display "rates as of [date]" prominently on every result. Build the pipeline to be re-runnable with a single command. Plan for automated monthly refresh via GitHub Actions.

4. **Floating-point arithmetic** -- `35.00 * 0.01` = `0.35000000000000003` in JavaScript. Round each tax amount to the nearest cent immediately after calculation. This is a one-line fix but must be enforced before multi-jurisdiction calculations where errors compound.

5. **Missing special district taxes** -- 39,000+ special taxing districts exist. Most free datasets miss them. Acknowledge as a known gap in v1, display disclaimers, and prioritize district data for CO, WA, MO, CA, TX in later phases.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 0: Foundation Fixes
**Rationale:** Fix existing technical debt that will compound at jurisdiction scale. The floating-point bug and dual-source-of-truth problem are explicitly called out in PITFALLS.md as "must fix before expansion." These are low-cost, high-impact fixes.
**Delivers:** Correct arithmetic, single source of truth for tax rules, fixed data inconsistencies
**Addresses:** Fix 5 data inconsistencies (FEATURES P1), floating-point rounding (PITFALLS #4), dual source of truth (PITFALLS #7)
**Avoids:** Compounding errors across 13,000 jurisdictions, unmaintainable hardcoded rules at scale

### Phase 1: Data Pipeline
**Rationale:** The jurisdiction rate dataset is the foundation that everything else depends on. ZIP lookup, rate breakdown, calculator upgrade, and state page enrichment all require this data to exist. Architecture research confirms this is the first dependency in the build chain.
**Delivers:** Build script that ingests Avalara CSVs (and optionally SST files) and outputs per-state JSON files in `public/tax-data/`, plus metadata manifests with update dates
**Uses:** Avalara CSV tables (STACK primary source), Node.js build script (STACK pipeline), parallel-array JSON format (ARCHITECTURE encoding)
**Implements:** Data Pipeline component, data validation, freshness stamping
**Avoids:** Data staleness (PITFALLS #3) by embedding effective dates from day one

### Phase 2: Lookup Engine + Calculation Engine
**Rationale:** Once data exists, the runtime engine to load, cache, and query it must be built before the UI can use it. The lookup engine and calculation engine are tightly coupled (calculation needs lookup results) and should be built together. This phase also introduces origin/destination resolution, which PITFALLS #5 says must be designed into the calculation model from the beginning.
**Delivers:** `rateLookup.ts` (lazy-load, decode, cache, O(1) lookup), `taxCalculator.ts` (jurisdiction resolution, taxability application, full breakdown), `zipUtils.ts` (ZIP-to-state, validation)
**Uses:** Per-state JSON files (Phase 1 output), in-memory Map cache (ARCHITECTURE pattern)
**Implements:** Rate Lookup Engine, Calculation Engine, ZIP Utilities
**Avoids:** Origin/destination bolt-on problem (PITFALLS #5), loading all states upfront (ARCHITECTURE anti-pattern)

### Phase 3: Calculator UI Upgrade
**Rationale:** With the engine API stable, the UI can be updated to accept ZIP input (instead of state dropdown), show full jurisdiction breakdowns, and support seller+buyer dual-address input. This is the "wow" feature that demonstrates full jurisdiction coverage.
**Delivers:** ZIP code input component with auto-state detection, jurisdiction breakdown display, updated calculator with product taxability per jurisdiction, data freshness indicator in UI
**Addresses:** ZIP code rate lookup (FEATURES P1), rate breakdown display (FEATURES P1), updated calculator (FEATURES P1), data freshness stamp (FEATURES P1)
**Avoids:** UX pitfalls (PITFALLS UX section) -- always show breakdown, always show effective date, disclaimer near results

### Phase 4: State Guide Enrichment
**Rationale:** With jurisdiction data loaded, the existing 51 state guide pages can be enriched with local tax tables, origin/destination rules, and special notes. This is medium-priority (P2 in FEATURES) but leverages all prior work with relatively low implementation cost.
**Delivers:** Enhanced state pages showing top cities/counties with rates, origin/destination rule explanation, local tax complexity notes, sales tax holiday reference
**Addresses:** Enriched state guide pages (FEATURES P2), origin/destination guidance (FEATURES P2), sales tax holiday reference (FEATURES P2)

### Phase 5: Polish and Comparison
**Rationale:** Comparison mode and multi-ZIP ambiguity handling are low-cost features built on top of the completed engine. They add perceived value with minimal new complexity.
**Delivers:** Side-by-side comparison across ZIPs, multi-rate display for ambiguous ZIPs, disclaimers and confidence indicators
**Addresses:** Comparison mode (FEATURES P2), multi-ZIP awareness (FEATURES P2)

### Phase Ordering Rationale

- **Phase 0 before everything** because existing bugs (floating-point, dual source of truth) will compound at 13,000 jurisdictions and corrupt any new data layer built on top.
- **Phase 1 before Phase 2** because the lookup engine needs data files to exist. The pipeline also validates the data format that the engine will consume.
- **Phase 2 before Phase 3** because the UI needs a stable engine API. Building UI without the engine leads to throwaway work when the API changes.
- **Phase 3 before Phase 4** because the calculator is the core product (P1 features), while state page enrichment is enhancement (P2 features).
- **Phase 4 and 5 are relatively independent** and could be reordered or parallelized.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Data Pipeline):** Complex multi-source CSV parsing with different formats (SST vs. Avalara vs. state DOR). Need to validate actual Avalara CSV format and SST boundary file structure during implementation. Also need to resolve Avalara redistribution terms.
- **Phase 2 (Engines):** California's hybrid origin/destination rules (state+local=origin, district=destination) need careful implementation research. Multi-jurisdiction ZIP handling strategy needs concrete design decisions.

Phases with standard patterns (skip research-phase):
- **Phase 0 (Foundation Fixes):** Well-understood problems with documented solutions. Floating-point fix is a one-liner. Data-driven refactor follows established patterns.
- **Phase 3 (Calculator UI):** Standard React component work. The API from Phase 2 defines the contract; UI is straightforward form + display.
- **Phase 4 (State Guide Enrichment):** Template-driven content enrichment. Existing state page pattern just gets more data.
- **Phase 5 (Polish):** Comparison mode is trivially built on top of the calculator by running it twice.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Avalara CSV verified accessible, SST files are government-mandated, Vite dynamic imports are standard. Zero new runtime dependencies. All sources verified 2026-03-24. |
| Features | HIGH | Well-documented regulatory domain. Competitor analysis clear. Feature priorities align across all research files. MVP definition is crisp. |
| Architecture | HIGH | Build-time pipeline + lazy-loaded static assets is a proven pattern. Per-state splitting, parallel-array JSON, in-memory Map cache are all standard approaches. Performance estimates are grounded in real data sizes. |
| Pitfalls | HIGH | Every pitfall backed by multiple authoritative sources (Avalara whitepapers, TaxJar blog, Vertex industry reports, CereTax analysis). Existing codebase CONCERNS.md already documents several of these issues. |

**Overall confidence:** HIGH

### Gaps to Address

- **Avalara CSV redistribution terms:** Research confirms the data is freely downloadable but redistribution rights are unclear. Need to verify whether bundling processed rate data in an open-source project is permitted, or whether the build pipeline should require users to download their own copy.
- **Multi-jurisdiction ZIP UX:** Research identifies the problem (23% of ZIPs span multiple jurisdictions) and the SST "lowest rate" default, but the exact UX for displaying multiple rates needs design work during Phase 3 planning.
- **Special district coverage depth:** Avalara CSVs include a "SpecialRate" column, but it is unclear how comprehensive this is versus GIS-based district boundaries. Need to validate Avalara's special district coverage against known complex jurisdictions (Denver, Seattle) during Phase 1 implementation.
- **Colorado home-rule cities:** 66+ self-administered cities with independent rules. Research flags this as a known complexity but does not resolve it. Accept as a known limitation with prominent disclaimers, or invest in Colorado-specific data sourcing.
- **Automated refresh pipeline:** Deferred to v2+, but the data pipeline in Phase 1 must be designed for easy re-runs. The gap is in the automation trigger (GitHub Actions cron), not the pipeline itself.

## Sources

### Primary (HIGH confidence)
- [Avalara Free Tax Rate Tables](https://www.avalara.com/taxrates/en/download-tax-tables.html) -- primary data source, verified accessible 2026-03-24
- [SST Rate & Boundary Files](https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files) -- supplementary data for 24 states, government-mandated
- [Tax Foundation 2026 Rates](https://taxfoundation.org/data/all/state/sales-tax-rates/) -- state-level reference data
- [Washington State DOR Database](https://dor.wa.gov/taxes-rates/sales-use-tax-rates/downloadable-database) -- verified quarterly updates
- [Alabama DoR Tax Rates CSV](https://www.revenue.alabama.gov/sales-use/local-cities-and-counties-tax-rates-text-file/) -- state-published rate file
- [Avalara: ZIP Codes Are The Wrong Tool](https://www.avalara.com/us/en/learn/whitepapers/zip-codes-the-wrong-tool-for-the-job.html) -- ZIP granularity limitations
- [Vertex: Record Year for Rate Changes](https://www.vertexinc.com/resources/resource-library/record-year-us-sales-tax-rate-changes) -- 408 changes in H1 2025

### Secondary (MEDIUM confidence)
- [TaxJar: Origin vs Destination Guide](https://www.taxjar.com/sales-tax/origin-based-and-destination-based-sales-tax) -- origin/destination state classification
- [CereTax: Special Tax Jurisdictions](https://www.ceretax.com/blog/special-tax-jurisdictions) -- 39,000+ special districts
- [Stripe: Colorado Home Rule Cities](https://stripe.com/resources/more/colorados-home-rule-cities) -- 66 self-administered cities
- [Zamp: Sales Tax on Groceries/Clothing by State](https://zamp.com/resources/sales-tax-on-groceries/) -- product taxability reference

### Tertiary (LOW confidence)
- [SalesTaxHandbook: Downloadable Data](https://www.salestaxhandbook.com/data) -- alternative paid data source, not verified for current pricing

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
