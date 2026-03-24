# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Client-side Single Page Application (SPA) with a build-time data pipeline

**Key Characteristics:**
- Static SPA deployed to GitHub Pages (no server-side rendering, no backend)
- Build-time data transformation: markdown files are parsed into structured JSON before the app builds
- All tax logic runs client-side with zero API calls at runtime
- Three-page app with shared layout wrapper via React Router nested routes

## Component Diagram

```
                        BUILD TIME
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   state-taxes/*.md   ───►  build-data.mjs    │
  │   (51 markdown files)      (Node.js script)  │
  │                                │              │
  │                                ▼              │
  │                         src/data/states.json  │
  │                         (generated, gitignored)│
  └──────────────────────────────────────────────┘

                        RUNTIME (browser)
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   index.html ──► main.tsx ──► BrowserRouter   │
  │                                    │          │
  │                              ┌─────┴─────┐   │
  │                              │  Layout    │   │
  │                              │  (header,  │   │
  │                              │   nav,     │   │
  │                              │   footer)  │   │
  │                              └─────┬─────┘   │
  │                    ┌───────────────┼─────────┐│
  │                    ▼               ▼         ▼│
  │              HomePage       StatePage    CalculatorPage
  │              (grid of       (detail for  (tax calc with │
  │               all states)   one state)   demo cart)    │
  │                    │               │         │         │
  │                    └───────────────┼─────────┘         │
  │                                    ▼                   │
  │                            states.json (imported)      │
  │                                    │                   │
  │                 ┌──────────────────┼──────────┐        │
  │                 ▼                  ▼          ▼        │
  │           products.ts        taxRules.ts  formatters.ts│
  │           (demo data)        (calc engine)(USD/% fmt)  │
  └──────────────────────────────────────────────┘
```

## Layers

**Data Source Layer (build-time):**
- Purpose: Hand-authored tax reference content per state
- Location: `state-taxes/*.md` (51 files, one per state + DC)
- Contains: Markdown documents with structured headings (Overview, Economic Nexus Thresholds, Taxable Goods, Local Taxes, Filing Requirements, Official Resources)
- Depends on: Nothing
- Used by: `scripts/build-data.mjs`

**Build Pipeline:**
- Purpose: Parse markdown into structured JSON for the frontend
- Location: `scripts/build-data.mjs`
- Contains: Regex-based markdown parsers for each data section (rates, nexus, exemptions, local taxes, filing, links)
- Depends on: `state-taxes/*.md`
- Used by: Build process (`npm run build` / `npm run dev`)
- Outputs: `src/data/states.json` (gitignored, regenerated each build)

**Data Layer (runtime):**
- Purpose: Typed data consumed by pages
- Location: `src/data/`
- Contains: `states.json` (generated), `products.ts` (hand-coded demo products)
- Depends on: Build pipeline output
- Used by: All three pages, `src/lib/taxRules.ts`

**Library Layer:**
- Purpose: Pure functions for tax calculation and formatting
- Location: `src/lib/`
- Contains: `taxRules.ts` (tax calculation engine), `formatters.ts` (currency/percent formatting), `useTheme.ts` (dark mode hook, currently unused)
- Depends on: `src/data/products.ts` (type import only)
- Used by: `src/pages/CalculatorPage.tsx`

**Page Layer:**
- Purpose: Route-level page components
- Location: `src/pages/`
- Contains: `HomePage.tsx`, `StatePage.tsx`, `CalculatorPage.tsx`
- Depends on: Data layer, library layer
- Used by: `src/App.tsx` (via React Router)

**Shell Layer:**
- Purpose: App chrome (navigation, footer, dark mode toggle)
- Location: `src/components/Layout.tsx`
- Contains: Header with nav links, dark mode toggle, footer disclaimer
- Depends on: React Router (`Outlet`)
- Used by: `src/App.tsx` (wraps all routes)

## Data Flow

**Build-time Data Pipeline:**

1. `npm run build` (or `npm run dev`) invokes `node scripts/build-data.mjs`
2. Script reads all 51 `state-taxes/*.md` files
3. Each file is parsed section-by-section using regex patterns to extract: state rate, combined rates, tax type, nexus thresholds, exemption statuses, local tax info, filing requirements, official URLs, and the full markdown content
4. All state data is assembled into a single JSON array and written to `src/data/states.json`
5. Vite bundles the JSON into the client app via `import statesData from "../data/states.json"`

**Runtime - State Browsing:**

