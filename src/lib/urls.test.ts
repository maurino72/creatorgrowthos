import { describe, it, expect } from "vitest";
import { appUrl } from "./urls";

describe("appUrl", () => {
  describe("platform-scoped routes", () => {
    it("dashboard with x slug", () => {
      expect(appUrl.dashboard("x")).toBe("/x/dashboard");
    });

    it("dashboard with linkedin slug", () => {
      expect(appUrl.dashboard("linkedin")).toBe("/linkedin/dashboard");
    });

    it("dashboard with threads slug", () => {
      expect(appUrl.dashboard("threads")).toBe("/threads/dashboard");
    });

    it("content list", () => {
      expect(appUrl.content("x")).toBe("/x/content");
    });

    it("content new", () => {
      expect(appUrl.contentNew("x")).toBe("/x/content/new");
    });

    it("content edit with id", () => {
      expect(appUrl.contentEdit("x", "abc-123")).toBe("/x/content/abc-123/edit");
    });

    it("content edit with linkedin slug", () => {
      expect(appUrl.contentEdit("linkedin", "post-456")).toBe(
        "/linkedin/content/post-456/edit",
      );
    });

    it("insights", () => {
      expect(appUrl.insights("x")).toBe("/x/insights");
    });

    it("insights with threads slug", () => {
      expect(appUrl.insights("threads")).toBe("/threads/insights");
    });

    it("experiments", () => {
      expect(appUrl.experiments("x")).toBe("/x/experiments");
    });

    it("experiments with linkedin slug", () => {
      expect(appUrl.experiments("linkedin")).toBe("/linkedin/experiments");
    });
  });

  describe("account-level routes", () => {
    it("connections", () => {
      expect(appUrl.connections()).toBe("/connections");
    });

    it("settings", () => {
      expect(appUrl.settings()).toBe("/settings");
    });

    it("settings billing", () => {
      expect(appUrl.settingsBilling()).toBe("/settings/billing");
    });
  });
});
