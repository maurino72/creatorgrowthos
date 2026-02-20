"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EyeIcon, HeartIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "@/lib/utils/format";
import type { DailyMetricPoint } from "@/lib/services/metrics";

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
            {String(entry.dataKey)}
          </span>
          <span className="font-mono tabular-nums ml-auto">
            {formatNumber(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ImpressionsChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <EyeIcon className="size-4 text-blue-400" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Impressions over time
        </h3>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="impressionsGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="hsl(217 91% 60%)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(217 91% 60%)"
                  stopOpacity={0}
                />
              </linearGradient>
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
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              fill="url(#impressionsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EngagementChart({ data }: { data: DailyMetricPoint[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <HeartIcon className="size-4 text-rose-400" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Engagement breakdown
        </h3>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
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
            <Bar
              dataKey="likes"
              stackId="engagement"
              fill="hsl(350 89% 60%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="replies"
              stackId="engagement"
              fill="hsl(263 83% 65%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="reposts"
              stackId="engagement"
              fill="hsl(160 84% 45%)"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="size-2 rounded-full bg-[hsl(350_89%_60%)]" />
          Likes
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="size-2 rounded-full bg-[hsl(263_83%_65%)]" />
          Replies
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="size-2 rounded-full bg-[hsl(160_84%_45%)]" />
          Reposts
        </div>
      </div>
    </div>
  );
}

export default function DashboardCharts({
  data,
}: {
  data: DailyMetricPoint[];
}) {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10"
      data-testid="metrics-charts"
    >
      <ImpressionsChart data={data} />
      <EngagementChart data={data} />
    </div>
  );
}
