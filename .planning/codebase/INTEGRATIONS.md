# External Integrations

**Analysis Date:** 2026-03-24

## APIs & Services

None detected. This is a fully static, client-side application with no API calls. All data is compiled at build time from local markdown files.

## Databases & Storage

**Browser localStorage:**
- Purpose: Persists dark/light theme preference
- Key: `"theme"` (values: `"dark"` or `"light"`)
- Implementation: `src/components/Layout.tsx` (lines 4-9) and `src/lib/useTheme.ts`

**Build-time data pipeline:**
- Source: 51 Markdown files in `state-taxes/*.md` (one per state + DC)
- Transform: `scripts/build-data.mjs` parses markdown structure, extracts tax rates, exemptions, nexus thresholds, filing info, and official links
- Output: `src/data/states.json` (gitignored, regenerated on every build)
- Consumed by: `src/pages/HomePage.tsx`, `src/pages/StatePage.tsx`, `src/pages/CalculatorPage.tsx` via `import statesData from "../data/states.json"`

## File Storage

None. No file uploads or external file storage.

## Caching

None beyond standard browser caching of static assets served by GitHub Pages.

## Authentication & Auth

None. This is a public informational site with no user authentication.

## Monitoring & Observability

**Error Tracking:** None detected
**Logging:** None detected (no console.log, no logging library)
**Analytics:** None detected

## CI/CD & Deployment

**Hosting:**
- GitHub Pages at `https://prepor.github.io/us-tax/`
- Static site deployed from `dist/` directory

**CI Pipeline:**
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Triggers: Push to `main` branch
- Steps: checkout, setup Node 20, `npm ci`, `npm run build`, upload to GitHub Pages
- Uses `actions/deploy-pages@v4` with OIDC token-based authentication
- Concurrency group `pages` with `cancel-in-progress: true`

## Webhooks & Callbacks

**Incoming:** None
**Outgoing:** None

## Environment Configuration

**Required env vars:** None. The application has no runtime environment variables.

**Secrets:**
- `.env`, `.env.local`, `.env.*.local` are gitignored but no code references `import.meta.env` beyond the default Vite client types in `src/vite-env.d.ts`

## External Links (Outbound, Not Integrations)

The state detail pages (`src/pages/StatePage.tsx`) render links to official state tax authority websites, sales tax pages, and registration URLs. These are data-driven from `states.json` and open in new tabs. They are static links, not API integrations.

---

*Integration audit: 2026-03-24*
