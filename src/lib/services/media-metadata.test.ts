import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAltTextsForPost, saveAltTexts } from "./media-metadata";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("getAltTextsForPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns alt texts as record of media_url -> alt_text", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { id: "1", post_id: "post-1", media_url: "img1.jpg", alt_text: "Alt 1" },
          { id: "2", post_id: "post-1", media_url: "img2.jpg", alt_text: "Alt 2" },
        ],
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await getAltTextsForPost("post-1");

    expect(result).toEqual({
      "img1.jpg": "Alt 1",
      "img2.jpg": "Alt 2",
    });
  });

  it("returns empty record when no alt texts exist", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await getAltTextsForPost("post-no-alts");
    expect(result).toEqual({});
  });
});

describe("saveAltTexts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes existing and inserts new alt texts", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "3", post_id: "post-1", media_url: "new.jpg", alt_text: "New alt" },
        ],
        error: null,
      }),
    };
    // delete resolves
    chain.eq.mockResolvedValueOnce({ error: null });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await saveAltTexts("post-1", { "new.jpg": "New alt" });

    expect(result).toHaveLength(1);
    expect(chain.from).toHaveBeenCalledWith("media_alt_texts");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalled();
  });

  it("returns empty array when no alt texts provided", async () => {
    const result = await saveAltTexts("post-1", {});
    expect(result).toEqual([]);
  });
});
