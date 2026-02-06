import { z } from "zod";

export const ONBOARDING_STEPS = [
  "welcome",
  "connect",
  "profile",
  "import",
  "tour",
  "activate",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const NICHES = [
  { value: "tech_software", label: "Tech / Software", hint: "SaaS, DevTools, AI, Web3" },
  { value: "business_startups", label: "Business / Startups", hint: "Founders, Bootstrapping, Consulting" },
  { value: "marketing", label: "Marketing", hint: "Content, Growth, SEO, Social" },
  { value: "design", label: "Design", hint: "UI/UX, Product Design, Branding" },
  { value: "finance", label: "Finance", hint: "Investing, Personal Finance, Crypto" },
  { value: "health_fitness", label: "Health / Fitness", hint: "Wellness, Nutrition, Mental Health" },
  { value: "productivity", label: "Productivity", hint: "Systems, Tools, Habits" },
  { value: "career", label: "Career", hint: "Leadership, Job Search, Skills" },
  { value: "creative", label: "Creative", hint: "Writing, Art, Music, Video" },
  { value: "education", label: "Education", hint: "Teaching, Coaching, Courses" },
  { value: "lifestyle", label: "Lifestyle", hint: "Travel, Parenting, Personal Growth" },
  { value: "other", label: "Other", hint: "Custom niche" },
] as const;

export const GOALS = [
  { value: "build_authority", label: "Build authority", description: "Become known as an expert" },
  { value: "grow_audience", label: "Grow audience", description: "Maximize follower growth" },
  { value: "get_clients", label: "Get clients", description: "Generate leads and customers" },
  { value: "grow_newsletter", label: "Grow newsletter", description: "Drive email signups" },
  { value: "launch_products", label: "Launch products", description: "Build audience for launches" },
  { value: "network", label: "Network", description: "Connect with peers" },
] as const;

const nicheValues = NICHES.map((n) => n.value);
const goalValues = GOALS.map((g) => g.value);

export const quickProfileSchema = z.object({
  primary_niche: z.enum(nicheValues as [string, ...string[]]),
  primary_goal: z.enum(goalValues as [string, ...string[]]),
  target_audience: z.string().min(5).max(100),
  custom_niche: z.string().max(100).optional(),
});

export type QuickProfileInput = z.infer<typeof quickProfileSchema>;

export const updateStepSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
});

export type UpdateStepInput = z.infer<typeof updateStepSchema>;
