import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPostSchema } from "@/lib/validators/posts";
import { createPost, getPostsForUser } from "@/lib/services/posts";
import { getConnectionByPlatform } from "@/lib/services/connections";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Verify user has active connections for selected platforms
  for (const platform of parsed.data.platforms) {
    const connection = await getConnectionByPlatform(user.id, platform);
    if (!connection || connection.status !== "active") {
      return NextResponse.json(
        { error: `No active connection for ${platform}` },
        { status: 400 },
      );
    }
  }

  const post = await createPost(user.id, parsed.data);
  return NextResponse.json({ post }, { status: 201 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const limit = Number(url.searchParams.get("limit")) || 20;
  const offset = Number(url.searchParams.get("offset")) || 0;

  const posts = await getPostsForUser(user.id, { status, limit, offset });
  return NextResponse.json({ posts });
}
