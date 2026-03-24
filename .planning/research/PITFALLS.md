# Pitfalls Research

**Domain:** US Sales Tax Calculation (13,000 jurisdictions)
**Researched:** 2026-03-24
**Confidence:** HIGH (multiple authoritative sources confirm each pitfall)

## Critical Pitfalls

### Pitfall 1: ZIP Code as Jurisdiction Proxy

**What goes wrong:**
ZIP codes were designed for mail routing, not taxation. A single 5-digit ZIP code routinely spans multiple counties, cities, and special tax districts -- each with a different combined rate. ZIP 80111 (Greenwood Village, CO) maps to four different sales tax rates. ZIP 30052 (Loganville, GA) covers four counties. This is not uncommon: it is the norm. Using ZIP-to-rate lookup produces incorrect rates for a significant portion of addresses.

**Why it happens:**
ZIP codes feel like the right granularity. They are readily available, users know theirs, and free datasets map ZIPs to rates. The project constraints (static dataset, client-side, no geocoding API) push toward ZIP-based lookup as the pragmatic choice. Developers assume "close enough" is acceptable for a calculator.

**How to avoid:**
- Use ZIP+4 as the minimum lookup key, not 5-digit ZIP. ZIP+4 narrows to a city block or building, dramatically reducing jurisdiction ambiguity.
- For 5-digit ZIP lookups, apply the Streamlined Sales Tax (SST) rule: default to the lowest combined rate within that ZIP. This is the legally safe default and should be clearly communicated to the user.
- Display a confidence indicator: "Exact rate" when ZIP+4 resolves to a single jurisdiction vs. "Estimated rate (X-Y% range)" when a 5-digit ZIP spans multiple jurisdictions.
- Bundle a ZIP+4-to-FIPS mapping table. FIPS codes (county/place codes) align with tax jurisdictions far better than ZIP codes.

**Warning signs:**
- Your rate table has one row per 5-digit ZIP code.
- Test lookups for known multi-jurisdiction ZIPs (80111, 30052, 05495) return a single rate.
- Users report rates that do not match their actual tax bills.

**Phase to address:**
Data pipeline phase (when building the jurisdiction dataset). This is a foundational data model decision. Retrofitting from 5-digit ZIP to ZIP+4 or address-level later requires rebuilding the entire lookup structure.

---

### Pitfall 2: Missing Special District Taxes

**What goes wrong:**
The US has over 39,000 special taxing districts -- transportation development districts, stadium authorities, cultural districts, school districts, emergency communications districts, and local improvement zones. Missouri alone has 205 transportation development districts. These layer on top of state, county, and city rates. A single address in Denver can owe taxes to five separate authorities. Most free datasets and simple scrapers capture only state + county + city rates, missing the district layer entirely. The calculator shows 7.5% when the actual combined rate is 8.81%.

**Why it happens:**
Special districts are invisible in most public data. They do not align with postal geography, city boundaries, or county lines. One building can be inside a transit district while the building next door is not. Their boundaries require GIS shapefiles, not tabular ZIP-to-rate mappings. Free government datasets rarely include them comprehensively.

**How to avoid:**
- Acknowledge special districts as a known gap and communicate it clearly in the UI ("Rate shown is state + county + city. Special district taxes may apply.").
- Source data that includes district-level rates. The Census Bureau's Government Units data and state-published GIS shapefiles (e.g., Colorado's SUTS system, Washington's DOR files) are starting points.
- For the static dataset approach: include a "has special districts" flag per jurisdiction so the UI can warn users when additional taxes are likely.
- Prioritize states with the most special district complexity: Colorado, Washington, Missouri, California, Texas.

**Warning signs:**
- Your combined rate for a Denver address matches the state+city+county sum but is lower than what Avalara or TaxJar returns.
- Your dataset has zero entries with tax type "district" or "special."
- Users in Colorado, Washington, or California report rates that are consistently too low.

**Phase to address:**
Dataset construction phase. Must be a conscious decision during data sourcing: either include district data (hard, requires GIS) or explicitly exclude it with proper disclaimers (acceptable for a demo, not for "accurate enough for real e-commerce").

---

### Pitfall 3: Data Staleness in a Static Dataset

**What goes wrong:**
US tax jurisdictions implemented 408 rate changes in the first six months of 2025 alone -- a 24% increase over the prior year. Changes happen on different schedules: some states allow changes quarterly (NY: March 1, June 1, September 1, December 1), others semi-annually (CO: January 1, July 1), and legislative changes can take effect at any time. A static dataset bundled at build time starts going stale immediately. Within 3 months, dozens of rates will be wrong. Within 6 months, hundreds.

