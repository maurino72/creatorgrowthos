"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import {
  useExperiments,
  useSuggestExperiments,
  useAcceptExperiment,
  useDismissExperiment,
} from "@/lib/queries/experiments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EXPERIMENT_TYPE_BADGE_STYLES,
  EXPERIMENT_STATUS_STYLES,
} from "@/lib/ui/badge-styles";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Suggested", value: "suggested" },
  { label: "Accepted", value: "accepted" },
  { label: "Running", value: "running" },
  { label: "Complete", value: "complete" },
] as const;


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
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${EXPERIMENT_TYPE_BADGE_STYLES[experiment.type]?.className ?? ""}`}
          >
            {EXPERIMENT_TYPE_BADGE_STYLES[experiment.type]?.label ?? experiment.type}
          </span>
          <span
            className={`text-[11px] font-medium capitalize ${EXPERIMENT_STATUS_STYLES[experiment.status]?.className ?? ""}`}
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

function ExperimentsPageInner() {
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);
  const { platform } = usePlatform();
  const platformFilter = platform ?? undefined;

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
            suggestExperiments.mutate(platformFilter, {
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

export default function ExperimentsPage() {
  return (
    <Suspense>
      <ExperimentsPageInner />
    </Suspense>
  );
}
