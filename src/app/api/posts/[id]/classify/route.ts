import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classifyPost } from "@/lib/services/classification";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const classifications = await classifyPost(user.id, id);
    return NextResponse.json({ classifications });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Post not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