**Why it happens:**
The project is explicitly a static SPA on GitHub Pages with no server. The build-time data pipeline (markdown -> JSON) requires manual rebuilds. There is no mechanism to detect when rates change, no automated scraping, and no CI/CD trigger tied to rate change calendars.

**How to avoid:**
- Implement an automated rate verification pipeline. An agent cron job (already mentioned in PROJECT.md as a possibility) should run monthly at minimum, checking published rate tables against the bundled dataset.
- Display a prominent "Rates effective as of [date]" indicator on every calculation result. This is the single most important UX element for a static dataset calculator.
- Build the data pipeline to be re-runnable with minimal effort. "Refresh all rates" should be a single command, not a manual multi-step process.
- Track effective dates per jurisdiction in the dataset, not just the current rate. This enables "rate changed since our last update" detection.
- Set up GitHub Actions on a schedule (monthly or quarterly) that runs the data pipeline and opens a PR with diffs, so rate changes are visible and reviewable.

**Warning signs:**
- No "last updated" date anywhere in the UI.
- The data pipeline requires manual steps beyond `npm run build:data`.
- Rates for recently-changed jurisdictions (check state DOR "what's new" pages) do not match your dataset.
- The codebase CONCERNS.md already documents 5 stale/incorrect rates (AL, AR, KS, MS, ID) -- and the project is only at state level. At 13,000 jurisdictions, this problem scales dramatically.

**Phase to address:**
Must be addressed in the data pipeline phase AND as ongoing infrastructure. The pipeline design must include refresh-ability from day one. The UI must show effective dates from the first release of jurisdiction data.

---

### Pitfall 4: Floating-Point Arithmetic for Currency

**What goes wrong:**
JavaScript's `Number` type uses IEEE 754 double-precision floats. `35.00 * 0.01` returns `0.35000000000000003`. The current codebase computes `taxableAmount * taxRate` with no rounding (line 235 of taxRules.ts), then sums multiple line items. Each line item carries floating-point noise. When you sum noisy values and then round for display, the total can differ from the sum of individually rounded line items. A customer sees line items of $1.23 + $2.34 + $0.56 = $4.13, but the total shows $4.14.

**Why it happens:**
JavaScript has no native decimal type. The error is invisible for simple cases (Intl.NumberFormat rounds display output), so developers never notice during basic testing. The bug only manifests with specific price/rate combinations and multiple line items.

**How to avoid:**
- Round each tax amount to the nearest cent immediately after calculation: `Math.round(taxableAmount * taxRate * 100) / 100`. This is already identified in CONCERNS.md.
- For the sum total, sum the already-rounded line items, do not round only at display time.
- Alternative: compute entirely in integer cents. Store prices as `3500` not `35.00`, rates as basis points (`100` not `0.01`). Convert to dollars only for display. This is more robust but requires refactoring the data model.
- Test with adversarial price/rate combinations: $19.99 at 8.875%, $0.01 at 4.225%, totals with 7+ line items.

**Warning signs:**
- `taxAmount` values in TaxLineItem objects have more than 2 decimal places.
- Line item taxes visually add up to a different number than the displayed total.
- No `Math.round()` call between multiplication and storage of tax amounts.

**Phase to address:**
Immediate fix in the current codebase (trivial one-line change). Must be enforced as a rule before expanding to multi-jurisdiction calculations where you sum state + county + city + district tax amounts per item.

---

### Pitfall 5: Origin vs. Destination Tax Classification

**What goes wrong:**
US states split into origin-based (tax at seller's location) and destination-based (tax at buyer's location) sourcing. 12 states are origin-based. But the classification is not binary. California is hybrid-origin: state and local taxes use origin, but district taxes use destination. Texas origin rules exclude online order processing centers (currently in litigation). For remote sellers (seller in State A, buyer in State B with nexus), all states default to destination-based regardless of their normal rule. Getting this wrong means charging the wrong jurisdiction's rate and potentially remitting to the wrong authority.

**Why it happens:**
The distinction is not widely understood. Most developers assume "ship to = tax at." The edge cases (hybrid states, remote seller exceptions, in-state vs. out-of-state rules) are buried in state-specific administrative codes. The current codebase does not model seller location at all -- it only accepts a buyer's state.

