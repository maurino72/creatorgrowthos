import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/services/settings";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings(user.id);
    return NextResponse.json(settings);
  } catch (err) {
    console.error("Failed to get settings:", err);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 },
    );
  }
}
