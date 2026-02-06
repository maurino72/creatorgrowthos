import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlatformIcon } from "./platform-icon";

describe("PlatformIcon", () => {
  it("renders Twitter icon", () => {
    render(<PlatformIcon platform="twitter" />);
    expect(screen.getByTestId("platform-twitter")).toBeInTheDocument();
  });

  it("renders LinkedIn icon", () => {
    render(<PlatformIcon platform="linkedin" />);
    expect(screen.getByTestId("platform-linkedin")).toBeInTheDocument();
  });

  it("renders Threads icon", () => {
    render(<PlatformIcon platform="threads" />);
    expect(screen.getByTestId("platform-threads")).toBeInTheDocument();
  });

  it("returns null for unknown platform", () => {
    const { container } = render(<PlatformIcon platform="unknown" />);
    expect(container.innerHTML).toBe("");
  });

  it("applies custom size", () => {
    render(<PlatformIcon platform="twitter" size={20} />);
    const svg = screen.getByTestId("platform-twitter").querySelector("svg");
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });
});
