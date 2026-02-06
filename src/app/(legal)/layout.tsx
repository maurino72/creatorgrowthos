import Link from "next/link";
import type { Metadata } from "next";
import { AtmosphericBackground } from "@/components/shared/atmospheric-background";

export const metadata: Metadata = {
  title: {
    template: "%s | Growth OS",
    default: "Legal | Growth OS",
  },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <AtmosphericBackground intensity="minimal" />
      {/* Compact header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12 6 8l4-4" />
            </svg>
            <span className="text-[13px] font-medium">Back</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground">
              <svg
                width="10"
                height="10"
                viewBox="0 0 20 20"
                fill="none"
                className="text-background"
              >
                <path
                  d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm11 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[13px] font-semibold tracking-tight">
              Growth OS
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-12 pb-24">{children}</main>
    </div>
  );
}
