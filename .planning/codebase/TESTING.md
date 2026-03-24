# Testing Patterns

**Analysis Date:** 2026-03-24

## Test Framework

**No test framework is configured.** There is no testing infrastructure in this project:
- No test runner (no Jest, Vitest, Mocha, or similar)
- No test configuration files
- No test dependencies in `package.json`
- No test scripts in `package.json`
- No E2E framework (no Cypress, Playwright, or similar)

## Test File Organization

**No test files exist.** Zero `.test.*`, `.spec.*`, or `__tests__/` directories in the `src/` tree.

## Test Structure

Not applicable - no tests exist.

## Test Types

**Unit Tests:** None
**Integration Tests:** None
**E2E Tests:** None

## Test Utilities

None configured.

## Mocking

No mocking libraries installed.

## Running Tests

**No test commands available.** The `package.json` `scripts` section contains only:
```json
{
  "dev": "node scripts/build-data.mjs && vite",
  "build:data": "node scripts/build-data.mjs",
  "build": "node scripts/build-data.mjs && tsc -b && vite build",
  "preview": "vite preview"
}
```

## Coverage

No coverage tooling configured.

## CI Pipeline

The GitHub Actions workflow at `.github/workflows/deploy.yml` runs only `npm ci` and `npm run build`. There is no test step in CI.

## Type Checking as Validation

The only automated validation is TypeScript compilation (`tsc -b`) during the build step. The TypeScript configuration is strict:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

This catches type errors but provides no runtime behavior verification.

## Build Script Validation

The build data script (`scripts/build-data.mjs`) includes basic validation output (printed to console) checking for:
- States with sales tax but 0% rate
- States with sales tax but no revenue threshold
- States with sales tax but no official website

These are console warnings, not assertions that fail the build.

## Recommendations for Adding Tests

If tests are to be added, the recommended setup for this Vite + React project:

**Framework:** Vitest (native Vite integration)

**Setup steps:**
1. Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
2. Add to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  // ... existing config
});
```
3. Add script to `package.json`: `"test": "vitest"`

**Priority areas for testing:**
- `src/lib/taxRules.ts` - `calculateTax()` is pure logic with complex branching per state/category. High value for unit tests.
- `src/lib/formatters.ts` - `formatCurrency()` and `formatPercent()` are pure functions, trivial to test.
- `scripts/build-data.mjs` - Markdown parsing helpers (`getSection`, `parseRate`, `parseNexus`, `parseExemptions`) contain regex-heavy logic that would benefit from snapshot/fixture tests.

**Test file placement convention (if added):**
- Co-locate with source: `src/lib/taxRules.test.ts`, `src/lib/formatters.test.ts`
- Or use `src/__tests__/` directory

---

*Testing analysis: 2026-03-24*
