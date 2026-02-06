import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStarterIdeas } from "@/lib/services/starter-ideas";
import { getCreatorProfile } from "@/lib/services/profiles";

export async function POST(_request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getCreatorProfile(user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Complete your Quick Profile first" },
      { status: 400 },
    );
  }

  const ideas = await generateStarterIdeas({
    primary_niche: profile.primary_niche,
    primary_goal: profile.primary_goal,
    target_audience: profile.target_audience,
  });

  return NextResponse.json({
    ideas,
    preview: ideas.slice(0, 3),
  });
}
