import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/services/settings";
import { exportDataSchema } from "@/lib/validators/settings";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = exportDataSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid export request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = await exportUserData(user.id, parsed.data.type, parsed.data.format);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Failed to export data:", err);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
