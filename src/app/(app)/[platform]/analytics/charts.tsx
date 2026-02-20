"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { UsersIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "@/lib/utils/format";

interface DailyData {
  date: string;
  count: number;
  new: number | null;
}

interface FollowerPlatformData {
  current_count: number;
  start_count: number;
  net_growth: number;
  growth_rate: number;
  daily: DailyData[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    color?: string;
    value?: number;
    name?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] font-mono text-muted-foreground mb-1">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.name ?? String(entry.dataKey)}
          </span>
          <span className="font-mono tabular-nums ml-auto">
            {formatNumber(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

const PLATFORM_CHART_COLORS: Record<string, { stroke: string; fill: string }> =
  {
    linkedin: {
      stroke: "hsl(217 91% 60%)",
      fill: "hsl(217 91% 60%)",
    },
    twitter: {
      stroke: "hsl(263 83% 58%)",
      fill: "hsl(263 83% 58%)",
    },
  };

function FollowerGrowthChart({
  platformData,
}: {
  platformData: Record<string, FollowerPlatformData>;
}) {
  const platforms = Object.keys(platformData);

  // Merge daily data from all platforms into a unified array keyed by date
  const dateMap = new Map<string, Record<string, number>>();
  for (const [platform, data] of Object.entries(platformData)) {
    for (const d of data.daily) {
      const existing = dateMap.get(d.date) ?? {};
      existing[platform] = d.count;
      existing[`${platform}_new`] = d.new ?? 0;
      dateMap.set(d.date, existing);
    }
  }

  const chartData = [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => ({ date, ...values }));

  if (chartData.length < 2) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <UsersIcon className="size-4 text-emerald-400" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Follower growth
        </h3>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              {platforms.map((platform) => {
                const color =
                  PLATFORM_CHART_COLORS[platform]?.fill ??
                  "hsl(0 0% 50%)";
                return (
                  <linearGradient
                    key={platform}
                    id={`followerGrad-${platform}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(0 0% 50% / 0.1)"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const date = new Date(d + "T00:00:00");
                return date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
              }}
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatNumber(v)}
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={24}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) =>
                value === "linkedin" ? "LinkedIn" : "X (Twitter)"
              }
              wrapperStyle={{ fontSize: 10, color: "hsl(0 0% 50% / 0.6)" }}
            />
            {platforms.map((platform) => {
              const color =
                PLATFORM_CHART_COLORS[platform]?.stroke ??
                "hsl(0 0% 50%)";
              return (
                <Area
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  name={platform}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#followerGrad-${platform})`}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function NewFollowersChart({
  platformData,
}: {
  platformData: Record<string, FollowerPlatformData>;
}) {
  const platforms = Object.keys(platformData);

  // Merge new followers data
  const dateMap = new Map<string, Record<string, number>>();
  for (const [platform, data] of Object.entries(platformData)) {
    for (const d of data.daily) {
      if (d.new === null) continue;
      const existing = dateMap.get(d.date) ?? {};
      existing[platform] = d.new;
      dateMap.set(d.date, existing);
    }
  }

  const chartData = [...dateMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, values]) => ({ date, ...values }));

  if (chartData.length < 2) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <UsersIcon className="size-4 text-blue-400" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          New followers per day
        </h3>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              {platforms.map((platform) => {
                const color =
                  PLATFORM_CHART_COLORS[platform]?.fill ??
                  "hsl(0 0% 50%)";
                return (
                  <linearGradient
                    key={platform}
                    id={`newFollowerGrad-${platform}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(0 0% 50% / 0.1)"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const date = new Date(d + "T00:00:00");
                return date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
              }}
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={24}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) =>
                value === "linkedin" ? "LinkedIn" : "X (Twitter)"
              }
              wrapperStyle={{ fontSize: 10, color: "hsl(0 0% 50% / 0.6)" }}
            />
            {platforms.map((platform) => {
              const color =
                PLATFORM_CHART_COLORS[platform]?.stroke ??
                "hsl(0 0% 50%)";
              return (
                <Area
                  key={platform}
                  type="monotone"
                  dataKey={platform}
                  name={platform}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#newFollowerGrad-${platform})`}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AnalyticsCharts({
  followerData,
  period,
}: {
  followerData: Record<string, FollowerPlatformData>;
  period: string;
}) {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10"
      data-testid="analytics-charts"
    >
      <FollowerGrowthChart platformData={followerData} />
      <NewFollowersChart platformData={followerData} />
    </div>
  );
}
