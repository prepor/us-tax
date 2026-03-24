# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.9.3 - All application source code in `src/`
- TSX (React JSX) - All UI components and pages

**Secondary:**
- JavaScript (ESM) - Build script `scripts/build-data.mjs`
- Markdown - State tax data source files in `state-taxes/*.md`

## Runtime

**Environment:**
- Node.js 20 (pinned in CI via `actions/setup-node`)
- Browser (ES2020 target, per `tsconfig.app.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.2.4 - UI rendering (using `react-jsx` transform, no explicit React import needed)
- React DOM 19.2.4 - Browser DOM rendering via `createRoot` in `src/main.tsx`
- React Router DOM 7.13.1 - Client-side routing with `BrowserRouter` (basename `/us-tax`)

**CSS/Styling:**
- Tailwind CSS 4.2.1 - Utility-first CSS via `@import "tailwindcss"` in `src/index.css`
- `@tailwindcss/vite` 4.2.1 - Vite plugin for Tailwind v4

**Build/Dev:**
- Vite 6.4.1 - Dev server and production bundler
- `@vitejs/plugin-react` 4.7.0 - React Fast Refresh and JSX transform
- TypeScript 5.9.3 - Type checking (via `tsc -b` in build step)

## Key Dependencies

**Runtime (3 total):**
- `react` ^19 - Core UI library
- `react-dom` ^19 - DOM rendering
- `react-router-dom` ^7 - Client-side routing (3 routes: `/`, `/state/:abbr`, `/calculator`)

**Dev Dependencies (6 total):**
- `@tailwindcss/vite` ^4 - Tailwind Vite integration
- `@types/react` latest - React type definitions
- `@types/react-dom` latest - React DOM type definitions
- `tailwindcss` ^4 - CSS utility framework
- `typescript` ^5.7 - TypeScript compiler
- `vite` ^6 - Build tool
- `@vitejs/plugin-react` ^4 - Vite React plugin

## Configuration

**TypeScript:**
- `tsconfig.json` - Project references root (references `tsconfig.app.json` and `tsconfig.node.json`)
- `tsconfig.app.json` - App code config: target ES2020, strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `resolveJsonModule`
- `tsconfig.node.json` - Node/Vite config: target ES2022, same strict settings

**Vite:**
- `vite.config.ts` - Configures `base: "/us-tax/"`, React plugin, Tailwind plugin

**Styling:**
- `src/index.css` - Single line: `@import "tailwindcss"` (Tailwind v4 style)
- No custom Tailwind config file; uses Tailwind v4 defaults with dark mode via `class` strategy (toggled manually in `src/components/Layout.tsx`)

**Build:**
- No `.env` files committed (gitignored)
- No ESLint, Prettier, or Biome configuration detected
- No test framework configured

## Notable Scripts

```bash
npm run dev          # Build data from markdown, then start Vite dev server
npm run build:data   # Run scripts/build-data.mjs to generate src/data/states.json
npm run build        # Build data + type check (tsc -b) + Vite production build
npm run preview      # Preview production build locally
```

**Build Pipeline:**
1. `scripts/build-data.mjs` parses `state-taxes/*.md` files and generates `src/data/states.json`
2. TypeScript compilation validates types
3. Vite bundles the application to `dist/`

## Platform Requirements

**Development:**
- Node.js 20+
- npm

**Production:**
- Static file hosting (GitHub Pages)
- All client-side; no server runtime needed
- Deployed to `https://prepor.github.io/us-tax/`

---

*Stack analysis: 2026-03-24*
