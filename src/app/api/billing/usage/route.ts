import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserUsage } from "@/lib/services/usage";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usage = await getUserUsage(user.id);
    return NextResponse.json({ usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/billing/usage]", message, err);
    return NextResponse.json(
      { error: "Failed to fetch usage", detail: message },
      { status: 500 }
    );
  }
}
