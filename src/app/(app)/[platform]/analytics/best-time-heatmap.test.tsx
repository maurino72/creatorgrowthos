import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BestTimeHeatmap from "./best-time-heatmap";

function makePost(dateStr: string, impressions: number) {
  return {
    published_at: dateStr,
    metrics: { impressions },
  };
}

describe("BestTimeHeatmap", () => {
  it("shows empty state when fewer than 20 posts", () => {
    const posts = Array.from({ length: 5 }, (_, i) =>
      makePost(`2025-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`, 100),
    );
    render(<BestTimeHeatmap posts={posts} />);
    expect(
      screen.getByText(/Need at least 20 posts/),
    ).toBeInTheDocument();
    expect(screen.getByText("5 of 20 required")).toBeInTheDocument();
  });

  it("shows empty state when posts have no metrics", () => {
    const posts = Array.from({ length: 25 }, () => ({
      published_at: "2025-01-15T10:00:00Z",
      metrics: null,
    }));
    render(<BestTimeHeatmap posts={posts} />);
    expect(
      screen.getByText(/Need at least 20 posts/),
    ).toBeInTheDocument();
  });

  it("renders heatmap grid when enough posts", () => {
    // Create 25 posts spread across different days/hours
    const posts = Array.from({ length: 25 }, (_, i) => {
      const day = (i % 7) + 1;
      const hour = (i * 3) % 24;
      return makePost(
        `2025-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`,
        1000 + i * 100,
      );
    });
    render(<BestTimeHeatmap posts={posts} />);
    expect(screen.getByText("Best time to post")).toBeInTheDocument();
  });

  it("renders day labels", () => {
    const posts = Array.from({ length: 25 }, (_, i) =>
      makePost(
        `2025-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`,
        500,
      ),
    );
    render(<BestTimeHeatmap posts={posts} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders legend", () => {
    const posts = Array.from({ length: 25 }, (_, i) =>
      makePost(
        `2025-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`,
        500,
      ),
    );
    render(<BestTimeHeatmap posts={posts} />);
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("shows best time indicator", () => {
    // All posts at same time → that should be the best
    const posts = Array.from({ length: 25 }, () =>
      makePost("2025-01-06T14:00:00Z", 5000), // Monday 14:00 UTC
    );
    render(<BestTimeHeatmap posts={posts} />);
    expect(screen.getByText(/Best:/)).toBeInTheDocument();
  });

  it("filters out posts with null impressions", () => {
    const postsWithMetrics = Array.from({ length: 18 }, (_, i) =>
      makePost(
        `2025-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00Z`,
        500,
      ),
    );
    const postsWithNull = Array.from({ length: 10 }, () => ({
      published_at: "2025-01-15T10:00:00Z",
      metrics: { impressions: null },
    }));
    render(<BestTimeHeatmap posts={[...postsWithMetrics, ...postsWithNull]} />);
    // Only 18 have valid metrics, need 20 → empty state
    expect(
      screen.getByText(/Need at least 20 posts/),
    ).toBeInTheDocument();
    expect(screen.getByText("18 of 20 required")).toBeInTheDocument();
  });
});
