import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl" data-testid="settings-loading">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="h-px bg-editorial-rule mt-4 mb-8" />
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
            <div className="h-px bg-editorial-rule-subtle mt-3 mb-1" />
            <div className="space-y-4 mt-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
