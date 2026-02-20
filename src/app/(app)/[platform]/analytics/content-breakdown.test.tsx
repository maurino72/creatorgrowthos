import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("recharts", () => {
  const React = require("react");
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "responsive-container" }, children),
    BarChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "bar-chart" }, children),
    Bar: () => React.createElement("div", { "data-testid": "bar" }),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

import ContentBreakdown from "./content-breakdown";

const makePosts = (types: string[]) =>
  types.map((t, i) => ({
    content_type: t,
    metrics: {
      impressions: 1000 * (i + 1),
      reactions: 50 * (i + 1),
      comments: 10 * (i + 1),
      shares: 5 * (i + 1),
      engagement_rate: 2.5 + i * 0.5,
    },
  }));

describe("ContentBreakdown", () => {
  it("shows empty state when no posts have metrics", () => {
    render(
      <ContentBreakdown posts={[{ content_type: null, metrics: null }]} />,
    );
    expect(
      screen.getByText(/Not enough data for content breakdown/),
    ).toBeInTheDocument();
  });

  it("renders chart when posts have metrics", () => {
    const posts = makePosts(["text", "text", "image", "video"]);
    render(<ContentBreakdown posts={posts} />);
    expect(
      screen.getByText("Engagement by content type"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("shows legend with content types", () => {
    const posts = makePosts(["text", "image", "video"]);
    render(<ContentBreakdown posts={posts} />);
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getByText("video")).toBeInTheDocument();
  });

  it("shows post counts in legend", () => {
    const posts = makePosts(["text", "text", "image"]);
    render(<ContentBreakdown posts={posts} />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  it("defaults null content_type to text", () => {
    const posts = [
      {
        content_type: null,
        metrics: {
          impressions: 1000,
          reactions: 50,
          comments: 10,
          shares: 5,
          engagement_rate: 2.5,
        },
      },
    ];
    render(<ContentBreakdown posts={posts} />);
    expect(screen.getByText("text")).toBeInTheDocument();
  });
});
