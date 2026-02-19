import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MentionInput } from "./mention-input";

describe("MentionInput", () => {
  const defaultProps = {
    mentions: [] as string[],
    onChange: vi.fn(),
    bodyLength: 50,
    tagsCharLength: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the input field", () => {
    render(<MentionInput {...defaultProps} />);
    expect(screen.getByPlaceholderText(/add @mention/i)).toBeInTheDocument();
  });

  it("adds a mention on Enter", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "dan_abramov" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["dan_abramov"]);
  });

  it("adds a mention on comma", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "vercel," } });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["vercel"]);
  });

  it("normalizes mention input (strips @, lowercases)", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "@DanAbramov" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).toHaveBeenCalledWith(["danabramov"]);
  });

  it("rejects invalid handles (with hyphens)", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "invalid-handle" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("rejects duplicate mentions", () => {
    render(<MentionInput {...defaultProps} mentions={["react"]} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("respects maxMentions limit", () => {
    render(
      <MentionInput
        {...defaultProps}
        mentions={["a", "b", "c", "d", "e"]}
        maxMentions={5}
      />,
    );
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.change(input, { target: { value: "f" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("removes a mention when X is clicked", () => {
    render(<MentionInput {...defaultProps} mentions={["react", "nextjs"]} />);

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(defaultProps.onChange).toHaveBeenCalledWith(["nextjs"]);
  });

  it("displays remaining character budget accounting for tags", () => {
    render(
      <MentionInput
        {...defaultProps}
        mentions={["react"]}
        bodyLength={200}
        tagsCharLength={15}
      />,
    );

    // 280 - 200 - 15 - 7 (" @react") = 58
    expect(screen.getByTestId("char-budget")).toHaveTextContent("58");
  });

  it("renders existing mentions as @handle chips", () => {
    render(<MentionInput {...defaultProps} mentions={["react", "nextjs"]} />);

    expect(screen.getByText("@react")).toBeInTheDocument();
    expect(screen.getByText("@nextjs")).toBeInTheDocument();
  });

  it("renders suggestion chips with handle when provided", () => {
    const suggestions = [
      { handle: "dan_abramov", relevance: "high" as const, reason: "React core team" },
      { handle: "vercel", relevance: "medium" as const, reason: "Next.js creator" },
    ];

    render(
      <MentionInput {...defaultProps} suggestions={suggestions} />,
    );

    expect(screen.getByText("@dan_abramov")).toBeInTheDocument();
    expect(screen.getByText("@vercel")).toBeInTheDocument();
  });

  it("shows reason in suggestion tooltip/text", () => {
    const suggestions = [
      { handle: "dan_abramov", relevance: "high" as const, reason: "React core team" },
    ];

    render(
      <MentionInput {...defaultProps} suggestions={suggestions} />,
    );

    expect(screen.getByText("React core team")).toBeInTheDocument();
  });

  it("adds mention when suggestion chip is clicked", () => {
    const suggestions = [
      { handle: "dan_abramov", relevance: "high" as const, reason: "React core team" },
    ];

    render(
      <MentionInput {...defaultProps} suggestions={suggestions} />,
    );

    fireEvent.click(screen.getByText("@dan_abramov"));

    expect(defaultProps.onChange).toHaveBeenCalledWith(["dan_abramov"]);
  });

  it("does not add suggestion if already in mentions", () => {
    const suggestions = [
      { handle: "react", relevance: "high" as const, reason: "Framework" },
    ];

    render(
      <MentionInput {...defaultProps} mentions={["react"]} suggestions={suggestions} />,
    );

    // The chip and suggestion both render @react
    const allReactTexts = screen.getAllByText("@react");
    // Find the disabled suggestion button
    const suggestionBtn = allReactTexts.find(
      (el) => el.closest("button[disabled]") !== null,
    );
    expect(suggestionBtn).toBeDefined();

    fireEvent.click(suggestionBtn!);
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("disables input when disabled prop is true", () => {
    render(<MentionInput {...defaultProps} disabled />);
    expect(screen.getByPlaceholderText(/add @mention/i)).toBeDisabled();
  });

  it("shows loading state for suggestions", () => {
    render(<MentionInput {...defaultProps} suggestLoading />);
    expect(screen.getByTestId("suggest-loading")).toBeInTheDocument();
  });

  it("clears input after adding mention", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "react" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input.value).toBe("");
  });

  it("ignores empty input on Enter", () => {
    render(<MentionInput {...defaultProps} />);
    const input = screen.getByPlaceholderText(/add @mention/i);

    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it("hides remove buttons when disabled", () => {
    render(<MentionInput {...defaultProps} mentions={["react"]} disabled />);

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});