**How to avoid:**
- Model both seller address and buyer address in the calculation. The seller address is a required input, not optional context.
- Maintain a per-state sourcing rule table: ORIGIN, DESTINATION, or HYBRID with specific hybrid rules.
- For the "remote seller" case: if seller state differs from buyer state, always use destination-based sourcing for the buyer's state.
- Start with the simple rule (origin states: TX, PA, OH, VA, CA, AZ, MO, TN, UT, MS, IL, NM) and flag California as hybrid. Then layer in the remote seller exception.
- Document that in-state intrastate rules (e.g., Texas seller to Texas buyer) differ from interstate rules (Texas seller to California buyer).

**Warning signs:**
- The calculator has no "seller location" input.
- Texas addresses always return the same rate regardless of where the seller is.
- California district taxes are calculated using the buyer's location (correct for destination) or seller's location (correct for state/local) but not both.

**Phase to address:**
Must be designed into the calculation model from the beginning of the multi-jurisdiction phase. Cannot be bolted on later without reworking the entire tax computation flow.

---

### Pitfall 6: Product Taxability Nuances Are Bottomless

**What goes wrong:**
Product taxability is not a binary taxable/exempt flag. It is a matrix of (product category x jurisdiction x conditions). A Milky Way bar is exempt food in SST states because it contains flour. A Milky Way Midnight bar is taxable candy because it does not contain flour. Pixy Stix are exempt because they are not "bars, drops, or pieces." A rotisserie chicken is taxable if heated, exempt if refrigerated. Clothing under $110 is exempt in New York but fully taxable at $111. The current codebase handles a few categories (groceries, clothing, medicine, candy, electronics) with state-level rules, but each category has dozens of jurisdiction-specific sub-rules.

**Why it happens:**
Tax law definitions are precise in ways that defy common sense. The Streamlined Sales Tax Agreement standardized some definitions (candy = sugar preparation without flour), but only 24 states are SST members and not all apply the definitions the same way. Non-SST states have their own definitions. Developers implement the "80% case" and assume edge cases are rare, but with 13,000 jurisdictions the edge cases become the norm.

**How to avoid:**
- For this project: limit product categories to a well-defined set (the current 5 are reasonable) and do NOT attempt to be exhaustive. Being wrong about a niche exemption is worse than not covering it.
- For each supported category, document the exact legal definition used and which states' definitions it follows (SST or state-specific).
- Implement taxability as a per-jurisdiction override table, not hardcoded if/else logic. The current approach of `CLOTHING_FULLY_EXEMPT`, `CLOTHING_PARTIAL`, etc. becomes unmaintainable at jurisdiction scale.
- Add a disclaimer: "Taxability determinations are based on general product categories. Specific products may be classified differently."
- Do NOT support prepared food, digital goods, or SaaS -- each of these opens an entirely new dimension of complexity.

**Warning signs:**
- The taxability logic is a growing switch statement with special cases.
- You are adding per-state if/else branches for individual products.
- Users ask "is X taxable?" for products that do not fit your categories.
- Your candy logic does not account for the flour distinction.

**Phase to address:**
Product taxability should be addressed after the jurisdiction/rate infrastructure is solid. Get the "where" right before trying to get the "what" right. The current 5 categories are sufficient for the MVP jurisdiction expansion.

---

### Pitfall 7: Two Sources of Truth for Tax Rules

**What goes wrong:**
The current codebase already demonstrates this pitfall. Tax rates and exemption rules are maintained in two independent places: 51 markdown files (processed by build-data.mjs into states.json) and hardcoded constants in taxRules.ts. The markdown says AL grocery rate is 2%, the code says 3%. The markdown says AR groceries are exempt, the code charges 0.125%. This divergence will explode at 13,000 jurisdictions. You cannot maintain jurisdiction-specific rules in both a data file and application code.

**Why it happens:**
The data pipeline was built for content (state guide pages) while the calculation engine was built for computation. They evolved independently. It feels natural to have "the code" compute taxes using coded constants, but at scale this is unmaintainable.

**How to avoid:**
- Single source of truth: all tax rates, exemptions, thresholds, and special rules must live in the data layer, not in application code.
- The calculation engine should be rule-agnostic: it reads jurisdiction data and applies rates. It should not contain `if (abbr === "NY")` branches.
- Build-time validation: a CI step that checks data consistency (e.g., every jurisdiction with `groceryExempt: true` must not also appear in a "grocery taxable" list).
- Test suite that verifies calculations against known-correct reference values for a sample of jurisdictions.

