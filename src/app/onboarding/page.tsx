"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import {
  useOnboardingState,
  useUpdateOnboardingStep,
  useSaveQuickProfile,
  useCompleteOnboarding,
  useImportTwitter,
  useStarterIdeas,
} from "@/lib/queries/onboarding";
import { useConnections } from "@/lib/queries/connections";
import {
  NICHES,
  GOALS,
  type QuickProfileInput,
} from "@/lib/validators/onboarding";

const STEPS = ["welcome", "connect", "profile", "import", "tour", "activate"] as const;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: onboardingState } = useOnboardingState();
  const updateStep = useUpdateOnboardingStep();
  const saveProfile = useSaveQuickProfile();
  const completeOnboarding = useCompleteOnboarding();
  const importTwitter = useImportTwitter();
  const starterIdeas = useStarterIdeas();
  const { data: connections, refetch: refetchConnections } = useConnections();

  const initialStep = onboardingState?.onboarding_step ?? "welcome";
  const [currentStep, setCurrentStep] = useState<string>(initialStep);
  const [profileData, setProfileData] = useState<QuickProfileInput>({
    niches: [],
    goals: [],
    target_audience: "",
  });
  const [customNiche, setCustomNiche] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [didImport, setDidImport] = useState(false);
  const hasCheckedConnected = useRef(false);

  useEffect(() => {
    if (onboardingState?.onboarding_step) {
      setCurrentStep(onboardingState.onboarding_step);
    }
  }, [onboardingState?.onboarding_step]);

  useEffect(() => {
    if (hasCheckedConnected.current) return;
    const connected = searchParams.get("connected");
    if (connected === "twitter") {
      hasCheckedConnected.current = true;
      setCurrentStep("connect");
      refetchConnections();
    }
  }, [searchParams, refetchConnections]);

  const twitterConnection = connections?.find(
    (c: { platform: string }) => c.platform === "twitter",
  );

  useEffect(() => {
    if (currentStep === "connect" && twitterConnection) {
      const timer = setTimeout(() => goToStep("profile"), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, twitterConnection]);

  const currentStepIndex = STEPS.indexOf(currentStep as typeof STEPS[number]);

  function goToStep(step: string) {
    setCurrentStep(step);
    updateStep.mutate(step);
  }

  function handleProfileSubmit() {
    const errors: Record<string, string> = {};
    if (profileData.niches.length === 0) errors.niche = "Pick at least one niche";
    if (profileData.goals.length === 0) errors.goal = "Choose at least one goal";
    if (!profileData.target_audience || profileData.target_audience.length < 5)
      errors.audience = "At least 5 characters";
    if (profileData.target_audience.length > 100)
      errors.audience = "Max 100 characters";
    if (profileData.niches.includes("other") && !customNiche)
      errors.niche = "Enter your custom niche";

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    saveProfile.mutate(
      {
        ...profileData,
        ...(profileData.niches.includes("other") && { custom_niche: customNiche }),
      },
      {
        onSuccess: () => goToStep("import"),
      },
    );
  }

  function handleImport(count: number) {
    importTwitter.mutate(count, {
      onSuccess: (data) => {
        setImportedCount(data.imported_count);
        setDidImport(true);
      },
    });
  }

  function handleComplete() {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => router.push("/pricing"),
    });
  }

  return (
    <div className="flex flex-col items-center">
      {/* Step indicator dots */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              i === currentStepIndex
                ? "w-6 bg-foreground"
                : i < currentStepIndex
                  ? "w-1.5 bg-muted-foreground"
                  : "w-1.5 bg-input",
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="w-full rounded-2xl border border-input/60 bg-foreground/[0.02] p-8 backdrop-blur-md">
        {currentStep === "welcome" && (
          <WelcomeStep onContinue={() => goToStep("connect")} />
        )}

        {currentStep === "connect" && (
          <ConnectPlatformStep
            isConnected={!!twitterConnection}
            username={twitterConnection?.platform_username}
          />
        )}

        {currentStep === "profile" && (
          <QuickProfileStep
            data={profileData}
            customNiche={customNiche}
            errors={profileErrors}
            isSubmitting={saveProfile.isPending}
            onChange={setProfileData}
            onCustomNicheChange={setCustomNiche}
            onSubmit={handleProfileSubmit}
          />
        )}

        {currentStep === "import" && (
          <ImportContentStep
            isImporting={importTwitter.isPending}
            importedCount={importedCount}
            didImport={didImport}
            onImport={handleImport}
            onSkip={() => {
              starterIdeas.mutate();
              goToStep("tour");
            }}
            onContinue={() => goToStep("tour")}
          />
        )}

        {currentStep === "tour" && (
          <TourStep onContinue={() => goToStep("activate")} />
        )}

        {currentStep === "activate" && (
          <ActivateStep
            didImport={didImport}
            importedCount={importedCount}
            ideas={starterIdeas.data?.preview}
            isLoadingIdeas={starterIdeas.isPending}
            onComplete={handleComplete}
            onCreatePost={() => {
              completeOnboarding.mutate(undefined, {
                onSuccess: () => router.push("/pricing"),
              });
            }}
            onUseIdea={() => {
              completeOnboarding.mutate(undefined, {
                onSuccess: () => router.push("/pricing"),
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ============ Step Components ============ */

function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo */}
      <div className="mb-8">
        <Logo variant="icon" size="lg" className="text-foreground/70" />
      </div>

      <h1 className="mb-3 font-serif text-2xl font-normal tracking-tight text-foreground">
        Welcome to AiGrow
      </h1>
      <p className="mb-2 text-sm leading-relaxed text-muted-foreground/60">
        Most creator tools help you post. We help you learn.
      </p>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground/40">
        AiGrow tracks what you publish, observes what works,
        remembers patterns, and guides better decisions over time.
      </p>

      <div className="mb-6 h-px w-full bg-editorial-rule" />

      <Button
        variant="coral"
        onClick={onContinue}
        className="w-full cursor-pointer py-6 text-sm font-medium"
      >
        Get Started
      </Button>
    </div>
  );
}

function ConnectPlatformStep({
  isConnected,
  username,
}: {
  isConnected: boolean;
  username?: string | null;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
        Connect your platform
      </h2>
      <p className="mb-6 text-sm text-muted-foreground/50">
        We&apos;ll track your content and performance
      </p>

      {/* Twitter card */}
      <div
        className={cn(
          "border-b py-4 transition-all duration-500",
          isConnected
            ? "border-emerald-500/20"
            : "border-editorial-rule-subtle",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-foreground/60"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <div>
              <p className="text-[15px] font-serif text-foreground">X</p>
              {isConnected && username ? (
                <p className="text-xs text-emerald-400/80">
                  Connected as @{username}
                </p>
              ) : (
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30">
                  Post, track, and analyze
                </p>
              )}
            </div>
          </div>

          {isConnected ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-emerald-400"
            >
              <path
                d="M3 8.5 6.5 12 13 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <a
              href="/api/connections/twitter"
              className="inline-flex h-8 items-center rounded border border-input px-4 text-[11px] uppercase tracking-[0.1em] text-foreground/70 transition-colors hover:border-ring/30 hover:text-foreground"
            >
              Connect
            </a>
          )}
        </div>
      </div>

      {/* Coming soon */}
      {["LinkedIn", "Threads"].map((name) => (
        <div
          key={name}
          className="flex items-center justify-between border-b border-editorial-rule-subtle py-4 opacity-30"
        >
          <div className="flex items-center gap-3">
            <div className="h-[18px] w-[18px]" />
            <div>
              <p className="text-[15px] font-serif text-foreground">{name}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30">Coming soon</p>
            </div>
          </div>
        </div>
      ))}

      {isConnected && (
        <p className="mt-4 text-center text-xs text-muted-foreground/40 animate-pulse">
          Continuing...
        </p>
      )}
    </div>
  );
}

function QuickProfileStep({
  data,
  customNiche,
  errors,
  isSubmitting,
  onChange,
  onCustomNicheChange,
  onSubmit,
}: {
  data: QuickProfileInput;
  customNiche: string;
  errors: Record<string, string>;
  isSubmitting: boolean;
  onChange: (data: QuickProfileInput) => void;
  onCustomNicheChange: (value: string) => void;
  onSubmit: () => void;
}) {
  function toggleNiche(value: string) {
    if (data.niches.includes(value)) {
      onChange({ ...data, niches: data.niches.filter((n) => n !== value) });
    } else if (data.niches.length < 3) {
      onChange({ ...data, niches: [...data.niches, value] });
    }
  }

  function toggleGoal(value: string) {
    if (data.goals.includes(value)) {
      onChange({ ...data, goals: data.goals.filter((g) => g !== value) });
    } else if (data.goals.length < 3) {
      onChange({ ...data, goals: [...data.goals, value] });
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
        Tell us about your content
      </h2>
      <p className="mb-6 text-sm text-muted-foreground/50">
        This helps us give you personalized ideas (30 seconds)
      </p>

      {/* Niche multi-select chips */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
            What are your niches?
          </label>
          <span data-testid="niche-counter" className="text-[10px] font-mono tabular-nums text-muted-foreground/30">
            {data.niches.length}/3 selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {NICHES.map((niche) => (
            <button
              key={niche.value}
              type="button"
              data-testid={`niche-chip-${niche.value}`}
              onClick={() => toggleNiche(niche.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                data.niches.includes(niche.value)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-input/60 text-muted-foreground/60 hover:border-input hover:text-muted-foreground",
                data.niches.length >= 3 &&
                  !data.niches.includes(niche.value) &&
                  "opacity-40 cursor-not-allowed",
              )}
            >
              {niche.label}
            </button>
          ))}
        </div>
        {data.niches.includes("other") && (
          <input
            type="text"
            placeholder="Enter your niche..."
            value={customNiche}
            onChange={(e) => onCustomNicheChange(e.target.value)}
            className="mt-2 w-full rounded border border-input bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-ring/50"
            maxLength={100}
          />
        )}
        {errors.niche && (
          <p className="mt-1 text-xs text-red-400">{errors.niche}</p>
        )}
      </div>

      {/* Goal multi-select cards */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
            What are your goals?
          </label>
          <span data-testid="goal-counter" className="text-[10px] font-mono tabular-nums text-muted-foreground/30">
            {data.goals.length}/3 selected
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() => toggleGoal(goal.value)}
              className={cn(
                "cursor-pointer rounded border p-3 text-left transition-all duration-200",
                data.goals.includes(goal.value)
                  ? "border-primary/30 bg-foreground/[0.04]"
                  : "border-input/60 hover:border-input hover:bg-foreground/[0.02]",
                data.goals.length >= 3 &&
                  !data.goals.includes(goal.value) &&
                  "opacity-40 cursor-not-allowed",
              )}
            >
              <p className="text-sm font-medium text-foreground">{goal.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/40">
                {goal.description}
              </p>
            </button>
          ))}
        </div>
        {errors.goal && (
          <p className="mt-1 text-xs text-red-400">{errors.goal}</p>
        )}
      </div>

      {/* Target audience */}
      <div className="mb-6">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">
          Who do you want to reach?
        </label>
        <input
          type="text"
          placeholder="e.g., Early-stage SaaS founders"
          value={data.target_audience}
          onChange={(e) =>
            onChange({ ...data, target_audience: e.target.value })
          }
          className={cn(
            "w-full rounded border bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none transition-colors",
            errors.audience
              ? "border-red-500/50"
              : "border-input focus:border-ring/50",
          )}
          maxLength={100}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.audience ? (
            <p className="text-xs text-red-400">{errors.audience}</p>
          ) : (
            <p className="text-xs text-muted-foreground/30">Be specific — who is your ideal reader?</p>
          )}
          <p className="text-xs font-mono tabular-nums text-muted-foreground/25">
            {data.target_audience.length}/100
          </p>
        </div>
      </div>

      <Button
        variant="coral"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full cursor-pointer py-6 text-sm font-medium disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}

function ImportContentStep({
  isImporting,
  importedCount,
  didImport,
  onImport,
  onSkip,
  onContinue,
}: {
  isImporting: boolean;
  importedCount: number;
  didImport: boolean;
  onImport: (count: number) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  if (didImport) {
    return (
      <div className="flex flex-col items-center text-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
          className="mb-4 text-emerald-400"
        >
          <path
            d="M3 8.5 6.5 12 13 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
          Imported {importedCount} posts
        </h2>
        <p className="mb-6 text-sm text-muted-foreground/50">
          {importedCount >= 20
            ? "You're ready for insights!"
            : `${20 - importedCount} more posts until insights unlock.`}
        </p>
        <Button
          variant="coral"
          onClick={onContinue}
          className="w-full cursor-pointer py-6 text-sm font-medium"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-input border-t-muted-foreground" />
        <p className="text-sm text-muted-foreground/60">Importing your posts...</p>
        <p className="mt-1 text-xs text-muted-foreground/30">This may take a moment</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
        Import your existing posts
      </h2>
      <p className="mb-1 text-sm text-muted-foreground/50">
        Unlock insights faster by importing your X history
      </p>
      <p className="mb-6 text-xs text-muted-foreground/30">
        Import 50+ posts to get personalized insights from day one
      </p>

      <div className="space-y-0">
        {[
          { count: 50, label: "Last 50 posts", time: "~10 seconds" },
          { count: 100, label: "Last 100 posts", time: "~20 seconds" },
          { count: 500, label: "All posts (up to 500)", time: "~60 seconds" },
        ].map((option) => (
          <button
            key={option.count}
            type="button"
            onClick={() => onImport(option.count)}
            className="group flex w-full cursor-pointer items-center justify-between border-b border-editorial-rule-subtle py-4 text-left transition-all hover:bg-foreground/[0.02]"
          >
            <div>
              <p className="text-[15px] font-serif text-foreground">{option.label}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30">{option.time}</p>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted-foreground/20 transition-colors group-hover:text-muted-foreground/50"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 w-full cursor-pointer text-center text-[11px] uppercase tracking-[0.1em] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
      >
        Skip for now
      </button>
    </div>
  );
}

function TourStep({ onContinue }: { onContinue: () => void }) {
  const [tourIndex, setTourIndex] = useState(0);

  const stops = [
    {
      title: "Dashboard",
      description: "Your command center. See performance at a glance.",
    },
    {
      title: "Content",
      description: "Create, schedule, and manage all your posts.",
    },
    {
      title: "Insights",
      description: "Personalized insights unlock after 20 published posts.",
    },
    {
      title: "Connections",
      description: "Manage your connected platforms here.",
    },
  ];

  const current = stops[tourIndex];

  return (
    <div>
      <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
        Quick tour
      </h2>
      <p className="mb-6 text-sm text-muted-foreground/50">
        Here&apos;s what you&apos;ll find in your toolkit
      </p>

      <div className="border-y border-editorial-rule-subtle py-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-editorial-label mb-2">
          {tourIndex + 1} / {stops.length}
        </p>
        <h3 className="mb-1 font-serif text-lg font-normal text-foreground">
          {current.title}
        </h3>
        <p className="text-sm text-muted-foreground/50">{current.description}</p>

        {/* Tour dots */}
        <div className="mt-4 flex gap-1.5">
          {stops.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTourIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all cursor-pointer",
                i === tourIndex ? "w-5 bg-foreground/60" : "w-1 bg-foreground/10",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {tourIndex > 0 && (
          <Button
            variant="outline"
            onClick={() => setTourIndex(tourIndex - 1)}
            className="flex-1 cursor-pointer border-input text-sm text-foreground hover:border-ring/30 hover:bg-foreground/[0.03]"
          >
            Back
          </Button>
        )}
        {tourIndex < stops.length - 1 ? (
          <Button
            variant="coral"
            onClick={() => setTourIndex(tourIndex + 1)}
            className="flex-1 cursor-pointer py-5 text-sm font-medium"
          >
            Next
          </Button>
        ) : (
          <Button
            variant="coral"
            onClick={onContinue}
            className="flex-1 cursor-pointer py-5 text-sm font-medium"
          >
            Continue
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-3 w-full cursor-pointer text-center text-[11px] uppercase tracking-[0.1em] text-muted-foreground/30 transition-colors hover:text-muted-foreground"
      >
        Skip tour
      </button>
    </div>
  );
}

function ActivateStep({
  didImport,
  importedCount,
  ideas,
  isLoadingIdeas,
  onComplete,
  onCreatePost,
  onUseIdea,
}: {
  didImport: boolean;
  importedCount: number;
  ideas?: Array<{ idea: string; hook: string }>;
  isLoadingIdeas: boolean;
  onComplete: () => void;
  onCreatePost: () => void;
  onUseIdea: (hook: string) => void;
}) {
  if (didImport) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-6">
          <Logo variant="icon" size="lg" className="text-foreground/70" />
        </div>
        <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
          You&apos;re all set!
        </h2>
        <p className="mb-6 text-sm text-muted-foreground/50">
          We imported {importedCount} posts. Insights are being generated.
        </p>

        <div className="w-full space-y-2">
          <Button
            variant="coral"
            onClick={onComplete}
            className="w-full cursor-pointer py-6 text-sm font-medium"
          >
            View Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={onCreatePost}
            className="w-full cursor-pointer border-input py-6 text-sm text-foreground hover:border-ring/30 hover:bg-foreground/[0.03]"
          >
            Create New Post
          </Button>
        </div>

        {/* How it works */}
        <div className="mt-8 w-full border-t border-editorial-rule-subtle pt-6 text-left">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-editorial-label">
            How AiGrow works
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground/40">
            <p>
              <span className="text-foreground/60">Post</span> — Create and publish
              content
            </p>
            <p>
              <span className="text-foreground/60">Observe</span> — We track
              performance automatically
            </p>
            <p>
              <span className="text-foreground/60">Learn</span> — Insights unlock
              after 20+ posts
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/25">
            The more you post, the smarter the system gets.
          </p>
        </div>
      </div>
    );
  }

  // No import — show AI ideas
  return (
    <div>
      <h2 className="mb-1 font-serif text-xl font-normal tracking-tight text-foreground">
        {ideas && ideas.length > 0
          ? "Here are your first content ideas"
          : "You're all set!"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground/50">
        {ideas && ideas.length > 0
          ? "Based on your profile, we've generated ideas to get you started"
          : "Start creating to unlock the full power of the system"}
      </p>

      {isLoadingIdeas && (
        <div className="mb-6 flex flex-col items-center py-4">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-input border-t-muted-foreground" />
          <p className="text-xs text-muted-foreground/50">
            Generating personalized ideas...
          </p>
        </div>
      )}

      {ideas && ideas.length > 0 && (
        <div className="mb-6">
          {ideas.map((idea, i) => (
            <div
              key={i}
              className="border-b border-editorial-rule-subtle py-4"
            >
              <p className="text-[15px] font-serif text-foreground">
                {idea.idea}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/40 italic">
                &ldquo;{idea.hook}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => onUseIdea(idea.hook)}
                className="mt-2 cursor-pointer text-[11px] uppercase tracking-[0.1em] text-muted-foreground/50 transition-colors hover:text-foreground"
              >
                Use this idea &rarr;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Button
          variant="coral"
          onClick={onComplete}
          className="w-full cursor-pointer py-6 text-sm font-medium"
        >
          {ideas && ideas.length > 0 ? "View Dashboard" : "Go to Dashboard"}
        </Button>
        <Button
          variant="outline"
          onClick={onCreatePost}
          className="w-full cursor-pointer border-input py-6 text-sm text-foreground hover:border-ring/30 hover:bg-foreground/[0.03]"
        >
          Create from scratch
        </Button>
      </div>

      {/* How it works */}
      <div className="mt-8 border-t border-editorial-rule-subtle pt-6">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-editorial-label">
          How AiGrow works
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground/40">
          <p>
            <span className="text-foreground/60">Post</span> — Create and publish
            content
          </p>
          <p>
            <span className="text-foreground/60">Observe</span> — We track
            performance automatically
          </p>
          <p>
            <span className="text-foreground/60">Learn</span> — Insights unlock
            after 20+ posts
          </p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/25">
          The more you post, the smarter the system gets.
        </p>
      </div>
    </div>
  );
}

/* ============ Main Page Export ============ */

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center">
          <div className="mb-8 flex items-center gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-input" />
            ))}
          </div>
          <div className="w-full rounded-2xl border border-input/60 bg-foreground/[0.02] p-8 backdrop-blur-md">
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-input border-t-muted-foreground" />
            </div>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
