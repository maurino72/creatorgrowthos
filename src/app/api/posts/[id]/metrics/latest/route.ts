import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestMetricsForPost } from "@/lib/services/metrics";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const metrics = await getLatestMetricsForPost(user.id, id);
    return NextResponse.json({ metrics });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
