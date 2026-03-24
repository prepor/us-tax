# Architecture Patterns

**Domain:** Client-side US sales tax calculator with full jurisdiction coverage
**Researched:** 2026-03-24

## Recommended Architecture

The system extends the existing build-time pipeline pattern into three new layers: a **data pipeline** (source -> build -> optimized binary), a **lookup engine** (ZIP-to-jurisdictions resolution), and a **calculation engine** (origin/destination + product taxability). The browser never talks to a server -- all data ships as static assets, lazy-loaded on demand.

### Architecture Diagram

```
                    BUILD TIME (Node.js)
  ┌───────────────────────────────────────────────────────────────┐
  │                                                               │
  │   DATA SOURCES (per-state)             EXISTING PIPELINE      │
  │   ┌─────────────────────┐              ┌──────────────────┐   │
  │   │ SST boundary/rate   │              │ state-taxes/*.md │   │
  │   │ files (24 states)   │              │ (51 files)       │   │
  │   ├─────────────────────┤              └────────┬─────────┘   │
  │   │ State DoR CSV files │                       │             │
  │   │ (AL, WA, NC, etc.)  │                       ▼             │
  │   ├─────────────────────┤              ┌──────────────────┐   │
  │   │ Avalara rate tables │              │ build-data.mjs   │   │
  │   │ (remaining states)  │              │ (existing)       │   │
  │   └────────┬────────────┘              └────────┬─────────┘   │
  │            │                                    │             │
  │            ▼                                    ▼             │
  │   ┌─────────────────────┐              ┌──────────────────┐   │
  │   │ scripts/            │              │ src/data/        │   │
  │   │ build-tax-data.ts   │              │ states.json      │   │
  │   │                     │              │ (existing)       │   │
  │   │ 1. Normalize CSVs   │              └──────────────────┘   │
  │   │ 2. Merge sources    │                                     │
  │   │ 3. Validate rates   │                                     │
  │   │ 4. Encode binary    │                                     │
  │   └────────┬────────────┘                                     │
  │            │                                                  │
  │            ▼                                                  │
  │   ┌─────────────────────────────────────────────────────┐     │
  │   │ public/tax-data/                                    │     │
  │   │ ├── jurisdictions.json    (state→origin/dest rules) │     │
  │   │ ├── taxability.json       (product category rules)  │     │
  │   │ ├── rates-AL.bin          (per-state ZIP→rate data) │     │
  │   │ ├── rates-CA.bin                                    │     │
  │   │ ├── ...                   (one .bin per state)      │     │
  │   │ └── rates-WY.bin                                    │     │
  │   └─────────────────────────────────────────────────────┘     │
  └───────────────────────────────────────────────────────────────┘

                    RUNTIME (browser)
  ┌───────────────────────────────────────────────────────────────┐
  │                                                               │
  │   ┌──────────────┐     ┌──────────────────────────────────┐   │
  │   │ UI Layer     │     │ Engine Layer (src/lib/)           │   │
  │   │              │     │                                  │   │
  │   │ Calculator   │────▶│ ┌───────────────────────┐        │   │
  │   │ Page         │     │ │ taxCalculator.ts      │        │   │
  │   │              │     │ │ - resolveJurisdiction()│        │   │
  │   │ State Guide  │     │ │ - applyTaxability()   │        │   │
  │   │ Pages        │     │ │ - calculateTax()      │        │   │
  │   │              │     │ └───────────┬───────────┘        │   │
  │   └──────────────┘     │             │                    │   │
  │                        │             ▼                    │   │
  │                        │ ┌───────────────────────┐        │   │
  │                        │ │ rateLookup.ts         │        │   │
  │                        │ │ - loadStateRates()    │        │   │
  │                        │ │ - lookupZIP()         │        │   │
  │                        │ │ - binary decode       │        │   │
  │                        │ └───────────┬───────────┘        │   │
  │                        │             │                    │   │
  │                        │             ▼                    │   │
  │                        │ ┌───────────────────────┐        │   │
  │                        │ │ In-memory Map cache   │        │   │
  │                        │ │ (per loaded state)    │        │   │
  │                        │ └───────────────────────┘        │   │
  │                        └──────────────────────────────────┘   │
  │                                      │                        │
  │                                      │ fetch()                │
  │                                      ▼                        │
  │                        ┌──────────────────────────────────┐   │
  │                        │ public/tax-data/rates-XX.bin     │   │
  │                        │ (loaded on demand per state)     │   │
  │                        └──────────────────────────────────┘   │
  └───────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Data Pipeline** (`scripts/build-tax-data.ts`) | Ingest multi-source CSVs, normalize, validate, encode to compact binary format | Source files (read), `public/tax-data/` (write) |
| **Rate Lookup Engine** (`src/lib/rateLookup.ts`) | Load per-state binary data on demand, decode, expose ZIP-to-rate Map | `public/tax-data/rates-XX.bin` (fetch), in-memory Map (write/read) |
| **Jurisdiction Resolver** (part of `taxCalculator.ts`) | Determine origin vs destination rules for a given state | `jurisdictions.json` (read once at init) |
| **Taxability Engine** (part of `taxCalculator.ts`) | Apply product category exemptions per jurisdiction | `taxability.json` (read once at init), existing category rules |
| **Calculator UI** (`src/pages/CalculatorPage.tsx`) | User input (ZIP, products), display results | Engine layer (call), Rate Lookup (trigger load) |
| **State Guide Pages** (`src/pages/StatePage.tsx`) | Display local tax detail per state | `states.json` (existing), optionally rate data |

## Data Pipeline Architecture

### The ZIP Code Problem

ZIP codes are postal delivery routes, not tax boundaries. A single ZIP can span multiple counties, cities, and special tax districts with different rates. There are ~41,500 US ZIP codes but ~13,000 tax jurisdictions. Some key facts:

- ZIP 30052 covers 4 counties with 4 different rates
- Washington state has 355 jurisdictions but ~800 ZIP codes
- A ZIP can have 1-6+ different combined rates within it

**Pragmatic approach for this project:** Use ZIP code as the primary lookup key, accepting that some ZIPs have multiple rates. For ambiguous ZIPs, show the most common rate (USPS primary location) and display a warning. This is the approach Avalara, Zip2Tax, and most commercial tools use for their "simple" tier. Full address-level precision requires geocoding, which is out of scope for a static site.

### Data Source Strategy (Priority Order)

**Tier 1 -- SST Boundary/Rate Files (24 states, FREE, authoritative)**
The Streamlined Sales Tax Governing Board requires member states to publish CSV boundary and rate files, updated quarterly. Member states: AR, GA, IN, IA, KS, KY, MI, MN, NE, NV, NJ, NC, ND, OH, OK, RI, SD, UT, VT, WA, WV, WI, WY. These files map 5-digit and 9-digit ZIP codes to FIPS jurisdiction codes, which link to rate tables.

Format: CSV, no headers. Boundary file maps ZIP to FIPS codes + special district codes. Rate file maps FIPS codes to rates by date. Both linked by jurisdiction code.

**Tier 2 -- State Department of Revenue Downloads (varies, FREE)**
Several non-SST states publish their own rate files:
- Alabama: `taxrates.csv` and `taxrates_current.csv` updated monthly
- Washington: comma-separated `.txt` in ZIP archives, updated quarterly (also SST)
- North Carolina: CSV format (also SST)
- Many others have per-county/city rate tables on their DoR websites

**Tier 3 -- Avalara Free Rate Tables (all states, FREE with email, monthly)**
Avalara provides free CSV rate tables per state with fields: State, ZIP Code, Tax Region Name, Estimated Combined Rate, State Rate, Estimated County Rate, Estimated City Rate, Special Rate, Risk Level. Updated monthly. Requires email registration. Redistribution terms unclear -- use as validation/fallback, not primary source.

**Tier 4 -- Manual Curation (last resort)**
For states with no machine-readable data, rates can be manually compiled from state DoR websites into the project's existing markdown format and extracted by the build pipeline.

### Build Pipeline Design

```
scripts/build-tax-data.ts
├── ingestors/
│   ├── sst.ts           -- parse SST boundary + rate CSV files
│   ├── state-dor.ts     -- parse state-specific CSV formats (AL, etc.)
│   ├── avalara.ts       -- parse Avalara CSV tables
│   └── manual.ts        -- parse hand-curated data from markdown
├── normalizer.ts        -- unify all sources into common schema
├── validator.ts         -- cross-check rates across sources, flag discrepancies
├── encoder.ts           -- encode normalized data into compact binary
└── writer.ts            -- write per-state .bin files + metadata JSON
```

**Common normalized schema (intermediate):**

```typescript
interface TaxRecord {
  zip5: string;          // 5-digit ZIP
  stateAbbr: string;     // 2-letter state
  stateRate: number;     // decimal (0.065 = 6.5%)
  countyRate: number;
  countyName: string;
  cityRate: number;
  cityName: string;
  specialRate: number;   // special district combined
  combinedRate: number;  // sum of all
  isPrimary: boolean;    // USPS primary location for this ZIP
}
```

### Binary Encoding Strategy

Why binary instead of JSON: ~41,500 ZIPs x ~50 bytes per record as JSON = ~3-4MB JSON. As compact binary = ~1-1.5MB. With gzip on static hosting = ~300-500KB transferred. Splitting per-state means each state is 5-50KB gzipped, loaded on demand.

**Proposed binary format per state file (`.bin`):**

```
Header (8 bytes):
  [2 bytes] magic number (0x5458 = "TX")
  [2 bytes] version
  [2 bytes] record count
  [2 bytes] string table offset

