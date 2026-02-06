import { NextResponse } from "next/server";
import { getEligibleUsersForInsights, generateInsights } from "@/lib/services/insights";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = await getEligibleUsersForInsights();

  let processed = 0;
  let failed = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const userId of userIds) {
    try {
      await generateInsights(userId);
      processed++;
    } catch (err) {
      failed++;
      errors.push({
        userId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ processed, failed, errors });
}
