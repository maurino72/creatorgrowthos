import { test, expect } from "@playwright/test";

test.describe("Experiments", () => {
  test("displays experiments heading and subtitle", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    await expect(
      page.getByRole("heading", { name: "Experiments" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Test hypotheses about what works for your audience.",
      ),
    ).toBeVisible();
  });

  test("status tabs are visible", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Suggested" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Accepted" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Running" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Complete" }),
    ).toBeVisible();
  });

  test("Suggest Experiments button is visible", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    await expect(
      page.getByRole("button", { name: "Suggest Experiments" }),
    ).toBeVisible();
  });

  test("shows empty state when no experiments exist", async ({ page }) => {
    await page.goto("/dashboard/experiments");

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
  });
});
