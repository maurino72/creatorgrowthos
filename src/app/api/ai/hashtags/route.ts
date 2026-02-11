import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHashtags } from "@/lib/services/hashtags";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const content = body?.content;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 },
    );
  }

  try {
    const suggestions = await suggestHashtags(user.id, content);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[POST /api/ai/hashtags]", err);
    return NextResponse.json(
      { error: "Failed to suggest hashtags" },
      { status: 500 },
    );
  }
}
