import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import { upsertConnection } from "@/lib/services/connections";
import { sendConnectionCreated } from "@/lib/inngest/send";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const connectionsUrl = `${appUrl}/dashboard/connections`;

  // Handle user denial
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      `${connectionsUrl}?error=${oauthError}`,
      302,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${connectionsUrl}?error=session_expired`,
      302,
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Read cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").filter(Boolean).map((c) => {
      const [name, ...rest] = c.split("=");
      return [name, rest.join("=")];
    }),
  );
  const oauthCookie = cookies["linkedin_oauth"];

  if (!oauthCookie || !code || !state) {
    return NextResponse.redirect(
      `${connectionsUrl}?error=session_expired`,
      302,
    );
  }

  // Decrypt and validate state
  let storedState: string;
  let redirectUri: string;
  try {
    const payload = JSON.parse(decrypt(oauthCookie));
    storedState = payload.state;
    redirectUri = payload.redirectUri ?? `${appUrl}/api/connections/linkedin/callback`;
  } catch {
    return NextResponse.redirect(
      `${connectionsUrl}?error=session_expired`,
      302,
    );
  }

  if (state !== storedState) {
    return NextResponse.redirect(
      `${connectionsUrl}?error=invalid_state`,
      302,
    );
  }

  // Exchange code for tokens (no PKCE verifier)
  const adapter = getAdapterForPlatform("linkedin");

  let tokens;
  try {
    tokens = await adapter.exchangeCodeForTokens(code, redirectUri, undefined);
  } catch {
    return NextResponse.redirect(
      `${connectionsUrl}?error=token_exchange_failed`,
      302,
    );
  }

  // Fetch user info
  const userInfo = await adapter.getCurrentUser(tokens.accessToken);

  // Upsert connection
  await upsertConnection(user.id, {
    platform: "linkedin",
    platformUserId: userInfo.platformUserId,
    platformUsername: userInfo.username,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes ?? [],
  });

  // Send Inngest event (fire-and-forget)
  sendConnectionCreated(user.id, "linkedin", userInfo.platformUserId).catch(() => {});

  // Determine redirect: non-onboarded users go to onboarding, others to connections
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  const redirectUrl =
    profile?.onboarded_at == null
      ? `${appUrl}/onboarding?connected=linkedin`
      : `${connectionsUrl}?connected=linkedin`;

  // Clear cookie and redirect
  const response = NextResponse.redirect(redirectUrl, 302);
  const isSecure = appUrl.startsWith("https");
  response.headers.set(
    "set-cookie",
    `linkedin_oauth=; HttpOnly;${isSecure ? " Secure;" : ""} SameSite=Lax; Max-Age=0; Path=/`,
  );

  return response;
}
