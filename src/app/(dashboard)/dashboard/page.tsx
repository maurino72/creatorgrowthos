export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5Z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
          Welcome to Creator Growth OS
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Connect your social accounts, create content, and track your growth —
          all in one place.
        </p>
      </div>
    </div>
  );
}
