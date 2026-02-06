import { test, expect } from "@playwright/test";

test.describe("Insights", () => {
  test("displays insights heading and subtitle", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await expect(
      page.getByRole("heading", { name: "Insights" }),
    ).toBeVisible();
    await expect(
      page.getByText("AI-powered analysis of your content performance."),
    ).toBeVisible();
  });

  test("status tabs are visible", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Dismissed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Acted On" }),
    ).toBeVisible();
  });

  test("type filter tabs are visible", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Performance" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Consistency" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Opportunity" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Anomaly" })).toBeVisible();
  });

  test("Generate Insights button is visible", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await expect(
      page.getByRole("button", { name: "Generate Insights" }),
    ).toBeVisible();
  });

  test("shows empty state when no insights exist", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await expect(page.getByText("No insights yet")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(
        "Generate insights from your posting history to get started.",
      ),
    ).toBeVisible();
  });

  test("switching to Dismissed tab preserves type filter tabs", async ({
    page,
  }) => {
    await page.goto("/dashboard/insights");

    await page.getByRole("button", { name: "Dismissed" }).click();

    // Type filter tabs should still be visible
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Performance" }),
    ).toBeVisible();
  });

  test("switching to Acted On tab shows empty state", async ({ page }) => {
    await page.goto("/dashboard/insights");

    await page.getByRole("button", { name: "Acted On" }).click();

    await expect(page.getByText("No insights yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("clicking type filter tabs switches active state", async ({ page }) => {
    await page.goto("/dashboard/insights");

    const perfBtn = page.getByRole("button", { name: "Performance" });
    await perfBtn.click();

    // Performance tab should be visually active (has different styling)
    await expect(perfBtn).toHaveClass(/bg-foreground/);
  });

  test("Generate Insights button shows loading state on click", async ({
    page,
  }) => {
    await page.goto("/dashboard/insights");

    const btn = page.getByRole("button", { name: "Generate Insights" });
    await btn.click();

    // Should show loading text
    await expect(
      page.getByRole("button", { name: "Generating..." }),
    ).toBeVisible();
  });
});
