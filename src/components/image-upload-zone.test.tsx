import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageUploadZone, type ImageItem } from "./image-upload-zone";

// Mock the media hooks
const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/lib/queries/media", () => ({
  useUploadMedia: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useDeleteMedia: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("ImageUploadZone", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the drop zone when no images", () => {
    render(<ImageUploadZone images={[]} onChange={onChange} />);

    expect(screen.getByText(/Drop files here or/)).toBeInTheDocument();
    expect(screen.getByText("browse")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();
  });

  it("shows image count when images are present", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg", type: "image" },
      { id: "img2", path: "user/img2.jpg", url: "https://example.com/img2.jpg", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("renders image previews", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const img = screen.getByAltText("Upload 1");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img1.jpg");
  });

  it("shows uploading spinner overlay for uploading items", () => {
    const images: ImageItem[] = [
      { id: "temp-1", path: "", url: "blob:preview", uploading: true, type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    // The uploading image should have animate-pulse class on its container
    const img = screen.getByAltText("Upload 1");
    const container = img.closest("[class*='animate-pulse']");
    expect(container).toBeInTheDocument();
  });

  it("hides drop zone when at max images", () => {
    const images: ImageItem[] = [
      { id: "1", path: "p/1.jpg", url: "u1", type: "image" },
      { id: "2", path: "p/2.jpg", url: "u2", type: "image" },
      { id: "3", path: "p/3.jpg", url: "u3", type: "image" },
      { id: "4", path: "p/4.jpg", url: "u4", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.queryByText(/Drop files here/)).not.toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();
  });

  it("hides drop zone and remove buttons when disabled", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} disabled />);

    expect(screen.queryByText(/Drop files here/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Remove image 1")).not.toBeInTheDocument();
  });

  it("calls onChange with item removed when remove button clicked", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg", type: "image" },
      { id: "img2", path: "user/img2.jpg", url: "https://example.com/img2.jpg", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const removeBtn = screen.getByLabelText("Remove media 1");
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });

  it("calls deleteMedia.mutate when removing an uploaded image", () => {
    const images: ImageItem[] = [
      { id: "img1.jpg", path: "user-123/img1.jpg", url: "https://example.com/img1.jpg", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const removeBtn = screen.getByLabelText("Remove media 1");
    fireEvent.click(removeBtn);

    expect(mockMutate).toHaveBeenCalledWith("img1.jpg", expect.any(Object));
  });

  it("does not show remove button for uploading items", () => {
    const images: ImageItem[] = [
      { id: "temp-1", path: "", url: "blob:preview", uploading: true, type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.queryByLabelText("Remove media 1")).not.toBeInTheDocument();
  });

  it("has a hidden file input with correct accept types for images", () => {
    render(<ImageUploadZone images={[]} onChange={onChange} />);

    const input = screen.getByLabelText("Upload media");
    expect(input).toHaveAttribute("type", "file");
    expect(input.getAttribute("accept")).toContain("image/jpeg");
    expect(input.getAttribute("accept")).toContain("video/mp4");
  });

  it("excludes uploading items from the count", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "u1", type: "image" },
      { id: "temp", path: "", url: "blob:x", uploading: true, type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  // ── Video support ──

  it("shows video placeholder icon for video items", () => {
    const images: ImageItem[] = [
      { id: "vid1", path: "user/vid1.mp4", url: "https://example.com/vid1.mp4", type: "video" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.getByLabelText("Video file")).toBeInTheDocument();
    // Should show 1/1 for videos
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("hides drop zone when a video is present (max 1)", () => {
    const images: ImageItem[] = [
      { id: "vid1", path: "user/vid1.mp4", url: "https://example.com/vid1.mp4", type: "video" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.queryByText(/Drop files here/)).not.toBeInTheDocument();
  });

  it("shows processing overlay for items with processing flag", () => {
    const images: ImageItem[] = [
      { id: "vid1", path: "user/vid1.mp4", url: "https://example.com/vid1.mp4", type: "video", processing: true },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  // ── GIF support ──

  it("shows GIF badge for GIF items", () => {
    const images: ImageItem[] = [
      { id: "gif1", path: "user/gif1.gif", url: "https://example.com/gif1.gif", type: "gif" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.getByText("GIF")).toBeInTheDocument();
    // Should show 1/1 for gifs
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("hides drop zone when a GIF is present (max 1)", () => {
    const images: ImageItem[] = [
      { id: "gif1", path: "user/gif1.gif", url: "https://example.com/gif1.gif", type: "gif" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.queryByText(/Drop files here/)).not.toBeInTheDocument();
  });

  // ── Progress bar ──

  it("shows progress bar when item has progress value", () => {
    const images: ImageItem[] = [
      { id: "vid1", path: "", url: "blob:x", uploading: true, type: "video", progress: 45 },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  // ── Drop zone description ──

  it("shows correct format description for media", () => {
    render(<ImageUploadZone images={[]} onChange={onChange} />);

    expect(
      screen.getByText(/JPEG, PNG, GIF, WEBP, MP4/),
    ).toBeInTheDocument();
  });

  // ── Max limit based on type ──

  it("shows correct max count for images (4)", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "p/1.jpg", url: "u1", type: "image" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  it("shows correct max count for video (1)", () => {
    const images: ImageItem[] = [
      { id: "vid1", path: "p/1.mp4", url: "u1", type: "video" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("shows correct max count for gif (1)", () => {
    const images: ImageItem[] = [
      { id: "gif1", path: "p/1.gif", url: "u1", type: "gif" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  // ── Backwards compatibility ──

  it("treats items without type as images", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const img = screen.getByAltText("Upload 1");
    expect(img).toBeInTheDocument();
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });
});
