export default function ThreadLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl animate-pulse">
      <div className="flex items-end justify-between mb-4">
        <div className="h-9 w-48 rounded bg-muted/20" />
        <div className="h-3 w-12 rounded bg-muted/20" />
      </div>
      <div className="h-px bg-foreground/10 mb-10" />
      <div className="h-6 w-64 rounded bg-muted/20 mb-8" />
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-muted/20 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-16 rounded bg-muted/20" />
              <div className="h-3 w-16 rounded bg-muted/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
