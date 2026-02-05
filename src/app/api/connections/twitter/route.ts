import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { encrypt } from "@/lib/utils/encryption";
import { disconnectPlatform } from "@/lib/services/connections";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl}/api/connections/twitter/callback`;
  const state = crypto.randomUUID();

  const adapter = getAdapterForPlatform("twitter");
  const { url, codeVerifier } = adapter.getAuthUrl(state, redirectUri);

  const cookiePayload = encrypt(
    JSON.stringify({ state, codeVerifier, redirectUri }),
  );

  const isSecure = appUrl.startsWith("https");
  const response = NextResponse.redirect(url, 302);
  response.headers.set(
    "set-cookie",
    `twitter_oauth=${cookiePayload}; HttpOnly;${isSecure ? " Secure;" : ""} SameSite=Lax; Max-Age=600; Path=/`,
  );

  return response;
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectPlatform(user.id, "twitter");
  return NextResponse.json({ success: true });
}
