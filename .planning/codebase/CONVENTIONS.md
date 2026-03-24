# Coding Conventions

**Analysis Date:** 2026-03-24

## Naming Patterns

**Files:**
- Pages: PascalCase with `Page` suffix: `HomePage.tsx`, `StatePage.tsx`, `CalculatorPage.tsx`
- Components: PascalCase matching the default export: `Layout.tsx`
- Utility/library modules: camelCase: `formatters.ts`, `useTheme.ts`, `taxRules.ts`
- Data modules: camelCase: `products.ts`
- Build scripts: kebab-case with `.mjs` extension: `build-data.mjs`
- State tax data files: uppercase two-letter state abbreviations: `CA.md`, `NY.md`

**Functions:**
- Use camelCase for all functions: `formatCurrency`, `calculateTax`, `parseNexus`, `updateQuantity`
- React components use PascalCase: `HomePage`, `TaxLineItemRow`, `Badge`, `Section`, `InfoRow`
- Helper/private functions in components use camelCase: `rateColor`, `exemptionBadge`, `isActive`
- Custom hooks use `use` prefix: `useTheme`

**Variables:**
- camelCase throughout: `selectedState`, `searchParams`, `demoProducts`
- Constants use SCREAMING_SNAKE_CASE: `CLOTHING_FULLY_EXEMPT`, `CLOTHING_PARTIAL`, `GROCERY_REDUCED_RATE`, `GROCERY_FULL_TAX`, `CANDY_TAXABLE_WITH_FOOD_EXEMPT`, `NO_TAX_STATES`, `STATE_NAMES`
- Record/map lookups use camelCase: `taxTypeLabel`, `taxTypeLabels`

**Types/Interfaces:**
- PascalCase: `StateEntry`, `StateData`, `Product`, `TaxLineItem`, `TaxSummary`, `CartItem`
- Interfaces preferred over type aliases for object shapes
- Union literal types used inline for constrained strings: `"electronics" | "clothing" | "groceries" | "medicine" | "candy" | "general"`

## Code Style

**Formatting:**
- No Prettier or ESLint configuration present. No `.editorconfig` either.
- Indentation: 2 spaces consistently throughout all source files
- Semicolons: used at end of statements
- Quotes: double quotes for strings in TypeScript/TSX files
- Trailing commas: used in function arguments and array/object literals
- Line length: no enforced limit; long Tailwind class strings span wide lines (100+ chars)
- When adding new code, use 2-space indentation, double quotes, and semicolons.

**Linting:**
- No ESLint, Biome, or other linter configured
- TypeScript strict mode provides type-level checking (see TypeScript Usage below)

## Import Organization

**Order (observed across all files):**
1. React imports (`import { useState, useMemo } from "react"`)
2. Third-party library imports (`import { Link, Outlet, useLocation } from "react-router-dom"`)
3. Local data/JSON imports (`import statesData from "../data/states.json"`)
4. Local module imports (`import { demoProducts, type Product } from "../data/products"`)
5. CSS imports last in entry files (`import "./index.css"`)

**Path Style:**
- Relative paths throughout: `"../data/states.json"`, `"./App"`, `"./components/Layout"`
- No path aliases configured (no `paths` in tsconfig)
- Use `type` keyword for type-only imports: `import type { Product } from "../data/products"`

## Component Patterns

**Default exports for pages and layout components:**
- `export default function HomePage() { ... }` in `src/pages/HomePage.tsx`
- `export default function Layout() { ... }` in `src/components/Layout.tsx`
- `export default function App() { ... }` in `src/App.tsx`

**Named exports for utilities, types, and data:**
- `export function formatCurrency(...)` in `src/lib/formatters.ts`
- `export function calculateTax(...)` in `src/lib/taxRules.ts`
- `export interface StateData { ... }` in `src/lib/taxRules.ts`
- `export const demoProducts: Product[] = [...]` in `src/data/products.ts`

