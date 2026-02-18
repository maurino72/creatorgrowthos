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
    const message = err instanceof Error ? err.message : "Unknown error";
    const causeMessage = err instanceof Error && err.cause instanceof Error
      ? err.cause.message
      : undefined;
    console.error("[POST /api/ai/ideas]", message, causeMessage ? `cause: ${causeMessage}` : "", err);
    return NextResponse.json(
      {
        error: "Failed to generate ideas",
        detail: message,
        ...(causeMessage && { cause: causeMessage }),
      },
      { status: 500 },
    );
  }
}
