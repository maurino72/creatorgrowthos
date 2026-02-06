import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtmosphericBackground } from "./atmospheric-background";

describe("AtmosphericBackground", () => {
  it("renders with full intensity", () => {
    render(<AtmosphericBackground intensity="full" />);

    const container = screen.getByTestId("atmospheric-bg");
    expect(container).toBeDefined();
    // Full intensity uses higher opacity blobs
    expect(container.innerHTML).toContain("opacity-60");
  });

  it("renders with subtle intensity", () => {
    render(<AtmosphericBackground intensity="subtle" />);

    const container = screen.getByTestId("atmospheric-bg");
    expect(container).toBeDefined();
    // Subtle intensity uses lower opacity blobs
    expect(container.innerHTML).toContain("opacity-20");
  });

  it("renders with minimal intensity", () => {
    render(<AtmosphericBackground intensity="minimal" />);

    const container = screen.getByTestId("atmospheric-bg");
    expect(container).toBeDefined();
    // Minimal intensity uses even lower opacity
    expect(container.innerHTML).toContain("opacity-10");
  });

  it("renders grain overlay", () => {
    render(<AtmosphericBackground intensity="full" />);

    const container = screen.getByTestId("atmospheric-bg");
    // Grain overlay is present
    expect(container.innerHTML).toContain("feTurbulence");
  });

  it("uses mesh token classes for gradient blobs", () => {
    render(<AtmosphericBackground intensity="full" />);

    const container = screen.getByTestId("atmospheric-bg");
    expect(container.innerHTML).toContain("bg-mesh-1");
    expect(container.innerHTML).toContain("bg-mesh-2");
    expect(container.innerHTML).toContain("bg-mesh-3");
  });

  it("is non-interactive (pointer-events-none)", () => {
    render(<AtmosphericBackground intensity="full" />);

    const container = screen.getByTestId("atmospheric-bg");
    expect(container.className).toContain("pointer-events-none");
  });
});
