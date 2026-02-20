import { describe, it, expect } from "vitest";
import { pollSchema, MIN_POLL_OPTIONS, MAX_POLL_OPTIONS, MAX_POLL_OPTION_LENGTH, MIN_POLL_DURATION_MINUTES, MAX_POLL_DURATION_MINUTES } from "./polls";

describe("pollSchema", () => {
  it("accepts valid poll with 2 options", () => {
    const result = pollSchema.safeParse({
      options: ["Yes", "No"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid poll with 4 options", () => {
    const result = pollSchema.safeParse({
      options: ["A", "B", "C", "D"],
      duration_minutes: 1440,
    });
    expect(result.success).toBe(true);
  });

  it("rejects poll with fewer than 2 options", () => {
    const result = pollSchema.safeParse({
      options: ["Only one"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it("rejects poll with more than 4 options", () => {
    const result = pollSchema.safeParse({
      options: ["A", "B", "C", "D", "E"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it("rejects option exceeding 25 characters", () => {
    const result = pollSchema.safeParse({
      options: ["A".repeat(26), "B"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it("accepts option exactly 25 characters", () => {
    const result = pollSchema.safeParse({
      options: ["A".repeat(25), "B"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty option string", () => {
    const result = pollSchema.safeParse({
      options: ["", "B"],
      duration_minutes: 60,
    });
    expect(result.success).toBe(false);
  });

  it("rejects duration below 5 minutes", () => {
    const result = pollSchema.safeParse({
      options: ["Yes", "No"],
      duration_minutes: 4,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration of exactly 5 minutes", () => {
    const result = pollSchema.safeParse({
      options: ["Yes", "No"],
      duration_minutes: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects duration above 10080 minutes", () => {
    const result = pollSchema.safeParse({
      options: ["Yes", "No"],
      duration_minutes: 10081,
    });
    expect(result.success).toBe(false);
  });

  it("accepts duration of exactly 10080 minutes", () => {
    const result = pollSchema.safeParse({
      options: ["Yes", "No"],
      duration_minutes: 10080,
    });
    expect(result.success).toBe(true);
  });

  it("exports correct constants", () => {
    expect(MIN_POLL_OPTIONS).toBe(2);
    expect(MAX_POLL_OPTIONS).toBe(4);
    expect(MAX_POLL_OPTION_LENGTH).toBe(25);
    expect(MIN_POLL_DURATION_MINUTES).toBe(5);
    expect(MAX_POLL_DURATION_MINUTES).toBe(10080);
  });
});
