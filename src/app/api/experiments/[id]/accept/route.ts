import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptExperiment } from "@/lib/services/experiments";

export async function PATCH(
  _request: Request,
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
    const experiment = await acceptExperiment(user.id, id);
    return NextResponse.json({ experiment });
  } catch {
    return NextResponse.json(
      { error: "Failed to accept experiment" },
      { status: 500 },
    );
  }
}
