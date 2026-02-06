import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/lib/services/settings";
import {
  preferenceSectionSchemas,
  type PreferenceSection,
} from "@/lib/validators/settings";

const VALID_SECTIONS = new Set<string>(Object.keys(preferenceSectionSchemas));

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { section, settings } = body as {
    section?: string;
    settings?: Record<string, unknown>;
  };

  if (!section || !VALID_SECTIONS.has(section) || !settings) {
    return NextResponse.json(
      { error: "Invalid section. Must be one of: " + [...VALID_SECTIONS].join(", ") },
      { status: 400 },
    );
  }

  const sectionKey = section as PreferenceSection;
  const sectionSchema = preferenceSectionSchemas[sectionKey];
  const settingsParsed = sectionSchema.safeParse(settings);

  if (!settingsParsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: settingsParsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await updatePreferences(
      user.id,
      sectionKey,
      settingsParsed.data as Record<string, unknown>,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update preferences:", err);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
}
