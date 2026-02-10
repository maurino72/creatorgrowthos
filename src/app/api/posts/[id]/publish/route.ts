import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publishPost } from "@/lib/services/publishing";
import { sendPostPublishResults } from "@/lib/inngest/send";

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
    const results = await publishPost(user.id, id);

    // Send Inngest events for metrics collection etc. (fire-and-forget)
    sendPostPublishResults(id, user.id, results).catch((err) =>
      console.error("[inngest] Failed to send publish results:", err),
    );

    return NextResponse.json({ results });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Post not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
