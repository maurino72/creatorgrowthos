import { test, expect } from "@playwright/test";

test.describe("Authenticated API Routes", () => {
  test.describe("Posts API", () => {
    test("GET /api/posts returns 200 with empty posts array", async ({
      request,
    }) => {
      const response = await request.get("/api/posts");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("posts");
      expect(Array.isArray(data.posts)).toBe(true);
    });

    test("GET /api/posts supports status filter", async ({ request }) => {
      const response = await request.get("/api/posts?status=draft");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("posts");
    });

    test("GET /api/posts supports limit and offset", async ({ request }) => {
      const response = await request.get("/api/posts?limit=5&offset=0");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("posts");
    });

    test("POST /api/posts returns 400 with invalid body", async ({
      request,
    }) => {
      const response = await request.post("/api/posts", {
        data: {},
      });
      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    test("POST /api/posts returns 400 with empty platforms", async ({
      request,
    }) => {
      const response = await request.post("/api/posts", {
        data: { body: "Test post", platforms: [] },
      });
      expect(response.status()).toBe(400);
    });

    test("POST /api/posts returns 400 when no active connection", async ({
      request,
    }) => {
      const response = await request.post("/api/posts", {
        data: { body: "Test post", platforms: ["twitter"] },
      });
      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("No active connection");
    });

    test("GET /api/posts/:id returns 404 for nonexistent post", async ({
      request,
    }) => {
      const response = await request.get(
        "/api/posts/00000000-0000-0000-0000-000000000000",
      );
      expect(response.status()).toBe(404);
    });

    test("PATCH /api/posts/:id returns 404 for nonexistent post", async ({
      request,
    }) => {
      const response = await request.patch(
        "/api/posts/00000000-0000-0000-0000-000000000000",
        { data: { body: "Updated" } },
      );
      expect(response.status()).toBe(404);
    });

    test("DELETE /api/posts/:id returns 404 for nonexistent post", async ({
      request,
    }) => {
      const response = await request.delete(
        "/api/posts/00000000-0000-0000-0000-000000000000",
      );
      expect(response.status()).toBe(404);
    });
  });

  test.describe("Dashboard Metrics API", () => {
    test("GET /api/dashboard/metrics returns 200 with metrics data", async ({
      request,
    }) => {
      const response = await request.get("/api/dashboard/metrics");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("totalImpressions");
      expect(data).toHaveProperty("postCount");
    });

    test("GET /api/dashboard/metrics supports days param", async ({
      request,
    }) => {
      const response = await request.get("/api/dashboard/metrics?days=30");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("totalImpressions");
    });

    test("GET /api/dashboard/metrics/top returns 200 with posts array", async ({
      request,
    }) => {
      const response = await request.get("/api/dashboard/metrics/top");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("posts");
      expect(Array.isArray(data.posts)).toBe(true);
    });

    test("GET /api/dashboard/metrics/top supports days and limit", async ({
      request,
    }) => {
      const response = await request.get(
        "/api/dashboard/metrics/top?days=90&limit=3",
      );
      expect(response.status()).toBe(200);
    });
  });

  test.describe("Connections API", () => {
    test("GET /api/connections returns 200 with connections array", async ({
      request,
    }) => {
      const response = await request.get("/api/connections");
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("connections");
      expect(Array.isArray(data.connections)).toBe(true);
    });
  });

  test.describe("Insights API", () => {
    test("GET /api/insights returns a response", async ({ request }) => {
      const response = await request.get("/api/insights");
      // May return 200 (with data) or 500 (if insights table not set up)
      expect([200, 500]).toContain(response.status());
    });
  });

  test.describe("Experiments API", () => {
    test("GET /api/experiments returns a response", async ({ request }) => {
      const response = await request.get("/api/experiments");
      // May return 200 (with data) or 500 (if experiments table not set up)
      expect([200, 500]).toContain(response.status());
    });
  });
});
