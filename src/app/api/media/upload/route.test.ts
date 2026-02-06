import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/media", () => ({
  uploadImage: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock("@/lib/validators/media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validators/media")>();
  return {
    ...actual,
    validateFileHeader: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";
import { uploadImage, getSignedUrl } from "@/lib/services/media";
import { validateFileHeader } from "@/lib/validators/media";

function mockAuth(userId: string | null) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : { message: "No session" },
      }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(supabase as never);
}

// Helper to create a mock File-like object that works in Node/jsdom
function createMockFile(name: string, type: string, size: number, content?: Uint8Array) {
  const bytes = content ?? new Uint8Array(Math.min(size, 64));
  return {
    name,
    type,
    size,
    arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
  };
}

// Build a request whose formData() returns a map with the given file
function createUploadRequest(file: ReturnType<typeof createMockFile> | null) {
  const formData = new Map();
  if (file) formData.set("file", file);

  return {
    formData: vi.fn().mockResolvedValue({
      get: (key: string) => formData.get(key) ?? null,
    }),
    url: "http://localhost:3000/api/media/upload",
  } as unknown as Request;
}

describe("POST /api/media/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateFileHeader).mockReturnValue({
      valid: true,
      detectedType: "image/jpeg",
    });
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("test.jpg", "image/jpeg", 1024),
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    mockAuth("user-123");
    const POST = await importPOST();
    const request = createUploadRequest(null);
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No file provided");
  });

  it("returns 400 for unsupported file type", async () => {
    mockAuth("user-123");
    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("doc.pdf", "application/pdf", 1024),
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Unsupported format");
  });

  it("returns 400 for oversized file", async () => {
    mockAuth("user-123");
    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1),
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("5MB");
  });

  it("returns 400 when file header does not match", async () => {
    mockAuth("user-123");
    vi.mocked(validateFileHeader).mockReturnValue({
      valid: false,
      error: "File content does not match a supported image format",
    });

    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("fake.jpg", "image/jpeg", 1024),
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("does not match");
  });

  it("returns 201 with url and path for valid upload", async () => {
    mockAuth("user-123");
    vi.mocked(uploadImage).mockResolvedValue({
      path: "user-123/abc-123.jpg",
    });
    vi.mocked(getSignedUrl).mockResolvedValue(
      "https://storage.example.com/signed/user-123/abc-123.jpg",
    );

    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("photo.jpg", "image/jpeg", 1024),
    );
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.url).toBe(
      "https://storage.example.com/signed/user-123/abc-123.jpg",
    );
    expect(body.path).toBe("user-123/abc-123.jpg");
  });

  it("calls uploadImage with correct params", async () => {
    mockAuth("user-123");
    vi.mocked(uploadImage).mockResolvedValue({
      path: "user-123/abc.jpg",
    });
    vi.mocked(getSignedUrl).mockResolvedValue("https://example.com/signed");

    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("photo.jpg", "image/jpeg", 1024),
    );
    await POST(request);

    expect(uploadImage).toHaveBeenCalledWith(
      "user-123",
      expect.any(Buffer),
      "photo.jpg",
      "image/jpeg",
    );
  });

  it("returns 500 when upload service fails", async () => {
    mockAuth("user-123");
    vi.mocked(uploadImage).mockRejectedValue(
      new Error("Storage quota exceeded"),
    );

    const POST = await importPOST();
    const request = createUploadRequest(
      createMockFile("photo.jpg", "image/jpeg", 1024),
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Storage quota exceeded");
  });
});
