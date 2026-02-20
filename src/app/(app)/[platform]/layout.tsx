import { notFound } from "next/navigation";
import { isValidPlatformSlug } from "@/lib/platform-slug";

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;

  if (!isValidPlatformSlug(platform)) {
    notFound();
  }

  return <>{children}</>;
}
