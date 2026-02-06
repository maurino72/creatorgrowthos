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
  });
});