**Warning signs:**
- The word "hardcoded" appears in descriptions of tax logic.
- Updating a tax rate requires changing both a data file and a TypeScript file.
- CONCERNS.md already lists 5 data inconsistencies between sources.

**Phase to address:**
Must be resolved BEFORE expanding to 13,000 jurisdictions. This is the single most important architectural fix. Refactor the calculation engine to be data-driven in the same phase as building the expanded dataset.

---

### Pitfall 8: Ignoring Sales Tax Holidays

**What goes wrong:**
Multiple states have temporary sales tax exemption periods (back-to-school, hurricane preparedness, Energy Star appliances, etc.) lasting a few days to a few weeks. These exempt specific product categories up to specific price thresholds, vary by state, and some local jurisdictions opt out of the holiday even when the state participates. A static calculator that ignores holidays will show "taxable" during periods when items are actually exempt.

**Why it happens:**
Holidays are temporary, irregular, and vary year to year. They require date-aware logic in a system designed around static rates. Implementing them feels like overkill for a reference tool.

**How to avoid:**
- For a static reference calculator: explicitly state that tax holidays are not reflected in calculations. Add a "Tax Holidays" informational section per state listing typical holiday dates and categories.
- Do NOT try to make the static calculator date-aware for holidays. The maintenance burden (tracking exact dates, product categories, price thresholds, and local opt-outs annually) is enormous and the value is low for a reference tool.
- If implementing holiday awareness later, treat it as a time-bounded override layer on top of the base rate table, not inline logic.

**Warning signs:**
- Users complain the calculator charges tax during a holiday period.
- You are tempted to add `if (currentDate >= holidayStart && currentDate <= holidayEnd)` logic.

**Phase to address:**
Not a priority for the multi-jurisdiction expansion. Acknowledge as a known limitation in documentation. Consider as a separate future enhancement if demand warrants.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 5-digit ZIP as sole lookup key | Simple data model, small dataset, easy user input | Incorrect rates for any ZIP spanning multiple jurisdictions; cannot fix without data model change | Only if "estimated range" is displayed, never if claiming "exact rate" |
| Hardcoded per-state rules in application code | Fast to implement for 50 states | Unmaintainable at 13,000 jurisdictions; dual source of truth | Only during initial state-level demo (current milestone) |
| No effective date on rates | Simpler data model, no date comparison logic | No way to detect or communicate staleness; users assume current accuracy | Never -- always show "rates as of [date]" even in v1 |
| Ship full dataset to client | No API needed, works offline, simple architecture | Bundle size grows with jurisdictions; 13,000 entries with rates+rules could be 5-15MB | Acceptable if dataset is split by state and lazy-loaded per query |
| Skip rounding until display | Less code, Intl.NumberFormat handles it | Summing errors accumulate across line items; auditors will flag it | Never for a tax calculator |
| Flat tax rate (no tiered/threshold logic) | Simple multiplication | NY clothing ($110 threshold), MA clothing ($175 threshold), RI clothing ($250 threshold) all wrong | Only if product taxability is out of scope |

## Performance Traps

Patterns that work at small scale but fail as the dataset grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading entire jurisdiction dataset eagerly | Slow initial page load, high memory usage | Split dataset by state or region; load on demand per ZIP lookup | At ~13,000 jurisdictions the JSON could be 5-15MB; current 348KB states.json is already flagged |
| Linear search through jurisdiction array for ZIP lookup | Imperceptible at 50 states | Build a lookup index (Map or trie) keyed by ZIP/ZIP+4 at load time | At 40,000+ ZIP codes, linear scan per keystroke causes jank |
| Bundling all jurisdiction data in a single JS chunk | No code splitting in current build | Use dynamic imports; split data files per state or region | When the single bundle exceeds ~1MB (likely with full jurisdiction data) |
| Re-computing tax on every render | No visible lag with 5 items and 1 jurisdiction | Memoize calculation results; debounce input changes | When calculation involves looking up 4 tax layers per item across multiple items |

## UX Pitfalls

