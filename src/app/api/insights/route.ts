import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInsightsForUser } from "@/lib/services/insights";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const limit = Number(url.searchParams.get("limit")) || 10;

  const insights = await getInsightsForUser(user.id, { status, type, limit });
  return NextResponse.json({ insights });
}
