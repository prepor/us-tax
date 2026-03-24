# Phase 3: State Guides & Comparison - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Auto mode (recommended defaults selected)

<domain>
## Phase Boundary

Enrich existing 51 state guide pages with local tax rate tables and origin/destination classification. Add a ZIP code comparison tool for side-by-side rate comparison. All existing state page URLs must remain functional.

</domain>

<decisions>
## Implementation Decisions

### Local Rate Tables on State Pages
- **D-01:** Each state guide page shows a table of top counties/cities with their tax rates, sorted by combined rate (descending). Show up to 10 entries.
- **D-02:** Data comes from the per-state JSON files (public/tax-data/) via lazy loading (same rateLookup.ts from Phase 2). Extract unique county/city names and rates from ZIP entries.
- **D-03:** Table columns: Jurisdiction Name, Type (County/City), Local Rate, Combined Rate. Simple, scannable.
- **D-04:** If per-state JSON is not available (no Avalara data yet), show a graceful fallback message rather than an error. State-level data from states.json remains visible.

### Origin vs Destination Badge
- **D-05:** Display a colored badge on each state page near the state rate header showing "Origin-Based" or "Destination-Based". Same visual style as the calculator badges from Phase 2.
- **D-06:** Use the same ORIGIN_STATES constant from taxCalculator.ts (or a shared location). Purple badge for origin, blue for destination.
- **D-07:** Include a brief one-line explanation: "Tax is calculated based on the seller's location" or "Tax is calculated based on the buyer's location."

### ZIP Comparison Tool
- **D-08:** New page/route at /compare (or section on calculator page). Two-column layout with a ZIP input in each column.
- **D-09:** Shared inputs at top: purchase amount and product category (same dropdown as calculator).
- **D-10:** Each column shows: full jurisdiction breakdown, combined rate, tax amount — identical to the calculator's breakdown display.
- **D-11:** Differences highlighted: if rates differ, show the delta (e.g., "+1.25% higher"). Color-code which is cheaper.
- **D-12:** Reuse calculateFullTax() from Phase 2 for both columns. Two calls, one per ZIP.

### Preserving Existing Pages
- **D-13:** All 51 state pages at /state/:abbr must remain functional. Enhancements are additive — new sections below existing content.
- **D-14:** Navigation must still work. Add "Compare" to the nav alongside existing Home/States/Calculator links.

### Claude's Discretion
- Exact placement of local rate table on state page (below exemptions section recommended)
- Whether to show rate table in a collapsible accordion or always visible
- Comparison page responsive layout on mobile (stacked vs side-by-side)
- How to handle comparison when one ZIP is in a no-tax state
- Loading states for the comparison tool

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### State guide pages
- `src/pages/StatePage.tsx` — Current state detail page (to be enhanced)
- `src/pages/HomePage.tsx` — State grid page (nav reference)

### Calculation engine (from Phase 2)
- `src/lib/taxCalculator.ts` — calculateFullTax() for comparison tool
- `src/lib/rateLookup.ts` — loadStateData() for lazy loading per-state JSON
- `src/lib/zipUtils.ts` — isValidZip() for ZIP validation
- `src/data/types.ts` — TaxBreakdownResult, StateTaxData, JurisdictionBreakdown

### Layout and navigation
- `src/components/Layout.tsx` — Navigation header and footer
- `src/main.tsx` — Route definitions (need to add /compare route)

### Formatting
- `src/lib/formatters.ts` — formatCurrency(), formatPercent()

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/taxCalculator.ts` — calculateFullTax() returns TaxBreakdownResult, reuse directly for comparison
- `src/lib/rateLookup.ts` — loadStateData() with Promise cache, already handles lazy loading
- `src/pages/CalculatorPage.tsx` — Breakdown table component pattern to replicate for comparison
- `src/lib/formatters.ts` — formatCurrency(), formatPercent()

### Established Patterns
- State pages use React Router params: useParams<{ abbr: string }>()
- Dark mode via dark: Tailwind variants throughout
- Per-state data loaded via fetch from public/tax-data/
- Existing state pages show sections: Overview, Exemptions, Filing Info, Resources

### Integration Points
- `src/pages/StatePage.tsx` — Add new sections for local rates and origin/dest badge
- `src/main.tsx` — Add /compare route
- `src/components/Layout.tsx` — Add Compare nav link

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-state-guides-comparison*
*Context gathered: 2026-03-24 via auto mode*