Common user experience mistakes in tax calculator domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing a single rate without breakdown | Users cannot verify correctness or understand what they owe to whom | Always show state + county + city + district breakdown, even if some are $0 |
| No "effective date" indicator | Users assume rates are current; make decisions based on stale data | Show "Rates effective as of [date]" prominently near every result |
| Claiming accuracy without caveats | Users rely on tool for real transactions; errors cause financial harm | Clear disclaimer: "For estimation purposes. Consult a tax professional for compliance." |
| Requiring full address for any result | Users abandon tool if they must enter street address for a quick lookup | Accept ZIP code for an estimate, offer refinement with full address |
| Not explaining exemptions | Users see "$0 tax" without understanding why | Show explanation text per line item (the current codebase does this well) |
| Mixing up "exempt" and "zero-rated" | Legally distinct concepts shown identically confuse professional users | Label exempt items as "Exempt" and zero-rated items as "0% rate" |
| Hiding the disclaimer | Legal protection buried in footer or separate page | Place disclaimer inline near the calculation result, not just in page footer |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces. This is the core danger for a tax calculator that expands from state-level to full jurisdiction coverage.

- [ ] **State-level rates "work":** But county, city, and district taxes are missing -- the combined rate can be 2-4% higher than state alone. Verify by comparing a Denver, CO result against Avalara's free calculator.
- [ ] **ZIP code lookup "works":** But multi-jurisdiction ZIPs return a single rate. Verify by testing ZIP 80111 (CO) which should map to 4 different rates.
- [ ] **Grocery exemptions "work":** But candy-with-flour vs. candy-without-flour distinction is not implemented. Verify by checking if Twix and Reese's are taxed differently in SST states.
- [ ] **Origin/destination "works":** But remote seller exception is not implemented. Verify by testing out-of-state seller to Texas buyer (should use destination, not origin).
- [ ] **Tax calculation "works":** But floating-point sum of line items may differ from sum of rounded line items. Verify by testing 10+ items with rates like 8.875%.
- [ ] **Data is "current":** But no effective date shown and no automated refresh pipeline. Verify by checking 5 recently-changed jurisdictions against their state DOR websites.
- [ ] **All 13,000 jurisdictions "covered":** But special districts are missing. Verify by comparing combined rate for a downtown Denver address against Colorado's SUTS lookup.
- [ ] **Product taxability "handled":** But threshold-based partial exemptions (NY/MA/RI clothing) may not work for per-item vs. per-invoice thresholds. Verify by testing a $200 clothing item in NY (taxable) vs. $100 (exempt).
- [ ] **Calculator "handles" all states:** But Hawaii GET, New Mexico GRT, and Arizona TPT are structurally different from sales tax (levied on seller, not buyer; different base). Verify that these states explain the distinction.
- [ ] **Disclaimer "exists":** But it is in the footer, not near the calculation. Verify that the disclaimer is visible without scrolling when viewing a tax result.
- [ ] **Sales tax holidays not tracked:** Users during a holiday period will see incorrect (too high) taxes. Verify a note exists explaining this limitation.
- [ ] **Colorado home-rule cities:** 66+ self-administered cities with their own rates, rules, and exemptions. Your dataset probably has the rates but not the city-specific exemption differences. Verify by checking if Denver's specific food exemption rules match your generic state rules.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| ZIP-only data model (no ZIP+4) | HIGH | Rebuild lookup table from scratch; requires sourcing ZIP+4-to-jurisdiction mapping data; months of work |
| Stale rates discovered post-launch | LOW | Run data refresh pipeline, rebuild, redeploy; add "last verified" date to prevent recurrence |
| Floating-point rounding errors | LOW | One-line fix (add Math.round); add test suite to prevent regression |
| Missing special districts | MEDIUM | Requires sourcing district boundary data (GIS shapefiles or commercial dataset); adding a data layer to the lookup; weeks of work |
| Dual source of truth (data vs code) | MEDIUM | Refactor calculation engine to be data-driven; migrate all hardcoded rules to data files; requires careful testing of every state |
| Wrong origin/destination classification | MEDIUM | Add seller location input; build sourcing rule table; re-test all calculations for origin-based states |
| Product taxability errors | LOW-MEDIUM | Fix specific incorrect classifications; but systemic fix requires restructuring taxability as data, not code |
| Holiday complaints | LOW | Add informational note about holidays; no code change needed if positioned as a known limitation |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Floating-point arithmetic | Phase 0 (immediate fix) | Test suite: sum of rounded line items equals displayed total for adversarial inputs |
| Dual source of truth | Phase 1 (architecture refactor before expansion) | Zero hardcoded tax rates in application code; all rates from data files |
| ZIP code granularity | Phase 1 (data model design) | Lookup for ZIP 80111 returns multiple possible rates or uses ZIP+4 |
| Data staleness | Phase 1 (pipeline infrastructure) | Automated monthly job compares bundled rates to published sources; "effective date" shown in UI |
| Missing special districts | Phase 2 (dataset expansion) | Combined rate for Denver address includes RTD tax; district layer in dataset |
| Origin vs. destination | Phase 2 (calculation model) | Seller location input exists; TX in-state uses origin; TX remote-seller uses destination |
| Product taxability nuances | Phase 3 (after rates are solid) | Flour-based candy distinction implemented for SST states; threshold exemptions tested |
| Sales tax holidays | Deferred (documentation only) | Informational note exists per state listing typical holiday periods |
| Colorado home-rule cities | Phase 2 (dataset expansion) | City-specific exemption overrides for self-administered cities |

