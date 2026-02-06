import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadImage, getSignedUrl } from "@/lib/services/media";
import {
  validateFileType,
  validateFileSize,
  validateFileHeader,
} from "@/lib/validators/media";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate MIME type
  const typeResult = validateFileType(file.type);
  if (!typeResult.valid) {
    return NextResponse.json({ error: typeResult.error }, { status: 400 });
  }

  // Validate file size
  const sizeResult = validateFileSize(file.size);
  if (!sizeResult.valid) {
    return NextResponse.json({ error: sizeResult.error }, { status: 400 });
  }

  // Validate file header (magic bytes)
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const headerResult = validateFileHeader(bytes);
  if (!headerResult.valid) {
    return NextResponse.json({ error: headerResult.error }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(arrayBuffer);
    const { path } = await uploadImage(user.id, buffer, file.name, file.type);
    const url = await getSignedUrl(path);

    return NextResponse.json({ url, path }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
