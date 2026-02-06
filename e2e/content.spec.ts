import { test, expect } from "@playwright/test";

test.describe("Content List", () => {
  test("displays content heading and subtitle", async ({ page }) => {
    await page.goto("/dashboard/content");

    await expect(
      page.getByRole("heading", { name: "Content" }),
    ).toBeVisible();
    await expect(
      page.getByText("Create, schedule, and manage your posts."),
    ).toBeVisible();
  });

  test("status tabs are visible", async ({ page }) => {
    await page.goto("/dashboard/content");

    await expect(page.getByRole("button", { name: "All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Drafts" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Scheduled" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Published" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Failed" })).toBeVisible();
  });

  test("New Post button navigates to new post page", async ({ page }) => {
    await page.goto("/dashboard/content");

    await page.getByRole("link", { name: "New Post" }).click();
    await expect(page).toHaveURL(/\/dashboard\/content\/new/);
  });

  test("shows empty state with Create Post link when no posts", async ({
    page,
  }) => {
    await page.goto("/dashboard/content");

    await expect(page.getByText("Create your first post")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("link", { name: "Create Post" }),
    ).toBeVisible();
  });

  test("switching to Drafts tab shows drafts empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard/content");

    await page.getByRole("button", { name: "Drafts" }).click();

    await expect(page.getByText("No drafts. Start writing!")).toBeVisible({
      timeout: 15000,
    });
  });

  test("switching to Scheduled tab shows scheduled empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard/content");

    await page.getByRole("button", { name: "Scheduled" }).click();

    await expect(
      page.getByText("Nothing scheduled. Plan ahead!"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("switching to Published tab shows published empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard/content");

    await page.getByRole("button", { name: "Published" }).click();

    await expect(page.getByText("No posts published yet")).toBeVisible({
      timeout: 15000,
    });
  });

  test("switching to Failed tab shows failed empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard/content");

    await page.getByRole("button", { name: "Failed" }).click();

    await expect(
      page.getByText("All clear! No failed posts"),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("New Post", () => {
  test("displays new post heading and editor", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("heading", { name: "New Post" }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("What's on your mind?"),
    ).toBeVisible();
  });

  test("character counter updates as user types", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    const textarea = page.getByPlaceholder("What's on your mind?");
    await textarea.fill("Hello, world!");

    await expect(page.getByText("13 / 280")).toBeVisible();
  });

  test("character counter turns red over 280 characters", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    const textarea = page.getByPlaceholder("What's on your mind?");
    const longText = "a".repeat(281);
    await textarea.fill(longText);

    await expect(page.getByText("281 / 280")).toBeVisible();
  });

  test("Cancel button navigates back to content list", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/dashboard\/content$/);
  });

  test("Save Draft and Publish Now buttons are present", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("button", { name: "Save Draft" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publish Now" }),
    ).toBeVisible();
  });

  test("Save Draft button is disabled when textarea is empty", async ({
    page,
  }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("button", { name: "Save Draft" }),
    ).toBeDisabled();
  });

  test("Publish Now button is disabled when textarea is empty", async ({
    page,
  }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("button", { name: "Publish Now" }),
    ).toBeDisabled();
  });

  test("shows no platforms message when none connected", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    await expect(page.getByText("No platforms connected.")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("link", { name: "Connect a platform" }),
    ).toBeVisible();
  });

  test("Connect a platform link navigates to connections", async ({
    page,
  }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("link", { name: "Connect a platform" }),
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole("link", { name: "Connect a platform" }).click();
    await expect(page).toHaveURL(/\/dashboard\/connections/);
  });

  test("schedule toggle shows datetime picker when enabled", async ({
    page,
  }) => {
    await page.goto("/dashboard/content/new");

    // Initially no datetime input
    await expect(page.locator('input[type="datetime-local"]')).toBeHidden();

    // Enable schedule
    await page.getByLabel("Schedule for later").check();

    // Datetime picker appears
    await expect(
      page.locator('input[type="datetime-local"]'),
    ).toBeVisible();
  });

  test("schedule toggle replaces Publish Now with Schedule button", async ({
    page,
  }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("button", { name: "Publish Now" }),
    ).toBeVisible();

    await page.getByLabel("Schedule for later").check();

    await expect(
      page.getByRole("button", { name: "Schedule" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publish Now" }),
    ).toBeHidden();
  });

  test("Content Ideas panel toggles open and closed", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    // Get Ideas button is always visible
    await expect(
      page.getByRole("button", { name: "Get Ideas" }),
    ).toBeVisible();

    // Content Ideas toggle button is visible
    await expect(page.getByText("Content Ideas")).toBeVisible();
  });
});
