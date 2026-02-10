import { Skeleton } from "@/components/ui/skeleton";

export default function NewPostLoading() {
  return (
    <div className="mx-auto max-w-2xl" data-testid="new-post-loading">
      <Skeleton className="h-8 w-32" />
      <div className="h-px bg-foreground/25 mt-4 mb-10" />
      <Skeleton className="h-48 w-full" />
      <div className="flex items-center gap-4 mt-3 mb-10">
        <Skeleton className="h-px flex-1" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-full mb-8" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
