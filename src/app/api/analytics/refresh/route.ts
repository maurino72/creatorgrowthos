import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { getApiCallsUsedToday } from "@/lib/services/metric-snapshots";

const VALID_PLATFORMS = ["twitter", "linkedin"];
const DAILY_API_LIMIT = 200;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const platform = body.platform as string;

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: "Invalid platform. Must be one of: " + VALID_PLATFORMS.join(", ") },
      { status: 400 },
    );
  }

  try {
    // Check daily API limit
    const apiCallsToday = await getApiCallsUsedToday(user.id, platform);

    if (apiCallsToday >= DAILY_API_LIMIT) {
      return NextResponse.json(
        {
          error: "Daily API limit reached",
          api_calls_today: apiCallsToday,
          limit: DAILY_API_LIMIT,
        },
        { status: 429 },
      );
    }

    // Send refresh event to Inngest
    await inngest.send({
      name: "metrics/refresh.requested",
      data: {
        userId: user.id,
        platform,
      },
    });

    return NextResponse.json({
      message: `Metrics refresh triggered for ${platform}`,
      api_calls_today: apiCallsToday,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to trigger refresh";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
