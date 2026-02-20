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
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "@/lib/utils/format";

interface Snapshot {
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  fetched_at: string;
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

export default function PostMetricsChart({
  snapshots,
}: {
  snapshots: Snapshot[];
}) {
  const data = snapshots.map((snap) => ({
    time: new Date(snap.fetched_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    impressions: snap.impressions ?? 0,
    reactions: snap.reactions ?? 0,
    comments: snap.comments ?? 0,
    shares: snap.shares ?? 0,
  }));

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="size-4 text-primary" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Metrics over time
        </h3>
      </div>
      <div className="h-64">
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
              dataKey="time"
              tick={{ fontSize: 9, fill: "hsl(0 0% 50% / 0.5)" }}
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
              wrapperStyle={{
                fontSize: 10,
                color: "hsl(0 0% 50% / 0.6)",
              }}
            />
            <Area
              type="monotone"
              dataKey="impressions"
              name="Impressions"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              fill="url(#impressionsGrad)"
            />
            <Area
              type="monotone"
              dataKey="reactions"
              name="Reactions"
              stroke="hsl(350 89% 60%)"
              strokeWidth={1.5}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="comments"
              name="Comments"
              stroke="hsl(38 92% 50%)"
              strokeWidth={1.5}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="shares"
              name="Shares"
              stroke="hsl(160 84% 45%)"
              strokeWidth={1.5}
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
