import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await getSubscriptionForUser(user.id);
    return NextResponse.json({ subscription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/billing/subscription]", message, err);
    return NextResponse.json(
      { error: "Failed to fetch subscription", detail: message },
      { status: 500 }
    );
  }
}
