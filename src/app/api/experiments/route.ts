import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getExperimentsForUser,
  suggestExperiments,
  InsufficientDataError,
} from "@/lib/services/experiments";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit")
    ? Number(searchParams.get("limit"))
    : undefined;

  try {
    const experiments = await getExperimentsForUser(user.id, { status, limit });
    return NextResponse.json({ experiments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch experiments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const experiments = await suggestExperiments(user.id);
    return NextResponse.json({ experiments }, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientDataError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to suggest experiments" },
      { status: 500 },
    );
  }
}
