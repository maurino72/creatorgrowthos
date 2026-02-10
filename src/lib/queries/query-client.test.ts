import { describe, it, expect } from "vitest";
import { makeQueryClient } from "./query-client";

describe("makeQueryClient", () => {
  it("sets refetchOnWindowFocus to false", () => {
    const client = makeQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it("sets retry to 2", () => {
    const client = makeQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(2);
  });

  it("sets gcTime to 5 minutes", () => {
    const client = makeQueryClient();
    expect(client.getDefaultOptions().queries?.gcTime).toBe(5 * 60 * 1000);
  });
});
