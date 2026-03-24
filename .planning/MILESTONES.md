# Milestones

## v1.0 Full Jurisdiction Coverage (Shipped: 2026-03-24)

**Phases completed:** 3 phases, 7 plans, 15 tasks

**Key accomplishments:**

- Shared TypeScript types for all tax data interfaces, corrected taxability JSON fixing 5 state data inconsistencies, and Avalara CSV-to-JSON build pipeline with validation
- Data-driven taxability engine with applyTaxability() helper, floating-point rounding fix, consolidated type imports, and manifest-based freshness badge
- Prepared food taxability category, TaxBreakdownResult/JurisdictionBreakdown types, and sample data generator for 6 US states
- ZIP-to-state resolver, lazy-loading rate lookup with Promise cache, and full tax calculator with origin/destination sourcing and per-jurisdiction breakdown
- ZIP-based calculator page with buyer/seller inputs, product category selector, and per-jurisdiction tax breakdown table replacing the old state-dropdown demo cart
- Origin/destination sourcing badge and local tax rate table added to all 51 state guide pages via lazy-loaded per-state JSON data
- Side-by-side ZIP code tax comparison page with parallel calculations, jurisdiction breakdowns, and color-coded delta highlighting

---
