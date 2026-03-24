---
phase: 02-calculation-engine
plan: 02
subsystem: calculation
tags: [zip-lookup, tax-calculation, origin-destination, jurisdiction-breakdown, lazy-loading]

requires:
  - phase: 01-data-foundation
    provides: "StateTaxData, ZipEntry, TaxabilityRule types and per-state JSON pipeline"
provides:
  - "zipToState() and isValidZip() for ZIP-to-state resolution"
  - "loadStateData() with Promise cache for lazy per-state JSON loading"
  - "lookupZip() and hasMultipleJurisdictions() for ZIP rate lookup"
  - "calculateFullTax() async calculator with origin/destination and per-jurisdiction breakdown"
  - "ORIGIN_STATES set (11 states) for sourcing rule determination"
  - "Shared types: TaxBreakdownResult, JurisdictionBreakdown, ProductCategory, StateTaxData, etc."
affects: [02-03-PLAN, 03-state-guides]

tech-stack:
  added: []
  patterns: ["Promise-cache for deduplicating concurrent fetches", "ZIP prefix table for instant state lookup", "data-driven taxability from StateTaxData"]

key-files:
  created:
    - src/lib/zipUtils.ts
    - src/lib/rateLookup.ts
    - src/lib/taxCalculator.ts
    - src/data/types.ts
  modified: []

key-decisions:
  - "Created src/data/types.ts with shared types since parallel Plan 02-01 had not committed yet"
  - "Used linear scan over ZIP prefix array (~60 entries) rather than binary search -- sufficient for instant lookup"
  - "Proportional adjustment factor for reduced-rate categories applied to all jurisdiction levels (v1 simplification)"
  - "totalTax computed from combined rate, not sum of jurisdiction amounts, per floating-point safety requirement"

patterns-established:
  - "Promise-cache pattern: store Promise (not value) in Map to prevent duplicate concurrent fetches"
  - "Data-driven taxability: applyProductTaxability reads from StateTaxData.taxability, no hardcoded rules"
  - "Graceful fallback: unknown ZIPs get synthetic state-rate-only entry instead of error"

requirements-completed: [CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, TAXB-01, TAXB-02, TAXB-03]

duration: 3min
completed: 2026-03-24
---

# Phase 2 Plan 2: Core Engine Modules Summary

**ZIP-to-state resolver, lazy-loading rate lookup with Promise cache, and full tax calculator with origin/destination sourcing and per-jurisdiction breakdown**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T19:47:11Z
- **Completed:** 2026-03-24T19:50:09Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- ZIP prefix table covering all 50 states + DC + PR with isValidZip/zipToState exports
- Promise-based cache in rateLookup preventing duplicate fetches for concurrent state data requests
- Full calculateFullTax() engine handling origin vs destination (11 origin states), product taxability, per-jurisdiction breakdown, no-tax states, and unknown ZIP fallback
- Shared type definitions (TaxBreakdownResult, JurisdictionBreakdown, ProductCategory, StateTaxData, ZipEntry, TaxabilityRule)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create zipUtils.ts and rateLookup.ts** - `fe861ee` (feat)
2. **Task 2: Create taxCalculator.ts** - `9638cdc` (feat)

## Files Created/Modified
- `src/data/types.ts` - Shared type definitions for the calculation engine (StateTaxData, ZipEntry, TaxBreakdownResult, etc.)
- `src/lib/zipUtils.ts` - ZIP validation and ZIP-to-state mapping via 3-digit prefix table
- `src/lib/rateLookup.ts` - Lazy-loading per-state JSON with Promise cache, ZIP lookup, multi-jurisdiction detection
- `src/lib/taxCalculator.ts` - Origin/destination resolution, product taxability application, per-jurisdiction tax breakdown

## Decisions Made
- **Created types.ts alongside engine modules:** Plan 02-01 runs in parallel and was expected to create types.ts. Since it hadn't committed yet, this plan created the file with all necessary types to unblock compilation. The parallel agent's version may need merging.
- **Linear scan for ZIP prefix lookup:** The prefix array has ~60 entries making linear scan effectively instant. Binary search would add complexity for no measurable gain.
- **Proportional rate adjustment for reduced categories:** When a product category has a reduced effective rate, all jurisdiction amounts are proportionally reduced (v1 simplification -- real-world treatment varies by state).
- **Combined rate for total tax:** Per pitfall 3 in research, totalTax is computed from the stored combined rate, not as the sum of per-jurisdiction amounts, to avoid floating-point rounding discrepancies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created src/data/types.ts to unblock TypeScript compilation**
- **Found during:** Task 1 (zipUtils.ts and rateLookup.ts creation)
- **Issue:** Plan 02-01 (running in parallel) was expected to create src/data/types.ts with shared types. The file did not exist yet in this worktree.
- **Fix:** Created types.ts with all types referenced by the plan's interface section (StateTaxData, ZipEntry, TaxabilityRule, ProductCategory, JurisdictionBreakdown, TaxBreakdownResult)
- **Files modified:** src/data/types.ts (created)
- **Verification:** npx tsc --noEmit passes
- **Committed in:** fe861ee (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock compilation in parallel worktree. Types match the plan's interface specification exactly. No scope creep.

## Issues Encountered
None -- both tasks executed cleanly with TypeScript compiling on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three engine modules ready for UI integration in Plan 02-03 (CalculatorPage rewrite)
- Types may need reconciliation with Plan 02-01's version of types.ts after merge
- Per-state JSON data files must exist in public/tax-data/ for the calculator to function at runtime (pipeline from Phase 1)

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (fe861ee, 9638cdc) found in git log. SUMMARY.md exists.

---
*Phase: 02-calculation-engine*
*Completed: 2026-03-24*
