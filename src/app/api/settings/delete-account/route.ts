import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/services/settings";
import { deleteAccountSchema } from "@/lib/validators/settings";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type DELETE to confirm account deletion" },
      { status: 400 },
    );
  }

  try {
    await deleteAccount(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete account:", err);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
