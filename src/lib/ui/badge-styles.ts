// ─── Shared Badge Style Maps ───
// Consolidates duplicated badge constants from dashboard pages.
// Uses status token classes where appropriate; falls back to
// Tailwind color utilities for domain-specific semantic colors.

interface BadgeStyle {
  className: string;
  label: string;
}

// ─── Post / Connection Status ───

export const STATUS_BADGE_STYLES: Record<string, BadgeStyle> = {
  // Post statuses
  draft: {
    className:
      "bg-muted text-muted-foreground ring-border",
    label: "Draft",
  },
  scheduled: {
    className:
      "bg-status-info-muted text-status-info ring-status-info/20",
    label: "Scheduled",
  },
  published: {
    className:
      "bg-status-success-muted text-status-success ring-status-success/20",
    label: "Published",
  },
  failed: {
    className:
      "bg-status-error-muted text-status-error ring-status-error/20",
    label: "Failed",
  },
  // Connection statuses
  active: {
    className:
      "bg-status-success-muted text-status-success ring-status-success/20",
    label: "Active",
  },
  expired: {
    className:
      "bg-status-warning-muted text-status-warning ring-status-warning/20",
    label: "Expired",
  },
  revoked: {
    className:
      "bg-status-error-muted text-status-error ring-status-error/20",
    label: "Revoked",
  },
};

// ─── Experiment Statuses (text-only, no background badge) ───

export const EXPERIMENT_STATUS_STYLES: Record<string, BadgeStyle> = {
  suggested: { className: "text-status-warning", label: "Suggested" },
  accepted: { className: "text-status-info", label: "Accepted" },
  running: { className: "text-status-success", label: "Running" },
  analyzing: { className: "text-violet-400", label: "Analyzing" },
  complete: { className: "text-muted-foreground", label: "Complete" },
  dismissed: { className: "text-muted-foreground/60", label: "Dismissed" },
};

// ─── Insight Types ───

export const INSIGHT_TYPE_BADGE_STYLES: Record<string, BadgeStyle> = {
  performance_pattern: {
    className:
      "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    label: "Performance",
  },
  consistency_pattern: {
    className:
      "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    label: "Consistency",
  },
  opportunity: {
    className:
      "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    label: "Opportunity",
  },
  anomaly: {
    className:
      "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    label: "Anomaly",
  },
};

// ─── Experiment Types ───

export const EXPERIMENT_TYPE_BADGE_STYLES: Record<string, BadgeStyle> = {
  format_test: {
    className:
      "bg-sky-500/10 text-sky-400 ring-sky-500/20",
    label: "Format Test",
  },
  topic_test: {
    className:
      "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    label: "Topic Test",
  },
  style_test: {
    className:
      "bg-orange-500/10 text-orange-400 ring-orange-500/20",
    label: "Style Test",
  },
};

// ─── Confidence Levels ───

export const CONFIDENCE_STYLES: Record<string, BadgeStyle> = {
  high: { className: "text-emerald-400", label: "High" },
  medium: { className: "text-amber-400", label: "Medium" },
  low: { className: "text-muted-foreground", label: "Low" },
};
