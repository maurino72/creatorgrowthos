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
    // LinkedIn and Threads are both Coming Soon
    await expect(comingSoonBadges.first()).toBeVisible();
    expect(await comingSoonBadges.count()).toBe(2);
  });

  test("Coming Soon platforms have disabled Connect buttons", async ({
    page,
  }) => {
    await page.goto("/dashboard/connections");

    // Wait for connections to load
    await expect(page.getByText("Coming Soon").first()).toBeVisible({
      timeout: 15000,
    });

    // Disabled Connect buttons exist for Coming Soon platforms
    const disabledButtons = page.locator(
      'button:has-text("Connect"):disabled',
    );
    expect(await disabledButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test("Twitter has a Connect link when not connected", async ({
    page,
  }) => {
    await page.goto("/dashboard/connections");

    // Wait for cards to load by checking Coming Soon appears (always present)
    await expect(page.getByText("Coming Soon").first()).toBeVisible({
      timeout: 15000,
    });

    // Twitter card should have a Connect link pointing to the OAuth endpoint
    const connectLink = page.locator(
      'a[href="/api/connections/twitter"]',
    );
    await expect(connectLink).toBeVisible();
  });

  test("shows success toast on connected query param", async ({ page }) => {
    await page.goto("/dashboard/connections?connected=twitter");

    // Toast should appear
    await expect(page.getByText("Twitter connected successfully!")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows error toast on error query param", async ({ page }) => {
    await page.goto("/dashboard/connections?error=access_denied");

    await expect(
      page.getByText("You denied access to your Twitter account."),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows token exchange error toast", async ({ page }) => {
    await page.goto("/dashboard/connections?error=token_exchange_failed");

    await expect(
      page.getByText("Failed to complete authentication. Please try again."),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows session expired error toast", async ({ page }) => {
    await page.goto("/dashboard/connections?error=session_expired");

    await expect(
      page.getByText("Your session expired. Please log in and try again."),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows unknown error toast for unrecognized error codes", async ({
    page,
  }) => {
    await page.goto("/dashboard/connections?error=some_random_error");

    await expect(
      page.getByText("An unknown error occurred. Please try again."),
    ).toBeVisible({ timeout: 5000 });
  });

  test("query params are cleared after toast is shown", async ({ page }) => {
    await page.goto("/dashboard/connections?connected=twitter");

    // Wait for toast to appear
    await expect(
      page.getByText("Twitter connected successfully!"),
    ).toBeVisible({ timeout: 5000 });

    // URL should be cleaned up (router.replace removes query params)
    await expect(page).toHaveURL(/\/dashboard\/connections$/);
  });
});
