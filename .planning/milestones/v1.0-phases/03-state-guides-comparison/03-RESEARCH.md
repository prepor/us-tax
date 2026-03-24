# Phase 3: State Guides & Comparison - Research

**Researched:** 2026-03-24
**Domain:** React SPA enhancement -- new page sections, new route, data extraction from per-state JSON
**Confidence:** HIGH

## Summary

Phase 3 enhances the existing 51 state guide pages with two new features (local rate tables, origin/destination badge) and adds a new `/compare` route with side-by-side ZIP code tax comparison. All work builds on existing infrastructure from Phases 1 and 2 -- no new dependencies are needed.

The core technical challenge is extracting unique jurisdictions from the `zips` map in per-state JSON files to build the "Top 10 counties/cities" rate table. The `zips` field is a `Record<string, ZipEntry[]>` where each `ZipEntry` has a `region` string (e.g., "LOS ANGELES COUNTY", "HOUSTON") and rate breakdowns. Multiple ZIPs map to the same region, so deduplication by region name is required.

The comparison tool is a straightforward composition: two parallel `calculateFullTax()` calls with shared inputs (amount, category) and independent ZIP inputs, then a diff overlay on the results.

**Primary recommendation:** Keep all changes within existing file patterns -- enhance `StatePage.tsx` with new sections, create a single new `ComparePage.tsx`, update `App.tsx` routes and `Layout.tsx` navigation. No new libraries, no new data fetching patterns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Each state guide page shows a table of top counties/cities with their tax rates, sorted by combined rate (descending). Show up to 10 entries.
- D-02: Data comes from the per-state JSON files (public/tax-data/) via lazy loading (same rateLookup.ts from Phase 2). Extract unique county/city names and rates from ZIP entries.
- D-03: Table columns: Jurisdiction Name, Type (County/City), Local Rate, Combined Rate. Simple, scannable.
- D-04: If per-state JSON is not available (no Avalara data yet), show a graceful fallback message rather than an error. State-level data from states.json remains visible.
- D-05: Display a colored badge on each state page near the state rate header showing "Origin-Based" or "Destination-Based". Same visual style as the calculator badges from Phase 2.
- D-06: Use the same ORIGIN_STATES constant from taxCalculator.ts (or a shared location). Purple badge for origin, blue for destination.
- D-07: Include a brief one-line explanation: "Tax is calculated based on the seller's location" or "Tax is calculated based on the buyer's location."
- D-08: New page/route at /compare (or section on calculator page). Two-column layout with a ZIP input in each column.
- D-09: Shared inputs at top: purchase amount and product category (same dropdown as calculator).
- D-10: Each column shows: full jurisdiction breakdown, combined rate, tax amount -- identical to the calculator's breakdown display.
- D-11: Differences highlighted: if rates differ, show the delta (e.g., "+1.25% higher"). Color-code which is cheaper.
- D-12: Reuse calculateFullTax() from Phase 2 for both columns. Two calls, one per ZIP.
- D-13: All 51 state pages at /state/:abbr must remain functional. Enhancements are additive -- new sections below existing content.
- D-14: Navigation must still work. Add "Compare" to the nav alongside existing Home/States/Calculator links.

### Claude's Discretion
- Exact placement of local rate table on state page (below exemptions section recommended)
- Whether to show rate table in a collapsible accordion or always visible
- Comparison page responsive layout on mobile (stacked vs side-by-side)
- How to handle comparison when one ZIP is in a no-tax state
- Loading states for the comparison tool

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GUID-01 | Existing 51 state guide pages remain functional and accessible | D-13 locks additive-only changes to StatePage.tsx; existing sections untouched |
| GUID-02 | State guide pages show local tax rate tables (top counties/cities in that state) | D-01 through D-04: extract from per-state JSON zips, deduplicate by region, sort by combined rate, show top 10 |
| GUID-03 | State guide pages display origin vs destination classification | D-05 through D-07: badge component using ORIGIN_STATES from taxCalculator.ts |
| GUID-04 | Side-by-side ZIP code comparison tool -- compare tax rates for two ZIP codes | D-08 through D-12: new ComparePage with two calculateFullTax() calls, shared inputs, delta display |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.2.4 | UI components | Already in project |
| react-router-dom | ^7.13.1 | /compare route | Already in project |
| tailwindcss | ^4.2.1 | Styling | Already in project |

