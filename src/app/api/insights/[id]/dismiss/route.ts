import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dismissInsight } from "@/lib/services/insights";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const insight = await dismissInsight(user.id, id);
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json(
      { error: "Failed to dismiss insight" },
      { status: 500 },
    );
  }
}
