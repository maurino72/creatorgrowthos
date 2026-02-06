import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsights, InsufficientDataError } from "@/lib/services/insights";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const insights = await generateInsights(user.id);
    return NextResponse.json({ insights }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientDataError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 },
    );
  }
}
