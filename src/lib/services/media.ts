import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import path from "path";

const BUCKET = "post-media";
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

export async function uploadImage(
  userId: string,
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
): Promise<{ path: string }> {
  const supabase = createAdminClient();
  const ext = path.extname(originalFilename) || ".jpg";
  const filePath = `${userId}/${randomUUID()}${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType, upsert: false });

  if (error) throw new Error(error.message);
  return { path: data.path };
}

export async function deleteImage(filePath: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) throw new Error(error.message);
}

export async function getSignedUrl(
  filePath: string,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function downloadImage(filePath: string): Promise<Buffer> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error) throw new Error(error.message);
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