Per record (fixed 12 bytes):
  [3 bytes] ZIP code (encoded as 17-bit integer, 00000-99999 fits in 17 bits, padded to 3 bytes)
  [2 bytes] combined rate (uint16, rate * 10000, so 10.25% = 1025)
  [2 bytes] state rate (uint16, same encoding)
  [2 bytes] county rate (uint16)
  [2 bytes] city rate (uint16)
  [1 byte]  flags (isPrimary, hasSpecialDistrict, etc.)

String table (variable):
  County and city names, referenced by index from a separate metadata sidecar
```

**Alternative (simpler, recommended for v1):** Use JSON but aggressively compressed.

```typescript
// Per-state JSON file, gzips very well due to repetition
interface StateRateFile {
  state: string;
  updated: string;
  // Parallel arrays -- much more compact than array of objects
  zips: number[];     // [10001, 10002, 10003, ...]
  combined: number[]; // [8875, 8875, 8500, ...]  (rate * 10000)
  stRate: number;     // state rate (same for all ZIPs in state)
  coRate: number[];   // county rates
  ciRate: number[];   // city rates
  spRate: number[];   // special district rates
  coName: string[];   // county name index
  ciName: string[];   // city name index
  coIdx: number[];    // county index per ZIP
  ciIdx: number[];    // city index per ZIP
  primary: number[];  // indices of primary-location ZIPs
}
```

**Why parallel arrays over array-of-objects:** JSON with repeated keys (`{"zip":10001,"combined":8875,...}`) wastes bytes on key names. Parallel arrays eliminate this. A state like California with ~2,600 ZIPs: array-of-objects ~180KB, parallel arrays ~70KB, gzipped ~15KB.

**Recommended approach:** Start with parallel-array JSON (simpler tooling, debuggable, good-enough compression). Migrate to binary only if bundle size proves problematic. JSON gzips to roughly the same transfer size as custom binary.

## Lookup Engine Architecture

### Loading Strategy: Per-State Lazy Loading

The critical insight: users look up one or two states at a time. Loading all 50 states upfront wastes bandwidth. Instead:

1. **At app init:** Load `jurisdictions.json` (~2KB) and `taxability.json` (~5KB) -- small metadata files bundled with the app or fetched once.
2. **On first lookup for a state:** `fetch('/us-tax/tax-data/rates-CA.json')`, decode, build in-memory Map.
3. **Cache in memory:** Once loaded, a state's rate data stays in a `Map<number, TaxRecord>` for instant subsequent lookups.
4. **Prefetch on hover/focus:** When user starts typing a ZIP, prefetch the state file based on first digit (ZIP prefix ranges map to states).

```typescript
// src/lib/rateLookup.ts

