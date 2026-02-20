import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getThreadPosts } from "@/lib/services/threads";
import { publishPost } from "@/lib/services/publishing";

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
    const posts = await getThreadPosts(id);
    if (posts.length === 0) {
      return NextResponse.json(
        { error: "Thread has no posts" },
        { status: 400 },
      );
    }

    // Publish each post in sequence (each replies to the previous)
    const results = [];
    for (const post of posts) {
      const result = await publishPost(user.id, post.id);
      results.push({ postId: post.id, results: result });
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
