import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("displays dashboard heading and subtitle", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your content performance at a glance."),
    ).toBeVisible();
  });

  test("sidebar navigation links are visible", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Content" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Insights" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Experiments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Connections" }),
    ).toBeVisible();
  });

  test("period selector buttons are visible", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("button", { name: "7 days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "90 days" })).toBeVisible();
  });

  test("navigates to content page via sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Content" }).click();
    await expect(page).toHaveURL(/\/dashboard\/content/);
    await expect(
      page.getByRole("heading", { name: "Content" }),
    ).toBeVisible();
  });

  test("navigates to insights page via sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Insights" }).click();
    await expect(page).toHaveURL(/\/dashboard\/insights/);
    await expect(
      page.getByRole("heading", { name: "Insights" }),
    ).toBeVisible();
  });

  test("navigates to connections page via sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: "Connections" }).click();
    await expect(page).toHaveURL(/\/dashboard\/connections/);
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });
});
