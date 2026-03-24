# Requirements: US Sales Tax Calculator

**Defined:** 2026-03-24
**Core Value:** Given any US address and purchase amount, return the exact tax breakdown across all applicable jurisdictions

## v1 Requirements

Requirements for full jurisdiction coverage release. Each maps to roadmap phases.

### Foundation

- [x] **FNDX-01**: Fix 5 data inconsistencies between state markdown files and taxRules.ts (AL, AR, KS, MS, ID)
- [ ] **FNDX-02**: Fix floating-point rounding — use integer cents or per-line rounding for tax calculations
- [x] **FNDX-03**: Eliminate dual source of truth — single authoritative data source feeds both guide pages and calculator
- [ ] **FNDX-04**: Display "Rates as of [date]" freshness indicator on all pages showing tax rates

### Data Pipeline

- [x] **DATA-01**: Build-time pipeline ingests Avalara free CSV rate tables covering all 50 states + DC
- [x] **DATA-02**: Pipeline normalizes CSV data into per-state JSON files with state/county/city/district rate breakdown
- [x] **DATA-03**: Pipeline validates ingested rates against known reference values during build
- [ ] **DATA-04**: GitHub Actions cron job refreshes tax rate data monthly and rebuilds/deploys automatically

### Tax Calculation

- [ ] **CALC-01**: User can enter a ZIP code and get the full combined tax rate for that location
- [ ] **CALC-02**: Tax rate displayed as breakdown: state rate, county rate, city rate, special district rate
- [ ] **CALC-03**: User can enter a purchase amount and get exact tax calculation with per-jurisdiction breakdown
- [ ] **CALC-04**: Calculator handles origin vs destination taxation — 11 origin-based states use seller location, 39 destination-based use buyer location
- [ ] **CALC-05**: User can enter both seller address (origin) and buyer address (destination) for accurate cross-state calculation
- [ ] **CALC-06**: Per-state JSON files are lazy-loaded on demand (not bundled in initial page load)

### Product Taxability

- [ ] **TAXB-01**: Calculator applies grocery exemptions — tax-free or reduced rate in applicable states
- [ ] **TAXB-02**: Calculator applies clothing exemptions — tax-free in NY, PA, NJ, MN, and other applicable states
- [ ] **TAXB-03**: Calculator applies medicine/pharmaceutical exemptions per state rules
- [ ] **TAXB-04**: Calculator handles prepared food category — separate (usually higher) rate where applicable
- [ ] **TAXB-05**: Product taxability rules are data-driven (JSON config, not hardcoded logic) for easy updates

### State Guide

- [ ] **GUID-01**: Existing 51 state guide pages remain functional and accessible
- [ ] **GUID-02**: State guide pages show local tax rate tables (top counties/cities in that state)
- [ ] **GUID-03**: State guide pages display origin vs destination classification
- [ ] **GUID-04**: Side-by-side ZIP code comparison tool — compare tax rates for two ZIP codes

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Accuracy

- **EACC-01**: Ingest SST boundary/rate files for 24 member states (higher accuracy than ZIP-level)
- **EACC-02**: Handle multi-jurisdiction ZIPs — show all possible rates when a ZIP spans boundaries
- **EACC-03**: California hybrid origin rules — origin for state/county/city, destination for district

### Additional Features

- **FEAT-01**: Tax holiday dates and calendar for each state
- **FEAT-02**: API endpoint for programmatic tax lookups (would require server)
- **FEAT-03**: Embeddable widget for e-commerce sites

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time API integration (Avalara/TaxJar) | Goal is self-contained static dataset |
| Server-side computation | Must remain client-side SPA on GitHub Pages |
| Tax filing or reporting | Calculator/reference only, not accounting tool |
| International taxes (VAT, GST) | US sales tax only |
| Marketplace facilitator rules | Complex legal territory beyond scope |
| Full address geocoding | Requires API services, violates static constraint |
| 600+ SSUTA TIC product codes | 4 categories + general covers 95% of cases |
| Digital goods / SaaS taxability | Rules vary wildly per state, not worth complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDX-01 | Phase 1 | Complete |
| FNDX-02 | Phase 1 | Pending |
| FNDX-03 | Phase 1 | Complete |
| FNDX-04 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Pending |
| CALC-01 | Phase 2 | Pending |
| CALC-02 | Phase 2 | Pending |
| CALC-03 | Phase 2 | Pending |
| CALC-04 | Phase 2 | Pending |
| CALC-05 | Phase 2 | Pending |
| CALC-06 | Phase 2 | Pending |
| TAXB-01 | Phase 2 | Pending |
| TAXB-02 | Phase 2 | Pending |
| TAXB-03 | Phase 2 | Pending |
| TAXB-04 | Phase 2 | Pending |
| TAXB-05 | Phase 2 | Pending |
| GUID-01 | Phase 3 | Pending |
| GUID-02 | Phase 3 | Pending |
| GUID-03 | Phase 3 | Pending |
| GUID-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation*
