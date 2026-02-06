import { describe, it, expect } from "vitest";
import {
  STATUS_BADGE_STYLES,
  INSIGHT_TYPE_BADGE_STYLES,
  EXPERIMENT_TYPE_BADGE_STYLES,
  CONFIDENCE_STYLES,
} from "./badge-styles";

describe("badge-styles", () => {
  describe("STATUS_BADGE_STYLES", () => {
    it("exports styles for all post statuses", () => {
      expect(STATUS_BADGE_STYLES.draft).toBeDefined();
      expect(STATUS_BADGE_STYLES.scheduled).toBeDefined();
      expect(STATUS_BADGE_STYLES.published).toBeDefined();
      expect(STATUS_BADGE_STYLES.failed).toBeDefined();
    });

    it("exports styles for connection statuses", () => {
      expect(STATUS_BADGE_STYLES.active).toBeDefined();
      expect(STATUS_BADGE_STYLES.expired).toBeDefined();
      expect(STATUS_BADGE_STYLES.revoked).toBeDefined();
    });

    it("each style has className and label", () => {
      for (const [, style] of Object.entries(STATUS_BADGE_STYLES)) {
        expect(style.className).toBeDefined();
        expect(typeof style.className).toBe("string");
        expect(style.label).toBeDefined();
        expect(typeof style.label).toBe("string");
      }
    });

    it("uses status token classes", () => {
      expect(STATUS_BADGE_STYLES.published.className).toContain("status-success");
      expect(STATUS_BADGE_STYLES.failed.className).toContain("status-error");
      expect(STATUS_BADGE_STYLES.scheduled.className).toContain("status-info");
    });
  });

  describe("INSIGHT_TYPE_BADGE_STYLES", () => {
    it("exports styles for all insight types", () => {
      expect(INSIGHT_TYPE_BADGE_STYLES.performance_pattern).toBeDefined();
      expect(INSIGHT_TYPE_BADGE_STYLES.consistency_pattern).toBeDefined();
      expect(INSIGHT_TYPE_BADGE_STYLES.opportunity).toBeDefined();
      expect(INSIGHT_TYPE_BADGE_STYLES.anomaly).toBeDefined();
    });

    it("each style has className and label", () => {
      for (const [, style] of Object.entries(INSIGHT_TYPE_BADGE_STYLES)) {
        expect(style.className).toBeDefined();
        expect(style.label).toBeDefined();
      }
    });
  });

  describe("EXPERIMENT_TYPE_BADGE_STYLES", () => {
    it("exports styles for all experiment types", () => {
      expect(EXPERIMENT_TYPE_BADGE_STYLES.format_test).toBeDefined();
      expect(EXPERIMENT_TYPE_BADGE_STYLES.topic_test).toBeDefined();
      expect(EXPERIMENT_TYPE_BADGE_STYLES.style_test).toBeDefined();
    });

    it("each style has className and label", () => {
      for (const [, style] of Object.entries(EXPERIMENT_TYPE_BADGE_STYLES)) {
        expect(style.className).toBeDefined();
        expect(style.label).toBeDefined();
      }
    });
  });

  describe("CONFIDENCE_STYLES", () => {
    it("exports styles for all confidence levels", () => {
      expect(CONFIDENCE_STYLES.high).toBeDefined();
      expect(CONFIDENCE_STYLES.medium).toBeDefined();
      expect(CONFIDENCE_STYLES.low).toBeDefined();
    });

    it("each style has className and label", () => {
      for (const [, style] of Object.entries(CONFIDENCE_STYLES)) {
        expect(style.className).toBeDefined();
        expect(style.label).toBeDefined();
      }
    });
  });
});
