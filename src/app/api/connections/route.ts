import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnectionsForUser } from "@/lib/services/connections";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await getConnectionsForUser(user.id);
  return NextResponse.json({ connections });
}
