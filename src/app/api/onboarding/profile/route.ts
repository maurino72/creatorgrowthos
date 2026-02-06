import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveQuickProfile } from "@/lib/services/profiles";
import { quickProfileSchema } from "@/lib/validators/onboarding";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = quickProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const profile = await saveQuickProfile(user.id, parsed.data);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to save profile:", err);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 },
    );
  }
}
