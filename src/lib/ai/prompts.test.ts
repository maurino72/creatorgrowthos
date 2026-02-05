import { describe, it, expect } from "vitest";
import {
  buildClassifyPrompt,
  CLASSIFY_POST_VERSION,
  CLASSIFY_POST_TEMPLATE,
} from "./prompts";
import { INTENTS, CONTENT_TYPES } from "./taxonomy";

describe("prompt constants", () => {
  it("exports a version string", () => {
    expect(CLASSIFY_POST_VERSION).toBe("1.0");
  });

  it("exports template name", () => {
    expect(CLASSIFY_POST_TEMPLATE).toBe("classify_post");
  });
});

describe("buildClassifyPrompt", () => {
  const result = buildClassifyPrompt("How to build a SaaS in 2024 — a thread on the 5 things I learned launching my first product.");

  it("returns system and user messages", () => {
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("system message includes all intent categories", () => {
    for (const intent of INTENTS) {
      expect(result.system).toContain(intent);
    }
  });

  it("system message includes all content types", () => {
    for (const type of CONTENT_TYPES) {
      expect(result.system).toContain(type);
    }
  });

  it("system message instructs JSON-only response", () => {
    expect(result.system).toMatch(/json/i);
  });

  it("system message includes example classifications", () => {
    // Should have at least 2 examples
    expect(result.system).toContain("Example");
  });

  it("user message contains the post body", () => {
    expect(result.user).toContain("How to build a SaaS in 2024");
  });

  it("returns the full prompt as a single string", () => {
    expect(result).toHaveProperty("fullPrompt");
    expect(result.fullPrompt).toContain(result.system);
    expect(result.fullPrompt).toContain(result.user);
  });
});