### Supporting
No new dependencies required. All functionality builds on existing project code:
- `calculateFullTax()` from `src/lib/taxCalculator.ts`
- `loadStateData()` from `src/lib/rateLookup.ts`
- `ORIGIN_STATES` from `src/lib/taxCalculator.ts`
- `formatCurrency()`, `formatPercent()` from `src/lib/formatters.ts`
- `isValidZip()` from `src/lib/zipUtils.ts`

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Client-side dedup/sort | Pre-computed top jurisdictions in build pipeline | Over-engineering for 10 items; client-side is fine for the small dataset per state |

## Architecture Patterns

### Project Structure (changes only)
```
src/
├── pages/
│   ├── StatePage.tsx      # MODIFY: add local rate table + origin/dest badge sections
│   └── ComparePage.tsx    # NEW: side-by-side ZIP comparison
├── App.tsx                # MODIFY: add /compare route
├── components/
│   └── Layout.tsx         # MODIFY: add Compare nav link
└── lib/
    └── taxCalculator.ts   # READ-ONLY: import ORIGIN_STATES
```

### Pattern 1: Extracting Top Jurisdictions from Per-State JSON
**What:** The `StateTaxData.zips` field is `Record<string, ZipEntry[]>` -- potentially hundreds of ZIPs all mapped to regions like "LOS ANGELES COUNTY" or "HOUSTON". To build the "top 10" table, we need to deduplicate by region name and pick the highest combined rate for each unique region.
**When to use:** StatePage local rate table section.
**Example:**
```typescript
// Extract unique jurisdictions from per-state ZIP data
function extractTopJurisdictions(
  stateData: StateTaxData,
  limit: number = 10,
): { name: string; localRate: number; combinedRate: number }[] {
  const seen = new Map<string, { localRate: number; combinedRate: number }>();

  for (const entries of Object.values(stateData.zips)) {
    for (const entry of entries) {
      const existing = seen.get(entry.region);
      // Keep the highest combined rate for duplicate region names
      if (!existing || entry.combined > existing.combinedRate) {
        const localRate = entry.county + entry.city + entry.special;
        seen.set(entry.region, { localRate, combinedRate: entry.combined });
      }
    }
  }

  return Array.from(seen.entries())
    .map(([name, rates]) => ({ name, ...rates }))
    .sort((a, b) => b.combinedRate - a.combinedRate)
    .slice(0, limit);
}
```

### Pattern 2: Determining Jurisdiction Type from Region Name
**What:** The `region` field in ZipEntry is a free-text string like "LOS ANGELES COUNTY", "HOUSTON", "UNINCORPORATED LA COUNTY". There is no explicit type field. Heuristic: if the region name contains "COUNTY" or "UNINCORPORATED", label it as County; otherwise label it as City.
**When to use:** D-03 requires a "Type (County/City)" column.
**Example:**
```typescript
function jurisdictionType(regionName: string): "County" | "City" {
  const upper = regionName.toUpperCase();
  if (upper.includes("COUNTY") || upper.includes("UNINCORPORATED")) {
    return "County";
  }
  return "City";
}
```

### Pattern 3: Origin/Destination Badge (reuse calculator pattern)
**What:** The calculator already shows a purple/blue badge for origin vs destination sourcing. The same visual pattern should appear on state pages.
**When to use:** StatePage header area.
**Example:**
```typescript
import { ORIGIN_STATES } from "../lib/taxCalculator";

const isOrigin = ORIGIN_STATES.has(state.abbreviation);
// Purple for origin, blue for destination (same as CalculatorPage line 189-193)
```

### Pattern 4: Async Data Loading in StatePage
**What:** StatePage currently uses only synchronous `states.json` data. The local rate table requires loading the per-state JSON asynchronously via `loadStateData()`. Use `useState` + `useEffect` pattern (no Suspense complexity).
**When to use:** StatePage new local rate table section.
**Example:**
```typescript
const [stateData, setStateData] = useState<StateTaxData | null>(null);
const [loadError, setLoadError] = useState(false);

useEffect(() => {
  if (!state) return;
  loadStateData(state.abbreviation)
    .then(setStateData)
    .catch(() => setLoadError(true));
}, [state?.abbreviation]);
```

