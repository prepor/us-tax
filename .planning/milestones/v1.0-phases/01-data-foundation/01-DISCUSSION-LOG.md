# Phase 1: Data Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 01-data-foundation
**Areas discussed:** Data source strategy, Single truth design, Freshness display

---

## Data Source Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual download + commit | Download CSV files manually, commit them to repo. Simple, no API keys, fully reproducible builds. | ✓ |
| Automated fetch in CI | GitHub Actions downloads fresh CSVs each build. Always current, but depends on Avalara URL stability. | |
| Both (Recommended) | Commit a baseline CSV to repo, CI fetches fresh data monthly. Falls back to committed data if fetch fails. | |

**User's choice:** Manual download + commit
**Notes:** User prefers simplicity for initial data acquisition. GitHub Actions monthly refresh (DATA-04 requirement) handles ongoing updates separately.

---

## Single Source of Truth Design

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline generates all | Build pipeline produces a single JSON with rates AND taxability rules. taxRules.ts reads from JSON, no hardcoded constants. | ✓ |
| Markdown is master | Keep markdown as source, enhance build-data.mjs to extract all rules including exemptions. taxRules.ts becomes a thin calculation layer. | |
| Avalara CSV is master | Avalara CSV becomes the sole rate source. Markdown files become display-only guides generated from the same data. | |

**User's choice:** Pipeline generates all
**Notes:** This eliminates the dual source of truth architecturally — taxRules.ts becomes a pure calculation layer reading from pipeline output.

---

## Freshness Display

| Option | Description | Selected |
|--------|-------------|----------|
| Global footer badge | Single 'Rates as of March 2026' in the site footer — visible everywhere, not intrusive | ✓ |
| Per-page header | Each page showing rates gets its own freshness date in the header area | |
| Both + build metadata | Footer badge globally + inline date on calculator/state pages. Build embeds date as metadata in JSON files. | |

**User's choice:** Global footer badge
**Notes:** Minimal, non-intrusive approach. Single location for freshness info.

---

## Claude's Discretion

- CSV parsing library choice
- JSON schema design for per-state files
- Validation threshold values
- File naming conventions
- No-sales-tax state handling in pipeline

## Deferred Ideas

None — discussion stayed within phase scope.
