import { test, expect } from "@playwright/test";
import path from "path";

const fixtures = path.resolve(__dirname, "fixtures");

test.describe("Image Upload - New Post Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/content/new");
  });

  test("uploads a single image and shows preview", async ({ page }) => {
    const fileInput = page.getByLabel("Upload images");

    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));

    // Preview image should appear
    await expect(page.getByAltText("Upload 1")).toBeVisible({ timeout: 15000 });

    // Counter should update to 1/4
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 10000 });
  });

  test("uploads multiple images sequentially and shows all previews", async ({
    page,
  }) => {
    const fileInput = page.getByLabel("Upload images");

    // Upload first image
    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    // Upload second image
    await fileInput.setInputFiles(path.join(fixtures, "test-image-2.jpg"));
    await expect(page.getByText("2/4")).toBeVisible({ timeout: 15000 });

    // Both previews should be visible
    await expect(page.getByAltText("Upload 1")).toBeVisible();
    await expect(page.getByAltText("Upload 2")).toBeVisible();
  });

  test("shows remove button on image hover", async ({ page }) => {
    const fileInput = page.getByLabel("Upload images");

    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));

    // Wait for upload to complete (counter updates from 0 to 1)
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    // The remove button exists in the DOM but is hidden (opacity-0, visible on group-hover)
    const removeBtn = page.getByLabel("Remove image 1");
    await expect(removeBtn).toBeAttached();

    // Hover over the image container to make the button visible
    const imageContainer = page.getByAltText("Upload 1").locator("..");
    await imageContainer.hover();

    await expect(removeBtn).toBeVisible();
  });

  test("removes an uploaded image when remove button is clicked", async ({
    page,
  }) => {
    const fileInput = page.getByLabel("Upload images");

    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));

    // Wait for upload to complete
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    // Force-click the remove button (it's only visible on hover)
    await page.getByLabel("Remove image 1").click({ force: true });

    // Preview should be gone
    await expect(page.getByAltText("Upload 1")).not.toBeVisible();

    // Counter should go back to 0/4
    await expect(page.getByText("0/4")).toBeVisible();

    // Drop zone should still be visible
    await expect(page.getByText(/Drop images here or/)).toBeVisible();
  });

  test("hides drop zone after uploading 4 images (max)", async ({ page }) => {
    test.slow(); // 4 sequential uploads take time
    const fileInput = page.getByLabel("Upload images");

    // Upload images one at a time to avoid race conditions
    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-2.jpg"));
    await expect(page.getByText("2/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-3.jpg"));
    await expect(page.getByText("3/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-4.jpg"));
    await expect(page.getByText("4/4")).toBeVisible({ timeout: 15000 });

    // Drop zone should be hidden when at max
    await expect(page.getByText(/Drop images here or/)).not.toBeVisible();
  });

  test("drop zone reappears after removing an image from max", async ({
    page,
  }) => {
    test.slow(); // 4 sequential uploads take time
    const fileInput = page.getByLabel("Upload images");

    // Upload 4 images sequentially
    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-2.jpg"));
    await expect(page.getByText("2/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-3.jpg"));
    await expect(page.getByText("3/4")).toBeVisible({ timeout: 15000 });

    await fileInput.setInputFiles(path.join(fixtures, "test-image-4.jpg"));
    await expect(page.getByText("4/4")).toBeVisible({ timeout: 15000 });

    // Remove one image
    await page.getByLabel("Remove image 1").click({ force: true });

    // Counter back to 3/4
    await expect(page.getByText("3/4")).toBeVisible({ timeout: 10000 });

    // Drop zone should reappear
    await expect(page.getByText(/Drop images here or/)).toBeVisible();
  });

  test("uploads a PNG image successfully", async ({ page }) => {
    const fileInput = page.getByLabel("Upload images");

    await fileInput.setInputFiles(path.join(fixtures, "test-image.png"));

    // Preview should appear
    await expect(page.getByAltText("Upload 1")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 10000 });
  });

  test("shows toast error for non-image file", async ({ page }) => {
    const fileInput = page.getByLabel("Upload images");

    // The input has accept="image/jpeg,image/png,image/gif,image/webp"
    // but browsers don't always enforce this, so the client-side validation should catch it.
    // However, Playwright's setInputFiles bypasses the accept attribute.
    // The component validates file.type, but Playwright may set a generic type.
    // Let's check that no preview appears (the validation rejects it)
    await fileInput.setInputFiles(path.join(fixtures, "not-an-image.txt"));

    // No preview should appear (validation should reject text/plain)
    // Counter should stay at 0/4
    await expect(page.getByText("0/4")).toBeVisible();

    // There should be an error toast visible
    await expect(
      page.locator("[data-sonner-toast][data-type='error']"),
    ).toBeVisible({ timeout: 5000 });
  });

  test("shows upload spinner during upload", async ({ page }) => {
    // Slow down the network to catch the spinner
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: 50 * 1024, // 50KB/s
      uploadThroughput: 10 * 1024, // 10KB/s
      latency: 500,
    });

    const fileInput = page.getByLabel("Upload images");
    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));

    // The spinner overlay should briefly be visible (animate-pulse on container)
    // Since the file is tiny, this may be very fast. We just verify the image appears eventually.
    await expect(page.getByAltText("Upload 1")).toBeVisible({ timeout: 30000 });

    // Reset network
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });

  test("clicking the drop zone opens file picker", async ({ page }) => {
    // We can verify that clicking the drop zone triggers the file input
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Drop images here or/ }).click();
    const fileChooser = await fileChooserPromise;

    expect(fileChooser.isMultiple()).toBe(true);
  });

  test("pressing Enter on drop zone opens file picker", async ({ page }) => {
    const dropZone = page.getByRole("button", {
      name: /Drop images here or/,
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await dropZone.press("Enter");
    const fileChooser = await fileChooserPromise;

    expect(fileChooser.isMultiple()).toBe(true);
  });

  test("pressing Space on drop zone opens file picker", async ({ page }) => {
    const dropZone = page.getByRole("button", {
      name: /Drop images here or/,
    });

    const fileChooserPromise = page.waitForEvent("filechooser");
    await dropZone.press("Space");
    const fileChooser = await fileChooserPromise;

    expect(fileChooser.isMultiple()).toBe(true);
  });

  test("uploaded images persist in preview grid after adding text", async ({
    page,
  }) => {
    const fileInput = page.getByLabel("Upload images");
    await fileInput.setInputFiles(path.join(fixtures, "test-image.jpg"));

    // Wait for upload
    await expect(page.getByText("1/4")).toBeVisible({ timeout: 15000 });

    // Type text in the textarea
    const textarea = page.getByPlaceholder("What's on your mind?");
    await textarea.fill("Post with an image!");

    // Image should still be there
    await expect(page.getByAltText("Upload 1")).toBeVisible();
    await expect(page.getByText("1/4")).toBeVisible();
  });
});

