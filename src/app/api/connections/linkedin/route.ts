import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { encrypt } from "@/lib/utils/encryption";
import { disconnectPlatform } from "@/lib/services/connections";
import { canConnectPlatform } from "@/lib/services/usage";

export async function GET(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const connectionsUrl = `${appUrl}/connections`;

  // Plan check
  const planCheck = await canConnectPlatform(user.id, "linkedin");
  if (!planCheck.allowed) {
    return NextResponse.redirect(
      `${connectionsUrl}?error=plan_required`,
      302,
    );
  }

  const redirectUri = `${appUrl}/api/connections/linkedin/callback`;
  const state = crypto.randomUUID();

  const adapter = getAdapterForPlatform("linkedin");
  const { url } = adapter.getAuthUrl(state, redirectUri);

  const cookiePayload = encrypt(
    JSON.stringify({ state, redirectUri }),
  );

  const isSecure = appUrl.startsWith("https");
  const response = NextResponse.redirect(url, 302);
  response.headers.set(
    "set-cookie",
    `linkedin_oauth=${cookiePayload}; HttpOnly;${isSecure ? " Secure;" : ""} SameSite=Lax; Max-Age=600; Path=/`,
  );

  return response;
}

export async function DELETE(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectPlatform(user.id, "linkedin");
  return NextResponse.json({ success: true });
}
