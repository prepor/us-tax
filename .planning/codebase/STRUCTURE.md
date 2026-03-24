# Project Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
us-tax/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages CI/CD
├── .planning/
│   └── codebase/                   # GSD analysis docs
├── scripts/
│   └── build-data.mjs              # Markdown → JSON build pipeline
├── src/
│   ├── components/
│   │   └── Layout.tsx              # App shell (header, nav, footer, dark mode)
│   ├── data/
│   │   ├── products.ts             # Demo product catalog (6 items)
│   │   └── states.json             # GENERATED at build time (gitignored)
│   ├── lib/
│   │   ├── formatters.ts           # Currency and percent formatting
│   │   ├── taxRules.ts             # Tax calculation engine
│   │   └── useTheme.ts             # Dark mode hook (currently unused)
│   ├── pages/
│   │   ├── CalculatorPage.tsx      # Interactive tax calculator with demo cart
│   │   ├── HomePage.tsx            # State grid overview with search/filter
│   │   └── StatePage.tsx           # Individual state tax detail view
│   ├── App.tsx                     # Route definitions
│   ├── index.css                   # Tailwind CSS import
│   ├── main.tsx                    # React entry point
│   └── vite-env.d.ts              # Vite type declarations
├── state-taxes/
│   ├── AK.md                       # Alaska tax guide
│   ├── AL.md                       # Alabama tax guide
│   ├── ...                         # (51 total: 50 states + DC)
│   └── WY.md                       # Wyoming tax guide
├── index.html                      # HTML entry point
├── package.json                    # Dependencies and scripts
├── package-lock.json               # Locked dependency versions
├── tsconfig.json                   # TypeScript root config (references only)
├── tsconfig.app.json               # TypeScript config for src/
├── tsconfig.node.json              # TypeScript config for vite.config.ts
└── vite.config.ts                  # Vite build configuration
```

## Directory Purposes

**`state-taxes/`:**
- Purpose: Source-of-truth tax reference content for each US state
- Contains: 51 markdown files named by 2-letter state abbreviation (e.g., `CA.md`, `NY.md`)
- Key structure: Each file has consistent headings: Overview, Economic Nexus Thresholds, Tax Registration, Taxable Goods, Local Taxes, Filing Requirements, Official Resources
- These files are parsed at build time by `scripts/build-data.mjs`

**`scripts/`:**
- Purpose: Build-time tooling
- Contains: `build-data.mjs` -- reads `state-taxes/*.md`, extracts structured data via regex, writes `src/data/states.json`
- Runs before every `dev` and `build` command

**`src/components/`:**
- Purpose: Shared UI components
- Contains: Only `Layout.tsx` (app shell with header, navigation, dark mode toggle, footer)
- Pattern: Layout uses React Router `<Outlet />` for nested page rendering

**`src/data/`:**
- Purpose: Application data (both static and generated)
- Contains: `products.ts` (hand-coded demo product catalog), `states.json` (generated, gitignored)
- `states.json` is large -- contains all 51 state objects with full markdown content embedded

**`src/lib/`:**
- Purpose: Pure utility functions and hooks
- Contains: `taxRules.ts` (tax calculation engine), `formatters.ts` (USD/percent formatting), `useTheme.ts` (dark mode hook)
- `taxRules.ts` is the core business logic file -- 270 lines with hardcoded per-state exemption rules

**`src/pages/`:**
- Purpose: Route-level page components (one file per route)
- Contains: `HomePage.tsx`, `StatePage.tsx`, `CalculatorPage.tsx`
- Each page imports `states.json` directly and casts it to a typed interface

**`.github/workflows/`:**
- Purpose: CI/CD pipeline
- Contains: `deploy.yml` -- builds and deploys to GitHub Pages on push to `main`

## Key Files

**Entry Points:**
- `index.html`: HTML shell with `#root` div, loads `src/main.tsx`
- `src/main.tsx`: Creates React root, wraps app in `StrictMode` and `BrowserRouter` (basename: `/us-tax`)
- `src/App.tsx`: Defines all routes under `Layout` wrapper

**Configuration:**
- `vite.config.ts`: Vite config with React and Tailwind plugins, base path `/us-tax/`
- `tsconfig.json`: Root config, references `tsconfig.app.json` and `tsconfig.node.json`
- `tsconfig.app.json`: Strict TypeScript for `src/` -- targets ES2020, enables `resolveJsonModule`
- `tsconfig.node.json`: TypeScript for `vite.config.ts` only
- `package.json`: Scripts: `dev`, `build`, `build:data`, `preview`

**Core Logic:**
- `scripts/build-data.mjs`: Build pipeline -- 813 lines of markdown parsing with regex. Extracts tax rates, nexus thresholds, exemptions, filing info, and official links from markdown files
- `src/lib/taxRules.ts`: Tax calculation engine -- 270 lines. Maps product categories to exemption/rate rules per state. Exports `calculateTax()` function
- `src/data/products.ts`: 6 demo products across categories (electronics, clothing, groceries, medicine, candy)

**Pages:**
- `src/pages/HomePage.tsx`: 137 lines. Searchable/filterable grid of all states with tax rate badges
- `src/pages/StatePage.tsx`: 297 lines. Detailed view of a single state (rates, nexus, exemptions, filing, official links). Includes local components: `Badge`, `Section`, `InfoRow`
- `src/pages/CalculatorPage.tsx`: 227 lines. Interactive demo cart with per-item tax breakdown table

**Styling:**
- `src/index.css`: Single line -- `@import "tailwindcss";` (Tailwind v4 style)

## Module Organization

**Organized by technical role** (not by feature):
- `components/` -- shared UI shells
- `pages/` -- route-level views
- `lib/` -- pure logic and utilities
- `data/` -- static data and generated data

There are no barrel files (`index.ts`). Each file is imported directly by path.

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `HomePage.tsx`, `Layout.tsx`)
- Utility modules: camelCase (e.g., `taxRules.ts`, `formatters.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useTheme.ts`)
- Data files: camelCase (e.g., `products.ts`, `states.json`)
- State markdown: UPPERCASE 2-letter abbreviation (e.g., `CA.md`, `NY.md`)
- Build scripts: kebab-case (e.g., `build-data.mjs`)

**Directories:**
- All lowercase, plural for collections (`pages/`, `components/`, `scripts/`)
- Singular for namespaces (`lib/`, `data/`)

## Where to Add New Code

**New Page/Route:**
1. Create component in `src/pages/NewPage.tsx` (PascalCase)
2. Add route in `src/App.tsx` inside the `<Route element={<Layout />}>` wrapper
3. Add nav link in `src/components/Layout.tsx` header nav array (line 29-31)

**New Shared Component:**
- Place in `src/components/ComponentName.tsx`
- Currently only `Layout.tsx` exists here; page-local components (Badge, Section, InfoRow) are defined inline in `src/pages/StatePage.tsx`

**New Utility/Library Function:**
- Add to existing file in `src/lib/` if it fits (tax logic -> `taxRules.ts`, formatting -> `formatters.ts`)
- Create new file in `src/lib/` for a distinct concern

**New Product Category:**
1. Add to the `Product["category"]` union type in `src/data/products.ts`
2. Add demo product to `demoProducts` array in `src/data/products.ts`
3. Add `case` branch in `calculateTax()` switch statement in `src/lib/taxRules.ts`

**New State Data Field:**
1. Add extraction logic in `scripts/build-data.mjs` (new parser function)
2. Include in the `entry` object in `main()` (line 723 of `build-data.mjs`)
3. Add to `StateData` interface in `src/lib/taxRules.ts`
4. Add to `StateEntry` interface in `src/pages/HomePage.tsx` and/or `src/pages/StatePage.tsx`

**New Tax Exemption Rule:**
- Add to the relevant `Set` or `Record` constants at the top of `src/lib/taxRules.ts` (e.g., `CLOTHING_FULLY_EXEMPT`, `GROCERY_REDUCED_RATE`)

## Special Directories

**`state-taxes/`:**
- Purpose: Source markdown content for all US state tax guides
- Generated: No -- hand-authored
- Committed: Yes

**`src/data/` (specifically `states.json`):**
- Purpose: Build-time generated JSON from markdown sources
- Generated: Yes -- by `scripts/build-data.mjs`
- Committed: No -- listed in `.gitignore`

**`dist/`:**
- Purpose: Vite build output (production bundle)
- Generated: Yes
- Committed: No -- listed in `.gitignore`

---

*Structure analysis: 2026-03-24*
