# Feature Research

**Domain:** US sales tax calculator / jurisdiction lookup tool
**Researched:** 2026-03-24
**Confidence:** HIGH (well-documented regulatory domain, multiple authoritative sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = the tool is a toy, not a calculator.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Full jurisdiction coverage (~13,000 jurisdictions)** | Every commercial tool covers state + county + city + special district. State-only rates are useless for real tax calculation -- a buyer in Chicago pays 10.25%, not Illinois's 6.25%. | HIGH | Avalara's free CSV data provides ZIP-level breakdowns with state/county/city/special columns. ~41,500 ZIP codes, but many ZIPs have multiple rate rows (one per tax region). Data size for all states: estimate 50-80K rows total, compresses well for static bundling. |
| **Rate breakdown display (state / county / city / district)** | Users need to see WHERE the tax comes from, not just a single combined number. Every competitor (TaxJar, Avalara, TaxCloud calculators) shows the breakdown. | MEDIUM | Current `TaxSummary` only returns one `taxRate` per item. Needs to become a multi-layer rate object: `{ state, county, city, special, combined }`. |
| **ZIP code lookup** | The minimum viable address input. Users expect to type a ZIP and get a rate. Avalara's free calculator, TaxCloud, and every online tool supports this. | MEDIUM | 5-digit ZIP is imperfect (one ZIP can span multiple jurisdictions -- e.g., ZIP 30052 covers 4 counties), but it is the practical baseline for a static dataset tool. Use "lowest rate in ZIP" as safe default per SSUTA rules, or show all possible rates. |
| **Product taxability categories** | Users need to know if groceries, clothing, or medicine are taxed differently. Current app already handles 6 categories at state level -- but local jurisdictions sometimes override state exemptions (e.g., some localities tax groceries even when the state exempts them). | MEDIUM | Keep the current 6 categories (electronics, clothing, groceries, medicine, candy, general). Expand rules to account for local overrides where they exist. The SSUTA TIC code system has 100+ categories, but the top 6 cover 95% of consumer use cases. |
| **No-tax state handling** | 5 states have no sales tax: Alaska (NOMAD: AK, DE, MT, NH, OR). But Alaska allows local sales taxes (up to ~7.5% in some boroughs). Delaware, Montana, New Hampshire, Oregon truly have zero everywhere. | LOW | Already handled for state level. Needs update: Alaska should show local rates when jurisdiction data is added. |
| **Origin vs destination sourcing awareness** | Users asking "what tax do I charge?" need to know whether to use their location or the buyer's location. This is fundamental to the calculation. | MEDIUM | 11 origin-based states (AZ, CA*, IL, MS, MO, OH, PA, TN, TX, UT, VA). All others are destination-based. California is modified-origin (state/county/city = origin, district = destination). Remote sellers almost always use destination rules regardless. Display this info per state. |
| **Data freshness / date visibility** | Tax rates change constantly. Users need to know when data was last updated. Avalara updates monthly. If data is stale, users leave. | LOW | Display "rates as of [date]" prominently. Build pipeline should stamp the dataset with a generation date. Monthly refresh is the industry norm. |

### Differentiators (Competitive Advantage)

Features that set the product apart from other free tools. The key differentiator is: self-contained static tool with no API dependency.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Fully offline / no-API-dependency** | Unlike TaxJar/Avalara/TaxCloud, works without API keys, accounts, or internet after initial load. Zero cost to operate. | Already done | This is the core value prop from PROJECT.md. Every feature should preserve this property. |
| **Transparent, inspectable dataset** | Users can see exactly where rates come from. Commercial tools are black boxes. Open data = trust. | LOW | Expose the data source (Avalara free tables, state DOR sources) and last-updated date per state. Link to official state rate lookup tools for verification. |
| **Per-state guide pages enriched with local tax info** | Existing state guide pages are unique content. Enriching them with local jurisdiction details (county list with rates, city rates, special districts) makes each page a comprehensive reference. No free tool does this well. | MEDIUM | Current 51 markdown files become richer. Show top cities by population with their combined rates. Show origin/destination rule. Show product exemption details. |
| **Cart calculator with full jurisdiction breakdown** | Enter ZIP + items, see exact tax per jurisdiction layer, per product category. Most free tools only show combined rate, not the per-item category-aware breakdown. | MEDIUM | Combines ZIP lookup + product taxability + rate breakdown. This is the "wow" feature that proves it handles real complexity. |
| **Comparison mode (compare rates across locations)** | "Should I buy this in NJ or NY?" -- show side-by-side tax for the same cart in different jurisdictions. | LOW | Simple UI feature once the calculation engine supports jurisdiction lookup. High perceived value, low implementation cost. |
| **Special tax type explanations** | Hawaii's GET, New Mexico's GRT, Arizona's TPT are not technically "sales tax" but function similarly. Explaining these clearly is a differentiator for a reference tool. | LOW | Already partially handled in `taxRules.ts` notes. Expand with per-state guide content. |
| **Sales tax holiday awareness** | ~20 states hold annual tax holidays (back-to-school, severe weather prep, etc.). Showing "upcoming tax holiday" on state pages is useful reference content. | LOW | Static data: list known annual holiday dates/categories per state. Not a live feature -- just reference info on state guide pages. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time API integration** | "Use Avalara/TaxJar API for live rates" | Violates the core value prop (self-contained, no API keys, no cost). Adds runtime dependency, requires server or proxy, can't work offline. Defeats the purpose of the project. | Static dataset refreshed monthly via automated build pipeline. Clearly label "rates as of [date]" so users know freshness. |
| **Full street-address geocoding** | "ZIP is inaccurate, use rooftop geocoding" | Requires a geocoding API (Google Maps, Mapbox) -- adds cost, API dependency, and complexity. ZIP+4 requires USPS database (not freely redistributable). For a free static tool, this is overengineering. | Use 5-digit ZIP with clear disclosure: "rates are approximate; a single ZIP may span multiple tax jurisdictions." Show all possible rates for ambiguous ZIPs. |
| **Tax filing / remittance** | "Calculate how much I owe and file for me" | Legal liability, requires business registration info, state-specific filing formats, payment processing. Completely different product category. | Link to official state filing portals. Clearly state "this is a calculator, not a filing tool" in disclaimers. |
| **Marketplace facilitator rules** | "Handle Amazon/eBay marketplace tax" | Marketplace facilitator laws vary by state and change frequently. The marketplace (Amazon, eBay) handles collection, not the seller. Complex legal territory with no upside for a reference calculator. | Note on relevant state pages that marketplace facilitators collect tax on behalf of sellers. |
| **Tax exemption certificate management** | "I'm tax-exempt, let me upload my certificate" | Requires authentication, storage, certificate validation -- basically building CertCapture (Avalara's separate product). Way beyond scope. | Note that tax-exempt buyers should consult their state's exemption process. |
| **International tax (VAT/GST)** | "Add support for Canadian GST/HST" | Completely different tax regime. Would double the scope and confuse the US-focused value prop. | Keep scope to US sales tax only. If demand exists, it's a separate project. |
| **Colorado home-rule city handling** | "Handle all 70+ self-collecting home-rule cities in Colorado" | Colorado has ~700 different rate combinations and ~70 self-collecting jurisdictions with their own rules. Accurately handling this requires per-city data that changes independently. Massive data maintenance burden for one state. | Use the best available ZIP-level data for Colorado. Add a prominent note on the Colorado state page explaining home-rule complexity and linking to Colorado's official GIS lookup tool (tax.colorado.gov). |

## Origin vs Destination Rules by State

This is critical for the calculator's "which rate applies?" logic.

### Origin-Based States (11 states)
Tax is based on the **seller's** location for in-state sales:

| State | Notes |
|-------|-------|
| Arizona | TPT (Transaction Privilege Tax), origin-based |
| California | **Modified origin**: state + county + city rates use origin; district taxes use destination |
| Illinois | Origin for in-state; destination for remote sellers |
| Mississippi | Origin-based |
| Missouri | Origin-based |
| Ohio | Origin-based |
| Pennsylvania | Origin-based |
| Tennessee | Origin for in-state; **destination for remote sellers** |
| Texas | Origin-based |
| Utah | Origin-based |
| Virginia | Origin-based |

### Destination-Based States (34 states + DC)
Tax is based on the **buyer's** location:

Alabama, Arkansas, Colorado, Connecticut, DC, Florida, Georgia, Hawaii, Idaho, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Nebraska, Nevada, New Jersey, New Mexico, New York, North Carolina, North Dakota, Oklahoma, Rhode Island, South Carolina, South Dakota, Vermont, Washington, West Virginia, Wisconsin, Wyoming

### No Sales Tax (5 states -- NOMAD)
Alaska*, Delaware, Montana, New Hampshire, Oregon

*Alaska has no state tax but allows local jurisdictions to impose sales tax (some boroughs charge up to ~7.5%).

### Key Implementation Note
**Remote sellers almost always use destination-based rules**, even in origin-based states. The origin rules primarily apply to businesses with physical presence in the state selling to in-state customers. For a general-purpose calculator, destination-based lookup (buyer's ZIP) is the correct default. Display origin vs destination info on state guide pages as reference.

## Product Taxability Categories

### Core Categories (current + recommended)

| Category | Current Status | Tax Treatment | States with Special Rules |
|----------|---------------|---------------|---------------------------|
| **General/Electronics** | Implemented | Taxable everywhere with sales tax | Universal |
| **Clothing** | Implemented | Fully exempt: PA, NJ, MN, VT. Partial: NY (<$110), MA (<$175), RI (<$250). Taxable elsewhere. | 7 states with exemptions |
| **Groceries (unprepared food)** | Implemented | Exempt in most states. Reduced rate: AL(3%), AR(0.125%), IL(1%), MO(1.225%), TN(4%), VA(1%), UT(3%), KS(4%). Full rate: HI, ID, MS, SD. | ~13 states still tax groceries |
| **Candy** | Implemented | Taxed at full rate in most states even when groceries are exempt. Follows grocery rate where groceries are taxed. | Most exempt-grocery states exclude candy |
| **Medicine (Rx)** | Implemented | Exempt in all states except IL (1% reduced rate for medical appliances). | Virtually universal exemption |
| **Prepared food** | NOT implemented | Taxable in nearly all states, even those that exempt groceries. Heated food, restaurant meals, food sold with utensils. | Would add value but complex to define boundaries |
| **Digital goods/SaaS** | NOT implemented | Varies wildly: taxable in TX, NY, WA, PA, OH; exempt in CA, OR, MT. | Too complex for v1 -- 50 different answers |
| **OTC medicine** | NOT implemented | Different from Rx: taxable in many states that exempt prescriptions. | Adds nuance but low priority |

### Recommended Approach
Keep the current 6 categories for the calculator. They cover the most common consumer scenarios. Add "prepared food" as the 7th category if expanding -- it's the most frequently asked about distinction. Do NOT attempt digital goods/SaaS -- the rules vary too wildly across jurisdictions and would require per-state research for every digital product type.

## Feature Dependencies

```
[ZIP Code Lookup Dataset]
    |
    +--requires--> [Full Jurisdiction Rate Data (state/county/city/district)]
    |                  |
    |                  +--requires--> [Data Pipeline Enhancement (CSV ingestion)]
    |                  |
    |                  +--enables--> [Rate Breakdown Display]
    |                  |
    |                  +--enables--> [Alaska Local Rates]
    |
    +--enables--> [Combined Rate Calculator with Jurisdiction Breakdown]
    |                  |
    |                  +--enhances--> [Product Taxability per Jurisdiction]
    |                  |
    |                  +--enables--> [Comparison Mode]
    |
    +--enables--> [Enriched State Guide Pages]

[Origin/Destination Rules]
    |
    +--enhances--> [State Guide Pages] (reference info)
    +--enhances--> [Calculator UX] (which ZIP to enter)

[Data Freshness Stamping]
    +--independent-- (can be added any time)

[Sales Tax Holiday Data]
    +--independent-- (reference content, no calculation dependency)
```

### Dependency Notes

- **ZIP Code Lookup requires Jurisdiction Rate Data**: Can't look up a ZIP without having the rate table loaded. The dataset is the foundation for everything.
- **Rate Breakdown Display requires Jurisdiction Rate Data**: Need separate state/county/city/district columns to display a breakdown (currently only `stateRateNum` exists).
- **Combined Rate Calculator requires ZIP Lookup**: The full calculator experience chains ZIP input -> rate lookup -> product taxability -> breakdown display.
- **Comparison Mode requires Calculator**: Trivially built on top of the calculator by running it twice with different ZIPs.
- **State Guide Enrichment requires Jurisdiction Data**: To show "top cities and their rates" on each state page, need the local rate data.
- **Origin/Destination enhances but doesn't block**: Purely informational for a consumer-facing tool. Show it on state pages and in calculator UX guidance.

## MVP Definition

### Launch With (v1 -- "Full Jurisdiction Coverage" milestone)

- [ ] **Jurisdiction rate dataset** -- Ingest Avalara free CSV tables (or equivalent) for all 50 states + DC into the build pipeline. Output a ZIP-to-rates JSON/binary structure bundled into the app.
- [ ] **ZIP code rate lookup** -- User enters a 5-digit ZIP, gets the combined rate with state/county/city/special breakdown.
- [ ] **Rate breakdown display** -- Show each jurisdiction layer separately (state X% + county Y% + city Z% + special W% = combined Q%).
- [ ] **Updated calculator** -- Calculator uses ZIP code instead of state dropdown. Shows full breakdown per item with product taxability applied.
- [ ] **Data freshness stamp** -- Display "rates as of [month/year]" in the UI. Embed generation date in the dataset.
- [ ] **Fix 5 existing data inconsistencies** -- AL, AR, KS, MS, ID rates that differ between markdown and taxRules.ts.

### Add After Validation (v1.x)

- [ ] **Enriched state guide pages** -- Add local tax tables (top cities/counties with rates), origin/destination rule, and local tax complexity notes to each state page.
- [ ] **Comparison mode** -- Side-by-side rate comparison for same cart across 2-3 ZIPs.
- [ ] **Multi-ZIP awareness** -- For ZIPs that span multiple jurisdictions, show all possible rates with a note about ambiguity.
- [ ] **Origin vs destination guidance** -- In calculator, show whether the state uses origin or destination sourcing and explain which ZIP the user should enter.
- [ ] **Sales tax holiday reference** -- Add annual tax holiday dates/categories to relevant state guide pages.

### Future Consideration (v2+)

- [ ] **Prepared food category** -- 7th product category for heated/restaurant food. Requires per-state research on what counts as "prepared."
- [ ] **Automated data refresh** -- Agent/cron job that re-downloads rate CSVs monthly, rebuilds the dataset, and opens a PR.
- [ ] **Embeddable widget** -- Allow other sites to embed the calculator via iframe or web component.
- [ ] **ZIP+4 support** -- Higher precision lookup for users who provide 9-digit ZIP codes. Requires a much larger dataset.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Jurisdiction rate dataset (all ~13K) | HIGH | HIGH | P1 |
| ZIP code rate lookup | HIGH | MEDIUM | P1 |
| Rate breakdown display | HIGH | MEDIUM | P1 |
| Updated calculator with ZIP input | HIGH | MEDIUM | P1 |
| Data freshness stamp | MEDIUM | LOW | P1 |
| Fix data inconsistencies | MEDIUM | LOW | P1 |
| Enriched state guide pages | MEDIUM | MEDIUM | P2 |
| Comparison mode | MEDIUM | LOW | P2 |
| Multi-ZIP ambiguity handling | MEDIUM | MEDIUM | P2 |
| Origin/destination guidance | LOW | LOW | P2 |
| Sales tax holiday reference | LOW | LOW | P2 |
| Prepared food category | LOW | MEDIUM | P3 |
| Automated data refresh pipeline | MEDIUM | MEDIUM | P3 |
| Embeddable widget | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for the "full jurisdiction coverage" milestone
- P2: Should have, adds polish and completeness
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Avalara (free calculator) | TaxJar (calculator) | TaxCloud (free tier) | Our Approach |
|---------|--------------------------|---------------------|----------------------|--------------|
| **Jurisdiction coverage** | All ~13K via address lookup | All ~13K via API | All ~13K via API | All ~13K via static ZIP-level dataset |
| **Input method** | Street address | Street address | Street address via API | 5-digit ZIP code (pragmatic for static) |
| **Rate breakdown** | State + county + city + special | Combined rate only in free tool | Combined rate | Full breakdown (state/county/city/special) |
| **Product taxability** | Full TIC codes (600+) | Category-based | Full TIC codes | 6-7 consumer categories |
| **Offline capable** | No (API required) | No (API required) | No (API required) | **Yes -- fully offline after load** |
| **Cost** | Free calculator / paid API | Paid subscription ($99+/mo) | Free for <1000 txns/mo | **Free, forever, no limits** |
| **Data freshness** | Real-time | Real-time | Real-time | Monthly static refresh |
| **Filing integration** | Yes (paid) | Yes (paid AutoFile) | Yes (paid) | No -- calculator only |
| **Open source / inspectable** | No | No | No | **Yes -- all data visible** |
| **State reference guides** | Basic rate pages | Blog content | Minimal | **Comprehensive per-state guides** |

## Data Size Considerations for Static Bundle

Critical constraint: everything must bundle into a client-side SPA on GitHub Pages.

| Data Point | Estimate | Notes |
|------------|----------|-------|
| Total US ZIP codes | ~41,500 | 5-digit ZIPs only |
| Rows in rate table (with multi-jurisdiction ZIPs) | 50,000 - 80,000 | Many ZIPs have multiple rate regions |
| Raw CSV size (all states) | ~5-8 MB | Avalara format with headers |
| Optimized JSON | ~2-4 MB | Strip headers, use short keys, numeric rates |
| Gzipped for transfer | ~300-600 KB | JSON compresses extremely well (repetitive structure) |

This is feasible for a static SPA. The current `states.json` is tiny by comparison. The ZIP-rate dataset at ~300-600KB gzipped is comparable to a medium-sized image.

**Optimization strategies:**
- Use a binary format or compressed JSON for the rate table
- Lazy-load the full dataset only when the calculator is opened
- Keep state guide data separate from the rate lookup table
- Consider code-splitting: state pages load state data, calculator loads ZIP data

## Sources

- [TaxJar: Origin-Based and Destination-Based Sales Tax](https://www.taxjar.com/sales-tax/origin-based-and-destination-based-sales-tax)
- [Avalara: Origin vs Destination Sales Tax](https://www.avalara.com/us/en/learn/whitepapers/origin-vs-destination-sales-tax.html)
- [Avalara: Free Tax Rate Table Downloads](https://www.avalara.com/taxrates/en/download-tax-tables.html)
- [Avalara: ZIP Codes -- The Wrong Tool for the Job](https://www.avalara.com/us/en/learn/whitepapers/zip-codes-the-wrong-tool-for-the-job.html)
- [TaxJar: Why ZIP Codes Don't Always Return Correct Rates](https://www.taxjar.com/blog/calculations/zip-codes-sales-tax)
- [TaxCloud: TIC Codes for Product Taxability](https://taxcloud.com/sales-tax-tic-codes/)
- [Stripe: Product Tax Codes](https://docs.stripe.com/tax/tax-codes)
- [Zamp: Sales Tax on Groceries by State](https://zamp.com/resources/sales-tax-on-groceries/)
- [Zamp: Sales Tax on Clothing by State](https://zamp.com/resources/sales-tax-on-clothing/)
- [Tax Foundation: 2026 Sales Tax Rates](https://taxfoundation.org/data/all/state/sales-tax-rates/)
- [SSUTA: State Taxability Matrix](https://www.streamlinedsalestax.org/Shared-Pages/State-taxability-matrix)
- [Avalara: 2026 Sales Tax Holidays](https://www.avalara.com/blog/en/north-america/2026/01/sales-tax-holidays.html)
- [Colorado DOR: Transition to Destination Sourcing](https://tax.colorado.gov/transition-to-destination-sourcing)
- [SalesTaxHandbook: Downloadable Data](https://www.salestaxhandbook.com/data)
- [TaxConnex: Origin vs Destination States](https://www.taxconnex.com/blog-/what-you-need-to-know-origin-vs.-destination-states)
- [USPS: Number of ZIP Codes](https://facts.usps.com/42000-zip-codes/)
- [Zip2Tax: Sales Tax Lookup Levels](https://www.zip2tax.com/pages/compare-zip-code-resolutions)

---
*Feature research for: US sales tax calculator*
*Researched: 2026-03-24*