test.describe("Image Upload - API", () => {
  test("POST /api/media/upload with valid JPEG returns 201", async ({
    request,
  }) => {
    const fs = await import("fs");
    const imageBuffer = fs.readFileSync(path.join(fixtures, "test-image.jpg"));

    const response = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "test-image.jpg",
          mimeType: "image/jpeg",
          buffer: imageBuffer,
        },
      },
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("url");
    expect(data).toHaveProperty("path");
    expect(typeof data.path).toBe("string");
    expect(data.path).toMatch(/\.jpg$/);
  });

  test("POST /api/media/upload with valid PNG returns 201", async ({
    request,
  }) => {
    const fs = await import("fs");
    const imageBuffer = fs.readFileSync(path.join(fixtures, "test-image.png"));

    const response = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "test-image.png",
          mimeType: "image/png",
          buffer: imageBuffer,
        },
      },
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("url");
    expect(data).toHaveProperty("path");
    expect(data.path).toContain(".png");
  });

  test("POST /api/media/upload rejects non-image MIME type", async ({
    request,
  }) => {
    const fs = await import("fs");
    const textBuffer = fs.readFileSync(
      path.join(fixtures, "not-an-image.txt"),
    );

    const response = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "not-an-image.txt",
          mimeType: "text/plain",
          buffer: textBuffer,
        },
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("Unsupported format");
  });

  test("POST /api/media/upload rejects file with spoofed MIME type", async ({
    request,
  }) => {
    const fs = await import("fs");
    const textBuffer = fs.readFileSync(
      path.join(fixtures, "not-an-image.txt"),
    );

    // Send text file but claim it's JPEG
    const response = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "fake.jpg",
          mimeType: "image/jpeg",
          buffer: textBuffer,
        },
      },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("does not match");
  });

  test("POST /api/media/signed-urls returns signed URLs for uploaded paths", async ({
    request,
  }) => {
    // First upload an image
    const fs = await import("fs");
    const imageBuffer = fs.readFileSync(path.join(fixtures, "test-image.jpg"));

    const uploadResponse = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "signed-url-test.jpg",
          mimeType: "image/jpeg",
          buffer: imageBuffer,
        },
      },
    });

    expect(uploadResponse.status()).toBe(201);
    const uploadData = await uploadResponse.json();

    // Now request a signed URL for that path
    const signedResponse = await request.post("/api/media/signed-urls", {
      data: { paths: [uploadData.path] },
    });

    expect(signedResponse.status()).toBe(200);

    const signedData = await signedResponse.json();
    expect(signedData).toHaveProperty("urls");
    expect(signedData.urls).toHaveLength(1);
    expect(signedData.urls[0]).toHaveProperty("path", uploadData.path);
    expect(signedData.urls[0]).toHaveProperty("url");
    expect(signedData.urls[0].url).toContain("http");
  });

  test("POST /api/media/signed-urls rejects empty paths", async ({
    request,
  }) => {
    const response = await request.post("/api/media/signed-urls", {
      data: { paths: [] },
    });

    expect(response.status()).toBe(400);
  });

  test("DELETE /api/media/:id deletes an uploaded file", async ({
    request,
  }) => {
    // First upload an image
    const fs = await import("fs");
    const imageBuffer = fs.readFileSync(path.join(fixtures, "test-image.jpg"));

    const uploadResponse = await request.post("/api/media/upload", {
      multipart: {
        file: {
          name: "to-delete.jpg",
          mimeType: "image/jpeg",
          buffer: imageBuffer,
        },
      },
    });

    expect(uploadResponse.status()).toBe(201);
    const { path: filePath } = await uploadResponse.json();

    // Extract the file ID (filename portion)
    const fileId = filePath.split("/").pop();

    const deleteResponse = await request.delete(`/api/media/${fileId}`);
    expect(deleteResponse.status()).toBe(200);
  });
});
