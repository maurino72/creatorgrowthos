import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { classificationOverrideSchema } from "@/lib/ai/taxonomy";
import { updateClassifications } from "@/lib/services/classification";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = classificationOverrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const post = await updateClassifications(user.id, id, parsed.data);
    return NextResponse.json({ post });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
