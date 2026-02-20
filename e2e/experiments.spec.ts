import { test, expect } from "@playwright/test";

test.describe("Experiments", () => {
  test("displays experiments heading and subtitle", async ({ page }) => {
    await page.goto("/x/experiments");

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
    await page.goto("/x/experiments");

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
    await page.goto("/x/experiments");

    await expect(
      page.getByRole("button", { name: "Suggest Experiments" }),
    ).toBeVisible();
  });

  test("shows empty state when no experiments exist", async ({ page }) => {
    await page.goto("/x/experiments");

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(
        "Suggest experiments to start testing what works for your audience.",
      ),
    ).toBeVisible();
  });

  test("switching to Suggested tab shows empty state", async ({ page }) => {
    await page.goto("/x/experiments");

    await page.getByRole("button", { name: "Suggested" }).click();

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("switching to Accepted tab shows empty state", async ({ page }) => {
    await page.goto("/x/experiments");

    await page.getByRole("button", { name: "Accepted" }).click();

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("switching to Running tab shows empty state", async ({ page }) => {
    await page.goto("/x/experiments");

    await page.getByRole("button", { name: "Running" }).click();

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("switching to Complete tab shows empty state", async ({ page }) => {
    await page.goto("/x/experiments");

    await page.getByRole("button", { name: "Complete" }).click();

    await expect(page.getByText("No experiments yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Suggest Experiments button shows loading state on click", async ({
    page,
  }) => {
    await page.goto("/x/experiments");

    const btn = page.getByRole("button", { name: "Suggest Experiments" });
    await btn.click();

    // Should show loading text
    await expect(
      page.getByRole("button", { name: "Suggesting..." }),
    ).toBeVisible();
  });
});
