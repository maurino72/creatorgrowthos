import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";

const ORPHAN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupOrphanMedia = inngest.createFunction(
  { id: "cleanup-orphan-media" },
  { cron: "0 3 * * *" }, // Daily at 3am UTC
  async ({ step }) => {
    const deleted = await step.run("cleanup", async () => {
      const supabase = createAdminClient();

      // Get all referenced media paths from non-deleted posts
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("media_urls")
        .is("deleted_at", null)
        .not("media_urls", "eq", "{}");

      if (postsError) throw new Error(postsError.message);

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

      if (foldersError) throw new Error(foldersError.message);

      let deletedCount = 0;
      const cutoff = new Date(Date.now() - ORPHAN_THRESHOLD_MS);

      for (const folder of folders ?? []) {
        const folderId = folder.name;
        const { data: files } = await storage.list(folderId, { limit: 1000 });
        if (!files) continue;

        const orphans: string[] = [];
        for (const file of files) {
          const filePath = `${folderId}/${file.name}`;
          const createdAt = new Date(file.created_at);

          if (createdAt > cutoff) continue;
          if (!referencedPaths.has(filePath)) {
            orphans.push(filePath);
          }
        }

        if (orphans.length > 0) {
          await storage.remove(orphans);
          deletedCount += orphans.length;
        }
      }

      return deletedCount;
    });

    return { deleted };
  },
);
