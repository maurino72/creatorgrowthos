import { NextResponse } from "next/server";
import {
  getPostsNeedingClassification,
  classifyPost,
} from "@/lib/services/classification";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await getPostsNeedingClassification(20);

  let failed = 0;

  for (const post of posts) {
    try {
      await classifyPost(post.user_id, post.id);
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    processed: posts.length,
    failed,
  });
}
