import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AltTextDialog } from "./alt-text-dialog";

describe("AltTextDialog", () => {
  const defaultProps = {
    open: true,
    imageUrl: "https://example.com/img.jpg",
    altText: "",
    onAltTextChange: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders when open", () => {
    render(<AltTextDialog {...defaultProps} />);
    expect(screen.getByText(/Alt Text/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<AltTextDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/Alt Text/i)).not.toBeInTheDocument();
  });

  it("shows a textarea for alt text input", () => {
    render(<AltTextDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Describe this image/i)).toBeInTheDocument();
  });

  it("calls onAltTextChange when text changes", () => {
    const onChange = vi.fn();
    render(<AltTextDialog {...defaultProps} onAltTextChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe this image/i), {
      target: { value: "A sunset" },
    });
    expect(onChange).toHaveBeenCalledWith("A sunset");
  });

  it("shows character count", () => {
    render(<AltTextDialog {...defaultProps} altText="Hello" />);
    expect(screen.getByText("5/1000")).toBeInTheDocument();
  });

  it("calls onClose when done button clicked", () => {
    const onClose = vi.fn();
    render(<AltTextDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<AltTextDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("alt-text-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("prevents text exceeding 1000 characters", () => {
    const onChange = vi.fn();
    render(<AltTextDialog {...defaultProps} onAltTextChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/Describe this image/i);
    expect(textarea).toHaveAttribute("maxLength", "1000");
  });
});
