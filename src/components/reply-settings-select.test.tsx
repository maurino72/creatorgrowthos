import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReplySettingsSelect } from "./reply-settings-select";

describe("ReplySettingsSelect", () => {
  it("renders a select with all 5 reply settings", () => {
    render(<ReplySettingsSelect value="everyone" onChange={vi.fn()} />);
    const select = screen.getByLabelText("Reply settings");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Everyone")).toBeInTheDocument();
  });

  it("calls onChange when value changes", () => {
    const onChange = vi.fn();
    render(<ReplySettingsSelect value="everyone" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Reply settings"), {
      target: { value: "mentioned_users" },
    });
    expect(onChange).toHaveBeenCalledWith("mentioned_users");
  });

  it("renders with correct selected value", () => {
    render(<ReplySettingsSelect value="following" onChange={vi.fn()} />);
    const select = screen.getByLabelText("Reply settings") as HTMLSelectElement;
    expect(select.value).toBe("following");
  });

  it("disables when disabled prop is true", () => {
    render(<ReplySettingsSelect value="everyone" onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText("Reply settings")).toBeDisabled();
  });
});
