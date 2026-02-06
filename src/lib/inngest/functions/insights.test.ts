import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/insights", () => ({
  getEligibleUsersForInsights: vi.fn(),
  generateInsights: vi.fn(),
}));

import { generateWeeklyInsights, generateUserInsights } from "./insights";
import { getEligibleUsersForInsights, generateInsights } from "@/lib/services/insights";

function createMockStep() {
  return {
    run: vi.fn((id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(),
  };
}

describe("generate-weekly-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(generateWeeklyInsights).toBeDefined();
  });

  it("queries eligible users and sends insight events", async () => {
    const step = createMockStep();

    vi.mocked(getEligibleUsersForInsights).mockResolvedValue([
      "user-1",
      "user-2",
    ]);

    const handler = generateWeeklyInsights["fn"];
    await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("get-eligible-users", expect.any(Function));
    expect(step.sendEvent).toHaveBeenCalledWith(
      "fan-out-insights",
      expect.arrayContaining([
        expect.objectContaining({
          name: "ai/insights.requested",
          data: { userId: "user-1", trigger: "weekly" },
        }),
        expect.objectContaining({
          name: "ai/insights.requested",
          data: { userId: "user-2", trigger: "weekly" },
        }),
      ]),
    );
  });

  it("does nothing when no eligible users", async () => {
    const step = createMockStep();

    vi.mocked(getEligibleUsersForInsights).mockResolvedValue([]);

    const handler = generateWeeklyInsights["fn"];
    const result = await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ eligible: 0 });
  });
});

describe("generate-user-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(generateUserInsights).toBeDefined();
  });

  it("generates insights and sends completion event", async () => {
    const step = createMockStep();
    const event = {
      name: "ai/insights.requested" as const,
      data: { userId: "user-1", trigger: "weekly" },
    };

    vi.mocked(generateInsights).mockResolvedValue([
      { id: "insight-1" },
      { id: "insight-2" },
    ] as Awaited<ReturnType<typeof generateInsights>>);

    const handler = generateUserInsights["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("generate", expect.any(Function));
    expect(generateInsights).toHaveBeenCalledWith("user-1");

    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-completion",
      expect.objectContaining({
        name: "ai/insights.completed",
        data: {
          userId: "user-1",
          insightIds: ["insight-1", "insight-2"],
        },
      }),
    );
  });

  it("propagates errors for retry", async () => {
    const step = createMockStep();
    const event = {
      name: "ai/insights.requested" as const,
      data: { userId: "user-1", trigger: "weekly" },
    };

    vi.mocked(generateInsights).mockRejectedValue(new Error("OpenAI down"));

    const handler = generateUserInsights["fn"];
    await expect(
      handler({ event, step } as unknown as Parameters<typeof handler>[0]),
    ).rejects.toThrow("OpenAI down");
  });
});
