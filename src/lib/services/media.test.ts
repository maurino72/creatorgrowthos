import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadImage, deleteImage, getSignedUrl } from "./media";

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: mockFrom,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    upload: mockUpload,
    remove: mockRemove,
    createSignedUrl: mockCreateSignedUrl,
  });
});

describe("uploadImage", () => {
  it("uploads file to user folder with correct path", async () => {
    mockUpload.mockResolvedValue({
      data: { path: "user-123/abc.jpg" },
      error: null,
    });

    const buffer = Buffer.from("fake-image");
    const result = await uploadImage("user-123", buffer, "test.jpg", "image/jpeg");

    expect(mockFrom).toHaveBeenCalledWith("post-media");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-123\/.+\.jpg$/),
      buffer,
      { contentType: "image/jpeg", upsert: false },
    );
    expect(result.path).toMatch(/^user-123\/.+\.jpg$/);
  });

  it("preserves file extension from original filename", async () => {
    mockUpload.mockResolvedValue({
      data: { path: "user-123/abc.png" },
      error: null,
    });

    const buffer = Buffer.from("fake-image");
    await uploadImage("user-123", buffer, "photo.png", "image/png");

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      buffer,
      { contentType: "image/png", upsert: false },
    );
  });

  it("generates unique filename to avoid collisions", async () => {
    mockUpload.mockResolvedValue({
      data: { path: "user-123/abc.jpg" },
      error: null,
    });

    const buffer = Buffer.from("fake-image");
    const result1 = await uploadImage("user-123", buffer, "test.jpg", "image/jpeg");

    mockUpload.mockResolvedValue({
      data: { path: "user-123/def.jpg" },
      error: null,
    });

    const result2 = await uploadImage("user-123", buffer, "test.jpg", "image/jpeg");

    // The paths passed to upload should be different even for same filename
    const call1Path = mockUpload.mock.calls[0][0];
    const call2Path = mockUpload.mock.calls[1][0];
    expect(call1Path).not.toBe(call2Path);
  });

  it("throws on upload error", async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: "Storage quota exceeded" },
    });

    const buffer = Buffer.from("fake-image");
    await expect(
      uploadImage("user-123", buffer, "test.jpg", "image/jpeg"),
    ).rejects.toThrow("Storage quota exceeded");
  });
});

describe("deleteImage", () => {
  it("deletes file from user folder", async () => {
    mockRemove.mockResolvedValue({ data: [{}], error: null });

    await deleteImage("user-123/abc.jpg");

    expect(mockFrom).toHaveBeenCalledWith("post-media");
    expect(mockRemove).toHaveBeenCalledWith(["user-123/abc.jpg"]);
  });

  it("throws on delete error", async () => {
    mockRemove.mockResolvedValue({
      data: null,
      error: { message: "File not found" },
    });

    await expect(deleteImage("user-123/abc.jpg")).rejects.toThrow(
      "File not found",
    );
  });
});

describe("getSignedUrl", () => {
  it("returns signed URL with default expiry", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/abc" },
      error: null,
    });

    const url = await getSignedUrl("user-123/abc.jpg");

    expect(mockFrom).toHaveBeenCalledWith("post-media");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-123/abc.jpg", 3600);
    expect(url).toBe("https://storage.example.com/signed/abc");
  });

  it("accepts custom expiry", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/abc" },
      error: null,
    });

    await getSignedUrl("user-123/abc.jpg", 7200);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-123/abc.jpg", 7200);
  });

  it("throws on signed URL error", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "Invalid path" },
    });

    await expect(getSignedUrl("invalid/path")).rejects.toThrow("Invalid path");
  });
});
