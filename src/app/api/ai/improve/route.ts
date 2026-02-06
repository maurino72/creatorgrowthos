import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { improveContent } from "@/lib/services/improvement";

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
      { error: "content is required and must be non-empty" },
      { status: 400 },
    );
  }

  try {
    const result = await improveContent(user.id, content);
    return NextResponse.json({ result }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to improve content" },
      { status: 500 },
    );
  }
}
