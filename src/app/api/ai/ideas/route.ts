import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateContentIdeas,
  InsufficientDataError,
} from "@/lib/services/ideation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ideas = await generateContentIdeas(user.id);
    return NextResponse.json({ ideas }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientDataError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[POST /api/ai/ideas]", err);
    return NextResponse.json(
      { error: "Failed to generate ideas" },
      { status: 500 },
    );
  }
}
