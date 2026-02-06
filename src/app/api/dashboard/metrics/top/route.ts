import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTopPosts } from "@/lib/services/metrics";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days")) || 7;
  const limit = Number(url.searchParams.get("limit")) || 5;
  const platform = url.searchParams.get("platform") || undefined;

  try {
    const posts = await getTopPosts(user.id, days, limit, platform);
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
