"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConnections, useDisconnect } from "@/lib/queries/connections";
import type { ConnectionData } from "@/lib/queries/connections";
import { useSubscription } from "@/lib/queries/billing";
import { canAccessPlatform } from "@/lib/stripe/plans";
import type { PlanType } from "@/lib/stripe/plans";
import type { PlatformType } from "@/lib/adapters/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BADGE_STYLES } from "@/lib/ui/badge-styles";

const PLATFORMS: {
  id: PlatformType;
  name: string;
  comingSoon: boolean;
  usesHandle: boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: "twitter",
    name: "X",
    comingSoon: false,
    usesHandle: true,
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    comingSoon: false,
    usesHandle: false,
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: "threads",
    name: "Threads",
    comingSoon: true,
    usesHandle: true,
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.104-1.139 3.546-1.206 1.048-.048 2.016.04 2.907.256-.02-.96-.175-1.71-.467-2.25-.387-.712-1.028-1.073-1.907-1.073h-.068c-.66.024-1.2.222-1.607.59-.39.354-.606.826-.643 1.404l-2.113-.108c.078-1.18.568-2.134 1.416-2.762.79-.585 1.818-.895 2.972-.895h.09c1.565.04 2.746.627 3.508 1.746.56.82.874 1.922.937 3.271.29.13.565.272.826.427 1.105.658 1.946 1.578 2.426 2.66.768 1.731.812 4.623-1.315 6.704-1.786 1.749-4.004 2.547-7.172 2.573zM10.14 15.39c.03.55.277.99.715 1.274.525.34 1.228.5 1.98.464 1.065-.058 1.9-.443 2.481-1.166.422-.525.727-1.22.908-2.07-.558-.12-1.158-.186-1.793-.186h-.173c-1.003.044-1.816.297-2.353.732-.51.41-.785.963-.765 1.603v-.651z" />
      </svg>
    ),
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You denied access to your X account.",
  invalid_state: "OAuth state mismatch. Please try connecting again.",
  token_exchange_failed: "Failed to complete authentication. Please try again.",
  session_expired: "Your session expired. Please log in and try again.",
  plan_required: "This platform requires a Business plan or higher.",
};

function ConnectionStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const style = STATUS_BADGE_STYLES[status];
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function ConnectionEntry({
  platform,
  connection,
  plan,
}: {
  platform: (typeof PLATFORMS)[number];
  connection: ConnectionData | undefined;
  plan: PlanType | null;
}) {
  const disconnect = useDisconnect();

  if (platform.comingSoon) {
    return (
      <div className="flex items-center justify-between py-5 opacity-50">
        <div className="flex items-center gap-4">
          <span className="text-foreground/60">{platform.icon}</span>
          <div>
            <p className="text-[15px] font-serif">{platform.name}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30 mt-0.5">
              Coming Soon
            </p>
          </div>
        </div>
        <Button variant="outline" size="xs" disabled>
          Connect
        </Button>
      </div>
    );
  }

  // Plan gating: if user's plan doesn't support this platform, show upgrade prompt
  const hasAccess = plan ? canAccessPlatform(plan, platform.id) : false;

  const isConnected = !!connection;
  const isExpired = connection?.status === "expired";
  const isRevoked = connection?.status === "revoked";
  const needsReconnect = isExpired || isRevoked;

  if (!isConnected && !hasAccess) {
    return (
      <div className="flex items-center justify-between py-5 opacity-60">
        <div className="flex items-center gap-4">
          <span className="text-foreground/60">{platform.icon}</span>
          <div>
            <p className="text-[15px] font-serif">{platform.name}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30 mt-0.5">
              Business plan required
            </p>
          </div>
        </div>
        <Button asChild variant="coral" size="xs">
          <a href="/pricing">Upgrade</a>
        </Button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-between py-5">
        <div className="flex items-center gap-4">
          <span className="text-foreground/60">{platform.icon}</span>
          <div>
            <p className="text-[15px] font-serif">{platform.name}</p>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30 mt-0.5">
              Not connected
            </p>
          </div>
        </div>
        <Button asChild variant="default" size="xs">
          <a href={`/api/connections/${platform.id}`}>Connect</a>
        </Button>
      </div>
    );
  }

  const usernameDisplay = platform.usesHandle
    ? `@${connection.platform_username}`
    : connection.platform_username;

  return (
    <div className="flex items-center justify-between py-5">
      <div className="flex items-center gap-4">
        <span className="text-foreground/60">{platform.icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-serif">{platform.name}</p>
            <ConnectionStatusBadge status={connection.status} />
          </div>
          <p className="text-[11px] text-muted-foreground/40 mt-0.5">
            <span>{usernameDisplay}</span>
            {connection.connected_at && (
              <> &middot; Connected {new Date(connection.connected_at).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {needsReconnect ? (
          <Button asChild variant="default" size="xs">
            <a href={`/api/connections/${platform.id}`}>Reconnect</a>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              if (window.confirm(`Disconnect your ${platform.name} account?`)) {
                disconnect.mutate(platform.id, {
                  onSuccess: () =>
                    toast.success(`${platform.name} disconnected.`),
                  onError: () =>
                    toast.error(`Failed to disconnect ${platform.name}.`),
                });
              }
            }}
            loading={disconnect.isPending}
          >
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectionSkeleton() {
  return (
    <div data-testid="connection-skeleton" className="flex items-center gap-4 py-5">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: connections, isLoading } = useConnections();
  const { data: subscription } = useSubscription();
  const plan = (subscription?.plan as PlanType) ?? null;
  const toastShown = useRef(false);

  useEffect(() => {
    if (toastShown.current) return;

    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toastShown.current = true;
      const platformDef = PLATFORMS.find((p) => p.id === connected);
      const name =
        platformDef?.name ??
        connected.charAt(0).toUpperCase() + connected.slice(1);
      toast.success(`${name} connected successfully!`);
      router.replace("/dashboard/connections");
    } else if (error) {
      toastShown.current = true;
      const message =
        ERROR_MESSAGES[error] ?? "An unknown error occurred. Please try again.";
      toast.error(message);
      router.replace("/dashboard/connections");
    }
  }, [searchParams, router]);

  return (
    <div>
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <ConnectionSkeleton />
              {i < 2 && <div className="h-px bg-editorial-rule-subtle" />}
            </div>
          ))
        : PLATFORMS.map((platform, idx) => (
            <div key={platform.id}>
              <ConnectionEntry
                platform={platform}
                connection={connections?.find(
                  (c) => c.platform === platform.id,
                )}
                plan={plan}
              />
              {idx < PLATFORMS.length - 1 && (
                <div className="h-px bg-editorial-rule-subtle" />
              )}
            </div>
          ))}
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <div className="w-full">
      {/* ── Masthead ── */}
      <h1 className="text-3xl font-normal tracking-tight font-serif">
        Connections
      </h1>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      <Suspense
        fallback={
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <ConnectionSkeleton />
                {i < 2 && <div className="h-px bg-editorial-rule-subtle" />}
              </div>
            ))}
          </div>
        }
      >
        <ConnectionsContent />
      </Suspense>
    </div>
  );
}
