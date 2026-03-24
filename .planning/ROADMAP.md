# Roadmap: US Sales Tax Calculator

## Overview

Expand the existing state-level sales tax SPA to cover all ~13,000 US tax jurisdictions. Three phases: first fix existing data debt and build the jurisdiction data pipeline, then implement the full calculation engine with ZIP lookup and product taxability, then enrich state guide pages and add comparison tools. Each phase delivers a coherent, independently verifiable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Data Foundation** - Fix data debt, build jurisdiction data pipeline, produce per-state rate files
- [ ] **Phase 2: Calculation Engine** - ZIP lookup, tax breakdown, origin/destination, product taxability
- [ ] **Phase 3: State Guides & Comparison** - Enrich state pages with local rates, add ZIP comparison tool

## Phase Details

### Phase 1: Data Foundation
**Goal**: Clean, accurate jurisdiction-level tax rate data is available as static per-state JSON files, built from a reliable pipeline with validated output
**Depends on**: Nothing (first phase)
**Requirements**: FNDX-01, FNDX-02, FNDX-03, FNDX-04, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. The 5 known data inconsistencies (AL, AR, KS, MS, ID) are resolved -- markdown and calculator show identical rates
  2. Tax calculations use correct rounding (no floating-point artifacts visible in any result)
  3. A single build command produces per-state JSON files with state/county/city/district rate breakdowns from Avalara CSV source data
  4. Build-time validation catches rate anomalies and the pipeline fails loudly on bad data
  5. Every page displaying tax rates shows a "Rates as of [date]" freshness indicator
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Shared types, corrected taxability data, and Avalara CSV build pipeline
- [ ] 01-02-PLAN.md — Refactor taxRules.ts (data-driven + rounding fix), consolidate page types, freshness badge
- [ ] 01-03-PLAN.md — GitHub Actions monthly tax data refresh workflow

### Phase 2: Calculation Engine
**Goal**: Users can enter a ZIP code and purchase details, and get an exact tax calculation with full jurisdiction breakdown, product taxability, and origin/destination awareness
**Depends on**: Phase 1
**Requirements**: CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, TAXB-01, TAXB-02, TAXB-03, TAXB-04, TAXB-05
**Success Criteria** (what must be TRUE):
  1. User can enter a ZIP code and instantly see the combined tax rate with state, county, city, and district rates shown separately
  2. User can enter a purchase amount with product category and get exact tax with per-jurisdiction breakdown
  3. User can specify seller and buyer locations, and the calculator correctly applies origin-based or destination-based rules per state
  4. Grocery, clothing, medicine, and prepared food categories apply correct exemptions or reduced rates per jurisdiction
  5. Per-state rate data loads on demand (not bundled in initial page load) with no perceptible delay
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: State Guides & Comparison
**Goal**: State guide pages show local jurisdiction details and users can compare tax rates across locations
**Depends on**: Phase 2
**Requirements**: GUID-01, GUID-02, GUID-03, GUID-04
**Success Criteria** (what must be TRUE):
  1. All 51 existing state guide pages remain functional and accessible at their current URLs
  2. State guide pages display local tax rate tables showing top counties and cities with their rates
  3. State guide pages show whether the state uses origin-based or destination-based taxation
  4. User can compare tax rates for two ZIP codes side-by-side
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/3 | Not started | - |
| 2. Calculation Engine | 0/3 | Not started | - |
| 3. State Guides & Comparison | 0/2 | Not started | - |
