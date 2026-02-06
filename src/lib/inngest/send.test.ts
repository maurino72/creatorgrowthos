import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { inngest } from "./client";
import {
  sendPostCreated,
  sendPostScheduled,
  sendPostScheduleCancelled,
  sendPostUpdated,
  sendPostPublishResults,
  sendConnectionCreated,
} from "./send";

describe("event sending utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendPostCreated sends post/created event", async () => {
    await sendPostCreated("post-1", "user-1");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "post/created",
      data: { postId: "post-1", userId: "user-1" },
    });
  });

  it("sendPostScheduled sends post/scheduled event", async () => {
    await sendPostScheduled("post-1", "user-1", "2025-06-01T15:00:00Z");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "post/scheduled",
      data: {
        postId: "post-1",
        userId: "user-1",
        scheduledAt: "2025-06-01T15:00:00Z",
      },
    });
  });

  it("sendPostScheduleCancelled sends post/schedule.cancelled event", async () => {
    await sendPostScheduleCancelled("post-1", "user-1");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "post/schedule.cancelled",
      data: { postId: "post-1", userId: "user-1" },
    });
  });

  it("sendPostUpdated sends post/updated event", async () => {
    await sendPostUpdated("post-1", "user-1", ["body", "platforms"]);
    expect(inngest.send).toHaveBeenCalledWith({
      name: "post/updated",
      data: {
        postId: "post-1",
        userId: "user-1",
        changedFields: ["body", "platforms"],
      },
    });
  });

  it("sendPostPublishResults sends events for each platform result", async () => {
    await sendPostPublishResults("post-1", "user-1", [
      {
        platform: "twitter",
        success: true,
        platformPostId: "tw-123",
        platformUrl: "https://twitter.com/i/status/tw-123",
      },
    ]);
    expect(inngest.send).toHaveBeenCalledWith([
      {
        name: "post/published",
        data: {
          postId: "post-1",
          userId: "user-1",
          publicationId: "tw-123",
          platform: "twitter",
        },
      },
    ]);
  });

  it("sendPostPublishResults sends failure events", async () => {
    await sendPostPublishResults("post-1", "user-1", [
      {
        platform: "twitter",
        success: false,
        error: "Rate limited",
      },
    ]);
    expect(inngest.send).toHaveBeenCalledWith([
      {
        name: "post/publish.failed",
        data: {
          postId: "post-1",
          userId: "user-1",
          platform: "twitter",
          error: "Rate limited",
        },
      },
    ]);
  });

  it("sendConnectionCreated sends connection/created event", async () => {
    await sendConnectionCreated("user-1", "twitter", "conn-1");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "connection/created",
      data: {
        userId: "user-1",
        platform: "twitter",
        connectionId: "conn-1",
      },
    });
  });
});
