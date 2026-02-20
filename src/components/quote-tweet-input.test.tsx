import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuoteTweetInput } from "./quote-tweet-input";

describe("QuoteTweetInput", () => {
  it("renders an input for tweet ID/URL", () => {
    render(<QuoteTweetInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/tweet URL or ID/i)).toBeInTheDocument();
  });

  it("calls onChange with the input value", () => {
    const onChange = vi.fn();
    render(<QuoteTweetInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/tweet URL or ID/i), {
      target: { value: "https://twitter.com/user/status/123456" },
    });
    expect(onChange).toHaveBeenCalledWith(
      "https://twitter.com/user/status/123456",
    );
  });

  it("extracts tweet ID from URL on blur", () => {
    const onChange = vi.fn();
    render(
      <QuoteTweetInput
        value="https://twitter.com/user/status/123456789"
        onChange={onChange}
      />,
    );
    fireEvent.blur(screen.getByPlaceholderText(/tweet URL or ID/i));
    expect(onChange).toHaveBeenCalledWith("123456789");
  });

  it("keeps raw ID as-is on blur", () => {
    const onChange = vi.fn();
    render(<QuoteTweetInput value="123456789" onChange={onChange} />);
    fireEvent.blur(screen.getByPlaceholderText(/tweet URL or ID/i));
    expect(onChange).toHaveBeenCalledWith("123456789");
  });

  it("renders clear button when value exists", () => {
    render(<QuoteTweetInput value="123" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Clear quote tweet")).toBeInTheDocument();
  });

  it("calls onChange with empty string on clear", () => {
    const onChange = vi.fn();
    render(<QuoteTweetInput value="123" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Clear quote tweet"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("disables input when disabled", () => {
    render(<QuoteTweetInput value="" onChange={vi.fn()} disabled />);
    expect(screen.getByPlaceholderText(/tweet URL or ID/i)).toBeDisabled();
  });
});
