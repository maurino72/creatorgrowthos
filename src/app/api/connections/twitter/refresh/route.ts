import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import {
  getConnectionByPlatform,
  updateTokens,
} from "@/lib/services/connections";

export async function POST(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getConnectionByPlatform(user.id, "twitter");
  if (!connection) {
    return NextResponse.json(
      { error: "No X connection found" },
      { status: 404 },
    );
  }

  if (!connection.refresh_token_enc) {
    return NextResponse.json(
      { error: "No refresh token available" },
      { status: 400 },
    );
  }

  const refreshToken = decrypt(connection.refresh_token_enc);
  const adapter = getAdapterForPlatform("twitter");

  try {
    const tokens = await adapter.refreshTokens(refreshToken);
    await updateTokens(connection.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 },
    );
  }
}