// Cache: state abbreviation -> Map<zipCode, rates>
const stateCache = new Map<string, Map<number, ZipRateEntry>>();

export async function loadStateRates(stateAbbr: string): Promise<void> {
  if (stateCache.has(stateAbbr)) return;

  const url = `${import.meta.env.BASE_URL}tax-data/rates-${stateAbbr}.json`;
  const data: StateRateFile = await fetch(url).then(r => r.json());

  const rateMap = new Map<number, ZipRateEntry>();
  for (let i = 0; i < data.zips.length; i++) {
    rateMap.set(data.zips[i], {
      combinedRate: data.combined[i] / 10000,
      stateRate: data.stRate / 10000,
      countyRate: data.coRate[i] / 10000,
      cityRate: data.ciRate[i] / 10000,
      specialRate: data.spRate[i] / 10000,
      countyName: data.coName[data.coIdx[i]],
      cityName: data.ciName[data.ciIdx[i]],
      isPrimary: data.primary.includes(i),
    });
  }

  stateCache.set(stateAbbr, rateMap);
}

export function lookupZIP(
  stateAbbr: string,
  zip: number
): ZipRateEntry | null {
  const rateMap = stateCache.get(stateAbbr);
  if (!rateMap) return null;
  return rateMap.get(zip) ?? null;
}
```

### ZIP-to-State Resolution

Users may enter a ZIP without selecting a state. ZIP prefixes map deterministically to states (first 3 digits = SCF area). Include a small bundled lookup (~3KB) mapping ZIP prefix ranges to state abbreviations:

```typescript
// Bundled in app (tiny, ~3KB)
// Format: [startZip3, endZip3, stateAbbr]
const ZIP_PREFIX_MAP: [number, number, string][] = [
  [0, 0, "PR"],    // Puerto Rico
  [1, 6, "MA"],    // Massachusetts
  [7, 9, "RI"],    // Rhode Island
  // ... ~150 entries covering all 3-digit prefixes
  [995, 999, "AK"],
];

