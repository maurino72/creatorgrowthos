"use client";

import Link from "next/link";
import { usePlatform } from "@/lib/hooks/use-platform";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter",
  linkedin: "LinkedIn",
  threads: "Threads",
};

export function PlatformSelector() {
  const { platform, setPlatform, activeConnections, hasConnections } =
    usePlatform();

  if (!hasConnections) {
    return (
      <Link
        href="/dashboard/connections"
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-70"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M9 6v6M6 9h6" />
        </svg>
        Connect a platform
      </Link>
    );
  }

  const selectedLabel = platform ? PLATFORM_LABELS[platform] ?? platform : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent/50">
          {platform && (
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
              <PlatformIcon platform={platform} size={16} />
            </span>
          )}
          <span className="flex-1 truncate text-left text-[13px] font-serif text-sidebar-foreground">
            {selectedLabel}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-sidebar-foreground/40"
          >
            <path d="M4 5.5 7 8.5 10 5.5" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-52">
        {activeConnections.map((conn) => (
          <DropdownMenuItem
            key={conn.id}
            className="cursor-pointer"
            onSelect={() => setPlatform(conn.platform)}
          >
            <PlatformIcon platform={conn.platform} size={16} />
            <div className="flex flex-col">
              <span className="text-sm font-serif">
                {PLATFORM_LABELS[conn.platform] ?? conn.platform}
              </span>
              {conn.platform_username && (
                <span className="text-[11px] text-muted-foreground/50">
                  @{conn.platform_username}
                </span>
              )}
            </div>
            {conn.platform === platform && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-auto text-foreground"
              >
                <path d="M3 7.5 5.5 10 11 4" />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/dashboard/connections">
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="9" r="2.5" />
              <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" />
            </svg>
            Manage connections
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
