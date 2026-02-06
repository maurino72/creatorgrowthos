import { test, expect } from "@playwright/test";

test.describe("Unauthenticated", () => {
  test("redirects /dashboard to /login when not authenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /dashboard/content to /login", async ({ page }) => {
    await page.goto("/dashboard/content");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /dashboard/insights to /login", async ({ page }) => {
    await page.goto("/dashboard/insights");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /dashboard/experiments to /login", async ({ page }) => {
    await page.goto("/dashboard/experiments");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects /dashboard/connections to /login", async ({ page }) => {
    await page.goto("/dashboard/connections");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders with title and Google button", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Creator Growth OS" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("login page shows subtitle text", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByText(/grow your audience with ai-powered/i),
    ).toBeVisible();
  });

  test("login page shows terms of service notice", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByText(/by continuing.*terms of service/i),
    ).toBeVisible();
  });

  test("GET /api/posts returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/posts");
    expect(response.status()).toBe(401);
  });

  test("POST /api/posts returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.post("/api/posts", {
      data: { body: "test", platforms: ["twitter"] },
    });
    expect(response.status()).toBe(401);
  });

  test("GET /api/insights returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/insights");
    expect(response.status()).toBe(401);
  });

  test("GET /api/experiments returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/experiments");
    expect(response.status()).toBe(401);
  });

  test("GET /api/connections returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/connections");
    expect(response.status()).toBe(401);
  });

  test("GET /api/dashboard/metrics returns 401 when not authenticated", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard/metrics");
    expect(response.status()).toBe(401);
  });
});
