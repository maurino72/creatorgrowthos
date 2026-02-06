import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/classification", () => ({
  classifyPost: vi.fn(),
}));

import { classifyPostFn, classifyImportedPosts } from "./classify";
import { classifyPost } from "@/lib/services/classification";

function createMockStep() {
  return {
    run: vi.fn((id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(),
  };
}

describe("classify-post function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(classifyPostFn).toBeDefined();
  });

  it("calls classifyPost service and sends completion event", async () => {
    const step = createMockStep();
    const event = {
      name: "ai/classify.requested" as const,
      data: { postId: "post-1", userId: "user-1" },
    };

    vi.mocked(classifyPost).mockResolvedValue({
      intent: "educate",
      content_type: "tutorial",
      topics: ["typescript", "testing"],
    } as Awaited<ReturnType<typeof classifyPost>>);

    const handler = classifyPostFn["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("classify", expect.any(Function));
    expect(classifyPost).toHaveBeenCalledWith("user-1", "post-1");

    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-completion",
      expect.objectContaining({
        name: "ai/classify.completed",
        data: expect.objectContaining({
          postId: "post-1",
          userId: "user-1",
          intent: "educate",
          topics: ["typescript", "testing"],
        }),
      }),
    );
  });

  it("propagates errors for retry", async () => {
    const step = createMockStep();
    const event = {
      name: "ai/classify.requested" as const,
      data: { postId: "post-1", userId: "user-1" },
    };

    vi.mocked(classifyPost).mockRejectedValue(new Error("OpenAI timeout"));

    const handler = classifyPostFn["fn"];
    await expect(
      handler({ event, step } as unknown as Parameters<typeof handler>[0]),
    ).rejects.toThrow("OpenAI timeout");
  });
});

describe("classify-imported-posts function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(classifyImportedPosts).toBeDefined();
  });

  it("sends classify events for each imported post", async () => {
    const step = createMockStep();
    const event = {
      name: "post/imported" as const,
      data: {
        userId: "user-1",
        postIds: ["post-1", "post-2", "post-3"],
        count: 3,
      },
    };

    const handler = classifyImportedPosts["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).toHaveBeenCalledWith(
      "fan-out-classify",
      expect.arrayContaining([
        expect.objectContaining({
          name: "ai/classify.requested",
          data: { postId: "post-1", userId: "user-1" },
        }),
        expect.objectContaining({
          name: "ai/classify.requested",
          data: { postId: "post-2", userId: "user-1" },
        }),
        expect.objectContaining({
          name: "ai/classify.requested",
          data: { postId: "post-3", userId: "user-1" },
        }),
      ]),
    );
  });
});
