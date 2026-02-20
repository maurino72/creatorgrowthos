import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

import PlatformLayout from "./layout";
import { notFound } from "next/navigation";

describe("PlatformLayout", () => {
  it("renders children for valid slug x", async () => {
    const result = await PlatformLayout({
      children: "child content",
      params: Promise.resolve({ platform: "x" }),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("renders children for valid slug linkedin", async () => {
    const result = await PlatformLayout({
      children: "child content",
      params: Promise.resolve({ platform: "linkedin" }),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("renders children for valid slug threads", async () => {
    const result = await PlatformLayout({
      children: "child content",
      params: Promise.resolve({ platform: "threads" }),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("calls notFound for invalid slug", async () => {
    await PlatformLayout({
      children: "child content",
      params: Promise.resolve({ platform: "invalid" }),
    });

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound for settings slug", async () => {
    await PlatformLayout({
      children: "child content",
      params: Promise.resolve({ platform: "settings" }),
    });

    expect(notFound).toHaveBeenCalled();
  });
});
