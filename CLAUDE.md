<!-- GSD:project-start source:PROJECT.md -->
## Project

**US Sales Tax Calculator**

A comprehensive US sales tax calculator and reference guide that handles all ~13,000 tax jurisdictions — state, county, city, and district level. Built as a client-side SPA with a static bundled tax rate dataset. Demonstrates that AI-built tools can handle real-world tax complexity, not just state-level demos.

**Core Value:** Given any US address and purchase amount, return the exact tax breakdown across all applicable jurisdictions (state, county, city, special district) — accurate enough to use for real e-commerce.

### Constraints

- **Hosting**: GitHub Pages — no server, no database, everything client-side
- **Data**: Static bundled dataset — must be comprehensive but small enough for browser
- **Accuracy**: Tax rates must be verifiable against official state/county sources
- **Performance**: Must handle ZIP code lookup instantly in browser despite large dataset
- **Stack**: Keep existing React/TypeScript/Vite/Tailwind stack
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - All application source code in `src/`
- TSX (React JSX) - All UI components and pages
- JavaScript (ESM) - Build script `scripts/build-data.mjs`
- Markdown - State tax data source files in `state-taxes/*.md`
## Runtime
- Node.js 20 (pinned in CI via `actions/setup-node`)
- Browser (ES2020 target, per `tsconfig.app.json`)
- npm
- Lockfile: `package-lock.json` (present)
## Frameworks
- React 19.2.4 - UI rendering (using `react-jsx` transform, no explicit React import needed)
- React DOM 19.2.4 - Browser DOM rendering via `createRoot` in `src/main.tsx`
- React Router DOM 7.13.1 - Client-side routing with `BrowserRouter` (basename `/us-tax`)
- Tailwind CSS 4.2.1 - Utility-first CSS via `@import "tailwindcss"` in `src/index.css`
- `@tailwindcss/vite` 4.2.1 - Vite plugin for Tailwind v4
- Vite 6.4.1 - Dev server and production bundler
- `@vitejs/plugin-react` 4.7.0 - React Fast Refresh and JSX transform
- TypeScript 5.9.3 - Type checking (via `tsc -b` in build step)
## Key Dependencies
- `react` ^19 - Core UI library
- `react-dom` ^19 - DOM rendering
- `react-router-dom` ^7 - Client-side routing (3 routes: `/`, `/state/:abbr`, `/calculator`)
- `@tailwindcss/vite` ^4 - Tailwind Vite integration
- `@types/react` latest - React type definitions
- `@types/react-dom` latest - React DOM type definitions
- `tailwindcss` ^4 - CSS utility framework
- `typescript` ^5.7 - TypeScript compiler
- `vite` ^6 - Build tool
- `@vitejs/plugin-react` ^4 - Vite React plugin
## Configuration
- `tsconfig.json` - Project references root (references `tsconfig.app.json` and `tsconfig.node.json`)
- `tsconfig.app.json` - App code config: target ES2020, strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `resolveJsonModule`
- `tsconfig.node.json` - Node/Vite config: target ES2022, same strict settings
- `vite.config.ts` - Configures `base: "/us-tax/"`, React plugin, Tailwind plugin
- `src/index.css` - Single line: `@import "tailwindcss"` (Tailwind v4 style)
- No custom Tailwind config file; uses Tailwind v4 defaults with dark mode via `class` strategy (toggled manually in `src/components/Layout.tsx`)
- No `.env` files committed (gitignored)
- No ESLint, Prettier, or Biome configuration detected
- No test framework configured
## Notable Scripts
## Platform Requirements
- Node.js 20+
- npm
- Static file hosting (GitHub Pages)
- All client-side; no server runtime needed
- Deployed to `https://prepor.github.io/us-tax/`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Pages: PascalCase with `Page` suffix: `HomePage.tsx`, `StatePage.tsx`, `CalculatorPage.tsx`
- Components: PascalCase matching the default export: `Layout.tsx`
- Utility/library modules: camelCase: `formatters.ts`, `useTheme.ts`, `taxRules.ts`
- Data modules: camelCase: `products.ts`
- Build scripts: kebab-case with `.mjs` extension: `build-data.mjs`
- State tax data files: uppercase two-letter state abbreviations: `CA.md`, `NY.md`
- Use camelCase for all functions: `formatCurrency`, `calculateTax`, `parseNexus`, `updateQuantity`
- React components use PascalCase: `HomePage`, `TaxLineItemRow`, `Badge`, `Section`, `InfoRow`
- Helper/private functions in components use camelCase: `rateColor`, `exemptionBadge`, `isActive`
- Custom hooks use `use` prefix: `useTheme`
- camelCase throughout: `selectedState`, `searchParams`, `demoProducts`
- Constants use SCREAMING_SNAKE_CASE: `CLOTHING_FULLY_EXEMPT`, `CLOTHING_PARTIAL`, `GROCERY_REDUCED_RATE`, `GROCERY_FULL_TAX`, `CANDY_TAXABLE_WITH_FOOD_EXEMPT`, `NO_TAX_STATES`, `STATE_NAMES`
- Record/map lookups use camelCase: `taxTypeLabel`, `taxTypeLabels`
- PascalCase: `StateEntry`, `StateData`, `Product`, `TaxLineItem`, `TaxSummary`, `CartItem`
- Interfaces preferred over type aliases for object shapes
- Union literal types used inline for constrained strings: `"electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general"`
## Code Style
- No Prettier or ESLint configuration present. No `.editorconfig` either.
- Indentation: 2 spaces consistently throughout all source files
- Semicolons: used at end of statements
- Quotes: double quotes for strings in TypeScript/TSX files
- Trailing commas: used in function arguments and array/object literals
- Line length: no enforced limit; long Tailwind class strings span wide lines (100+ chars)
- When adding new code, use 2-space indentation, double quotes, and semicolons.
- No ESLint, Biome, or other linter configured
- TypeScript strict mode provides type-level checking (see TypeScript Usage below)
## Import Organization
- Relative paths throughout: `"../data/states.json"`, `"./App"`, `"./components/Layout"`
- No path aliases configured (no `paths` in tsconfig)
- Use `type` keyword for type-only imports: `import type { Product } from "../data/products"`
## Component Patterns
- `export default function HomePage() { ... }` in `src/pages/HomePage.tsx`
- `export default function Layout() { ... }` in `src/components/Layout.tsx`
- `export default function App() { ... }` in `src/App.tsx`
- `export function formatCurrency(...)` in `src/lib/formatters.ts`
- `export function calculateTax(...)` in `src/lib/taxRules.ts`
- `export interface StateData { ... }` in `src/lib/taxRules.ts`
- `export const demoProducts: Product[] = [...]` in `src/data/products.ts`
- Small UI components defined within page files and NOT exported: `Badge`, `Section`, `InfoRow` in `src/pages/StatePage.tsx`, `TaxLineItemRow` in `src/pages/CalculatorPage.tsx`
- These are scoped to the file that uses them
- Local component state with `useState` hooks
- `useMemo` for derived/computed values (filtering, calculations)
- No global state management library (no Redux, Zustand, etc.)
- Theme state managed via `useState` + `localStorage` directly in `Layout.tsx`
- React Router v7 with `BrowserRouter` and `Routes`/`Route` components
- Layout route pattern: `<Route element={<Layout />}>` wrapping child routes
- URL params via `useParams`: `const { abbr } = useParams<{ abbr: string }>()`
- Search params via `useSearchParams`: `const [searchParams] = useSearchParams()`
## TypeScript Usage
- `"strict": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`
- `"noUncheckedSideEffectImports": true`
- Target: ES2020, JSX: react-jsx
- Interfaces for data shapes: `interface StateEntry { ... }`, `interface CartItem { ... }`
- `Record<string, string>` for string-keyed lookup maps
- `Record<string, { ... }>` for structured lookup maps (e.g., `CLOTHING_PARTIAL`)
- Non-null assertion used sparingly: `document.getElementById("root")!`
- Index signature `[key: string]: unknown` on `StateData` for flexibility
- JSON data imported and cast with `as`: `const states = statesData as StateEntry[]`
- `React.ReactNode` for children props
- Use `type` keyword: `import type { Product } from "../data/products"`
## Comments & Documentation
- Comments explain WHY or domain-specific rules, not WHAT the code does
- No TSDoc `@param`/`@returns` annotations used
- Keep comments focused on tax rules and business logic context
## CSS / Styling
- Single CSS entry point: `src/index.css` contains only `@import "tailwindcss"`
- All styling is inline Tailwind utility classes in JSX
- Dark mode via `dark:` variant classes + manual class toggle on `<html>`
- Responsive breakpoints: `sm:`, `lg:`, `xl:` prefixes
- No custom CSS, no CSS modules, no styled-components
- Long class strings are acceptable; do not extract to separate files
- Toggle via `document.documentElement.classList.toggle("dark", dark)`
- Persisted to `localStorage` key `"theme"`
- Falls back to system preference via `matchMedia("(prefers-color-scheme: dark)")`
## Build Pipeline
- `src/data/states.json` is generated (listed in `.gitignore`) and must be rebuilt before dev/build
- Run `npm run build:data` or `npm run dev` (which runs it automatically)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Static SPA deployed to GitHub Pages (no server-side rendering, no backend)
- Build-time data transformation: markdown files are parsed into structured JSON before the app builds
- All tax logic runs client-side with zero API calls at runtime
- Three-page app with shared layout wrapper via React Router nested routes
## Component Diagram
```
```
## Layers
- Purpose: Hand-authored tax reference content per state
- Location: `state-taxes/*.md` (51 files, one per state + DC)
- Contains: Markdown documents with structured headings (Overview, Economic Nexus Thresholds, Taxable Goods, Local Taxes, Filing Requirements, Official Resources)
- Depends on: Nothing
- Used by: `scripts/build-data.mjs`
- Purpose: Parse markdown into structured JSON for the frontend
- Location: `scripts/build-data.mjs`
- Contains: Regex-based markdown parsers for each data section (rates, nexus, exemptions, local taxes, filing, links)
- Depends on: `state-taxes/*.md`
- Used by: Build process (`npm run build` / `npm run dev`)
- Outputs: `src/data/states.json` (gitignored, regenerated each build)
- Purpose: Typed data consumed by pages
- Location: `src/data/`
- Contains: `states.json` (generated), `products.ts` (hand-coded demo products)
- Depends on: Build pipeline output
- Used by: All three pages, `src/lib/taxRules.ts`
- Purpose: Pure functions for tax calculation and formatting
- Location: `src/lib/`
- Contains: `taxRules.ts` (tax calculation engine), `formatters.ts` (currency/percent formatting), `useTheme.ts` (dark mode hook, currently unused)
- Depends on: `src/data/products.ts` (type import only)
- Used by: `src/pages/CalculatorPage.tsx`
- Purpose: Route-level page components
- Location: `src/pages/`
- Contains: `HomePage.tsx`, `StatePage.tsx`, `CalculatorPage.tsx`
- Depends on: Data layer, library layer
- Used by: `src/App.tsx` (via React Router)
- Purpose: App chrome (navigation, footer, dark mode toggle)
- Location: `src/components/Layout.tsx`
- Contains: Header with nav links, dark mode toggle, footer disclaimer
- Depends on: React Router (`Outlet`)
- Used by: `src/App.tsx` (wraps all routes)
## Data Flow
- No global state management library -- all state is local via `useState`/`useMemo`
- Theme (dark mode) persists to `localStorage`, toggled via button in `Layout.tsx`
- URL search params (`useSearchParams`) pass initial state selection to calculator
- No server state, no data fetching at runtime -- all data is bundled at build time
## Key Abstractions
- Purpose: Represents all structured tax data for a single US state
- Defined in: `src/lib/taxRules.ts` (lines 11-29), also duplicated as `StateEntry` in `src/pages/HomePage.tsx` and `src/pages/StatePage.tsx`
- Pattern: TypeScript interface with nested objects for nexus and exemptions
- Purpose: Represents a purchasable item with a tax category
- Defined in: `src/data/products.ts` (lines 1-8)
- Pattern: Category union type (`"electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general"`) drives tax exemption logic
- Purpose: Result of tax calculation -- per-item breakdown and aggregate totals
- Defined in: `src/lib/taxRules.ts` (lines 31-50)
- Pattern: Calculation result with human-readable `explanation` field per item
- Purpose: Core tax engine -- computes tax for a cart of items in a given state
- Defined in: `src/lib/taxRules.ts` (line 90)
- Pattern: Pure function using `switch` on product category with hardcoded exemption rules per state
## Entry Points
- Location: `index.html` -> `src/main.tsx`
- Triggers: Browser page load
- Responsibilities: Mounts React app into `#root` div, wraps in `StrictMode` and `BrowserRouter` with `/us-tax` base path
- Location: `scripts/build-data.mjs`
- Triggers: `npm run build` or `npm run dev` (runs before vite)
- Responsibilities: Generates `src/data/states.json` from markdown source files
- Location: `src/App.tsx`
- Defines three routes: `/` (HomePage), `/state/:abbr` (StatePage), `/calculator` (CalculatorPage)
- All wrapped in `Layout` component via nested route with `<Outlet />`
## Routing
- `/` -- `HomePage` (state grid overview)
- `/state/:abbr` -- `StatePage` (single state detail, param is 2-letter abbreviation)
- `/calculator` -- `CalculatorPage` (accepts `?state=XX` query param for initial state)
## Error Handling
- `StatePage`: If `abbr` param doesn't match any state, renders "State not found" with back link (lines 110-118)
- `CalculatorPage`: Conditional rendering -- `result` is null if no state found, table only renders when result exists
- No try/catch blocks, no error boundaries, no error logging
- Build script (`build-data.mjs`): Top-level `.catch()` on `main()` -- logs error and exits with code 1
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
