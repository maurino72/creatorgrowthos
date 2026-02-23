# PostIQ — Project Structure

```
postiq/
├── CLAUDE.md
├── README.md
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
│
├── e2e/                                        # Playwright E2E tests
├── public/                                     # Static assets
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260205000000_insights_experiments.sql
│       ├── 20260205000001_storage_post_media.sql
│       ├── 20260205000002_platform_media_urls.sql
│       ├── 20260206000000_onboarding.sql
│       ├── 20260206000001_settings.sql
│       ├── 20260211000000_multi_niche_goals.sql
│       ├── 20260211000001_posts_tags.sql
│       ├── 20260218000000_subscriptions_usage.sql
│       ├── 20260219000000_mentions_platform_filter.sql
│       ├── 20260219000001_linkedin_platform.sql
│       ├── 20260220000000_analytics_tables.sql
│       └── 20260223000000_inspiration_cards.sql
│
└── src/
    ├── middleware.ts
    │
    ├── types/
    │   └── database.ts                         # Supabase generated types
    │
    ├── test/
    │   ├── setup.ts                            # Vitest global setup
    │   └── smoke.test.ts
    │
    ├── components/
    │   ├── providers.tsx                        # QueryClient + Theme providers
    │   ├── theme-provider.tsx
    │   ├── image-upload-zone.tsx                # Drag-drop image uploads
    │   ├── mention-input.tsx                    # @mention autocomplete
    │   ├── tag-input.tsx                        # Hashtag input + AI suggestions
    │   ├── poll-builder.tsx                     # Poll option builder
    │   ├── quote-tweet-input.tsx                # Quote tweet URL input
    │   ├── reply-settings-select.tsx            # Reply permission selector
    │   ├── alt-text-dialog.tsx                  # Image alt text modal
    │   ├── thread-composer.tsx                  # Multi-tweet thread editor
    │   ├── shared/
    │   │   ├── atmospheric-background.tsx       # Mesh gradient + grain overlay
    │   │   ├── header.tsx
    │   │   ├── logo.tsx
    │   │   ├── platform-icon.tsx               # Platform SVG icons
    │   │   ├── platform-selector.tsx           # Platform dropdown
    │   │   ├── sidebar.tsx                     # App navigation sidebar
    │   │   └── upgrade-prompt.tsx              # Subscription upgrade CTA
    │   └── ui/
    │       ├── avatar.tsx
    │       ├── button.tsx                      # Button with coral variant + loading
    │       ├── card.tsx
    │       ├── dropdown-menu.tsx
    │       └── skeleton.tsx
    │
    ├── lib/
    │   ├── utils.ts                            # cn() classname merge
    │   ├── platform-slug.ts                    # Platform ↔ slug mapping
    │   ├── urls.ts                             # Type-safe URL builders (appUrl.*)
    │   │
    │   ├── adapters/                           # Platform API adapters
    │   │   ├── types.ts                        # PlatformAdapter interface
    │   │   ├── index.ts                        # Adapter registry factory
    │   │   ├── capabilities.ts                 # Per-platform feature flags
    │   │   ├── platform-config.ts              # Char limits, media rules per platform
    │   │   ├── twitter.ts                      # X/Twitter adapter (OAuth, publish, metrics, media)
    │   │   └── linkedin.ts                     # LinkedIn adapter (OAuth, publish, metrics)
    │   │
    │   ├── ai/                                 # AI schemas, prompts, types
    │   │   ├── client.ts                       # OpenAI wrapper (chatCompletion, extractJsonPayload)
    │   │   ├── prompts.ts                      # All prompt builders (classify, ideas, improve, insights, inspiration, etc.)
    │   │   ├── taxonomy.ts                     # Content intents, types, topic normalization
    │   │   ├── ideas.ts                        # Content idea schemas
    │   │   ├── insights.ts                     # Insight type/confidence/status schemas
    │   │   ├── inspiration.ts                  # Inspiration card schemas (formats, statuses, saved types)
    │   │   ├── experiments.ts                  # Experiment suggestion schemas
    │   │   ├── improvement.ts                  # Content improvement schemas
    │   │   ├── hashtags.ts                     # Hashtag suggestion schemas
    │   │   ├── mentions.ts                     # Mention suggestion schemas
    │   │   └── trending.ts                     # Trending topic schemas
    │   │
    │   ├── hooks/
    │   │   └── use-platform.ts                 # Platform context from URL + connections
    │   │
    │   ├── inngest/                            # Background job system
    │   │   ├── client.ts                       # Inngest instance with typed events
    │   │   ├── events.ts                       # 17+ event type definitions
    │   │   ├── send.ts                         # Fire-and-forget event send helpers
    │   │   └── functions/
    │   │       ├── index.ts                    # Function registry
    │   │       ├── publish-scheduled-post.ts   # Scheduled post publishing
    │   │       ├── metrics.ts                  # Metric fetching (throttled)
    │   │       ├── analytics.ts                # Analytics snapshot collection
    │   │       ├── classify.ts                 # AI post classification
    │   │       ├── insights.ts                 # Weekly insight generation
    │   │       ├── connections.ts              # Token refresh + expiry check
    │   │       └── cleanup-media.ts            # Orphan media cleanup
    │   │
    │   ├── queries/                            # React Query hooks
    │   │   ├── query-client.ts                 # QueryClient config
    │   │   ├── prefetch.ts                     # Hover prefetch helpers
    │   │   ├── user.ts                         # useCurrentUser
    │   │   ├── posts.ts                        # CRUD + publish + classify hooks
    │   │   ├── metrics.ts                      # Post metrics + dashboard hooks
    │   │   ├── analytics.ts                    # Analytics overview + followers + posts
    │   │   ├── connections.ts                  # useConnections, useDisconnect
    │   │   ├── insights.ts                     # useInsights, generate, dismiss, act
    │   │   ├── inspiration.ts                  # useInspirationFeed, refresh, save, dismiss, library
    │   │   ├── experiments.ts                  # useExperiments, suggest, accept, dismiss
    │   │   ├── ai.ts                           # useGenerateIdeas, useImproveContent, useSuggestHashtags
    │   │   ├── media.ts                        # useUploadMedia, useDeleteMedia, useSignedUrls
    │   │   ├── billing.ts                      # useSubscription, useUsage, useCheckout, usePortal
    │   │   ├── settings.ts                     # useCreatorProfile, usePreferences
    │   │   ├── onboarding.ts                   # useOnboardingStatus
    │   │   └── threads.ts                      # Thread query hooks
    │   │
    │   ├── services/                           # Business logic layer
    │   │   ├── posts.ts                        # Post CRUD + status transitions
    │   │   ├── publishing.ts                   # Multi-platform publish pipeline
    │   │   ├── metrics.ts                      # Metric events + dashboard aggregation
    │   │   ├── metric-snapshots.ts             # Daily metric snapshots
    │   │   ├── follower-snapshots.ts           # Follower count tracking
    │   │   ├── connections.ts                  # OAuth connection management
    │   │   ├── classification.ts               # AI post classification pipeline
    │   │   ├── aggregation.ts                  # Performance data aggregation (InsightContext)
    │   │   ├── insights.ts                     # AI insight generation + management
    │   │   ├── inspiration.ts                  # Inspiration cards (generate, feed, save, dismiss, library, rate limit)
    │   │   ├── ideation.ts                     # AI content idea generation
    │   │   ├── improvement.ts                  # AI content improvement
    │   │   ├── experiments.ts                  # Experiment suggestion + management
    │   │   ├── hashtags.ts                     # AI hashtag suggestions
    │   │   ├── mentions.ts                     # AI mention suggestions
    │   │   ├── trending.ts                     # Trending topic fetching
    │   │   ├── media.ts                        # Image upload/delete/signed URLs (Supabase Storage)
    │   │   ├── media-metadata.ts               # Image dimension/format validation
    │   │   ├── polls.ts                        # Poll CRUD
    │   │   ├── threads.ts                      # Thread management
    │   │   ├── post-editing.ts                 # Post edit logic
    │   │   ├── import.ts                       # Twitter post import
    │   │   ├── profiles.ts                     # Creator profile management
    │   │   ├── settings.ts                     # User settings/preferences
    │   │   ├── ai-logs.ts                      # AI usage logging
    │   │   ├── subscriptions.ts                # Subscription management
    │   │   ├── usage.ts                        # Usage tracking + enforcement
    │   │   └── starter-ideas.ts                # Onboarding starter ideas
    │   │
    │   ├── stripe/
    │   │   ├── client.ts                       # Stripe SDK singleton
    │   │   └── plans.ts                        # Plan tiers, pricing, limits
    │   │
    │   ├── supabase/
    │   │   ├── admin.ts                        # createAdminClient (service role)
    │   │   ├── client.ts                       # createBrowserClient
    │   │   ├── middleware.ts                    # Auth middleware
    │   │   └── server.ts                       # createClient (server, cookie-based auth)
    │   │
    │   ├── ui/
    │   │   └── badge-styles.ts                 # Semantic badge color utilities
    │   │
    │   ├── utils/
    │   │   ├── cache.ts                        # TTLCache utility
    │   │   ├── encryption.ts                   # Token encrypt/decrypt (AES-256-GCM)
    │   │   ├── format.ts                       # formatNumber, formatEngagementRate, formatTimeAgo
    │   │   ├── pkce.ts                         # PKCE code challenge generation
    │   │   ├── rate-limit.ts                   # Rate limit utility
    │   │   └── twitter-char-count.ts           # Twitter character counting (URL expansion)
    │   │
    │   └── validators/                         # Zod request validators
    │       ├── billing.ts
    │       ├── inspiration.ts
    │       ├── media.ts
    │       ├── mentions.ts
    │       ├── onboarding.ts
    │       ├── polls.ts
    │       ├── posts.ts
    │       ├── reply-settings.ts
    │       ├── settings.ts
    │       ├── tags.ts
    │       └── threads.ts
    │
    └── app/
        ├── layout.tsx                          # Root layout (fonts, metadata, providers)
        ├── globals.css                         # Tailwind v4 + design tokens
        ├── page.tsx                            # Landing / redirect
        │
        ├── auth/
        │   └── callback/route.ts               # Supabase auth callback
        │
        ├── (auth)/
        │   ├── layout.tsx
        │   └── login/page.tsx                  # Login page
        │
        ├── (legal)/
        │   ├── layout.tsx
        │   ├── privacy/page.tsx
        │   └── terms/page.tsx
        │
        ├── onboarding/
        │   ├── layout.tsx
        │   └── page.tsx                        # Multi-step onboarding wizard
        │
        ├── pricing/
        │   ├── layout.tsx
        │   └── page.tsx                        # Plan selection (3 tiers, monthly/annual)
        │
        ├── (app)/                              # Authenticated app shell
        │   ├── layout.tsx                      # Sidebar + header layout
        │   │
        │   ├── connections/
        │   │   ├── page.tsx                    # Platform connection management
        │   │   └── loading.tsx
        │   │
        │   ├── settings/
        │   │   ├── page.tsx                    # Profile + preferences
        │   │   ├── loading.tsx
        │   │   └── billing/page.tsx            # Subscription + usage + invoices
        │   │
        │   └── [platform]/                     # Dynamic platform routes (x, linkedin)
        │       ├── layout.tsx                  # Platform context provider
        │       │
        │       ├── dashboard/
        │       │   ├── page.tsx                # Overview: metrics, insights, top posts
        │       │   ├── charts.tsx              # Dashboard chart components
        │       │   └── loading.tsx
        │       │
        │       ├── content/
        │       │   ├── page.tsx                # Post list (status tabs, filters)
        │       │   ├── loading.tsx
        │       │   ├── new/
        │       │   │   ├── page.tsx            # Post editor (body, tags, media, schedule, ideas)
        │       │   │   ├── loading.tsx
        │       │   │   └── thread/
        │       │   │       ├── page.tsx        # Thread composer
        │       │   │       └── loading.tsx
        │       │   └── [id]/edit/
        │       │       ├── page.tsx            # Post edit (metrics, classification, improve)
        │       │       └── loading.tsx
        │       │
        │       ├── analytics/
        │       │   ├── page.tsx                # Analytics dashboard (overview, charts, heatmap)
        │       │   ├── charts.tsx              # Recharts line/bar components
        │       │   ├── best-time-heatmap.tsx   # Post timing heatmap
        │       │   ├── content-breakdown.tsx   # Content type breakdown
        │       │   ├── loading.tsx
        │       │   └── [id]/
        │       │       ├── page.tsx            # Individual post analytics
        │       │       ├── chart.tsx
        │       │       └── loading.tsx
        │       │
        │       ├── insights/
        │       │   ├── page.tsx                # AI insights (status + type tabs)
        │       │   └── loading.tsx
        │       │
        │       ├── inspiration/
        │       │   ├── page.tsx                # Inspiration feed (niche filters, refresh, cards)
        │       │   ├── loading.tsx
        │       │   └── library/
        │       │       ├── page.tsx            # Saved inspiration (type filter tabs)
        │       │       └── loading.tsx
        │       │
        │       └── experiments/
        │           ├── page.tsx                # Experiment suggestions (status tabs)
        │           └── loading.tsx
        │
        └── api/
            ├── inngest/route.ts                # Inngest webhook endpoint
            │
            ├── posts/
            │   ├── route.ts                    # GET (list) + POST (create)
            │   ├── metrics/latest-batch/route.ts
            │   └── [id]/
            │       ├── route.ts                # GET + PATCH + DELETE
            │       ├── edit/route.ts
            │       ├── publish/route.ts        # POST publish
            │       ├── repost/route.ts
            │       ├── classify/route.ts       # POST AI classify
            │       ├── classifications/route.ts # PATCH update classifications
            │       └── metrics/
            │           ├── route.ts            # GET metric events
            │           ├── latest/route.ts     # GET latest metrics
            │           └── refresh/route.ts    # POST refresh metrics
            │
            ├── threads/
            │   ├── route.ts                    # GET + POST
            │   └── [id]/
            │       ├── route.ts                # GET + PATCH + DELETE
            │       └── publish/route.ts
            │
            ├── connections/
            │   ├── route.ts                    # GET all connections
            │   ├── twitter/
            │   │   ├── route.ts                # GET (auth URL) + DELETE
            │   │   ├── callback/route.ts       # OAuth callback
            │   │   └── refresh/route.ts        # Token refresh
            │   └── linkedin/
            │       ├── route.ts                # GET (auth URL) + DELETE
            │       ├── callback/route.ts
            │       └── refresh/route.ts
            │
            ├── insights/
            │   ├── route.ts                    # GET insights
            │   ├── generate/route.ts           # POST generate
            │   └── [id]/
            │       ├── dismiss/route.ts        # PATCH dismiss
            │       └── acted/route.ts          # PATCH mark acted
            │
            ├── inspiration/
            │   ├── route.ts                    # GET feed
            │   ├── refresh/route.ts            # POST generate cards
            │   ├── library/route.ts            # GET saved library
            │   └── [id]/
            │       ├── save/route.ts           # PATCH save to library
            │       └── dismiss/route.ts        # PATCH dismiss
            │
            ├── experiments/
            │   ├── route.ts                    # GET + POST suggest
            │   └── [id]/
            │       ├── accept/route.ts
            │       └── dismiss/route.ts
            │
            ├── ai/
            │   ├── ideas/route.ts              # POST generate ideas
            │   ├── improve/route.ts            # POST improve content
            │   ├── hashtags/route.ts           # POST suggest hashtags
            │   └── mentions/route.ts           # POST suggest mentions
            │
            ├── analytics/
            │   ├── overview/route.ts           # GET analytics overview
            │   ├── followers/route.ts          # GET follower data
            │   ├── refresh/route.ts            # POST refresh analytics
            │   └── posts/
            │       ├── route.ts                # GET post analytics list
            │       └── [id]/route.ts           # GET individual post analytics
            │
            ├── dashboard/metrics/
            │   ├── route.ts                    # GET dashboard metrics
            │   ├── top/route.ts                # GET top posts
            │   └── timeseries/route.ts         # GET timeseries data
            │
            ├── media/
            │   ├── upload/route.ts             # POST image upload
            │   ├── signed-urls/route.ts        # POST get signed URLs
            │   └── [id]/route.ts               # DELETE image
            │
            ├── import/twitter/route.ts         # POST import tweets
            │
            ├── billing/
            │   ├── checkout/route.ts           # POST create Stripe checkout
            │   ├── portal/route.ts             # POST create billing portal
            │   ├── subscription/route.ts       # GET subscription status
            │   ├── usage/route.ts              # GET usage data
            │   ├── invoices/route.ts           # GET invoice history
            │   └── upgrade/route.ts            # POST upgrade plan
            │
            ├── webhooks/stripe/route.ts        # Stripe webhook handler
            │
            ├── onboarding/
            │   ├── route.ts                    # GET onboarding status
            │   ├── profile/route.ts            # POST save creator profile
            │   ├── ideas/route.ts              # POST generate starter ideas
            │   └── complete/route.ts           # POST mark onboarding complete
            │
            ├── settings/
            │   ├── route.ts                    # GET settings
            │   ├── profile/route.ts            # PATCH update profile
            │   ├── preferences/route.ts        # PATCH update preferences
            │   ├── creator-profile/route.ts    # GET + PATCH creator profile
            │   ├── delete-account/route.ts     # DELETE account
            │   └── export/route.ts             # GET data export
            │
            └── admin/
                └── backfill-metrics/route.ts   # POST backfill historical metrics
```
