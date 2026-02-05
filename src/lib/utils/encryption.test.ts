import { describe, it, expect, beforeEach, vi } from "vitest";
import { encrypt, decrypt } from "./encryption";

const TEST_KEY =
  "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

describe("encryption utility", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
  });

  it("round-trips a simple string", () => {
    const plaintext = "hello world";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips unicode content", () => {
    const plaintext = "emoji: 🚀🎉 — accents: café résumé";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips a long string", () => {
    const plaintext = "x".repeat(10_000);
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("produces different ciphertexts for the same input (unique IV)", () => {
    const plaintext = "same input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("throws on tampered ciphertext", () => {
    const ciphertext = encrypt("test");
    const tampered = ciphertext.slice(0, -4) + "AAAA";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws if ENCRYPTION_KEY is missing", () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws if ENCRYPTION_KEY is wrong length", () => {
    vi.stubEnv("ENCRYPTION_KEY", "tooshort");
    expect(() => encrypt("test")).toThrow(/ENCRYPTION_KEY/);
  });
});
