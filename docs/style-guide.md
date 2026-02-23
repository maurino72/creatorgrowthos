# PostIQ — UI Style Guide

## Brand Identity

**Name:** PostIQ
**Tagline:** Grow your audience with AI-powered content intelligence
**Logo:** Custom SVG mark — a hashtag where vertical lines fan outward above horizontal bars, symbolizing growth breaking through structure. Paired with "PostIQ" wordmark in serif font.
**Design Direction:** Editorial-meets-SaaS. Magazine-inspired layouts with clean typography, generous whitespace, and warm accent colors. The aesthetic sits between a premium editorial publication and a modern productivity tool.

---

## Color System

All colors use HSL format with CSS custom variables. Theme switching is controlled by `.dark` class on `<html>`.

### Core Palette

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `hsl(210 40% 98%)` cool white | `hsl(240 21% 8%)` deep indigo | Page background |
| `--foreground` | `hsl(244 47% 20%)` dark navy | `hsl(213 31% 91%)` pale blue | Primary text |
| `--primary` | `hsl(263 83% 58%)` purple | `hsl(263 83% 65%)` lighter purple | Nav, tabs, links, focus rings, headings |
| `--coral` | `hsl(4 93% 69%)` warm coral | `hsl(4 90% 62%)` deeper coral | **All primary CTAs** |
| `--muted` | `hsl(215 20% 95%)` | `hsl(240 15% 15%)` | Disabled states, subtle backgrounds |
| `--muted-foreground` | `hsl(215 16% 47%)` | `hsl(215 16% 57%)` | Secondary text, timestamps |

### Brand Tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--coral` | `hsl(4 93% 69%)` | `hsl(4 90% 62%)` | Primary action buttons |
| `--coral-foreground` | `hsl(0 0% 100%)` | `hsl(0 0% 100%)` | Text on coral buttons |
| `--coral-soft` | `hsl(4 86% 97%)` | `hsl(4 40% 15%)` | Coral tinted backgrounds |
| `--purple-light` | `hsl(258 90% 76%)` | `hsl(258 90% 76%)` | Accent highlights |
| `--purple-soft` | `hsl(257 89% 96%)` | `hsl(257 40% 15%)` | Purple tinted backgrounds |

### Status / Semantic Colors

| Token | Usage | Light | Dark |
|---|---|---|---|
| `--success` | Published, Active | `hsl(160 84% 39%)` | `hsl(160 84% 45%)` |
| `--warning` | Expired, Suggested | `hsl(38 92% 50%)` | `hsl(38 92% 56%)` |
| `--destructive` | Failed, Revoked, Errors | `hsl(0 84% 60%)` | `hsl(0 72% 51%)` |
| `--info` | Scheduled, Accepted | `hsl(199 89% 48%)` | `hsl(199 89% 55%)` |

Each status has a `-muted` variant at 10-15% opacity for badge backgrounds, and a `-foreground` variant (white) for text on solid badges.

### Surfaces & Glass

| Token | Usage |
|---|---|
| `--card` | Card backgrounds (white / dark gray) |
| `--glass-bg` | Glass morphism surfaces (80% opacity) |
| `--glass-border` | Frosted border lines |
| `--glass-hover` | Hover state on glass surfaces |
| `--mesh-1/2/3` | Atmospheric gradient blob colors |

### Editorial Tokens

| Token | Usage |
|---|---|
| `--editorial-rule` | Primary horizontal dividers between sections |
| `--editorial-rule-subtle` | Subtle dividers between list items |
| `--editorial-label` | Section labels, nav category headers |

### Chart Colors

Five-color palette for data visualization:

| Token | Color |
|---|---|
| `--chart-1` | Purple (primary) |
| `--chart-2` | Coral |
| `--chart-3` | Lavender |
| `--chart-4` | Teal |
| `--chart-5` | Amber |

### Color Distribution Rule

**60-30-10:**
- 60% — Neutrals (`background`, `card`, `muted`)
- 30% — Primary family (`primary`, `purple-light`, `purple-soft`)
- 10% — Accent + Status (`coral`, `success`, `warning`, `destructive`, `info`)

---

## Typography

### Font Stack

| Variable | Font | Usage |
|---|---|---|
| `--font-geist-sans` | Geist | Body text, UI labels, buttons |
| `--font-geist-mono` | Geist Mono | Code, metrics, data points |
| `--font-newsreader` | Newsreader (serif) | Page titles, card body text, logo wordmark |

