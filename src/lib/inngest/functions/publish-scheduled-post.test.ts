import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/services/publishing", () => ({
  publishPost: vi.fn(),
}));

import { publishScheduledPost } from "./publish-scheduled-post";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/services/publishing";

function createMockStep() {
  return {
    sleep: vi.fn(),
    sleepUntil: vi.fn(),
    run: vi.fn((id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(),
  };
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function createMockEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "post/scheduled" as const,
    data: {
      postId: "post-123",
      userId: "user-123",
      scheduledAt: "2025-06-01T15:00:00Z",
      ...overrides,
    },
  };
}

describe("publish-scheduled-post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct function configuration", () => {
    expect(publishScheduledPost).toBeDefined();
    // Inngest function id() is a method that takes a prefix
    const id = typeof publishScheduledPost.id === "function"
      ? publishScheduledPost.id("")
      : String(publishScheduledPost.id);
    expect(id).toContain("publish-scheduled-post");
  });

  it("sleeps until scheduledAt then publishes", async () => {
    const step = createMockStep();
    const event = createMockEvent();

    // Mock: post still scheduled with matching scheduled_at
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "post-123", status: "scheduled", scheduled_at: "2025-06-01T15:00:00Z" },
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createAdminClient>);

    vi.mocked(publishPost).mockResolvedValue([
      {
        platform: "twitter",
        success: true,
        platformPostId: "tw-123",
        platformUrl: "https://twitter.com/i/status/tw-123",
      },
    ]);

    // Execute the function handler directly
    const handler = publishScheduledPost["fn"];
    await handler({ event, step, logger: createMockLogger() } as unknown as Parameters<typeof handler>[0]);

    // Should sleep until the scheduled time
    expect(step.sleepUntil).toHaveBeenCalledWith(
      "wait-until-scheduled",
      "2025-06-01T15:00:00Z",
    );

    // Should verify the post is still scheduled
    expect(step.run).toHaveBeenCalledWith("verify-still-scheduled", expect.any(Function));

    // Should publish
    expect(step.run).toHaveBeenCalledWith("publish-post", expect.any(Function));

    // Should send success event
    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-publish-results",
      expect.arrayContaining([
        expect.objectContaining({
          name: "post/published",
          data: expect.objectContaining({
            postId: "post-123",
            platform: "twitter",
          }),
        }),
      ]),
    );
  });

  it("aborts if post is no longer scheduled", async () => {
    const step = createMockStep();
    const event = createMockEvent();

    // Mock verify step to throw (post was cancelled)
    let stepIndex = 0;
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      stepIndex++;
      if (id === "verify-still-scheduled") {
        // Simulate: post status is "draft" (schedule was cancelled)
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "post-123", status: "draft", scheduled_at: "2025-06-01T15:00:00Z" },
            error: null,
          }),
        };
        vi.mocked(createAdminClient).mockReturnValue({
          from: vi.fn().mockReturnValue(chain),
        } as unknown as ReturnType<typeof createAdminClient>);
        return fn();
      }
      return fn();
    });

    const handler = publishScheduledPost["fn"];
    const logger = createMockLogger();
    const result = await handler({ event, step, logger } as unknown as Parameters<typeof handler>[0]);

    // Should not call publishPost since the post is no longer scheduled
    expect(publishPost).not.toHaveBeenCalled();
    expect(result).toEqual({ cancelled: true, reason: "Post is no longer scheduled" });
  });

  it("aborts if scheduled_at was changed", async () => {
    const step = createMockStep();
    const event = createMockEvent();

    // Mock verify step: post is still "scheduled" but scheduled_at differs from event
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "verify-still-scheduled") {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "post-123", status: "scheduled", scheduled_at: "2025-06-02T10:00:00Z" },
            error: null,
          }),
        };
        vi.mocked(createAdminClient).mockReturnValue({
          from: vi.fn().mockReturnValue(chain),
        } as unknown as ReturnType<typeof createAdminClient>);
        return fn();
      }
      return fn();
    });

    const handler = publishScheduledPost["fn"];
    const logger = createMockLogger();
    const result = await handler({ event, step, logger } as unknown as Parameters<typeof handler>[0]);

    // Should not call publishPost since the schedule was changed
    expect(publishPost).not.toHaveBeenCalled();
    expect(result).toEqual({ cancelled: true, reason: "Schedule was changed" });
  });

  it("sends failure events when publish fails", async () => {
    const step = createMockStep();
    const event = createMockEvent();

    // Mock: post still scheduled with matching scheduled_at
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "verify-still-scheduled") {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "post-123", status: "scheduled", scheduled_at: "2025-06-01T15:00:00Z" },
            error: null,
          }),
        };
        vi.mocked(createAdminClient).mockReturnValue({
          from: vi.fn().mockReturnValue(chain),
        } as unknown as ReturnType<typeof createAdminClient>);
        return fn();
      }
      return fn();
    });

    vi.mocked(publishPost).mockResolvedValue([
      {
        platform: "twitter",
        success: false,
        error: "Rate limited",
      },
    ]);

    const handler = publishScheduledPost["fn"];
    await handler({ event, step, logger: createMockLogger() } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-publish-results",
      expect.arrayContaining([
        expect.objectContaining({
          name: "post/publish.failed",
          data: expect.objectContaining({
            postId: "post-123",
            platform: "twitter",
            error: "Rate limited",
          }),
        }),
      ]),
    );
  });
});