### Pattern 5: Comparison Tool with Parallel Calculations
**What:** ComparePage runs two independent `calculateFullTax()` calls. Both share the same amount and category but have different ZIP codes. Results are displayed side by side with delta highlighting.
**When to use:** ComparePage.
**Example:**
```typescript
const [leftResult, setLeftResult] = useState<TaxBreakdownResult | null>(null);
const [rightResult, setRightResult] = useState<TaxBreakdownResult | null>(null);

async function handleCompare() {
  const [left, right] = await Promise.all([
    calculateFullTax({ buyerZip: leftZip, amount: parsedAmount, category }),
    calculateFullTax({ buyerZip: rightZip, amount: parsedAmount, category }),
  ]);
  setLeftResult(left);
  setRightResult(right);
}
```

### Discretion Recommendations

**Rate table placement:** Always visible below the existing Tax Rates section and above Economic Nexus. Collapsible accordions add interaction cost for a 10-row table -- not worth it. If the data is loading, show a spinner; if unavailable, show a note.

**Comparison responsive layout:** Stack vertically on mobile (`grid-cols-1 lg:grid-cols-2`). Side-by-side only on `lg` breakpoint and above. The shared inputs (amount, category) always span full width at the top.

**No-tax state in comparison:** When one ZIP resolves to a no-tax state (OR, NH, MT, DE, AK), still show the result normally -- `calculateFullTax()` already handles this by returning `combinedRate: 0` and a note. The delta display would show the full difference (e.g., "+8.25% higher" for the taxed side). Color-code the no-tax side green.

**Loading states:** Show a shared loading spinner/message while both calculations run. Disable the "Compare" button during loading. If one fails, show error for that column only; the other column can still display results.

### Anti-Patterns to Avoid
- **Modifying existing StatePage sections:** D-13 requires all existing content to remain. Only add new sections below or near existing ones.
- **Loading all 51 state JSONs at once:** Only load the JSON for the state being viewed. The `loadStateData()` cache handles repeat visits.
- **Building a shared "breakdown display" component prematurely:** The calculator and comparison pages have slightly different layouts. Extract a shared component only if duplication is genuinely painful, not preemptively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tax calculation | Custom rate math | `calculateFullTax()` | Already handles origin/dest, taxability, rounding |
| ZIP validation | Custom regex | `isValidZip()` | Already exists |
| State data loading | Custom fetch | `loadStateData()` | Promise cache prevents duplicate fetches |
| Currency/percent formatting | Inline toFixed | `formatCurrency()`, `formatPercent()` | Consistent formatting across app |
| ZIP-to-state mapping | API call | `zipToState()` | Client-side, instant |

## Common Pitfalls

### Pitfall 1: Per-State JSON Not Available for All States
**What goes wrong:** Only 6 sample per-state JSON files exist (CA, FL, NY, OR, PA, TX). The remaining 45 states will 404 on `loadStateData()`.
**Why it happens:** The full Avalara data pipeline may not have been run, or only sample data was generated.
**How to avoid:** D-04 explicitly requires graceful fallback. Catch the `loadStateData()` error and show "Local rate data not yet available for this state" instead of crashing. The rest of the state page (from `states.json`) must still render.
**Warning signs:** Console errors on state pages for missing states.

### Pitfall 2: Duplicate Region Names with Different Rates
**What goes wrong:** The same region name can appear across multiple ZIPs with slightly different rates (e.g., different special district rates within "LOS ANGELES COUNTY").
**Why it happens:** ZIP boundaries don't align perfectly with jurisdiction boundaries.
**How to avoid:** When deduplicating, use the highest combined rate (or average -- highest is simpler and more useful as a "worst case" reference). Document this choice in the table with a footnote like "Showing highest combined rate per jurisdiction."
**Warning signs:** Table shows same jurisdiction name twice.

### Pitfall 3: Region Names Are ALL CAPS
**What goes wrong:** Displaying "LOS ANGELES COUNTY" in the table looks jarring.
**Why it happens:** The source data from Avalara CSV uses uppercase region names.
**How to avoid:** Apply title-case formatting when displaying: "Los Angeles County", "Houston", etc.
**Warning signs:** Ugly all-caps text in the rate table.

