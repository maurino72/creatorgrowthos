import { test, expect } from "@playwright/test";

test.describe("Unauthenticated", () => {
  test("redirects /dashboard to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders with title and Google button", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Creator Growth OS" })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("API routes return 401 when not authenticated", async ({ request }) => {
    const response = await request.get("/api/posts");
    expect(response.status()).toBe(401);
  });
});