export function zipToState(zip: number): string | null {
  const prefix = Math.floor(zip / 100);
  for (const [start, end, state] of ZIP_PREFIX_MAP) {
    if (prefix >= start && prefix <= end) return state;
  }
  return null;
}
```

### Performance Characteristics

| Operation | Data Size | Time |
|-----------|-----------|------|
| Initial page load | 0 bytes extra (lazy) | 0ms |
| Load one state's rates | 5-50KB gzipped | 50-200ms (network) |
| Decode JSON + build Map | N/A | 5-20ms |
| Single ZIP lookup (cached) | In-memory Map.get() | <0.01ms |
| ZIP prefix -> state | Bundled 3KB array | <0.1ms |

An in-memory `Map` with ~2,600 entries (California, largest state) uses roughly 200KB of heap. Even loading all 50 states would use ~5MB heap, well within browser limits. But lazy loading keeps initial memory near zero.

## Calculation Engine Architecture

### Origin vs. Destination Resolution

US sales tax sourcing rules determine which jurisdiction's rates apply:

**Origin-based states (11):** Tax based on seller's location.
Arizona, California (modified), Illinois, Mississippi, Missouri, Ohio, Pennsylvania, Tennessee, Texas, Utah, Virginia.

**Destination-based states (34 + DC):** Tax based on buyer's address.
All other states with sales tax.

**No sales tax (5):** Alaska (local only), Delaware, Montana, New Hampshire, Oregon.

The calculator needs both addresses (seller + buyer) to determine which rates apply:

```typescript
// src/lib/taxCalculator.ts

interface TaxCalculation {
  sellerState: string;
  sellerZip: number;
  buyerState: string;
  buyerZip: number;
  items: CartItem[];
}

