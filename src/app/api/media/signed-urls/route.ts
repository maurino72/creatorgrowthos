import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/services/media";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const paths: string[] = body.paths;

  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "paths must be a non-empty array" }, { status: 400 });
  }

  // Only allow access to the user's own files
  const urls: { path: string; url: string }[] = [];
  for (const path of paths) {
    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const url = await getSignedUrl(path);
    urls.push({ path, url });
  }

  return NextResponse.json({ urls });
}