1. User loads `/` -- `HomePage` imports `states.json`, renders filterable/searchable card grid
2. User clicks a state card -- navigates to `/state/:abbr`
3. `StatePage` finds the state in the JSON array by abbreviation, renders tax details

**Runtime - Tax Calculation:**

1. User navigates to `/calculator` (optionally with `?state=XX` query param)
2. `CalculatorPage` initializes with demo products from `src/data/products.ts`
3. User selects a state and adjusts cart quantities
4. `calculateTax()` from `src/lib/taxRules.ts` is called via `useMemo` on every state/cart change
5. Tax engine applies category-based exemption rules (medicine, groceries, clothing, candy, electronics/general) using hardcoded rule sets (e.g., `CLOTHING_FULLY_EXEMPT`, `GROCERY_REDUCED_RATE`)
6. Returns per-item breakdown with human-readable explanations and aggregate totals

**State Management:**
- No global state management library -- all state is local via `useState`/`useMemo`
- Theme (dark mode) persists to `localStorage`, toggled via button in `Layout.tsx`
- URL search params (`useSearchParams`) pass initial state selection to calculator
- No server state, no data fetching at runtime -- all data is bundled at build time

## Key Abstractions

**StateData (interface):**
- Purpose: Represents all structured tax data for a single US state
- Defined in: `src/lib/taxRules.ts` (lines 11-29), also duplicated as `StateEntry` in `src/pages/HomePage.tsx` and `src/pages/StatePage.tsx`
- Pattern: TypeScript interface with nested objects for nexus and exemptions

**Product (interface):**
- Purpose: Represents a purchasable item with a tax category
- Defined in: `src/data/products.ts` (lines 1-8)
- Pattern: Category union type (`"electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general"`) drives tax exemption logic

**TaxLineItem / TaxSummary (interfaces):**
- Purpose: Result of tax calculation -- per-item breakdown and aggregate totals
- Defined in: `src/lib/taxRules.ts` (lines 31-50)
- Pattern: Calculation result with human-readable `explanation` field per item

**calculateTax (function):**
- Purpose: Core tax engine -- computes tax for a cart of items in a given state
- Defined in: `src/lib/taxRules.ts` (line 90)
- Pattern: Pure function using `switch` on product category with hardcoded exemption rules per state

## Entry Points

**Browser Entry:**
- Location: `index.html` -> `src/main.tsx`
- Triggers: Browser page load
- Responsibilities: Mounts React app into `#root` div, wraps in `StrictMode` and `BrowserRouter` with `/us-tax` base path

**Build Script Entry:**
- Location: `scripts/build-data.mjs`
- Triggers: `npm run build` or `npm run dev` (runs before vite)
- Responsibilities: Generates `src/data/states.json` from markdown source files

**App Router:**
- Location: `src/App.tsx`
- Defines three routes: `/` (HomePage), `/state/:abbr` (StatePage), `/calculator` (CalculatorPage)
- All wrapped in `Layout` component via nested route with `<Outlet />`

## Routing

**Approach:** Declarative routing via `react-router-dom` v7

**Routes defined in `src/App.tsx`:**
- `/` -- `HomePage` (state grid overview)
- `/state/:abbr` -- `StatePage` (single state detail, param is 2-letter abbreviation)
- `/calculator` -- `CalculatorPage` (accepts `?state=XX` query param for initial state)

**Base path:** `/us-tax/` (configured in both `vite.config.ts` and `BrowserRouter` basename)

**Navigation:** `<Link>` components in `Layout.tsx` header (States, Tax Calculator) and throughout pages (state cards link to detail, detail links to calculator)

## Error Handling

**Strategy:** Minimal -- render fallback UI for expected error cases, no global error boundary

**Patterns:**
- `StatePage`: If `abbr` param doesn't match any state, renders "State not found" with back link (lines 110-118)
- `CalculatorPage`: Conditional rendering -- `result` is null if no state found, table only renders when result exists
- No try/catch blocks, no error boundaries, no error logging
- Build script (`build-data.mjs`): Top-level `.catch()` on `main()` -- logs error and exits with code 1

## Cross-Cutting Concerns

**Logging:** None in the frontend. Build script uses `console.log` for progress and `console.warn` for missing data validation.

**Validation:** Build script validates output (missing rates, missing nexus thresholds, missing websites) but only warns -- does not fail the build.

**Authentication:** None -- fully static public site.

**Styling:** Tailwind CSS v4 with dark mode via `dark:` variant classes. Dark mode toggled by adding/removing `dark` class on `<html>` element.

---

*Architecture analysis: 2026-03-24*