function resolveTaxJurisdiction(calc: TaxCalculation): {
  rateState: string;
  rateZip: number;
  sourcingRule: "origin" | "destination" | "mixed";
} {
  const { sellerState, buyerState } = calc;

  // Interstate sales: almost always destination-based
  if (sellerState !== buyerState) {
    return {
      rateState: buyerState,
      rateZip: calc.buyerZip,
      sourcingRule: "destination",
    };
  }

  // Intrastate: depends on state rules
  if (ORIGIN_STATES.has(sellerState)) {
    // California special case: state/county/city = origin, district = destination
    if (sellerState === "CA") {
      return {
        rateState: sellerState,
        rateZip: calc.sellerZip, // primary rates from seller
        sourcingRule: "mixed",
      };
    }
    return {
      rateState: sellerState,
      rateZip: calc.sellerZip,
      sourcingRule: "origin",
    };
  }

  return {
    rateState: buyerState,
    rateZip: calc.buyerZip,
    sourcingRule: "destination",
  };
}
```

### Product Taxability Engine

The existing `taxRules.ts` has hardcoded exemption logic per product category. This should be refactored into a data-driven system loaded from `taxability.json`:

```typescript
// taxability.json structure
interface TaxabilityRules {
  categories: {
    [category: string]: {
      default: "taxable" | "exempt";
      overrides: {
        [stateAbbr: string]: {
          status: "taxable" | "exempt" | "reduced";
          rate?: number;        // for reduced rate
          threshold?: number;   // for partial exemption (clothing)
          thresholdType?: "exempt_below" | "tax_excess";
          note: string;
        };
      };
    };
  };
}
```

**Example `taxability.json`:**

```json
{
  "categories": {
    "medicine": {
      "default": "exempt",
      "overrides": {
        "IL": { "status": "exempt", "note": "Prescription drugs exempt (1% for medical appliances only)" }
      }
    },
    "groceries": {
      "default": "exempt",
      "overrides": {
        "AL": { "status": "reduced", "rate": 0.03, "note": "State taxes groceries at reduced 3%" },
        "MS": { "status": "taxable", "note": "Groceries taxed at full 7% rate" },
        "ID": { "status": "taxable", "note": "Groceries taxable at full 6% rate" }
      }
    },
    "clothing": {
      "default": "taxable",
      "overrides": {
        "PA": { "status": "exempt", "note": "Clothing exempt from sales tax" },
        "NY": { "status": "reduced", "threshold": 110, "thresholdType": "exempt_below", "note": "Items under $110 exempt" },
        "MA": { "status": "reduced", "threshold": 175, "thresholdType": "tax_excess", "note": "Tax on amount over $175" }
      }
    }
  }
}
```

This replaces the hardcoded `Set`s and `Record`s in `taxRules.ts` with data that can be updated without code changes.

### Combined Calculation Flow

```
User Input
  │
  ├── Seller ZIP + Buyer ZIP + Product list
  │
  ▼
resolveTaxJurisdiction()
  │
  ├── Determines: which state + ZIP to look up rates for
  │   (based on origin/destination/mixed rules)
  │
  ▼
loadStateRates() + lookupZIP()
  │
  ├── Returns: combined, state, county, city, special rates
  │   plus jurisdiction names
  │
  ▼
applyTaxability() (per item)
  │
  ├── For each product category:
  │   1. Check taxability rules for this state
  │   2. Apply exemptions, reduced rates, thresholds
  │   3. Calculate taxable amount and applicable rate
  │
  ▼
TaxBreakdown
  │
  ├── Per-item: subtotal, taxable amount, rate, tax, explanation
  ├── Per-jurisdiction: state tax, county tax, city tax, special tax
  └── Totals: subtotal, total tax, grand total, effective rate
```

## Component Architecture (UI)

### New Components Needed

```
src/
├── lib/
│   ├── rateLookup.ts         NEW  -- lazy-load + cache per-state rate data
│   ├── taxCalculator.ts      NEW  -- jurisdiction resolution + taxability + calc
│   ├── zipUtils.ts           NEW  -- ZIP prefix -> state, validation
│   ├── taxRules.ts           KEEP -- backward compat wrapper, delegates to taxCalculator
│   └── formatters.ts         KEEP
├── components/
│   ├── Layout.tsx             KEEP
│   ├── ZipInput.tsx           NEW  -- ZIP code input with validation + auto-state detection
│   ├── TaxBreakdown.tsx       NEW  -- jurisdiction-level rate breakdown display
│   └── JurisdictionBadge.tsx  NEW  -- visual badge showing jurisdiction detail
├── pages/
│   ├── HomePage.tsx           KEEP
│   ├── StatePage.tsx          MODIFY -- add local tax rates section
│   └── CalculatorPage.tsx     MODIFY -- add ZIP input, dual-address, full breakdown
└── data/
    ├── products.ts            KEEP
    └── states.json            KEEP (existing state guides)
