import { test, expect } from "@playwright/test";

test.describe("Dark mode toggle", () => {
  test("toggles dark class on html element", async ({ page }) => {
    await page.goto("/");

    // Should start with system preference or stored preference
    const html = page.locator("html");

    // Click the dark mode toggle button
    const toggle = page.getByLabel("Toggle dark mode");
    await expect(toggle).toBeVisible();

    // Get initial state
    const initialDark = await html.evaluate((el) => el.classList.contains("dark"));

    // Click toggle
    await toggle.click();

    // Should have flipped
    const afterClick = await html.evaluate((el) => el.classList.contains("dark"));
    expect(afterClick).toBe(!initialDark);

    // Click again to flip back
    await toggle.click();
    const afterSecondClick = await html.evaluate((el) => el.classList.contains("dark"));
    expect(afterSecondClick).toBe(initialDark);
  });

  test("dark mode changes background color", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const body = page.locator("div.min-h-screen");

    // Force light mode
    await html.evaluate((el) => {
      el.classList.remove("dark");
      localStorage.setItem("theme", "light");
    });
    await page.waitForTimeout(100);

    const lightBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Switch to dark
    const toggle = page.getByLabel("Toggle dark mode");
    await toggle.click();
    await page.waitForTimeout(100);

    const darkBg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Background colors must differ
    expect(lightBg).not.toBe(darkBg);
  });
});
