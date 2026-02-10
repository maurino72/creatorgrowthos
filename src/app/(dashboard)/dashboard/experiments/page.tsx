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

function ExperimentEntry({
  experiment,
}: {
  experiment: ExperimentItem;
}) {
  const acceptExperiment = useAcceptExperiment();
  const dismissExperiment = useDismissExperiment();
  const isSuggested = experiment.status === "suggested";

  const typeLabel = EXPERIMENT_TYPE_BADGE_STYLES[experiment.type]?.label ?? experiment.type;

  return (
    <div className="group py-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
        <span>{typeLabel}</span> &middot; {experiment.status}
      </p>
      <p className="text-[15px] font-serif leading-snug mt-1.5">
        {experiment.hypothesis}
      </p>
      <p className="text-xs text-muted-foreground/50 leading-relaxed mt-1.5">
        {experiment.description}
      </p>

      {experiment.results?.recommended_action && (
        <p className="text-xs text-foreground/60 mt-1.5">
          {experiment.results.recommended_action}
        </p>
      )}

      {isSuggested && (
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}

function ExperimentSkeleton() {
  return (
    <div data-testid="experiment-skeleton" className="py-4 space-y-2">
      <Skeleton className="h-2.5 w-32" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
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
    <div className="mx-auto max-w-3xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Experiments
        </h1>
        <Button
          variant="outline"
          size="xs"
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
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-6 mb-8">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b ${
              activeStatus === tab.value
                ? "text-foreground border-foreground/60"
                : "text-muted-foreground/40 border-transparent hover:text-foreground/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <ExperimentSkeleton />
              {i < 2 && <div className="h-px bg-editorial-rule-subtle" />}
            </div>
          ))}
        </div>
      ) : experiments && experiments.length > 0 ? (
        <div>
          {(experiments as ExperimentItem[]).map((experiment, idx) => (
            <div key={experiment.id}>
              <ExperimentEntry experiment={experiment} />
              {idx < experiments.length - 1 && (
                <div className="h-px bg-editorial-rule-subtle" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground/60">No experiments yet</p>
          <p className="mt-1 text-xs text-muted-foreground/40">
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
