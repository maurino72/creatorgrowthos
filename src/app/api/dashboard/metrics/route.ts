import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardMetrics } from "@/lib/services/metrics";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days")) || 7;

  try {
    const metrics = await getDashboardMetrics(user.id, days);
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
