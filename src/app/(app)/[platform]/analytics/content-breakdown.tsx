"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { formatEngagementRate } from "@/lib/utils/format";

interface AnalyticsPost {
  content_type: string | null;
  metrics: {
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
    shares: number | null;
    engagement_rate: number;
  } | null;
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
      <p className="text-[11px] font-mono text-muted-foreground mb-1 capitalize">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.name}
          </span>
          <span className="font-mono tabular-nums ml-auto">
            {formatEngagementRate(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  text: "hsl(217 91% 60%)",
  image: "hsl(263 83% 58%)",
  video: "hsl(350 89% 60%)",
  poll: "hsl(38 92% 50%)",
  thread: "hsl(160 84% 45%)",
};

export default function ContentBreakdown({
  posts,
}: {
  posts: AnalyticsPost[];
}) {
  // Group by content type and calculate avg engagement rate
  const typeMap: Record<string, { total: number; count: number }> = {};

  for (const post of posts) {
    const type = post.content_type ?? "text";
    if (!post.metrics) continue;

    if (!typeMap[type]) {
      typeMap[type] = { total: 0, count: 0 };
    }
    typeMap[type].total += post.metrics.engagement_rate;
    typeMap[type].count++;
  }

  const data = Object.entries(typeMap)
    .map(([type, stats]) => ({
      type,
      avg_engagement: Math.round((stats.total / stats.count) * 100) / 100,
      count: stats.count,
      fill: TYPE_COLORS[type] ?? "hsl(0 0% 50%)",
    }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
        <DocumentTextIcon className="size-6 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/40">
          Not enough data for content breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <DocumentTextIcon className="size-4 text-primary" />
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Engagement by content type
        </h3>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            layout="vertical"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(0 0% 50% / 0.1)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="type"
              type="category"
              tick={{ fontSize: 10, fill: "hsl(0 0% 50% / 0.5)" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="avg_engagement"
              name="Avg. Engagement"
              radius={[0, 4, 4, 0]}
              fill="hsl(263 83% 58%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
        {data.map((d) => (
          <div
            key={d.type}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span className="capitalize">{d.type}</span>
            <span className="text-muted-foreground/30">({d.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
