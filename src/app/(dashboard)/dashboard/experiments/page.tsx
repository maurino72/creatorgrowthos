"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useExperiments,
  useSuggestExperiments,
  useAcceptExperiment,
  useDismissExperiment,
} from "@/lib/queries/experiments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Suggested", value: "suggested" },
  { label: "Accepted", value: "accepted" },
  { label: "Running", value: "running" },
  { label: "Complete", value: "complete" },
] as const;

const EXPERIMENT_TYPE_STYLES: Record<string, string> = {
  format_test:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
  topic_test:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20",
  style_test:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
};

const EXPERIMENT_TYPE_LABELS: Record<string, string> = {
  format_test: "Format Test",
  topic_test: "Topic Test",
  style_test: "Style Test",
};

const STATUS_STYLES: Record<string, string> = {
  suggested: "text-amber-600 dark:text-amber-400",
  accepted: "text-blue-600 dark:text-blue-400",
  running: "text-emerald-600 dark:text-emerald-400",
  analyzing: "text-violet-600 dark:text-violet-400",
  complete: "text-zinc-600 dark:text-zinc-400",
  dismissed: "text-zinc-400 dark:text-zinc-500",
};

interface ExperimentItem {
  id: string;
  type: string;
  hypothesis: string;
  description: string;
  status: string;
  results?: { recommended_action?: string; confidence?: string };
}

function ExperimentCard({
  experiment,
}: {
  experiment: ExperimentItem;
}) {
  const acceptExperiment = useAcceptExperiment();
  const dismissExperiment = useDismissExperiment();
  const isSuggested = experiment.status === "suggested";

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${EXPERIMENT_TYPE_STYLES[experiment.type] ?? ""}`}
          >
            {EXPERIMENT_TYPE_LABELS[experiment.type] ?? experiment.type}
          </span>
          <span
            className={`text-[11px] font-medium capitalize ${STATUS_STYLES[experiment.status] ?? ""}`}
          >
            {experiment.status}
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-snug">{experiment.hypothesis}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {experiment.description}
          </p>
        </div>

        {experiment.results?.recommended_action && (
          <p className="text-xs font-medium text-foreground/80">
            {experiment.results.recommended_action}
          </p>
        )}

        {isSuggested && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                acceptExperiment.mutate(experiment.id, {
                  onSuccess: () => toast.success("Experiment accepted"),
                  onError: () => toast.error("Failed to accept"),
                })
              }
              disabled={acceptExperiment.isPending}
            >
              Accept
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                dismissExperiment.mutate(experiment.id, {
                  onSuccess: () => toast.success("Experiment dismissed"),
                  onError: () => toast.error("Failed to dismiss"),
                })
              }
              disabled={dismissExperiment.isPending}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExperimentSkeleton() {
  return (
    <Card data-testid="experiment-skeleton">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

export default function ExperimentsPage() {
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);

  const { data: experiments, isLoading } = useExperiments(
    activeStatus ? { status: activeStatus } : undefined,
  );
  const suggestExperiments = useSuggestExperiments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground">
            Test hypotheses about what works for your audience.
          </p>
        </div>
        <Button
          onClick={() =>
            suggestExperiments.mutate(undefined, {
              onSuccess: () => toast.success("Experiments suggested!"),
              onError: (err: Error) => toast.error(err.message),
            })
          }
          disabled={suggestExperiments.isPending}
        >
          {suggestExperiments.isPending ? "Suggesting..." : "Suggest Experiments"}
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={`rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ExperimentSkeleton key={i} />
          ))}
        </div>
      ) : experiments && experiments.length > 0 ? (
        <div className="space-y-3">
          {(experiments as ExperimentItem[]).map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4">
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
              <path d="M9 3h6l3 7H6L9 3Z" />
              <path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
              <path d="M12 14v4" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium">No experiments yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Suggest experiments to start testing what works for your audience.
          </p>
        </div>
      )}
    </div>
  );
}
