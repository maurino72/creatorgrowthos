import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/services/publishing";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, user_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let failed = 0;

  for (const post of posts ?? []) {
    try {
      await publishPost(post.user_id, post.id);
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    processed: posts?.length ?? 0,
    failed,
  });
}
