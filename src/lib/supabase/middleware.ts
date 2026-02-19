import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Redirect unauthenticated users away from dashboard, onboarding, and pricing
  if (
    !user &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname === "/pricing")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Onboarding + subscription routing for authenticated users on protected pages
  if (
    user &&
    (pathname.startsWith("/dashboard") ||
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

    // Not onboarded + trying to access dashboard or pricing → redirect to onboarding
    if (!isOnboarded && (pathname.startsWith("/dashboard") || pathname === "/pricing")) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // Already onboarded + trying to access onboarding → redirect to dashboard
    if (isOnboarded && pathname.startsWith("/onboarding")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Subscription check for onboarded users accessing dashboard
    if (isOnboarded && (pathname.startsWith("/dashboard") || pathname === "/pricing")) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .single();

      const hasValidSub = isSubscriptionValid(subscription);

      // On /dashboard without valid subscription → redirect to /pricing
      // Skip redirect when returning from Stripe checkout (webhook may still be processing)
      const isCheckoutReturn = request.nextUrl.searchParams.get("checkout") === "success";
      if (!hasValidSub && pathname.startsWith("/dashboard") && !isCheckoutReturn) {
        const url = request.nextUrl.clone();
        url.pathname = "/pricing";
        return NextResponse.redirect(url);
      }

      // On /pricing with valid subscription → redirect to /dashboard
      if (hasValidSub && pathname === "/pricing") {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
