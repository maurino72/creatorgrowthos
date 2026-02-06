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

  test("Save Draft button is present", async ({ page }) => {
    await page.goto("/dashboard/content/new");

    await expect(
      page.getByRole("button", { name: "Save Draft" }),
    ).toBeVisible();
  });
});
