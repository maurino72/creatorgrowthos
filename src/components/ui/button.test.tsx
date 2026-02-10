import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeDefined();
  });

  it("shows spinner when loading", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByTestId("button-spinner")).toBeDefined();
  });

  it("is disabled when loading", () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("does not show spinner when not loading", () => {
    render(<Button>Submit</Button>);
    expect(screen.queryByTestId("button-spinner")).toBeNull();
  });
});
