import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importTwitterPosts } from "@/lib/services/import";
import { z } from "zod";

const importSchema = z.object({
  count: z.enum(["50", "100", "500"]).transform(Number).or(z.literal(50)).or(z.literal(100)).or(z.literal(500)),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid count. Must be 50, 100, or 500." },
      { status: 400 },
    );
  }

  try {
    const result = await importTwitterPosts(user.id, parsed.data.count);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to import tweets:", err);
    const message =
      err instanceof Error ? err.message : "Failed to import tweets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
