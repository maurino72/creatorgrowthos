"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="6" height="6" rx="1" />
        <rect x="10" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="10" width="6" height="6" rx="1" />
        <rect x="10" y="10" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    label: "Content",
    href: "/dashboard/content",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h12M3 9h8M3 13h10" />
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
  },
  {
    label: "Experiments",
    href: "/dashboard/experiments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h4l2 5H5L7 2Z" />
        <path d="M5 7v6a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 13 13V7" />
        <path d="M9 10v3" />
      </svg>
    ),
  },
  {
    label: "Connections",
    href: "/dashboard/connections",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="5" r="2" />
        <circle cx="13" cy="13" r="2" />
        <path d="M6.5 6.5 11.5 11.5" />
      </svg>
    ),
  },
];

const menuItems = (
  <>
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/dashboard/settings">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="2.5" />
          <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" />
        </svg>
        Settings
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/privacy">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2 3 5v4c0 4.5 3.5 7.74 6 9 2.5-1.26 6-4.5 6-9V5L9 2Z" />
        </svg>
        Privacy Policy
      </Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/terms">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
          <path d="M6 6h6M6 9h6M6 12h4" />
        </svg>
        Terms of Use
      </Link>
    </DropdownMenuItem>
  </>
);

function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "";
  const avatarUrl =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return { displayName, avatarUrl, initials };
}

export function Sidebar() {
  const pathname = usePathname();
  const { displayName, avatarUrl, initials } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-background">
              <path
                d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm11 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            Growth OS
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User menu */}
        <div className="border-t border-border px-3 py-3">
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent/50">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[11px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[13px] font-medium text-sidebar-foreground">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2">
              <div className="h-7 w-7 rounded-full bg-muted" />
              <div className="h-3.5 w-20 rounded bg-muted" />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg lg:hidden">
        <ul className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            {mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex cursor-pointer flex-col items-center gap-1 px-3 py-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-[8px] font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      Account
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-48">
                  {menuItems}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex flex-col items-center gap-1 px-3 py-1">
                <div className="h-5 w-5 rounded-full bg-muted" />
                <div className="h-2.5 w-8 rounded bg-muted" />
              </div>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}