Loaded via `next/font/google` with CSS custom properties. Newsreader includes normal + italic styles, weights 300-600.

### Type Scale

| Element | Classes | Example |
|---|---|---|
| **Page title** | `text-3xl font-normal tracking-tight font-serif` | "Dashboard", "Inspiration" |
| **Card body text** | `text-[17px] font-serif leading-snug` or `text-[15px] font-serif leading-snug` | Inspiration cards, experiment hypotheses |
| **Section labels** | `text-[9px] uppercase tracking-[0.25em] text-editorial-label` | "Navigate" in sidebar |
| **Tab labels** | `text-[11px] uppercase tracking-[0.15em]` | Filter tabs |
| **Meta labels** | `text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40` | "Statement · Inspiration" |
| **Body text** | `text-sm` (14px) | General body content |
| **Small text** | `text-xs` (12px) | Engagement signals, descriptions |
| **Tiny text** | `text-[10px]` | Badge labels, timestamps |
| **User name (sidebar)** | `text-[12px] text-sidebar-foreground/60` | Sidebar user display |
| **Mobile nav label** | `text-[9px] uppercase tracking-[0.15em]` | Bottom nav labels |

### Text Opacity Modifiers

Used extensively for visual hierarchy:

| Modifier | Usage |
|---|---|
| `text-foreground` (100%) | Primary headings, active content |
| `text-foreground/60` | Secondary text, results |
| `text-muted-foreground` | Standard secondary text |
| `text-muted-foreground/60` | Empty state primary |
| `text-muted-foreground/50` | Descriptions |
| `text-muted-foreground/40` | Meta labels, inactive tabs, empty state secondary |
| `text-sidebar-foreground/40` | Inactive nav items |
| `text-sidebar-foreground/80` | Nav hover state |

---

## Layout & Spacing

### App Shell

```
┌──────────────────────────────────────────────────────┐
│ ┌─────────┬──────────────────────────────────────────┐
│ │         │                                          │
│ │ Sidebar │            Main Content                  │
│ │  w-56   │     px-4 py-8 lg:px-8 lg:py-10          │
│ │         │                                          │
│ │         │                                          │
│ └─────────┴──────────────────────────────────────────┘
│         AtmosphericBackground (absolute, z-0)        │
└──────────────────────────────────────────────────────┘
```

- **Sidebar:** `w-56`, `border-r border-editorial-rule-subtle`, `bg-sidebar/60 backdrop-blur-sm`
- **Main content:** `flex-1 overflow-y-auto px-4 py-8 lg:px-8 lg:py-10`, `relative z-10`
- **Atmospheric background:** Positioned absolute, `z-0`, gradient mesh blobs + grain overlay

### Page Structure (Masthead Pattern)

Every page follows this masthead layout:

```
┌──────────────────────────────────────────────┐
│  Title (serif)                    Action CTA │
├──────────────────────────────────────────────┤  ← h-px bg-editorial-rule mt-4 mb-8
│  [Tab] [Tab] [Tab]                           │  ← gap-6 mb-8
├──────────────────────────────────────────────┤
│  Content area (list / cards / empty state)   │
│  wrapped in data-testid="tab-content"        │
└──────────────────────────────────────────────┘
```

```html
<div class="w-full">
  <!-- Masthead -->
  <div class="flex items-end justify-between">
    <h1 class="text-3xl font-normal tracking-tight font-serif">Title</h1>
    <Button variant="coral" size="xs">Action</Button>
  </div>
  <div class="h-px bg-editorial-rule mt-4 mb-8" />

  <!-- Tabs -->
  <div class="flex items-center gap-6 mb-8">...</div>

  <!-- Content -->
  <div data-testid="tab-content" class={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
    ...
  </div>
</div>
```

### Spacing Conventions

| Context | Value |
|---|---|
| Masthead rule → tabs | `mt-4 mb-8` |
| Tabs → content | `mb-8` |
| List item padding | `py-4` or `py-5` |
| Item internal spacing | `space-y-2` |
| Card grid gaps | `gap-3` or `gap-4` |
| Sidebar padding | `px-3`, `px-5` |
| Main content padding | `px-4 py-8` / `lg:px-8 lg:py-10` |

---

## Components

### Button

**Variants:**