```

### Data Flow Between Components

```
CalculatorPage
  │
  ├── ZipInput (seller)  ──► zipUtils.zipToState() ──► auto-select state
  ├── ZipInput (buyer)   ──► zipUtils.zipToState() ──► auto-select state
  ├── Product selector   ──► existing products.ts
  │
  └── on calculate:
      │
      ├── taxCalculator.calculateFullTax({
      │     sellerZip, buyerZip, items
      │   })
      │   │
      │   ├── resolveTaxJurisdiction()
      │   ├── await loadStateRates()    ← async, lazy fetch
      │   ├── lookupZIP()
      │   ├── applyTaxability()         ← per item
      │   └── return TaxBreakdown
      │
      └── TaxBreakdown component renders result
          ├── Per-item table with rate + explanation
          ├── Jurisdiction breakdown (state / county / city / special)
          └── Notes (origin/dest rule, ZIP ambiguity warnings)
```

## Patterns to Follow

### Pattern 1: Lazy Data Loading with Cache

**What:** Fetch per-state rate data only when needed, cache in memory.
**When:** Any time a user initiates a lookup for a state not yet loaded.
**Why:** Keeps initial bundle small (~0 bytes of tax data), loads ~10-50KB per state on demand.

```typescript
// Singleton cache pattern
const cache = new Map<string, Promise<Map<number, ZipRateEntry>>>();

export function loadStateRates(state: string): Promise<Map<number, ZipRateEntry>> {
  if (!cache.has(state)) {
    // Store the promise, not the result -- prevents duplicate fetches
    cache.set(state, fetchAndDecode(state));
  }
  return cache.get(state)!;
}
```

### Pattern 2: Parallel Arrays for Compact JSON

**What:** Store related data as parallel arrays instead of array-of-objects.
**When:** Any data file with many records of uniform structure.
**Why:** Eliminates repeated key names, compresses ~60% better with gzip.

```typescript
// Instead of: [{"zip":10001,"rate":8875}, {"zip":10002,"rate":8875}]
// Use:        {"zips":[10001,10002], "rates":[8875,8875]}
```

### Pattern 3: Data-Driven Rules Over Hardcoded Logic

**What:** Move tax exemption rules from code (`switch`/`if`) to a JSON data file.
**When:** Business rules that vary by jurisdiction and change over time.
**Why:** Rules can be updated without code changes; pipeline can validate rules against source data.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Loading All States Upfront

**What:** Bundling all 50 states' rate data into the main JS bundle or fetching everything at init.
**Why bad:** ~1-4MB of data the user probably does not need. Destroys initial load time.
**Instead:** Per-state lazy loading via `fetch()`. Only load states the user actually looks up.

### Anti-Pattern 2: Using ZIP as Sole Source of Truth

**What:** Treating a 5-digit ZIP code as a precise tax jurisdiction identifier.
**Why bad:** ZIPs cross county/city boundaries. A single ZIP can have 2-6 different combined rates.
**Instead:** Use ZIP as primary lookup, show the USPS-primary rate, display a disclaimer for ambiguous ZIPs, and note when multiple rates exist within a ZIP.

### Anti-Pattern 3: Real-Time Data Fetching

**What:** Calling an external API (Avalara, TaxJar) at runtime for rate lookups.
**Why bad:** Violates the project's core constraint (static site, no backend, works offline). Adds latency, requires API keys, creates a runtime dependency.
**Instead:** All data is baked into static files at build time. Updates happen via periodic rebuild (monthly or quarterly).

### Anti-Pattern 4: One Giant Data File

**What:** Putting all jurisdiction data into a single JSON file.
**Why bad:** Forces browser to download and parse all 41,500 ZIP records even for a single lookup.
**Instead:** Split by state. Each state file is small enough to load individually.

## Bundle Size Strategy

### Size Estimates

| Asset | Raw | Gzipped | When Loaded |
|-------|-----|---------|-------------|
| `jurisdictions.json` (origin/dest rules) | ~2KB | ~0.5KB | App init (bundled) |
| `taxability.json` (product rules) | ~8KB | ~2KB | App init (bundled) |
| ZIP prefix -> state map | ~3KB | ~1KB | App init (bundled) |
| Single state rate file (avg) | ~30KB | ~8KB | On demand |
| Single state rate file (CA, largest) | ~120KB | ~25KB | On demand |
| All 50 state files combined | ~1.5MB | ~400KB | Never loaded at once |
| Existing `states.json` | 354KB | ~60KB | Existing, unchanged |

**Total initial overhead:** ~3.5KB gzipped added to main bundle.
**Per-lookup overhead:** ~8KB gzipped per state (one-time, cached).

### Code Splitting Configuration

The rate data files live in `public/tax-data/` (not `src/`), so Vite does not bundle them into JS. They are served as static assets and fetched at runtime. This is the simplest and most effective splitting strategy -- no rollup `manualChunks` needed.

```typescript
// vite.config.ts -- no changes needed for data splitting
// Files in public/ are served as-is, not processed by Vite
```

New page components can use React `lazy()` for route-based code splitting:

```typescript
// src/App.tsx
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
```

## Scalability Considerations

| Concern | Current (51 states) | At full coverage (~13K jurisdictions) | If ZIP+4 added |
|---------|---------------------|---------------------------------------|----------------|
| Data size | 354KB JSON | ~1.5MB total, ~8KB per state (gzipped) | ~10MB total, still lazy-loaded |
| Lookup speed | Array scan | Map.get() O(1) | Same Map.get() O(1) |
| Memory | All states in JS bundle | ~200KB per loaded state | ~2MB per loaded state |
| Build time | 1-2 seconds | 10-30 seconds (CSV parsing + encoding) | 1-2 minutes |
| Update frequency | Manual edits | Monthly automated pipeline | Monthly automated pipeline |

## Build Order Implications

Dependencies flow in this order:

```
Phase 1: Data Pipeline
  └── Must exist first: source data ingestion, normalization, validation
  └── Output: per-state .json files in public/tax-data/
  └── Depends on: nothing new (extends existing build-data.mjs)

