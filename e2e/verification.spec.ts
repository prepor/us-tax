import { test, expect } from "@playwright/test";

// Helper: fill the calculator form on /calculator and click Calculate Tax
async function calculate(
  page: import("@playwright/test").Page,
  opts: {
    buyerZip: string;
    sellerZip?: string;
    amount: string;
    category?: string;
  },
) {
  await page.goto("./calculator");

  // Fill buyer ZIP
  const buyerInput = page.locator('input[placeholder="e.g. 90210"]');
  await expect(buyerInput).toBeVisible({ timeout: 10000 });
  await buyerInput.fill(opts.buyerZip);

  // Fill seller ZIP if given
  if (opts.sellerZip) {
    const sellerInput = page.locator('input[placeholder="e.g. 94102"]');
    await sellerInput.fill(opts.sellerZip);
  }

  // Fill amount
  const amountInput = page.locator('input[type="number"]');
  await amountInput.fill(opts.amount);

  // Select category if given
  if (opts.category) {
    await page.locator("select").selectOption(opts.category);
  }

  // Click Calculate Tax
  await page.getByRole("button", { name: "Calculate Tax" }).click();

  // Wait for results to appear (loading disappears)
  await expect(page.getByRole("button", { name: "Calculate Tax" })).toBeEnabled({ timeout: 10000 });
  // Small wait for DOM update
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Phase 2 Tests
// ---------------------------------------------------------------------------

test.describe("Phase 2 Verification", () => {
  test("1. End-to-end calculation: ZIP 90210 (CA), $100, with jurisdiction breakdown", async ({ page }) => {
    await calculate(page, { buyerZip: "90210", amount: "100" });

    // Check that a non-zero rate is shown (real Avalara data, rate may vary)
    const rateValue = page.locator(".text-4xl");
    await expect(rateValue).toHaveText(/\d+\.\d+%/);

    // Verify "Combined tax rate" label exists nearby
    await expect(page.getByText("Combined tax rate")).toBeVisible();

    // Verify jurisdiction breakdown table exists
    await expect(page.getByRole("heading", { name: "Jurisdiction Breakdown" })).toBeVisible();

    // Verify State row exists in the breakdown table
    const table = page.locator("table").first();
    await expect(table.locator("td", { hasText: "State" })).toBeVisible();

    // Verify the state name is California
    await expect(page.getByText("California (CA)")).toBeVisible();

    // Check that Special District row exists (Beverly Hills has a special district rate of 0.02)
    await expect(table.locator("td", { hasText: "Special District" })).toBeVisible();

    // Also verify County row exists (Beverly Hills has county rate of 0.0025)
    await expect(table.locator("td", { hasText: "County" })).toBeVisible();
  });

  test("2. No-tax state: ZIP 97201 (OR), 0% rate with explanation", async ({ page }) => {
    await calculate(page, { buyerZip: "97201", amount: "100" });

    // Rate should be 0.00%
    const rateValue = page.locator(".text-4xl");
    await expect(rateValue).toHaveText("0.00%");

    // State name should be Oregon
    await expect(page.getByText("Oregon (OR)")).toBeVisible();

    // Should have a note about no sales tax
    await expect(page.getByText("Oregon does not impose a sales tax")).toBeVisible();
  });

  test("3. Origin-based sourcing: buyer 90210 + seller 94102 (both CA), Origin badge", async ({ page }) => {
    await calculate(page, { buyerZip: "90210", sellerZip: "94102", amount: "100" });

    // Should show "Origin-based" badge (exact match to avoid matching the helper text)
    await expect(page.getByText("Origin-based", { exact: true })).toBeVisible();

    // Since seller is in SF (94102), rates should come from SF jurisdiction
    const rateValue = page.locator(".text-4xl");
    await expect(rateValue).toHaveText(/\d+\.\d+%/);
  });

  test("4. Interstate sourcing: buyer 10001 (NY) + seller 90210 (CA), Destination badge", async ({ page }) => {
    await calculate(page, { buyerZip: "10001", sellerZip: "90210", amount: "100" });

    // Should show "Destination-based" badge (interstate = always destination)
    await expect(page.getByText("Destination-based")).toBeVisible();

    // Rates should be from buyer's state (NY)
    await expect(page.getByText("New York (NY)")).toBeVisible();

    // NYC combined rate is 8.875% -> formatted as 8.88%
    const rateValue = page.locator(".text-4xl");
    await expect(rateValue).toHaveText("8.88%");
  });

  test("5. Grocery exemption: ZIP 90210 with Groceries, tax is $0 or shows exempt", async ({ page }) => {
    await calculate(page, { buyerZip: "90210", amount: "100", category: "groceries" });

    // CA exempts groceries -- total tax should be $0.00
    // The rate should be 0.00%
    const rateValue = page.locator(".text-4xl");
    await expect(rateValue).toHaveText("0.00%");

    // The Order Summary section should show Total of $100.00
    const orderSummary = page.getByText("Order Summary").locator("..");
    await expect(orderSummary).toBeVisible();

    // Tax amount should be $0.00
    await expect(page.getByText("$0.00").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 3 Tests
// ---------------------------------------------------------------------------

test.describe("Phase 3 Verification", () => {
  test("7. State page /state/CA has origin/destination badge", async ({ page }) => {
    await page.goto("./state/CA");

    // Wait for the page to load
    await expect(page.locator("h1", { hasText: "California" })).toBeVisible({ timeout: 10000 });

    // Should show "Origin-Based" badge (CA is an origin-based state)
    await expect(page.getByText("Origin-Based")).toBeVisible();
  });

  test("8. State page /state/CA has local rate table", async ({ page }) => {
    await page.goto("./state/CA");

    // Wait for the page to load
    await expect(page.locator("h1", { hasText: "California" })).toBeVisible({ timeout: 10000 });

    // Wait for data to load -- the "Local Tax Rates" section should appear
    await expect(page.getByText("Local Tax Rates")).toBeVisible({ timeout: 10000 });

    // Wait for the table to load (not "Loading local rates...")
    await expect(page.getByText("Loading local rates")).not.toBeVisible({ timeout: 10000 });

    // The table should have jurisdiction rows -- find the table inside "Local Tax Rates" section
    const section = page.getByText("Local Tax Rates").locator("..").locator(".."); // Section > h2 > text
    const localTable = section.locator("table");
    await expect(localTable).toBeVisible({ timeout: 10000 });

    // Table should have headers: Jurisdiction, Type, Local Rate, Combined Rate
    await expect(localTable.locator("th", { hasText: "Jurisdiction" })).toBeVisible();
    await expect(localTable.locator("th", { hasText: "Type" })).toBeVisible();
    await expect(localTable.locator("th", { hasText: "Local Rate" })).toBeVisible();
    await expect(localTable.locator("th", { hasText: "Combined Rate" })).toBeVisible();

    // Should have at least one data row
    const rows = localTable.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test("9. Compare tool: ZIPs 90210 and 10001 show both results with delta", async ({ page }) => {
    await page.goto("./compare");

    // Fill Location A ZIP
    const leftInput = page.locator('input[placeholder="e.g. 90210"]');
    await expect(leftInput).toBeVisible({ timeout: 10000 });
    await leftInput.fill("90210");

    // Fill Location B ZIP
    const rightInput = page.locator('input[placeholder="e.g. 10001"]');
    await rightInput.fill("10001");

    // Fill amount
    const amountInput = page.locator('input[type="number"]');
    await amountInput.fill("100");

    // Click Compare
    await page.getByRole("button", { name: "Compare" }).click();

    // Wait for results
    await expect(page.getByRole("button", { name: "Compare" })).toBeEnabled({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Both Location A and Location B columns should appear
    await expect(page.getByText("Location A").first()).toBeVisible();
    await expect(page.getByText("Location B").first()).toBeVisible();

    // Location A should show California
    await expect(page.getByText("California (CA)")).toBeVisible();

    // Location B should show New York
    await expect(page.getByText("New York (NY)")).toBeVisible();

    // The delta section should appear showing the difference
    await expect(page.getByText("Difference:")).toBeVisible();
  });

  test("10. State page /state/OR: no-tax state, no origin/destination badge, no rate table", async ({ page }) => {
    await page.goto("./state/OR");

    // Wait for the page to load
    await expect(page.locator("h1", { hasText: "Oregon" })).toBeVisible({ timeout: 10000 });

    // Should show "No Sales Tax" badge (use the badge element specifically)
    const noTaxBadge = page.locator("span.rounded-full", { hasText: "No Sales Tax" });
    await expect(noTaxBadge).toBeVisible();

    // Should NOT show origin/destination badge
    await expect(page.locator("span.rounded-full", { hasText: "Origin-Based" })).not.toBeVisible();
    await expect(page.locator("span.rounded-full", { hasText: "Destination-Based" })).not.toBeVisible();

    // Should NOT show a Local Tax Rates section at all (the whole section is conditionally rendered)
    await expect(page.getByText("Local Tax Rates")).not.toBeVisible();
  });
});
