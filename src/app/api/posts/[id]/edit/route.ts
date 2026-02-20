import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editPublishedPost } from "@/lib/services/post-editing";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 },
      );
    }

    const updated = await editPublishedPost(user.id, id, body.text);
    return NextResponse.json({ post: updated });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("not editable")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