| Variant | Usage | Style |
|---|---|---|
| `coral` | All primary CTAs (Refresh, Save, Publish, etc.) | `bg-coral text-coral-foreground shadow-xs hover:bg-coral/90` |
| `default` | Standard purple buttons | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `outline` | Secondary actions (Suggest Experiments) | `border border-input bg-transparent shadow-xs` |
| `ghost` | Inline actions (Accept, Dismiss, Remove) | `hover:bg-accent hover:text-accent-foreground` |
| `destructive` | Dangerous actions (Delete) | `bg-destructive text-white` |
| `secondary` | Tertiary actions | `bg-secondary text-secondary-foreground` |
| `link` | Text links | `text-primary underline-offset-4 hover:underline` |

**Sizes:** `xs` (h-6), `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (size-9), `icon-xs` (size-6), `icon-sm` (size-8), `icon-lg` (size-10)

**Loading state:** `loading` prop adds spinner SVG and disables button.

### Card (Glass Card)

```html
<Card> <!-- bg-card border-glass-border backdrop-blur-sm rounded-xl shadow-sm -->
  <CardHeader>
    <CardTitle>...</CardTitle>
    <CardDescription>...</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

### Skeleton (Loading)

```html
<Skeleton class="h-8 w-32" /> <!-- bg-accent animate-pulse rounded-md -->
```

**Loading page pattern:**
```
Title skeleton     → h-8 w-32..w-40
Editorial rule     → h-px bg-editorial-rule
Tab skeletons      → h-4 w-16..w-20 (repeat per tab count)
Content skeletons  → 3 items, py-4 space-y-2
  Meta line        → h-2.5 w-28..w-32
  Headline         → h-4..h-5 w-3/4..w-full
  Body lines       → h-3..h-5 w-full, w-4/5, w-2/3
```

### Status Badges

```html
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset {style}">
  Label
</span>
```

| Status | Background | Text | Ring |
|---|---|---|---|
| Draft | `bg-muted` | `text-muted-foreground` | `ring-border` |
| Scheduled | `bg-info-muted` | `text-info` | `ring-info/20` |
| Published / Active | `bg-success-muted` | `text-success` | `ring-success/20` |
| Failed / Revoked | `bg-destructive-muted` | `text-destructive` | `ring-destructive/20` |
| Expired | `bg-warning-muted` | `text-warning` | `ring-warning/20` |

### Tabs (Filter Tabs)

```html
<button class="text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b
  {active ? 'text-foreground border-foreground/60' : 'text-muted-foreground/40 border-transparent hover:text-foreground/70'}">
  Tab Label
</button>
```

Tabs are wrapped in `flex items-center gap-6 mb-8` and use `useTransition` for pending state (`opacity-70` on content wrapper).

### List Items (Entry Pattern)

Used for Insights, Experiments, Inspiration cards, Library items:

```html
<div class="group py-4">
  <!-- Meta line -->
  <p class="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
    <span>Type Label</span> · Status
  </p>
  <!-- Primary content (serif) -->
  <p class="text-[15px] font-serif leading-snug mt-1.5">
    Main body text
  </p>
  <!-- Secondary content -->
  <p class="text-xs text-muted-foreground/50 leading-relaxed mt-1.5">
    Description or engagement signal
  </p>
  <!-- Hover actions -->
  <div class="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <Button variant="ghost" size="xs">Action</Button>
  </div>
</div>
```

**Item dividers:** `<div class="h-px bg-editorial-rule-subtle" />` between items (not after the last one).

### Empty State

```html
<div class="py-16 text-center">
  <p class="text-sm text-muted-foreground/60">Primary message</p>
  <p class="mt-1 text-xs text-muted-foreground/40">
    Supportive description with call to action.
  </p>
</div>
```

### Metric Card (Dashboard)

```html
<div class="rounded-lg border border-border/40 bg-card/30 backdrop-blur-sm p-5">
  <div class="flex items-center gap-2 mb-3">
    <Icon class="size-4 text-muted-foreground/50" />
    <span class="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/50">Label</span>
  </div>
  <p class="text-2xl font-semibold font-mono tracking-tight">1,234</p>
  <p class="text-xs text-muted-foreground/40 mt-1">Sub info</p>
</div>
```

---

## Atmospheric Background

Positioned behind all app content. Three gradient mesh blobs + grain overlay.

**Intensity levels:**

| Level | Blob Opacity | Grain Opacity | Usage |
|---|---|---|---|
| `full` | 60/40/30% | 3% | Landing, pricing |
| `subtle` | 20/15/10% | 2% | App shell (default) |
| `minimal` | 10/8/5% | 1.5% | Focused content |