### Pitfall 4: No-Tax States Show Empty Rate Table
**What goes wrong:** States like OR, NH, MT, DE, AK have `hasSalesTax: false` and empty `zips: {}`. Showing an empty table or "No data" is confusing.
**Why it happens:** These states genuinely have no sales tax.
**How to avoid:** Check `stateData.hasSalesTax` before rendering the local rate table section. For no-tax states, skip the table entirely (or show "No sales tax in this state").
**Warning signs:** Empty table on OR/NH/MT/DE/AK state pages.

### Pitfall 5: Comparison Tool with Same ZIP in Both Columns
**What goes wrong:** User enters the same ZIP in both columns. Delta shows 0% everywhere, which is technically correct but useless.
**How to avoid:** Not a bug, but consider a subtle hint like "Both ZIPs show the same rates" when the combined rates are identical. Don't block the comparison.
**Warning signs:** User confusion when no differences are shown.

### Pitfall 6: StatePage Badge for Non-Sales-Tax States
**What goes wrong:** Origin/destination classification doesn't apply to states with no sales tax.
**Why it happens:** ORIGIN_STATES only contains sales-tax states. No-tax states are "destination-based" by default, but the concept is irrelevant.
**How to avoid:** Only show the origin/destination badge when `state.hasSalesTax` is true.
**Warning signs:** "Destination-Based" badge on Oregon or Montana state page.

## Code Examples

### Title-Case Formatting for Region Names
```typescript
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
// "LOS ANGELES COUNTY" -> "Los Angeles County"
```

### Comparison Delta Display
```typescript
function formatDelta(leftRate: number, rightRate: number): string {
  const diff = rightRate - leftRate;
  if (diff === 0) return "Same rate";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${(diff * 100).toFixed(2)}%`;
}
```

### Adding Route to App.tsx
```typescript
// In App.tsx, add import and route:
import ComparePage from "./pages/ComparePage";

// Inside <Route element={<Layout />}>:
<Route path="/compare" element={<ComparePage />} />
```

### Adding Nav Link to Layout.tsx
```typescript
// In Layout.tsx nav array, add:
{ to: "/compare", label: "Compare" },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global state for shared data | Local useState + useEffect per component | Established pattern in project | No Redux/Zustand needed; keeps things simple |
| React Router v6 | React Router v7 | v7 in project | Route definitions use same `<Route>` JSX pattern |

## Project Constraints (from CLAUDE.md)
- No "Generated with Claude Code" or co-authored annotations in commit/PR messages
- No "files affected" or "test plan" sections in commit/PR messages
- GitHub username: prepor

## Open Questions

1. **How many jurisdictions will real Avalara data produce per state?**
   - What we know: Sample data has 7-10 ZIPs per state. Real data will have hundreds to thousands of ZIPs.
   - What's unclear: Whether deduplication by region name will yield 10+ unique jurisdictions for all states, or if some states have fewer than 10.
   - Recommendation: Show however many unique jurisdictions exist (up to 10). If fewer than 10, just show what's available. This is a non-issue.

2. **Should the local rate table load on initial page render or on user interaction?**
   - What we know: `loadStateData()` fetches ~8KB gzipped per state. The Promise cache means subsequent loads are instant.
   - What's unclear: Whether the extra network request on state page load is noticeable.
   - Recommendation: Load on mount (useEffect). The data is small and cached. Adding a "Show rates" button adds unnecessary friction.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed in canonical references
- `public/tax-data/CA.json`, `TX.json`, `OR.json` -- actual data structure verified
- `src/lib/taxCalculator.ts` -- ORIGIN_STATES constant and calculateFullTax() API verified
- `src/lib/rateLookup.ts` -- loadStateData() caching behavior verified
- `src/data/types.ts` -- StateTaxData, ZipEntry, TaxBreakdownResult interfaces verified

### Secondary (MEDIUM confidence)
- Region name format inference from 6 sample JSON files (uppercase convention may vary with full Avalara data)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing code verified
- Architecture: HIGH - patterns derived directly from existing codebase inspection
- Pitfalls: HIGH - identified from actual data inspection (empty zips, uppercase names, missing JSON files)
- Data extraction logic: MEDIUM - deduplication approach tested against sample data only; real Avalara data may have edge cases

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable -- no external dependencies changing)
