import { describe, it, expect } from "vitest";
import { replySettingsSchema, REPLY_SETTINGS, type ReplySettings } from "./reply-settings";

describe("replySettingsSchema", () => {
  it("accepts 'everyone'", () => {
    expect(replySettingsSchema.safeParse("everyone").success).toBe(true);
  });

  it("accepts 'mentioned_users'", () => {
    expect(replySettingsSchema.safeParse("mentioned_users").success).toBe(true);
  });

  it("accepts 'following'", () => {
    expect(replySettingsSchema.safeParse("following").success).toBe(true);
  });

  it("accepts 'subscribers'", () => {
    expect(replySettingsSchema.safeParse("subscribers").success).toBe(true);
  });

  it("accepts 'verified_users'", () => {
    expect(replySettingsSchema.safeParse("verified_users").success).toBe(true);
  });

  it("rejects invalid value", () => {
    expect(replySettingsSchema.safeParse("nobody").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(replySettingsSchema.safeParse("").success).toBe(false);
  });

  it("exports REPLY_SETTINGS array with all 5 values", () => {
    expect(REPLY_SETTINGS).toHaveLength(5);
    expect(REPLY_SETTINGS).toContain("everyone");
    expect(REPLY_SETTINGS).toContain("mentioned_users");
    expect(REPLY_SETTINGS).toContain("following");
    expect(REPLY_SETTINGS).toContain("subscribers");
    expect(REPLY_SETTINGS).toContain("verified_users");
  });
});