Blobs use `blur-[80-120px]` and are GPU-composited with `willChange: "transform"` + `transform: "translateZ(0)"`.

---

## Theme System

- **Default theme:** Dark
- **Switching mechanism:** `.dark` class on `<html>`
- **FOUC prevention:** Inline `<script>` checks `localStorage("theme-preference")`, adds `.dark` unless value is `"light"`
- **Transition:** `.theme-transitioning *` adds `transition: color 200ms, background-color 200ms, border-color 200ms`
- **Storage key:** `theme-preference` in localStorage

---

## Interaction Patterns

### Hover Reveal Actions

Action buttons on list items are hidden by default and revealed on hover:
```
.group on parent → .opacity-0 .group-hover:opacity-100 .transition-opacity on action container
```

### Tab Transitions

All tab/filter switches use React `useTransition`:
```typescript
const [isPending, startTransition] = useTransition();
// Tab click:
startTransition(() => setActiveTab(tab.value));
// Content wrapper:
className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}
```

### Prefetch on Hover

Sidebar nav items prefetch query data on `mouseEnter` and `focus`:
```typescript
onMouseEnter={() => prefetchDashboard(queryClient)}
```

### Toast Notifications

Using `sonner` library:
```typescript
toast.success("Action completed")
toast.error("Failed to perform action")
toast.error(err.message) // For caught errors
```

---

## Navigation

### Sidebar (Desktop)

- Width: `w-56`
- Structure: Logo → Platform Selector → Nav Items → User Menu
- Section labels: `text-[9px] uppercase tracking-[0.25em] text-editorial-label`
- Nav items: `text-[13px]`, `gap-2.5` between icon and label
- Active state: `border-l-2 border-foreground/60`, full opacity
- Inactive state: `text-sidebar-foreground/40`, no border
- Hover: `text-sidebar-foreground/80`

### Mobile Bottom Nav

- `fixed inset-x-0 bottom-0`, `border-t border-editorial-rule`, `bg-background/90 backdrop-blur-lg`
- Items: `text-[9px] uppercase tracking-[0.15em]`
- Active: `text-foreground`
- Inactive: `text-muted-foreground/50`

---

## Icons

- **Sidebar & navigation:** Custom inline SVGs, `16x16`, `strokeWidth="1.5"`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- **Page content:** `@heroicons/react/24/outline` — `size-4` for inline, `size-5` for standalone
- **No icon library mixing** — custom SVGs for nav, Heroicons for page content

---

## Responsive Breakpoints

| Breakpoint | Usage |
|---|---|
| Default (mobile) | Bottom nav, `px-4 py-8`, single column |
| `lg:` (1024px+) | Sidebar visible, `px-8 py-10`, multi-column grids |

The sidebar is `hidden lg:flex`. Mobile uses fixed bottom nav that is `lg:hidden`.

---

## Radius Scale

Base radius: `0.625rem` (10px)

| Token | Value |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 10px (base) |
| `--radius-xl` | 14px |
| `--radius-2xl` | 18px |

Cards use `rounded-xl`. Buttons use `rounded-md`. Badges use `rounded-full`.

---

## Animation & Motion

| Effect | Implementation |
|---|---|
| Skeleton pulse | `animate-pulse` (Tailwind built-in) |
| Theme transition | `.theme-transitioning *` → 200ms ease on color/bg/border |
| Tab content transition | `opacity-70 transition-opacity` during `isPending` |
| Hover reveal | `.opacity-0 .group-hover:opacity-100 .transition-opacity` |
| Button loading | `animate-spin` on spinner SVG |

---

## File Naming & Organization

| Type | Convention | Example |
|---|---|---|
| Pages | `page.tsx` in route folder | `inspiration/page.tsx` |
| Loading skeletons | `loading.tsx` in route folder | `inspiration/loading.tsx` |
| Tests | Co-located `.test.tsx` | `page.test.tsx` |
| Shared components | `src/components/shared/` | `sidebar.tsx` |
| UI primitives | `src/components/ui/` | `button.tsx`, `skeleton.tsx` |
| Feature components | `src/components/` root | `image-upload-zone.tsx` |
| Design tokens | `src/lib/ui/` | `badge-styles.ts` |
| Style definitions | `src/app/globals.css` | All CSS variables |
