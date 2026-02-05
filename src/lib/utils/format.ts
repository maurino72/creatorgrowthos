export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "–";
  if (value === 0) return "0";
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1);
    return formatted.endsWith(".0")
      ? `${Math.floor(value / 1_000_000)}M`
      : `${formatted}M`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1);
    return formatted.endsWith(".0")
      ? `${Math.floor(value / 1_000)}K`
      : `${formatted}K`;
  }
  return String(value);
}

export function formatEngagementRate(
  rate: number | null | undefined,
): string {
  if (rate == null) return "–";
  const pct = rate * 100;
  return pct === 0 ? "0%" : `${parseFloat(pct.toFixed(1))}%`;
}

export function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return "–";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
