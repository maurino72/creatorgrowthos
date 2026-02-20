import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: publications, error } = await supabase
    .from("post_publications")
    .select("id, platform, platform_post_id, posts!inner(id, user_id)")
    .eq("status", "published")
    .not("platform_post_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!publications || publications.length === 0) {
    return NextResponse.json({ triggered: 0 });
  }

  const events = publications.map((pub) => {
    const post = pub.posts as unknown as { id: string; user_id: string };
    return {
      name: "post/published" as const,
      data: {
        postId: post.id,
        userId: post.user_id,
        publicationId: pub.id,
        platform: pub.platform,
      },
    };
  });

  await inngest.send(events);

  return NextResponse.json({ triggered: events.length });
}
