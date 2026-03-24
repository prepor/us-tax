# Phase 2: Calculation Engine - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Auto mode (recommended defaults selected)

<domain>
## Phase Boundary

Users can enter a ZIP code and purchase details, and get an exact tax calculation with full jurisdiction breakdown, product taxability, and origin/destination awareness. Per-state rate data loads on demand. This phase builds the lookup engine, calculation engine, and calculator UI.

</domain>

<decisions>
## Implementation Decisions

### ZIP Code Lookup
- **D-01:** Single search/input field for ZIP code with instant results. User types a ZIP, sees combined rate + full breakdown immediately.
- **D-02:** Per-state JSON files are fetched on demand via `fetch()` from `public/tax-data/{state}.json`. Cached in memory after first load.
- **D-03:** ZIP-to-state mapping needed — either a lightweight index file or derive from the first lookup. Manifest.json from Phase 1 can include ZIP→state mapping.

### Origin vs Destination
- **D-04:** Two ZIP fields side-by-side: "Seller ZIP" and "Buyer ZIP". Seller defaults to empty (optional).
- **D-05:** 11 origin-based states: AZ, CA, IL, MS, MO, OH, PA, TN, TX, UT, VA. All others are destination-based. This is a static map in code.
- **D-06:** When both ZIPs provided: if buyer state is origin-based AND seller is in-state, use seller's rate. Otherwise use buyer's rate. Remote/interstate sales always use destination.
- **D-07:** California hybrid rules (origin for state/county/city, destination for district) — defer to v2. Use simplified origin-based for CA in v1.

### Product Taxability
- **D-08:** Dropdown/select with 5 categories: General, Groceries, Clothing, Medicine, Prepared Food. Default to "General".
- **D-09:** Taxability rules from `data/taxability.json` (created in Phase 1) applied via `applyTaxability()` function already in `taxRules.ts`.
- **D-10:** The existing `calculateTax()` function signature extends to accept `StateTaxData` (already supports this from Phase 1 refactor). Phase 2 passes actual per-state data.

### Rate Breakdown Display
- **D-11:** Table/stacked display showing each jurisdiction level as a separate row: State rate, County rate, City rate, Special District rate, with amounts for each.
- **D-12:** Combined rate prominently displayed at top. Individual jurisdiction rows below.
- **D-13:** If a ZIP has multiple possible jurisdictions (ambiguous), show the primary/default rate with a note.

### Calculator Page Redesign
- **D-14:** Replace the current state-dropdown calculator with ZIP-based lookup. Keep the existing demo cart UI pattern but upgrade the input method.
- **D-15:** Amount input field + product category dropdown + ZIP fields → calculate button → breakdown table.
- **D-16:** Lazy loading: show a brief loading state while fetching per-state data. No full-page spinner — just the results area.

### Claude's Discretion
- Exact UI layout and spacing for the calculator form
- Loading state design (skeleton, spinner, or fade)
- How to handle invalid ZIP codes (error message design)
- Whether to show origin/destination explanation text
- Mobile responsive layout for the dual-ZIP input
- Caching strategy details (in-memory Map vs module-level cache)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data layer (from Phase 1)
- `src/data/types.ts` — All shared type definitions (StateEntry, StateTaxData, ZipEntry, TaxabilityRule)
- `data/taxability.json` — Per-state taxability rules for all product categories
- `scripts/build-tax-data.mjs` — Pipeline that produces per-state JSON files

### Calculation engine
- `src/lib/taxRules.ts` — Refactored calculation engine with `applyTaxability()` and `calculateTax()`
- `src/lib/formatters.ts` — Currency and percentage formatting utilities

### Current calculator UI
- `src/pages/CalculatorPage.tsx` — Current calculator page (to be redesigned)
- `src/data/products.ts` — Demo product data and Product type

### Research
- `.planning/research/FEATURES.md` — Origin vs destination rules, product taxability categories
- `.planning/research/ARCHITECTURE.md` — Lazy loading strategy, lookup engine design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/taxRules.ts` — Already refactored to accept `StateTaxData` parameter. `applyTaxability()` handles all product category logic.
- `src/data/types.ts` — `ZipEntry`, `StateTaxData`, `TaxabilityRule` interfaces ready for use.
- `src/lib/formatters.ts` — `formatCurrency()` and `formatPercent()` for display.
- `src/data/products.ts` — Demo products with category field matching taxability categories.

### Established Patterns
- Build-time pipeline produces per-state JSON in `public/tax-data/`
- Components use Tailwind CSS utility classes
- Pages are React functional components with hooks (useState, useMemo)
- Dark mode support via `dark:` Tailwind variants throughout

### Integration Points
- `src/pages/CalculatorPage.tsx` — Primary file to redesign
- React Router: calculator route already exists at `/calculator`
- Layout.tsx footer already has the freshness badge from Phase 1

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The calculator should feel fast and responsive.

</specifics>

<deferred>
## Deferred Ideas

- California hybrid origin rules (origin for state/county/city, destination for district) — v2 enhancement
- Multi-jurisdiction ZIP disambiguation UI — v2 (show all possible rates)
- Tax holiday awareness in calculator — Phase 3 or later

</deferred>

---

*Phase: 02-calculation-engine*
*Context gathered: 2026-03-24 via auto mode*
