import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("displays dashboard heading and subtitle", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your content performance at a glance."),
    ).toBeVisible();
  });

  test("sidebar navigation links are visible", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Content" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Insights" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Experiments" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Connections" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("period selector buttons are visible", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(page.getByRole("button", { name: "7 days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30 days" })).toBeVisible();
    await expect(page.getByRole("button", { name: "90 days" })).toBeVisible();
  });

  test("period selector switches active state on click", async ({ page }) => {
    await page.goto("/x/dashboard");

    // 7 days is default active
    const btn7 = page.getByRole("button", { name: "7 days" });
    const btn30 = page.getByRole("button", { name: "30 days" });
    const btn90 = page.getByRole("button", { name: "90 days" });

    // Click 30 days
    await btn30.click();
    await expect(btn30).toHaveClass(/bg-foreground/);

    // Click 90 days
    await btn90.click();
    await expect(btn90).toHaveClass(/bg-foreground/);

    // Click back to 7 days
    await btn7.click();
    await expect(btn7).toHaveClass(/bg-foreground/);
  });

  test("shows empty metrics state for new user", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(
      page.getByText("Publish your first post to see metrics here."),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("link", { name: "Create Post" }),
    ).toBeVisible();
  });

  test("Create Post link in empty state navigates to new post", async ({
    page,
  }) => {
    await page.goto("/x/dashboard");

    await expect(
      page.getByRole("link", { name: "Create Post" }),
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Create Post" }).click();
    await expect(page).toHaveURL(/\/x\/content\/new/);
  });

  test("shows insights section with empty state", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(
      page.getByRole("heading", { name: "Insights" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "No insights yet. Generate insights from your posting history.",
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Generate Insights button is visible on dashboard", async ({
    page,
  }) => {
    await page.goto("/x/dashboard");

    await expect(
      page.getByRole("button", { name: "Generate Insights" }),
    ).toBeVisible();
  });

  test("navigates to content page via sidebar", async ({ page }) => {
    await page.goto("/x/dashboard");

    await page.getByRole("link", { name: "Content" }).click();
    await expect(page).toHaveURL(/\/x\/content/);
    await expect(
      page.getByRole("heading", { name: "Content" }),
    ).toBeVisible();
  });

  test("navigates to insights page via sidebar", async ({ page }) => {
    await page.goto("/x/dashboard");

    await page.getByRole("link", { name: "Insights" }).click();
    await expect(page).toHaveURL(/\/x\/insights/);
    await expect(
      page.getByRole("heading", { name: "Insights" }),
    ).toBeVisible();
  });

  test("navigates to experiments page via sidebar", async ({ page }) => {
    await page.goto("/x/dashboard");

    await page.getByRole("link", { name: "Experiments" }).click();
    await expect(page).toHaveURL(/\/x\/experiments/);
    await expect(
      page.getByRole("heading", { name: "Experiments" }),
    ).toBeVisible();
  });

  test("navigates to connections page via sidebar", async ({ page }) => {
    await page.goto("/x/dashboard");

    await page.getByRole("link", { name: "Connections" }).click();
    await expect(page).toHaveURL(/\/connections/);
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test("navigates to settings page via sidebar", async ({ page }) => {
    await page.goto("/x/dashboard");

    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("user name is displayed in header", async ({ page }) => {
    await page.goto("/x/dashboard");

    await expect(page.getByText("E2E Test User")).toBeVisible();
  });
});
