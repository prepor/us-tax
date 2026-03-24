# US Sales Tax Calculator

## What This Is

A comprehensive US sales tax calculator and reference guide that handles all ~13,000 tax jurisdictions — state, county, city, and district level. Features ZIP-based lookup with full jurisdiction breakdown, origin/destination taxation, product taxability (groceries, clothing, medicine, prepared food), side-by-side comparison tool, and enriched state guide pages. Built as a client-side SPA deployed to GitHub Pages.

## Core Value

Given any US address and purchase amount, return the exact tax breakdown across all applicable jurisdictions (state, county, city, special district) — accurate enough to use for real e-commerce.

## Requirements

### Validated

- ✓ Per-state tax guide with rates, rules, and exemption details — existing
- ✓ State-level sales tax rates for all 50 states + DC — existing
- ✓ Responsive SPA deployed to GitHub Pages — existing
- ✓ Fix 5 data inconsistencies (AL, AR, KS, MS, ID) — v1.0
- ✓ Avalara CSV build pipeline with per-state JSON output — v1.0
- ✓ Eliminate dual source of truth (data-driven taxRules.ts) — v1.0
- ✓ Floating-point rounding fix — v1.0
- ✓ "Rates as of" freshness badge — v1.0
- ✓ ZIP code to jurisdiction tax rate lookup — v1.0
- ✓ Tax rate breakdown (state/county/city/district) — v1.0
- ✓ Origin vs destination taxation — v1.0
- ✓ Product taxability (groceries, clothing, medicine, prepared food) — v1.0
- ✓ Combined rate calculator with full breakdown — v1.0
- ✓ State guide pages with local rate tables + origin/dest badges — v1.0
- ✓ Side-by-side ZIP comparison tool — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Real-time API integration (Avalara, TaxJar) — goal is self-contained static dataset
- Server-side computation — must remain a client-side SPA on GitHub Pages
- Tax filing or reporting — this is a calculator/reference, not an accounting tool
- International taxes (VAT, GST) — US sales tax only
- Marketplace facilitator rules — complex legal territory, not a tax tool
- Full address geocoding — ZIP code sufficient for static approach

## Context

Shipped v1.0 with 2,257 LOC TypeScript across 3 phases (7 plans, 15 tasks).
Tech stack: React 19, TypeScript, Vite, Tailwind CSS v4.
Deployed to GitHub Pages at prepor.github.io/us-tax/.
Origin: built to prove AI agents can handle real US tax complexity (13,000 jurisdictions, not just 50 states).
Sample data covers 6 states (CA, NY, TX, FL, OR, PA). Full Avalara CSV data not yet loaded.
E2e tests with Playwright cover all calculator, state page, and comparison features.

## Constraints

- **Hosting**: GitHub Pages — no server, no database, everything client-side
- **Data**: Static bundled dataset — must be comprehensive but small enough for browser
- **Accuracy**: Tax rates must be verifiable against official state/county sources
- **Performance**: Must handle ZIP code lookup instantly in browser despite large dataset
- **Stack**: React 19 / TypeScript / Vite / Tailwind CSS v4

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static dataset over API | Self-contained, no API keys, works offline, proves the point | ✓ Good |
| ZIP code as primary lookup key | Most practical for address-based lookup without full geocoding | ✓ Good |
| Client-side only | GitHub Pages constraint, keeps it simple and free | ✓ Good |
| Per-state JSON lazy loading | Keeps initial bundle small, loads data on demand | ✓ Good |
| Data-driven taxability (JSON not hardcoded) | Eliminates dual source of truth, easy to update | ✓ Good |
| Tailwind v4 @custom-variant for dark mode | v4 changed dark mode mechanism, class-based toggle needs explicit config | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after v1.0 milestone*
