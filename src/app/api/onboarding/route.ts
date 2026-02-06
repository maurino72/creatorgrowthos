import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getOnboardingState,
  updateOnboardingStep,
} from "@/lib/services/profiles";
import { updateStepSchema } from "@/lib/validators/onboarding";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getOnboardingState(user.id);
    return NextResponse.json(state);
  } catch (err) {
    console.error("Failed to get onboarding state:", err);
    return NextResponse.json(
      { error: "Failed to get onboarding state" },
      { status: 500 },
    );
  }
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
  const parsed = updateStepSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid step", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await updateOnboardingStep(user.id, parsed.data.step);
    return NextResponse.json({ success: true, step: parsed.data.step });
  } catch (err) {
    console.error("Failed to update onboarding step:", err);
    return NextResponse.json(
      { error: "Failed to update step" },
      { status: 500 },
    );
  }
}
