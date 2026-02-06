import { test, expect } from "@playwright/test";

test.describe("Connections", () => {
  test("displays connections heading and subtitle", async ({ page }) => {
    await page.goto("/dashboard/connections");

    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Connect your social media accounts to publish and track content.",
      ),
    ).toBeVisible();
  });

  test("platform cards are visible", async ({ page }) => {
    await page.goto("/dashboard/connections");

    await expect(page.getByText("Twitter")).toBeVisible();
    await expect(page.getByText("LinkedIn")).toBeVisible();
    await expect(page.getByText("Threads")).toBeVisible();
  });

  test("Coming Soon badges are shown for unsupported platforms", async ({
    page,
  }) => {
    await page.goto("/dashboard/connections");

    const comingSoonBadges = page.getByText("Coming Soon");
    await expect(comingSoonBadges.first()).toBeVisible();
  });
});
