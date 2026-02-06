import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ORPHAN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all files in the post-media bucket
  // Storage.from().list() lists files in a folder; we list root to get user folders
  // Then for each folder, list files. But simpler: list all files with a prefix search.
  // Actually, Supabase Storage list() doesn't recursively list, so we need a different approach.
  // We'll list at the root level to get user-id folders, then list each folder.

  // Get all referenced media paths from non-deleted posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("media_urls")
    .is("deleted_at", null)
    .not("media_urls", "eq", "{}");

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  // Build a set of all referenced file paths
  const referencedPaths = new Set<string>();
  for (const post of posts ?? []) {
    const urls = post.media_urls as string[] | null;
    if (urls) {
      for (const url of urls) {
        referencedPaths.add(url);
      }
    }
  }

  // List all files in the storage bucket
  const storage = supabase.storage.from("post-media");
  const { data: folders, error: foldersError } = await storage.list("", {
    limit: 1000,
  });

  if (foldersError) {
    return NextResponse.json({ error: foldersError.message }, { status: 500 });
  }

  let deleted = 0;
  const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MS);

  // Each entry at root level is a user folder
  for (const folder of folders ?? []) {
    const folderId = folder.name;
    const { data: files } = await storage.list(folderId, { limit: 1000 });

    if (!files) continue;

    const orphans: string[] = [];
    for (const file of files) {
      const filePath = `${folderId}/${file.name}`;
      const createdAt = new Date(file.created_at);

      // Skip recent files (still being uploaded/processed)
      if (createdAt > cutoff) continue;

      // Check if referenced by any post
      if (!referencedPaths.has(filePath)) {
        orphans.push(filePath);
      }
    }

    if (orphans.length > 0) {
      await storage.remove(orphans);
      deleted += orphans.length;
    }
  }

  return NextResponse.json({ deleted });
}
