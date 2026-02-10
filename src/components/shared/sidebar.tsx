"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlatformSelector } from "@/components/shared/platform-selector";
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
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h12M3 9h8M3 13h10" />
      </svg>
    ),
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" />
        <circle cx="9" cy="9" r="2" />
      </svg>
    ),
  },
  {
    label: "Experiments",
    href: "/dashboard/experiments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h4l2 5H5L7 2Z" />
        <path d="M5 7v6a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 13 13V7" />
        <path d="M9 10v3" />
      </svg>
    ),
  },
];

const menuItems = (
  <>
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/dashboard/settings">
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="2.5" />
          <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M4.22 13.78l1.42-1.42M12.36 5.64l1.42-1.42" />
        </svg>
        Settings
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/privacy">
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2 3 5v4c0 4.5 3.5 7.74 6 9 2.5-1.26 6-4.5 6-9V5L9 2Z" />
        </svg>
        Privacy
      </Link>
    </DropdownMenuItem>
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/terms">
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
          <path d="M6 6h6M6 9h6M6 12h4" />
        </svg>
        Terms
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
      <aside className="relative z-20 hidden w-56 flex-shrink-0 flex-col border-r border-editorial-rule-subtle lg:flex bg-sidebar/60 backdrop-blur-sm">
        {/* Masthead */}
        <div className="px-5 pt-6 pb-4">
          <Link href="/dashboard" className="block">
            <span className="text-lg font-light tracking-tight text-sidebar-foreground font-serif">
              Growth OS
            </span>
          </Link>
        </div>

        <div className="mx-5 h-px bg-editorial-rule-subtle" />

        {/* Platform Selector */}
        <div className="px-3 py-3">
          <PlatformSelector />
        </div>

        <div className="mx-5 h-px bg-editorial-rule-subtle" />

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4">
          <p className="px-2.5 pb-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
            Navigate
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors",
                      isActive
                        ? "text-sidebar-foreground border-l-2 border-foreground/60 pl-[8px]"
                        : "text-sidebar-foreground/40 hover:text-sidebar-foreground/80",
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User menu */}
        <div className="px-3 py-3">
          <div className="mx-2 mb-3 h-px bg-editorial-rule-subtle" />
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 transition-colors hover:bg-sidebar-accent/30">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px] font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[12px] text-sidebar-foreground/60">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-44">
                {menuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex w-full items-center gap-2.5 rounded px-2.5 py-2">
              <div className="h-6 w-6 rounded-full bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-editorial-rule bg-background/90 backdrop-blur-lg lg:hidden">
        <ul className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-1 text-[9px] uppercase tracking-[0.15em] transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/50",
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
                    <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50">
                      Account
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-44">
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
