"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  // Determine initial step from server state or default to welcome
  const initialStep = onboardingState?.onboarding_step ?? "welcome";
  const [currentStep, setCurrentStep] = useState<string>(initialStep);
  const [profileData, setProfileData] = useState<QuickProfileInput>({
    primary_niche: "",
    primary_goal: "",
    target_audience: "",
  });
  const [customNiche, setCustomNiche] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [didImport, setDidImport] = useState(false);
  const hasCheckedConnected = useRef(false);

  // Sync step from server state on first load
  useEffect(() => {
    if (onboardingState?.onboarding_step) {
      setCurrentStep(onboardingState.onboarding_step);
    }
  }, [onboardingState?.onboarding_step]);

  // Check if returning from Twitter OAuth
  useEffect(() => {
    if (hasCheckedConnected.current) return;
    const connected = searchParams.get("connected");
    if (connected === "twitter") {
      hasCheckedConnected.current = true;
      setCurrentStep("connect");
      refetchConnections();
    }
  }, [searchParams, refetchConnections]);

  // Auto-advance from connect step when connection detected
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
    if (!profileData.primary_niche) errors.niche = "Pick your niche";
    if (!profileData.primary_goal) errors.goal = "Choose your goal";
    if (!profileData.target_audience || profileData.target_audience.length < 5)
      errors.audience = "At least 5 characters";
    if (profileData.target_audience.length > 100)
      errors.audience = "Max 100 characters";
    if (profileData.primary_niche === "other" && !customNiche)
      errors.niche = "Enter your custom niche";

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    saveProfile.mutate(
      {
        ...profileData,
        ...(profileData.primary_niche === "other" && { custom_niche: customNiche }),
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
      onSuccess: () => router.push("/dashboard"),
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

      {/* Step content card */}
      <div className="w-full rounded-2xl border border-glass-border bg-glass-bg p-8 backdrop-blur-md">
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
                onSuccess: () => router.push("/dashboard/content/new"),
              });
            }}
            onUseIdea={(hook: string) => {
              completeOnboarding.mutate(undefined, {
                onSuccess: () =>
                  router.push(
                    `/dashboard/content/new?body=${encodeURIComponent(hook)}`,
                  ),
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
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-input bg-secondary">
        <svg
          width="24"
          height="24"
          viewBox="0 0 20 20"
          fill="none"
          className="text-foreground"
        >
          <path
            d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm11 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        Welcome to Creator Growth OS
      </h1>
      <p className="mb-2 text-sm leading-relaxed text-muted-foreground">
        Most creator tools help you post. We help you learn.
      </p>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground/60">
        Creator Growth OS tracks what you publish, observes what works,
        remembers patterns, and guides better decisions over time.
      </p>

      <Button
        onClick={onContinue}
        className="w-full cursor-pointer bg-primary py-6 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90"
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
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
        Connect your platform
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        We&apos;ll track your content and performance
      </p>

      {/* Twitter card */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-all duration-500",
          isConnected
            ? "border-emerald-500/30 bg-emerald-500/[0.06]"
            : "border-input bg-muted",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-foreground"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Twitter / X</p>
              {isConnected && username ? (
                <p className="text-xs text-emerald-400/80">
                  Connected as @{username}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  Post, track, and analyze
                </p>
              )}
            </div>
          </div>

          {isConnected ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
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
            </div>
          ) : (
            <a
              href="/api/connections/twitter"
              className="inline-flex h-9 items-center rounded-lg border border-input bg-secondary px-4 text-xs font-medium text-foreground transition-colors hover:bg-input"
            >
              Connect
            </a>
          )}
        </div>
      </div>

      {/* Coming soon */}
      <div className="mt-3 space-y-2">
        {["LinkedIn", "Threads"].map((name) => (
          <div
            key={name}
            className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4 opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary" />
              <div>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground/60">Coming soon</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isConnected && (
        <p className="mt-4 text-center text-xs text-muted-foreground/60 animate-pulse">
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
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
        Tell us about your content
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        This helps us give you personalized ideas (30 seconds)
      </p>

      {/* Niche dropdown */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          What&apos;s your niche?
        </label>
        <select
          value={data.primary_niche}
          onChange={(e) =>
            onChange({ ...data, primary_niche: e.target.value })
          }
          className={cn(
            "w-full rounded-lg border bg-glass-bg px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
            errors.niche
              ? "border-destructive/50"
              : "border-input focus:border-ring",
          )}
        >
          <option value="" className="bg-popover">
            Select a niche...
          </option>
          {NICHES.map((niche) => (
            <option key={niche.value} value={niche.value} className="bg-popover">
              {niche.label} — {niche.hint}
            </option>
          ))}
        </select>
        {data.primary_niche === "other" && (
          <input
            type="text"
            placeholder="Enter your niche..."
            value={customNiche}
            onChange={(e) => onCustomNicheChange(e.target.value)}
            className="mt-2 w-full rounded-lg border border-input bg-glass-bg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-ring"
            maxLength={100}
          />
        )}
        {errors.niche && (
          <p className="mt-1 text-xs text-red-400">{errors.niche}</p>
        )}
      </div>

      {/* Goal cards */}
      <div className="mb-5">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          What&apos;s your main goal?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              onClick={() =>
                onChange({ ...data, primary_goal: goal.value })
              }
              className={cn(
                "cursor-pointer rounded-lg border p-3 text-left transition-all duration-200",
                data.primary_goal === goal.value
                  ? "border-ring bg-secondary"
                  : "border-glass-border bg-muted hover:border-input hover:bg-glass-hover",
              )}
            >
              <p className="text-sm font-medium text-foreground">{goal.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/60">
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
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
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
            "w-full rounded-lg border bg-glass-bg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors",
            errors.audience
              ? "border-destructive/50"
              : "border-input focus:border-ring",
          )}
          maxLength={100}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.audience ? (
            <p className="text-xs text-red-400">{errors.audience}</p>
          ) : (
            <p className="text-xs text-muted-foreground/40">Be specific — who is your ideal reader?</p>
          )}
          <p className="text-xs text-muted-foreground/30">
            {data.target_audience.length}/100
          </p>
        </div>
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="w-full cursor-pointer bg-primary py-6 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:opacity-50"
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
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <svg
            width="20"
            height="20"
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
        </div>
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          Imported {importedCount} posts
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {importedCount >= 20
            ? "You're ready for insights!"
            : `${20 - importedCount} more posts until insights unlock.`}
        </p>
        <Button
          onClick={onContinue}
          className="w-full cursor-pointer bg-primary py-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Continue
        </Button>
      </div>
    );
  }

  if (isImporting) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
        <p className="text-sm text-muted-foreground">Importing your posts...</p>
        <p className="mt-1 text-xs text-muted-foreground/40">This may take a moment</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
        Import your existing posts
      </h2>
      <p className="mb-1 text-sm text-muted-foreground">
        Unlock insights faster by importing your Twitter history
      </p>
      <p className="mb-6 text-xs text-muted-foreground/40">
        Import 50+ posts to get personalized insights from day one
      </p>

      <div className="space-y-2">
        {[
          { count: 50, label: "Last 50 posts", time: "~10 seconds" },
          { count: 100, label: "Last 100 posts", time: "~20 seconds" },
          { count: 500, label: "All posts (up to 500)", time: "~60 seconds" },
        ].map((option) => (
          <button
            key={option.count}
            type="button"
            onClick={() => onImport(option.count)}
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-glass-border bg-muted p-4 text-left transition-all hover:border-input hover:bg-glass-hover"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground/40">{option.time}</p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-muted-foreground/40"
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
        className="mt-4 w-full cursor-pointer text-center text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
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
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="6" height="6" rx="1" />
          <rect x="10" y="2" width="6" height="6" rx="1" />
          <rect x="2" y="10" width="6" height="6" rx="1" />
          <rect x="10" y="10" width="6" height="6" rx="1" />
        </svg>
      ),
    },
    {
      title: "Content",
      description: "Create, schedule, and manage all your posts.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h12M3 9h8M3 13h10" />
        </svg>
      ),
    },
    {
      title: "Insights",
      description: "Personalized insights unlock after 20 published posts.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2v4M9 12v4M2 9h4M12 9h4" />
          <circle cx="9" cy="9" r="2" />
        </svg>
      ),
    },
    {
      title: "Connections",
      description: "Manage your connected platforms here.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="5" r="2" />
          <circle cx="13" cy="13" r="2" />
          <path d="M6.5 6.5 11.5 11.5" />
        </svg>
      ),
    },
  ];

  const current = stops[tourIndex];

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
        Quick tour
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Here&apos;s what you&apos;ll find in your toolkit
      </p>

      <div className="rounded-xl border border-input bg-glass-bg p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          {current.icon}
        </div>
        <h3 className="mb-1 text-base font-semibold text-foreground">
          {current.title}
        </h3>
        <p className="text-sm text-muted-foreground">{current.description}</p>

        {/* Tour dots */}
        <div className="mt-4 flex gap-1.5">
          {stops.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setTourIndex(i)}
              className={cn(
                "h-1 rounded-full transition-all cursor-pointer",
                i === tourIndex ? "w-5 bg-foreground/60" : "w-1 bg-border",
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
            className="flex-1 cursor-pointer border-input bg-secondary text-sm text-foreground hover:bg-input"
          >
            Back
          </Button>
        )}
        {tourIndex < stops.length - 1 ? (
          <Button
            onClick={() => setTourIndex(tourIndex + 1)}
            className="flex-1 cursor-pointer bg-primary py-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={onContinue}
            className="flex-1 cursor-pointer bg-primary py-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Continue
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-3 w-full cursor-pointer text-center text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
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
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-input bg-secondary">
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            className="text-foreground"
          >
            <path
              d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm11 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-1 text-xl font-semibold text-foreground">
          You&apos;re all set!
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          We imported {importedCount} posts. Insights are being generated.
        </p>

        <div className="w-full space-y-2">
          <Button
            onClick={onComplete}
            className="w-full cursor-pointer bg-primary py-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            View Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={onCreatePost}
            className="w-full cursor-pointer border-input bg-secondary py-6 text-sm text-foreground hover:bg-input"
          >
            Create New Post
          </Button>
        </div>

        {/* Info card */}
        <div className="mt-6 w-full rounded-xl border border-glass-border bg-muted p-4 text-left">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            How Creator Growth OS works
          </p>
          <div className="space-y-1.5 text-xs text-muted-foreground/60">
            <p>
              <span className="text-muted-foreground">Post</span> — Create and publish
              content
            </p>
            <p>
              <span className="text-muted-foreground">Observe</span> — We track
              performance automatically
            </p>
            <p>
              <span className="text-muted-foreground">Learn</span> — Insights unlock
              after 20+ posts
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/40">
            The more you post, the smarter the system gets.
          </p>
        </div>
      </div>
    );
  }

  // No import — show AI ideas
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
        {ideas && ideas.length > 0
          ? "Here are your first content ideas"
          : "You're all set!"}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {ideas && ideas.length > 0
          ? "Based on your profile, we've generated ideas to get you started"
          : "Start creating to unlock the full power of the system"}
      </p>

      {isLoadingIdeas && (
        <div className="mb-6 flex flex-col items-center py-4">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Generating personalized ideas...
          </p>
        </div>
      )}

      {ideas && ideas.length > 0 && (
        <div className="mb-6 space-y-2">
          {ideas.map((idea, i) => (
            <div
              key={i}
              className="rounded-xl border border-glass-border bg-muted p-4"
            >
              <p className="mb-1 text-sm font-medium text-foreground">
                {idea.idea}
              </p>
              <p className="mb-3 text-xs text-muted-foreground/60">
                &ldquo;{idea.hook}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => onUseIdea(idea.hook)}
                className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Use this idea &rarr;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Button
          onClick={onComplete}
          className="w-full cursor-pointer bg-primary py-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {ideas && ideas.length > 0 ? "View Dashboard" : "Go to Dashboard"}
        </Button>
        <Button
          variant="outline"
          onClick={onCreatePost}
          className="w-full cursor-pointer border-input bg-secondary py-6 text-sm text-foreground hover:bg-input"
        >
          Create from scratch
        </Button>
      </div>

      {/* Info card */}
      <div className="mt-6 rounded-xl border border-glass-border bg-muted p-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          How Creator Growth OS works
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground/60">
          <p>
            <span className="text-muted-foreground">Post</span> — Create and publish
            content
          </p>
          <p>
            <span className="text-muted-foreground">Observe</span> — We track
            performance automatically
          </p>
          <p>
            <span className="text-muted-foreground">Learn</span> — Insights unlock
            after 20+ posts
          </p>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/40">
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
          <div className="w-full rounded-2xl border border-glass-border bg-glass-bg p-8 backdrop-blur-md">
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-muted-foreground" />
            </div>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
