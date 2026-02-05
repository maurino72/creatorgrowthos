import { describe, it, expect } from "vitest";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce";

describe("PKCE utilities", () => {
  describe("generateCodeVerifier", () => {
    it("returns a string between 43 and 128 characters", () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it("contains only URL-safe characters (unreserved chars per RFC 7636)", () => {
      const verifier = generateCodeVerifier();
      // RFC 7636: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it("generates unique values on each call", () => {
      const a = generateCodeVerifier();
      const b = generateCodeVerifier();
      expect(a).not.toBe(b);
    });
  });

  describe("generateCodeChallenge", () => {
    it("returns a base64url string without padding", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      // Base64url: [A-Za-z0-9_-], no padding '='
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(challenge).not.toContain("=");
    });

    it("is deterministic for the same verifier", async () => {
      const verifier = "test-verifier-value";
      const a = await generateCodeChallenge(verifier);
      const b = await generateCodeChallenge(verifier);
      expect(a).toBe(b);
    });

    it("produces different challenges for different verifiers", async () => {
      const a = await generateCodeChallenge("verifier-one");
      const b = await generateCodeChallenge("verifier-two");
      expect(a).not.toBe(b);
    });

    it("produces a SHA-256 hash (43 chars base64url for 32 bytes)", async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      // SHA-256 = 32 bytes → ceil(32 * 4/3) = 43 base64url chars (without padding)
      expect(challenge.length).toBe(43);
    });
  });
});
