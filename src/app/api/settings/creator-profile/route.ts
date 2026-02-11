import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCreatorProfile,
  updateCreatorProfile,
} from "@/lib/services/profiles";
import { updateCreatorProfileSchema } from "@/lib/validators/onboarding";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getCreatorProfile(user.id);
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateCreatorProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await updateCreatorProfile(user.id, parsed.data);
  return NextResponse.json({ profile });
}
