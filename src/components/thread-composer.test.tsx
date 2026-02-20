import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThreadComposer } from "./thread-composer";

describe("ThreadComposer", () => {
  const defaultProps = {
    posts: [
      { body: "First tweet", media_urls: [] as string[] },
      { body: "Second tweet", media_urls: [] as string[] },
    ],
    charLimit: 280,
    onPostsChange: vi.fn(),
    disabled: false,
  };

  it("renders a textarea for each post", () => {
    render(<ThreadComposer {...defaultProps} />);
    const textareas = screen.getAllByPlaceholderText(/Tweet/);
    expect(textareas).toHaveLength(2);
  });

  it("shows post number labels", () => {
    render(<ThreadComposer {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onPostsChange when text changes", () => {
    const onChange = vi.fn();
    render(<ThreadComposer {...defaultProps} onPostsChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Tweet 1"), {
      target: { value: "Updated first" },
    });
    expect(onChange).toHaveBeenCalledWith([
      { body: "Updated first", media_urls: [] },
      { body: "Second tweet", media_urls: [] },
    ]);
  });

  it("shows add tweet button", () => {
    render(<ThreadComposer {...defaultProps} />);
    expect(screen.getByText(/Add Tweet/i)).toBeInTheDocument();
  });

  it("adds a new post when add button clicked", () => {
    const onChange = vi.fn();
    render(<ThreadComposer {...defaultProps} onPostsChange={onChange} />);
    fireEvent.click(screen.getByText(/Add Tweet/i));
    expect(onChange).toHaveBeenCalledWith([
      ...defaultProps.posts,
      { body: "", media_urls: [] },
    ]);
  });

  it("shows remove button for each post when more than 2", () => {
    render(
      <ThreadComposer
        {...defaultProps}
        posts={[
          { body: "A", media_urls: [] },
          { body: "B", media_urls: [] },
          { body: "C", media_urls: [] },
        ]}
      />,
    );
    const removeButtons = screen.getAllByLabelText(/Remove tweet/);
    expect(removeButtons).toHaveLength(3);
  });

  it("removes a post when remove button clicked", () => {
    const onChange = vi.fn();
    render(
      <ThreadComposer
        {...defaultProps}
        posts={[
          { body: "A", media_urls: [] },
          { body: "B", media_urls: [] },
          { body: "C", media_urls: [] },
        ]}
        onPostsChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByLabelText(/Remove tweet/)[1]);
    expect(onChange).toHaveBeenCalledWith([
      { body: "A", media_urls: [] },
      { body: "C", media_urls: [] },
    ]);
  });

  it("shows per-post character count", () => {
    render(<ThreadComposer {...defaultProps} />);
    // "First tweet" = 11 chars
    expect(screen.getByText("11/280")).toBeInTheDocument();
  });

  it("disables all inputs when disabled", () => {
    render(<ThreadComposer {...defaultProps} disabled />);
    const textareas = screen.getAllByPlaceholderText(/Tweet/);
    for (const textarea of textareas) {
      expect(textarea).toBeDisabled();
    }
  });
});
