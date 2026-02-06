import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/services/settings";
import { updateProfileSchema } from "@/lib/validators/settings";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await updateProfile(user.id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update profile:", err);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
