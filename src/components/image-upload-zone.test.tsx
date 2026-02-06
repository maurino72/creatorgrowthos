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

    expect(screen.getByText(/Drop images here or/)).toBeInTheDocument();
    expect(screen.getByText("browse")).toBeInTheDocument();
    expect(screen.getByText("Images")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();
  });

  it("shows image count when images are present", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg" },
      { id: "img2", path: "user/img2.jpg", url: "https://example.com/img2.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("renders image previews", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const img = screen.getByAltText("Upload 1");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/img1.jpg");
  });

  it("shows uploading spinner overlay for uploading items", () => {
    const images: ImageItem[] = [
      { id: "temp-1", path: "", url: "blob:preview", uploading: true },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    // The uploading image should have animate-pulse class on its container
    const img = screen.getByAltText("Upload 1");
    const container = img.closest("[class*='animate-pulse']");
    expect(container).toBeInTheDocument();
  });

  it("hides drop zone when at max images", () => {
    const images: ImageItem[] = [
      { id: "1", path: "p/1.jpg", url: "u1" },
      { id: "2", path: "p/2.jpg", url: "u2" },
      { id: "3", path: "p/3.jpg", url: "u3" },
      { id: "4", path: "p/4.jpg", url: "u4" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    expect(screen.queryByText(/Drop images here/)).not.toBeInTheDocument();
    expect(screen.getByText("4/4")).toBeInTheDocument();
  });

  it("hides drop zone and remove buttons when disabled", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} disabled />);

    expect(screen.queryByText(/Drop images here/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Remove image 1")).not.toBeInTheDocument();
  });

  it("calls onChange with item removed when remove button clicked", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "https://example.com/img1.jpg" },
      { id: "img2", path: "user/img2.jpg", url: "https://example.com/img2.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const removeBtn = screen.getByLabelText("Remove image 1");
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([images[1]]);
  });

  it("calls deleteMedia.mutate when removing an uploaded image", () => {
    const images: ImageItem[] = [
      { id: "img1.jpg", path: "user-123/img1.jpg", url: "https://example.com/img1.jpg" },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);

    const removeBtn = screen.getByLabelText("Remove image 1");
    fireEvent.click(removeBtn);

    expect(mockMutate).toHaveBeenCalledWith("img1.jpg", expect.any(Object));
  });

  it("does not show remove button for uploading items", () => {
    const images: ImageItem[] = [
      { id: "temp-1", path: "", url: "blob:preview", uploading: true },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.queryByLabelText("Remove image 1")).not.toBeInTheDocument();
  });

  it("has a hidden file input with correct accept types", () => {
    render(<ImageUploadZone images={[]} onChange={onChange} />);

    const input = screen.getByLabelText("Upload images");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/gif,image/webp");
    expect(input).toHaveAttribute("multiple");
  });

  it("excludes uploading items from the count", () => {
    const images: ImageItem[] = [
      { id: "img1", path: "user/img1.jpg", url: "u1" },
      { id: "temp", path: "", url: "blob:x", uploading: true },
    ];

    render(<ImageUploadZone images={images} onChange={onChange} />);
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });
});
