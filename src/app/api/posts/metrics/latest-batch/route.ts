import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestMetricsBatch } from "@/lib/services/metrics";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postIdsParam = request.nextUrl.searchParams.get("post_ids");
  if (!postIdsParam) {
    return NextResponse.json({ error: "post_ids parameter is required" }, { status: 400 });
  }

  const postIds = postIdsParam.split(",").filter(Boolean);
  if (postIds.length === 0) {
    return NextResponse.json({ error: "post_ids parameter is required" }, { status: 400 });
  }

  try {
    const metrics = await getLatestMetricsBatch(user.id, postIds);
    return NextResponse.json({ metrics });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