Phase 2: Lookup Engine
  └── Must exist before calculation engine
  └── rateLookup.ts: load, decode, cache, lookup
  └── Depends on: Phase 1 output format being stable

Phase 3: Calculation Engine
  └── Jurisdiction resolution + taxability
  └── Depends on: Lookup Engine (Phase 2) + jurisdictions.json + taxability.json

Phase 4: UI Integration
  └── Calculator page updates, new components
  └── Depends on: Calculation Engine (Phase 3) exposing a clean API
```

Each phase is independently testable. Phase 1 can be validated by checking output files. Phase 2 can be tested with mock data. Phase 3 with hardcoded rates. Phase 4 only after the engine API is stable.

## Sources

- [Streamlined Sales Tax Rate and Boundary Files](https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files) -- SST member states, quarterly CSV updates (HIGH confidence)
- [Avalara Free Tax Rate Tables](https://www.avalara.com/taxrates/en/download-tax-tables.html) -- per-state CSV with ZIP-level rates (HIGH confidence)
- [Alabama DoR Tax Rates CSV](https://www.revenue.alabama.gov/sales-use/local-cities-and-counties-tax-rates-text-file/) -- state-published rate file (HIGH confidence)
- [Washington DoR Downloadable Database](https://dor.wa.gov/taxes-rates/sales-use-tax-rates/downloadable-database) -- quarterly ZIP+4 data (HIGH confidence)
- [NC DoR Rate and Boundary Database](https://www.ncdor.gov/taxes-forms/sales-and-use-tax/other-sales-and-use-tax-resources/streamlined-sales-tax-information/rate-and-boundary-database-information) -- SST format example (HIGH confidence)
- [TaxJar Origin vs Destination Guide](https://www.taxjar.com/sales-tax/origin-based-and-destination-based-sales-tax) -- complete state classification (MEDIUM confidence)
- [Avalara ZIP Codes Whitepaper](https://www.avalara.com/us/en/learn/whitepapers/zip-codes-the-wrong-tool-for-the-job.html) -- ZIP-to-jurisdiction mapping limitations (HIGH confidence)
- [USPS ZIP Code Facts](https://facts.usps.com/42000-zip-codes/) -- ~41,552 US ZIP codes (HIGH confidence)
- [Tax Foundation 2026 Rates](https://taxfoundation.org/data/all/state/sales-tax-rates/) -- state-level rate reference (HIGH confidence)

---

*Architecture research: 2026-03-24*