**Inline helper components (not exported):**
- Small UI components defined within page files and NOT exported: `Badge`, `Section`, `InfoRow` in `src/pages/StatePage.tsx`, `TaxLineItemRow` in `src/pages/CalculatorPage.tsx`
- These are scoped to the file that uses them

**State management:**
- Local component state with `useState` hooks
- `useMemo` for derived/computed values (filtering, calculations)
- No global state management library (no Redux, Zustand, etc.)
- Theme state managed via `useState` + `localStorage` directly in `Layout.tsx`

**Routing:**
- React Router v7 with `BrowserRouter` and `Routes`/`Route` components
- Layout route pattern: `<Route element={<Layout />}>` wrapping child routes
- URL params via `useParams`: `const { abbr } = useParams<{ abbr: string }>()`
- Search params via `useSearchParams`: `const [searchParams] = useSearchParams()`

## TypeScript Usage

**Strict mode enabled** with additional checks in `tsconfig.app.json`:
- `"strict": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"noFallthroughCasesInSwitch": true`
- `"noUncheckedSideEffectImports": true`
- Target: ES2020, JSX: react-jsx

**Type patterns:**
- Interfaces for data shapes: `interface StateEntry { ... }`, `interface CartItem { ... }`
- `Record<string, string>` for string-keyed lookup maps
- `Record<string, { ... }>` for structured lookup maps (e.g., `CLOTHING_PARTIAL`)
- Non-null assertion used sparingly: `document.getElementById("root")!`
- Index signature `[key: string]: unknown` on `StateData` for flexibility
- JSON data imported and cast with `as`: `const states = statesData as StateEntry[]`
- `React.ReactNode` for children props

**Type-only imports:**
- Use `type` keyword: `import type { Product } from "../data/products"`

## Comments & Documentation

**JSDoc-style block comments for module-level documentation:**
```typescript
/**
 * Tax calculation engine.
 *
 * Uses the structured state data (from states.json) plus hand-coded
 * per-category exemption rules to compute tax on each cart item and
 * provide a human-readable explanation.
 */
```

**Inline comments for domain-specific context:**
```typescript
// States where clothing is fully exempt (year-round).
// Note: CT only exempts clothing during August sales tax-free week, so it's excluded here.
const CLOTHING_FULLY_EXEMPT = new Set(["PA", "NJ", "MN", "VT"]);
```

**Section divider comments in build script** (`scripts/build-data.mjs`):
```javascript
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
```

**JSX comments for section labeling:**
```tsx
{/* Tax Rates */}
{/* Sidebar: state selector + cart */}
```

**General guidance:**
- Comments explain WHY or domain-specific rules, not WHAT the code does
- No TSDoc `@param`/`@returns` annotations used
- Keep comments focused on tax rules and business logic context

## CSS / Styling

**Tailwind CSS v4** via Vite plugin (`@tailwindcss/vite`):
- Single CSS entry point: `src/index.css` contains only `@import "tailwindcss"`
- All styling is inline Tailwind utility classes in JSX
- Dark mode via `dark:` variant classes + manual class toggle on `<html>`
- Responsive breakpoints: `sm:`, `lg:`, `xl:` prefixes
- No custom CSS, no CSS modules, no styled-components
- Long class strings are acceptable; do not extract to separate files

**Dark mode pattern:**
- Toggle via `document.documentElement.classList.toggle("dark", dark)`
- Persisted to `localStorage` key `"theme"`
- Falls back to system preference via `matchMedia("(prefers-color-scheme: dark)")`

## Build Pipeline

**Two-stage build** defined in `package.json`:
1. `node scripts/build-data.mjs` - parses `state-taxes/*.md` files into `src/data/states.json`
2. `tsc -b && vite build` - type-check then bundle

**Generated file:**
- `src/data/states.json` is generated (listed in `.gitignore`) and must be rebuilt before dev/build
- Run `npm run build:data` or `npm run dev` (which runs it automatically)

---

*Convention analysis: 2026-03-24*