## Legal and Compliance Considerations

While this project is explicitly a calculator/reference tool (not a compliance tool), certain legal considerations affect the product:

| Consideration | Risk | Mitigation |
|---------------|------|------------|
| Users rely on incorrect rates for real transactions | Potential financial harm to users | Prominent disclaimer near every calculation result; "effective date" on all data |
| Claiming "accurate for real e-commerce" (per PROJECT.md) | Sets expectation of compliance-grade accuracy | Qualify the claim: "accurate at the state level; local rates are estimates based on ZIP code" |
| Displaying tax breakdowns without effective dates | Users assume currency of data | Every result must show data vintage |
| No audit trail or rate sourcing | Users cannot verify where rates come from | Link to official state DOR source per jurisdiction |

## Sources

- [Avalara: ZIP Codes Are The Wrong Tool](https://www.avalara.com/us/en/learn/whitepapers/zip-codes-the-wrong-tool-for-the-job.html) -- ZIP 80111 example, compliance risk
- [TaxJar: Why ZIP Codes Don't Return Correct Rates](https://www.taxjar.com/blog/calculations/zip-codes-sales-tax) -- Stillwell OK and Williston VT examples, SST lowest-rate default
- [CereTax: Why Special Tax Jurisdictions Are a Compliance Nightmare](https://www.ceretax.com/blog/special-tax-jurisdictions) -- 39,000+ special districts, Missouri's 205 TDDs
- [Avalara: Origin vs. Destination Sales Tax](https://www.avalara.com/us/en/learn/whitepapers/origin-vs-destination-sales-tax.html) -- 12 origin states, California hybrid rules
- [Vertex: A Record Year for US Sales Tax Rate Changes](https://www.vertexinc.com/resources/resource-library/record-year-us-sales-tax-rate-changes) -- 408 rate changes in H1 2025
- [Tax Foundation: 2026 Sales Tax Rates](https://taxfoundation.org/data/all/state/sales-tax-rates/) -- current state-level rate reference
- [Avalara: State-by-State Guide to Sales Tax on Candy](https://www.avalara.com/blog/en/north-america/2019/10/state-by-state-guide-to-sales-tax-on-candy-just-in-time-for-halloween.html) -- flour distinction, SST candy definition
- [Sales Tax Institute: Food and Sales Tax](https://www.salestaxinstitute.com/resources/food-and-sales-tax-lets-dig-in) -- prepared food definitions, SST food categories
- [Stripe: Colorado Home Rule Cities](https://stripe.com/resources/more/colorados-home-rule-cities) -- 66 self-administered cities
- [Zamp: 30 Online Seller Sales Tax Challenges](https://zamp.com/blog/online-seller-sales-tax-challenges/) -- rate change frequency, compliance statistics
- [Robin Wieruch: JavaScript Rounding Errors](https://www.robinwieruch.de/javascript-rounding-errors/) -- floating-point currency arithmetic
- [Vertex: Sales Tax Holidays](https://www.vertexinc.com/resources/resource-library/back-school-tax-holidays-are-not-our-friends) -- holiday compliance complexity
- [FHWA: Transportation Sales Tax Districts](https://www.fhwa.dot.gov/ipd/value_capture/defined/faq_transportation_sales_tax_districts.aspx) -- special district structures
- Project codebase: `.planning/codebase/CONCERNS.md` -- 5 documented rate inconsistencies, floating-point issue, dual source of truth

---
*Pitfalls research for: US Sales Tax Calculation (13,000 jurisdictions)*
*Researched: 2026-03-24*
