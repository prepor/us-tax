# US Sales Tax Calculator

## What This Is

A comprehensive US sales tax calculator and reference guide that handles all ~13,000 tax jurisdictions — state, county, city, and district level. Built as a client-side SPA with a static bundled tax rate dataset. Demonstrates that AI-built tools can handle real-world tax complexity, not just state-level demos.

## Core Value

Given any US address and purchase amount, return the exact tax breakdown across all applicable jurisdictions (state, county, city, special district) — accurate enough to use for real e-commerce.

## Requirements

### Validated

- ✓ Per-state tax guide with rates, rules, and exemption details — existing
- ✓ State-level sales tax rates for all 50 states + DC — existing
- ✓ Interactive tax calculator with demo cart — existing
- ✓ Responsive SPA deployed to GitHub Pages — existing
- ✓ Build-time data pipeline (markdown → JSON) — existing

### Active

- [ ] Full jurisdiction coverage — all ~13,000 US tax jurisdictions (state/county/city/district) via static dataset
- ✓ Address-to-jurisdiction lookup — ZIP code to exact tax rate mapping — Phase 2
- ✓ Tax rate breakdown — state, county, city, and district rates separately — Phase 2
- ✓ Origin vs destination taxation — seller/buyer location based — Phase 2
- ✓ Product taxability — groceries, clothing, medicine, prepared food exemptions — Phase 2
- ✓ Combined rate calculator — amount + addresses + category → full breakdown — Phase 2
- ✓ Fix 5 data inconsistencies — AL, AR, KS, MS, ID — Phase 1
- ✓ Avalara CSV build pipeline with per-state JSON output — Phase 1
- ✓ Eliminate dual source of truth (data-driven taxRules.ts) — Phase 1
- ✓ Floating-point rounding fix — Phase 1
- ✓ "Rates as of" freshness badge — Phase 1
- ✓ State guide pages enriched with local rate tables + origin/dest badges — Phase 3
- ✓ Side-by-side ZIP comparison tool at /compare — Phase 3

### Out of Scope

- Real-time API integration (Avalara, TaxJar) — goal is self-contained static dataset
- Server-side computation — must remain a client-side SPA on GitHub Pages
- Tax filing or reporting — this is a calculator/reference, not an accounting tool
- International taxes (VAT, GST) — US sales tax only
- Marketplace facilitator rules — complex legal territory, not a tax tool

## Context

- Existing React 19 + TypeScript + Vite + Tailwind SPA
- Deployed to GitHub Pages at prepor.github.io/us-tax/
- Current data pipeline: 51 state markdown files → build script → states.json
- Codebase map available at .planning/codebase/ (7 documents)
- Origin: built to prove a point in a chat debate about whether AI can handle US tax complexity
- The challenge: Evgenios pointed out 13,000 jurisdictions and local taxes aren't covered — time to prove him wrong
- Static dataset approach means data needs periodic refresh — could set up an agent cron job for updates

## Constraints

- **Hosting**: GitHub Pages — no server, no database, everything client-side
- **Data**: Static bundled dataset — must be comprehensive but small enough for browser
- **Accuracy**: Tax rates must be verifiable against official state/county sources
- **Performance**: Must handle ZIP code lookup instantly in browser despite large dataset
- **Stack**: Keep existing React/TypeScript/Vite/Tailwind stack

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static dataset over API | Self-contained, no API keys, works offline, proves the point | — Pending |
| ZIP code as primary lookup key | Most practical for address-based lookup without full geocoding | — Pending |
| Client-side only | GitHub Pages constraint, keeps it simple and free | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after Phase 3 completion (all phases complete)*
