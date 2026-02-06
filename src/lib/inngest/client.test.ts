import { describe, it, expect } from "vitest";
import { inngest } from "./client";

describe("Inngest client", () => {
  it("is an Inngest instance with correct app id", () => {
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe("creator-growth-os");
  });

  it("has createFunction method", () => {
    expect(typeof inngest.createFunction).toBe("function");
  });

  it("has send method for dispatching events", () => {
    expect(typeof inngest.send).toBe("function");
  });
});
