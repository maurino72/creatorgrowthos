import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
 *  # Evolved — The AiGrow mark
 *
 *  A hashtag where the vertical lines fan outward
 *  above the horizontal grid bars, like branches
 *  spreading toward light. Below the grid: straight,
 *  structured. Above: expansion, growth, reach.
 *
 *  Grid = AI / system / structure
 *  Fanning verticals = growth breaking through
 * ───────────────────────────────────────────── */

interface LogoIconProps {
  size?: number;
  className?: string;
}

function LogoIcon({ size = 24, className }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Horizontal bars — the grid / AI structure */}
      <line
        x1="3"
        y1="10"
        x2="21"
        y2="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="3"
        y1="15"
        x2="21"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Left vertical — straight base, fans outward-left above grid */}
      <path
        d="M9 18V10L5 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right vertical — straight base, fans outward-right above grid */}
      <path
        d="M15 18V10L19 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
 *  Sizes: control icon dimensions + text scale
 * ───────────────────────────────────────────── */

const sizeMap = {
  xs: { icon: 14, text: "text-xs" },
  sm: { icon: 18, text: "text-sm" },
  md: { icon: 24, text: "text-lg" },
  lg: { icon: 32, text: "text-2xl" },
  xl: { icon: 40, text: "text-3xl" },
} as const;

/* ─────────────────────────────────────────────
 *  Public API
 * ───────────────────────────────────────────── */

interface LogoProps {
  /** "icon" = mark only, "wordmark" = text only, "lockup" = both */
  variant?: "icon" | "wordmark" | "lockup";
  size?: keyof typeof sizeMap;
  className?: string;
}

export function Logo({
  variant = "lockup",
  size = "md",
  className,
}: LogoProps) {
  const s = sizeMap[size];

  if (variant === "icon") {
    return <LogoIcon size={s.icon} className={className} />;
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          s.text,
          "font-serif font-light tracking-tight",
          className,
        )}
      >
        AiGrow
      </span>
    );
  }

  // lockup: icon + wordmark
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon size={s.icon} className="flex-shrink-0" />
      <span className={cn(s.text, "font-serif font-light tracking-tight")}>
        AiGrow
      </span>
    </span>
  );
}
