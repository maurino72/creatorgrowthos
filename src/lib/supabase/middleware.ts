import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isValidPlatformSlug,
  platformToSlug,
  type PlatformSlug,
} from "@/lib/platform-slug";
import type { PlatformType } from "@/lib/adapters/types";

const SUBSCRIPTION_EXEMPT_PATHS = [
  "/pricing",
  "/api/billing/",
  "/api/webhooks/stripe",
  "/auth/",
];

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

function isSubscriptionExempt(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
}

function isSubscriptionValid(
  subscription: { status: string; current_period_end: string | null } | null,
): boolean {
  if (!subscription) return false;

  if (ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)) return true;

  if (
    subscription.status === "canceled" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > new Date()
  ) {
    return true;
  }

  return false;
}

/** Check if a path requires authentication */
function isProtectedPath(pathname: string): boolean {
  // Platform-scoped pages: /<valid-slug>/*
  const firstSegment = pathname.split("/")[1];
  if (firstSegment && isValidPlatformSlug(firstSegment)) return true;

  // Account-level pages
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/connections")) return true;

  return false;
}

/** Check if this is a legacy /dashboard/* path that needs redirect */
function isLegacyDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/** Map legacy /dashboard/* paths to new URL structure */
function mapLegacyPath(pathname: string, slug: PlatformSlug): string {
  // Account-level routes (no platform prefix)
  if (pathname.startsWith("/dashboard/connections")) {
    return pathname.replace("/dashboard/connections", "/connections");
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return pathname.replace("/dashboard/settings", "/settings");
  }

  // Platform-scoped routes
  if (pathname === "/dashboard") {
    return `/${slug}/dashboard`;
  }
  // /dashboard/content/... → /<slug>/content/...
  return pathname.replace(/^\/dashboard/, `/${slug}`);
}

/** Get default platform slug from first active connection */
async function getDefaultSlug(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<PlatformSlug> {
  const { data: connections } = await supabase
    .from("connections")
    .select("platform")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (connections && connections.length > 0) {
    return platformToSlug(connections[0].platform as PlatformType);
  }

  return "x"; // default fallback
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const needsAuth =
    isProtectedPath(pathname) ||
    isLegacyDashboardPath(pathname) ||
    pathname.startsWith("/onboarding") ||
    pathname === "/pricing";

  // Redirect unauthenticated users from protected pages to /login
  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    const slug = await getDefaultSlug(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Routing for authenticated users on protected + onboarding + pricing paths
  if (
    user &&
    (isProtectedPath(pathname) ||
      isLegacyDashboardPath(pathname) ||
      pathname.startsWith("/onboarding") ||
      pathname === "/pricing")
  ) {
    // Check onboarding status
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .single();

    const isOnboarded = profile?.onboarded_at != null;

    // Not onboarded + trying to access protected/pricing pages → redirect to onboarding
    if (
      !isOnboarded &&
      (isProtectedPath(pathname) ||
        isLegacyDashboardPath(pathname) ||
        pathname === "/pricing")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Already onboarded + trying to access onboarding → redirect to /<slug>/dashboard
    if (isOnboarded && pathname.startsWith("/onboarding")) {
      const slug = await getDefaultSlug(supabase, user.id);
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}/dashboard`;
      return NextResponse.redirect(url);
    }

    // Legacy /dashboard/* redirect (after onboarding check, before subscription check)
    if (isOnboarded && isLegacyDashboardPath(pathname)) {
      const slug = await getDefaultSlug(supabase, user.id);
      const url = request.nextUrl.clone();
      url.pathname = mapLegacyPath(pathname, slug);
      return NextResponse.redirect(url);
    }

    // Subscription check for onboarded users on protected pages
    if (
      isOnboarded &&
      (isProtectedPath(pathname) || pathname === "/pricing")
    ) {
      if (!isSubscriptionExempt(pathname)) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", user.id)
          .single();

        const hasValidSub = isSubscriptionValid(subscription);

        // On protected page without valid subscription → redirect to /pricing
        const isCheckoutReturn =
          request.nextUrl.searchParams.get("checkout") === "success";
        if (
          !hasValidSub &&
          isProtectedPath(pathname) &&
          !isCheckoutReturn
        ) {
          const url = request.nextUrl.clone();
          url.pathname = "/pricing";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
