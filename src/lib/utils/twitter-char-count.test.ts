import { describe, it, expect } from "vitest";
import { countTweetLength, T_CO_LENGTH } from "./twitter-char-count";

describe("countTweetLength", () => {
  it("returns exact length for text without URLs", () => {
    expect(countTweetLength("Hello world")).toBe(11);
  });

  it("returns 0 for empty string", () => {
    expect(countTweetLength("")).toBe(0);
  });

  it("counts a single https URL as T_CO_LENGTH", () => {
    const text = "visit https://example.com/long/path";
    // "visit " = 6, URL = 23
    expect(countTweetLength(text)).toBe(6 + T_CO_LENGTH);
  });

  it("counts a single http URL as T_CO_LENGTH", () => {
    const text = "check http://example.com/foo/bar/baz";
    // "check " = 6, URL = 23
    expect(countTweetLength(text)).toBe(6 + T_CO_LENGTH);
  });

  it("counts multiple URLs each as T_CO_LENGTH", () => {
    const text = "A https://a.com B https://b.com/long";
    // "A " = 2, URL = 23, " B " = 3, URL = 23
    expect(countTweetLength(text)).toBe(2 + T_CO_LENGTH + 3 + T_CO_LENGTH);
  });

  it("handles URL at the start of text", () => {
    const text = "https://start.com rest";
    // URL = 23, " rest" = 5
    expect(countTweetLength(text)).toBe(T_CO_LENGTH + 5);
  });

  it("handles URL at the end of text", () => {
    const text = "check this https://end.com";
    // "check this " = 11, URL = 23
    expect(countTweetLength(text)).toBe(11 + T_CO_LENGTH);
  });

  it("handles consecutive URLs separated by space", () => {
    const text = "https://a.com https://b.com";
    // URL = 23, " " = 1, URL = 23
    expect(countTweetLength(text)).toBe(T_CO_LENGTH + 1 + T_CO_LENGTH);
  });

  it("handles URLs with query params and fragments", () => {
    const text = "go to https://example.com/path?q=1&b=2#section";
    // "go to " = 6, URL = 23
    expect(countTweetLength(text)).toBe(6 + T_CO_LENGTH);
  });

  it("handles URLs with ports", () => {
    const text = "at https://example.com:8080/path";
    // "at " = 3, URL = 23
    expect(countTweetLength(text)).toBe(3 + T_CO_LENGTH);
  });

  it("does not treat non-URLs as URLs", () => {
    const text = "email@example.com is not a url";
    expect(countTweetLength(text)).toBe(text.length);
  });

  it("handles text with emojis correctly", () => {
    // Emojis are typically 2 chars in JS but Twitter counts them differently;
    // For simplicity, we count JS string length for non-URL portions
    const text = "Hello 😀";
    expect(countTweetLength(text)).toBe(text.length);
  });

  it("exports T_CO_LENGTH as 23", () => {
    expect(T_CO_LENGTH).toBe(23);
  });
});
