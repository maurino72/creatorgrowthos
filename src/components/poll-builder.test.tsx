import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PollBuilder } from "./poll-builder";

describe("PollBuilder", () => {
  const defaultProps = {
    options: ["", ""],
    durationMinutes: 1440,
    onOptionsChange: vi.fn(),
    onDurationChange: vi.fn(),
    onRemove: vi.fn(),
  };

  it("renders 2 option inputs by default", () => {
    render(<PollBuilder {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/Option/);
    expect(inputs).toHaveLength(2);
  });

  it("calls onOptionsChange when option text changes", () => {
    const onChange = vi.fn();
    render(<PollBuilder {...defaultProps} onOptionsChange={onChange} />);
    const input = screen.getByPlaceholderText("Option 1");
    fireEvent.change(input, { target: { value: "Yes" } });
    expect(onChange).toHaveBeenCalledWith(["Yes", ""]);
  });

  it("shows add option button when fewer than 4 options", () => {
    render(<PollBuilder {...defaultProps} />);
    expect(screen.getByText(/Add Option/i)).toBeInTheDocument();
  });

  it("hides add option button when 4 options exist", () => {
    render(
      <PollBuilder
        {...defaultProps}
        options={["A", "B", "C", "D"]}
      />,
    );
    expect(screen.queryByText(/Add Option/i)).not.toBeInTheDocument();
  });

  it("adds an option when add button clicked", () => {
    const onChange = vi.fn();
    render(<PollBuilder {...defaultProps} onOptionsChange={onChange} />);
    fireEvent.click(screen.getByText(/Add Option/i));
    expect(onChange).toHaveBeenCalledWith(["", "", ""]);
  });

  it("removes an option when remove button clicked (3+ options)", () => {
    const onChange = vi.fn();
    render(
      <PollBuilder
        {...defaultProps}
        options={["A", "B", "C"]}
        onOptionsChange={onChange}
      />,
    );
    const removeButtons = screen.getAllByLabelText(/Remove option/);
    fireEvent.click(removeButtons[2]);
    expect(onChange).toHaveBeenCalledWith(["A", "B"]);
  });

  it("does not show remove buttons when only 2 options", () => {
    render(<PollBuilder {...defaultProps} />);
    expect(screen.queryByLabelText(/Remove option/)).not.toBeInTheDocument();
  });

  it("renders duration select", () => {
    render(<PollBuilder {...defaultProps} />);
    expect(screen.getByLabelText("Poll duration")).toBeInTheDocument();
  });

  it("calls onDurationChange when duration changes", () => {
    const onDuration = vi.fn();
    render(<PollBuilder {...defaultProps} onDurationChange={onDuration} />);
    fireEvent.change(screen.getByLabelText("Poll duration"), {
      target: { value: "60" },
    });
    expect(onDuration).toHaveBeenCalledWith(60);
  });

  it("renders remove poll button", () => {
    render(<PollBuilder {...defaultProps} />);
    expect(screen.getByText(/Remove Poll/i)).toBeInTheDocument();
  });

  it("shows character count for each option", () => {
    render(
      <PollBuilder
        {...defaultProps}
        options={["Hello", ""]}
      />,
    );
    expect(screen.getByText("5/25")).toBeInTheDocument();
  });

  it("disables inputs when disabled prop is true", () => {
    render(<PollBuilder {...defaultProps} disabled />);
    const inputs = screen.getAllByPlaceholderText(/Option/);
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });
});
