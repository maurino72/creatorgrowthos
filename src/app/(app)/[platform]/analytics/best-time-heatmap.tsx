"use client";

import { ClockIcon } from "@heroicons/react/24/outline";

interface AnalyticsPost {
  published_at: string;
  metrics: {
    impressions: number | null;
  } | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const MIN_POSTS = 20;

export default function BestTimeHeatmap({
  posts,
}: {
  posts: AnalyticsPost[];
}) {
  const postsWithMetrics = posts.filter(
    (p) => p.metrics && p.metrics.impressions !== null,
  );

  if (postsWithMetrics.length < MIN_POSTS) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
        <ClockIcon className="size-6 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground/40">
          Need at least {MIN_POSTS} posts with metrics to show best posting
          times.
        </p>
        <p className="text-[10px] text-muted-foreground/30 mt-1">
          {postsWithMetrics.length} of {MIN_POSTS} required
        </p>
      </div>
    );
  }

  // Build heatmap: day (0-6) × hour (0-23) → avg impressions
  const grid: Record<string, { total: number; count: number }> = {};

  for (const post of postsWithMetrics) {
    const date = new Date(post.published_at);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const key = `${day}-${hour}`;

    if (!grid[key]) {
      grid[key] = { total: 0, count: 0 };
    }
    grid[key].total += post.metrics!.impressions!;
    grid[key].count++;
  }

  // Calculate max for scaling
  let maxAvg = 0;
  for (const cell of Object.values(grid)) {
    const avg = cell.total / cell.count;
    if (avg > maxAvg) maxAvg = avg;
  }

  // Find best time
  let bestKey = "";
  let bestAvg = 0;
  for (const [key, cell] of Object.entries(grid)) {
    const avg = cell.total / cell.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestKey = key;
    }
  }
  const [bestDay, bestHour] = bestKey.split("-").map(Number);

  function getIntensity(day: number, hour: number): number {
    const key = `${day}-${hour}`;
    const cell = grid[key];
    if (!cell || maxAvg === 0) return 0;
    return (cell.total / cell.count) / maxAvg;
  }

  function getColor(intensity: number): string {
    if (intensity === 0) return "bg-muted/30";
    if (intensity < 0.25) return "bg-primary/10";
    if (intensity < 0.5) return "bg-primary/20";
    if (intensity < 0.75) return "bg-primary/40";
    return "bg-primary/70";
  }

  function formatHour(h: number): string {
    if (h === 0) return "12a";
    if (h < 12) return `${h}a`;
    if (h === 12) return "12p";
    return `${h - 12}p`;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-amber-400" />
          <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
            Best time to post
          </h3>
        </div>
        {bestKey && (
          <span className="text-[10px] text-primary/70">
            Best: {DAYS[bestDay]} at {formatHour(bestHour)} UTC
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex items-center mb-1 pl-10">
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <span
                key={h}
                className="text-[9px] text-muted-foreground/40 font-mono"
                style={{ width: `${100 / 8}%` }}
              >
                {formatHour(h)}
              </span>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="flex items-center gap-1 mb-0.5">
              <span className="w-8 text-right text-[9px] text-muted-foreground/40 font-mono shrink-0">
                {dayLabel}
              </span>
              <div className="flex flex-1 gap-px">
                {HOURS.map((hour) => {
                  const intensity = getIntensity(dayIdx, hour);
                  const cell = grid[`${dayIdx}-${hour}`];
                  const isBest = dayIdx === bestDay && hour === bestHour;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 aspect-square rounded-sm transition-colors ${getColor(intensity)} ${
                        isBest ? "ring-1 ring-primary" : ""
                      }`}
                      title={
                        cell
                          ? `${dayLabel} ${formatHour(hour)}: avg ${Math.round(cell.total / cell.count)} impressions (${cell.count} posts)`
                          : `${dayLabel} ${formatHour(hour)}: no data`
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/40">
            <span className="text-[9px] text-muted-foreground/40 mr-1">
              Less
            </span>
            <div className="size-3 rounded-sm bg-muted/30" />
            <div className="size-3 rounded-sm bg-primary/10" />
            <div className="size-3 rounded-sm bg-primary/20" />
            <div className="size-3 rounded-sm bg-primary/40" />
            <div className="size-3 rounded-sm bg-primary/70" />
            <span className="text-[9px] text-muted-foreground/40 ml-1">
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
