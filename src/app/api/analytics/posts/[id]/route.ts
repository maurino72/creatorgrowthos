import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSnapshotsForPost,
  getLatestSnapshotForPost,
} from "@/lib/services/metric-snapshots";

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

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || 100;
  const since = url.searchParams.get("since") || undefined;

  try {
    const admin = createAdminClient();

    const { data: publication, error } = await admin
      .from("post_publications")
      .select(
        "id, platform, platform_post_id, published_at, status, posts!inner(id, body, content_type, tags, created_at)",
      )
      .eq("id", id)
      .single();

    if (error || !publication) {
      return NextResponse.json(
        { error: "Publication not found" },
        { status: 404 },
      );
    }

    const platformPostId = publication.platform_post_id!;
    const platform = publication.platform;

    const [snapshots, latest] = await Promise.all([
      getSnapshotsForPost(user.id, platformPostId, platform, {
        limit,
        since,
      }),
      getLatestSnapshotForPost(user.id, platformPostId, platform),
    ]);

    return NextResponse.json({
      publication,
      snapshots,
      latest,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch post analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
