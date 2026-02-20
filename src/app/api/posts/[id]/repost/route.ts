import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";
import { TwitterAdapter } from "@/lib/adapters/twitter";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const connection = await getConnectionByPlatform(user.id, "twitter");
    if (!connection || !connection.access_token_enc) {
      return NextResponse.json(
        { error: "No active Twitter connection" },
        { status: 400 },
      );
    }

    const accessToken = decrypt(connection.access_token_enc);
    const adapter = new TwitterAdapter();
    await adapter.repost(accessToken, connection.platform_user_id!, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const connection = await getConnectionByPlatform(user.id, "twitter");
    if (!connection || !connection.access_token_enc) {
      return NextResponse.json(
        { error: "No active Twitter connection" },
        { status: 400 },
      );
    }

    const accessToken = decrypt(connection.access_token_enc);
    const adapter = new TwitterAdapter();
    await adapter.unrepost(accessToken, connection.platform_user_id!, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
