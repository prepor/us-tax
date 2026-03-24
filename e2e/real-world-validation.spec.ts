import { test, expect } from "@playwright/test";

/**
 * Real-world tax rate validation tests.
 *
 * These test cases use actual ZIP codes and validate the calculator
 * against rates from Avalara CSV data (March 2026). Rates are verified
 * against official state/city tax authority websites.
 */

async function calculate(
  page: import("@playwright/test").Page,
  opts: { buyerZip: string; amount: string; category?: string },
) {
  await page.goto("/us-tax/#/calculator");
  await page.locator('input[placeholder="e.g. 90210"]').fill(opts.buyerZip);
  await page.locator('input[placeholder="0.00"]').fill(opts.amount);
  if (opts.category) {
    await page.locator("select").selectOption(opts.category);
  }
  await page.getByRole("button", { name: /calculate/i }).click();
  await page.waitForTimeout(500);
}

function rateText(rate: number): string {
  return (rate * 100).toFixed(2) + "%";
}

test.describe("Real-World Tax Rate Validation", () => {
  test("Chicago IL 60601 — high-tax city, 10.25%", async ({ page }) => {
    await calculate(page, { buyerZip: "60601", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.1025));
    await expect(page.getByText("Illinois (IL)")).toBeVisible();
    // Verify breakdown has state + county + city + special
    const table = page.locator("table").first();
    await expect(table.locator("td", { hasText: "State" })).toBeVisible();
    await expect(table.locator("td", { hasText: "County" })).toBeVisible();
    await expect(table.locator("td", { hasText: "City" })).toBeVisible();
    await expect(table.locator("td", { hasText: "Special District" })).toBeVisible();
  });

  test("Portland OR 97201 — no-tax state, 0%", async ({ page }) => {
    await calculate(page, { buyerZip: "97201", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
    await expect(page.getByText("Oregon (OR)")).toBeVisible();
  });

  test("Anchorage AK 99501 — no-tax city in local-tax state, 0%", async ({ page }) => {
    await calculate(page, { buyerZip: "99501", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
    await expect(page.getByText("Alaska (AK)")).toBeVisible();
  });

  test("Los Angeles CA 90012 — 9.75%, groceries exempt", async ({ page }) => {
    // General merchandise at full rate
    await calculate(page, { buyerZip: "90012", amount: "100", category: "general" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.0975));
    await expect(page.getByText("California (CA)")).toBeVisible();

    // Groceries should be exempt
    await calculate(page, { buyerZip: "90012", amount: "100", category: "groceries" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
  });

  test("NYC NY 10001 — 8.88%, clothing exempt under threshold", async ({ page }) => {
    await calculate(page, { buyerZip: "10001", amount: "100", category: "general" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.08875));
    await expect(page.getByText("New York (NY)")).toBeVisible();

    // Clothing should be exempt (NY exempts clothing under $110)
    await calculate(page, { buyerZip: "10001", amount: "100", category: "clothing" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
  });

  test("Houston TX 77001 — origin-based state, 8.25%, groceries exempt", async ({ page }) => {
    await calculate(page, { buyerZip: "77001", amount: "100", category: "general" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.0825));
    await expect(page.getByText("Texas (TX)")).toBeVisible();

    // Groceries exempt in TX
    await calculate(page, { buyerZip: "77001", amount: "100", category: "groceries" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
  });

  test("Philadelphia PA 19103 — origin-based, 8%, clothing exempt", async ({ page }) => {
    await calculate(page, { buyerZip: "19103", amount: "100", category: "general" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.08));
    await expect(page.getByText("Pennsylvania (PA)")).toBeVisible();

    // Clothing exempt in PA
    await calculate(page, { buyerZip: "19103", amount: "100", category: "clothing" });
    await expect(page.locator(".text-4xl")).toHaveText("0.00%");
  });

  test("Seattle WA 98101 — special districts, 10.55%", async ({ page }) => {
    await calculate(page, { buyerZip: "98101", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.1055));
    await expect(page.getByText("Washington (WA)")).toBeVisible();
  });

  test("Juneau AK 99801 — local tax only (no state tax), 5%", async ({ page }) => {
    await calculate(page, { buyerZip: "99801", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.05));
    await expect(page.getByText("Alaska (AK)")).toBeVisible();
    // Should show county rate only (Juneau Borough 5%)
    const table = page.locator("table").first();
    await expect(table.locator("td", { hasText: "County" })).toBeVisible();
  });

  test("Colorado Springs CO 80903 — complex multi-layer, 8.20%", async ({ page }) => {
    await calculate(page, { buyerZip: "80903", amount: "100" });
    await expect(page.locator(".text-4xl")).toHaveText(rateText(0.082));
    await expect(page.getByText("Colorado (CO)")).toBeVisible();
    // Should have all 4 jurisdiction levels
    const table = page.locator("table").first();
    await expect(table.locator("td", { hasText: "State" })).toBeVisible();
    await expect(table.locator("td", { hasText: "County" })).toBeVisible();
    await expect(table.locator("td", { hasText: "City" })).toBeVisible();
    await expect(table.locator("td", { hasText: "Special District" })).toBeVisible();
  });
});
