import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardLoading from "./loading";
import ContentLoading from "../content/loading";
import InsightsLoading from "../insights/loading";
import ExperimentsLoading from "../experiments/loading";
import ConnectionsLoading from "../../connections/loading";
import SettingsLoading from "../../settings/loading";
import NewPostLoading from "../content/new/loading";
import EditPostLoading from "../content/[id]/edit/loading";

describe("loading.tsx skeletons", () => {
  it("renders dashboard loading skeleton", () => {
    render(<DashboardLoading />);
    expect(screen.getByTestId("dashboard-loading")).toBeDefined();
  });

  it("renders content loading skeleton", () => {
    render(<ContentLoading />);
    expect(screen.getByTestId("content-loading")).toBeDefined();
  });

  it("renders insights loading skeleton", () => {
    render(<InsightsLoading />);
    expect(screen.getByTestId("insights-loading")).toBeDefined();
  });

  it("renders experiments loading skeleton", () => {
    render(<ExperimentsLoading />);
    expect(screen.getByTestId("experiments-loading")).toBeDefined();
  });

  it("renders connections loading skeleton", () => {
    render(<ConnectionsLoading />);
    expect(screen.getByTestId("connections-loading")).toBeDefined();
  });

  it("renders settings loading skeleton", () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId("settings-loading")).toBeDefined();
  });

  it("renders new post loading skeleton", () => {
    render(<NewPostLoading />);
    expect(screen.getByTestId("new-post-loading")).toBeDefined();
  });

  it("renders edit post loading skeleton", () => {
    render(<EditPostLoading />);
    expect(screen.getByTestId("edit-post-loading")).toBeDefined();
  });
});
