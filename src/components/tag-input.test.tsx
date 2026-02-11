import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagInput } from "./tag-input";

describe("TagInput", () => {
  const defaultProps = {
    tags: [] as string[],
    onChange: vi.fn(),
    bodyLength: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the input field", () => {
    render(<TagInput {...defaultProps} />);
    expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
  });

  it("adds a tag on Enter", () => {
    render(<TagInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["react"]);
  });

  it("adds a tag on comma", () => {
    render(<TagInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.change(input, { target: { value: "nextjs," } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["nextjs"]);
  });

  it("normalizes tag input (strips #, lowercases, trims)", () => {
    render(<TagInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.change(input, { target: { value: "#TypeScript" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["typescript"]);
  });

  it("rejects duplicate tags", () => {
    render(<TagInput {...defaultProps} tags={["react"]} />);
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("respects maxTags limit", () => {
    render(
      <TagInput
        {...defaultProps}
        tags={["a", "b", "c", "d", "e"]}
        maxTags={5}
      />,
    );
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.change(input, { target: { value: "f" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("removes a tag when X is clicked", () => {
    render(<TagInput {...defaultProps} tags={["react", "nextjs"]} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(defaultProps.onChange).toHaveBeenCalledWith(["nextjs"]);
  });

  it("displays remaining character budget", () => {
    render(<TagInput {...defaultProps} tags={["react"]} bodyLength={200} />);

    // 280 - 200 - 7 (" #react") = 73
    expect(screen.getByTestId("char-budget")).toHaveTextContent("73");
  });

  it("renders existing tags as chips", () => {
    render(<TagInput {...defaultProps} tags={["react", "nextjs"]} />);

    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("#nextjs")).toBeInTheDocument();
  });

  it("renders suggestion chips when provided", () => {
    const suggestions = [
      { tag: "webdev", relevance: "high" as const },
      { tag: "coding", relevance: "medium" as const },
    ];

    render(
      <TagInput {...defaultProps} suggestions={suggestions} />,
    );

    expect(screen.getByText("#webdev")).toBeInTheDocument();
    expect(screen.getByText("#coding")).toBeInTheDocument();
  });

  it("adds tag when suggestion chip is clicked", () => {
    const suggestions = [
      { tag: "webdev", relevance: "high" as const },
    ];

    render(
      <TagInput {...defaultProps} suggestions={suggestions} />,
    );

    fireEvent.click(screen.getByText("#webdev"));

    expect(defaultProps.onChange).toHaveBeenCalledWith(["webdev"]);
  });

  it("does not add suggestion if already in tags", () => {
    const suggestions = [
      { tag: "react", relevance: "high" as const },
    ];

    render(
      <TagInput {...defaultProps} tags={["react"]} suggestions={suggestions} />,
    );

    // The suggestion button should be disabled since "react" is already a tag
    const suggestionButtons = screen.getAllByText("#react");
    // There should be 2: one chip in tags, one suggestion button (disabled)
    const suggestionBtn = suggestionButtons.find(
      (el) => el.closest("button[disabled]") !== null,
    );
    expect(suggestionBtn).toBeDefined();

    fireEvent.click(suggestionBtn!);
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("disables input when disabled prop is true", () => {
    render(<TagInput {...defaultProps} disabled />);
    expect(screen.getByPlaceholderText(/add tag/i)).toBeDisabled();
  });

  it("shows loading state for suggestions", () => {
    render(<TagInput {...defaultProps} suggestLoading />);
    expect(screen.getByTestId("suggest-loading")).toBeInTheDocument();
  });

  it("clears input after adding tag", () => {
    render(<TagInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add tag/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input.value).toBe("");
  });

  it("ignores empty input on Enter", () => {
    render(<TagInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add tag/i);

    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });
});
