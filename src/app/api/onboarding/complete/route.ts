import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/lib/services/profiles";

export async function POST(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await completeOnboarding(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to complete onboarding:", err);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
