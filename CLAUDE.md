# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Always Plan Before Coding

**You MUST enter plan mode (using `EnterPlanMode`) before writing ANY code.** This is non-negotiable. No matter how simple the task appears, always plan first:

1. **Enter plan mode** — Explore the codebase, understand the context, and design the approach.
2. **Get user approval** — Present the plan and wait for explicit approval via `ExitPlanMode`.
3. **Then implement** — Only write code after the plan is approved.

The only exceptions are trivial single-line fixes (typos, obvious one-character bugs) where the change is unambiguous. When in doubt, plan first.

## CRITICAL: Test-Driven Development (TDD)

**You MUST follow TDD for all implementation work.** The cycle is:

1. **Red** — Write a failing test first that describes the expected behavior.
2. **Green** — Write the minimum code necessary to make the test pass.
3. **Refactor** — Clean up the code while keeping all tests green.

Rules:
- **Never write production code without a failing test first.** If there's no test, write one before touching the implementation.
- Tests go alongside the code they test (e.g., `Component.test.tsx` next to `Component.tsx`).
- Run tests after each step to confirm the red/green/refactor cycle.
- When fixing bugs, first write a test that reproduces the bug, then fix it.
- The plan (from plan mode) should include what tests will be written and what they will assert.

## Build & Development Commands

- `npm run dev` — Start dev server (http://localhost:3000) with HMR
- `npm run build` — Production build
- `npm start` — Start production server
- `npm run lint` — Run ESLint (uses flat config format, ESLint v9+)

## Architecture

This is a **Next.js 16.1.6** project using the **App Router** (`src/app/`), **React 19**, **TypeScript** (strict mode), and **Tailwind CSS v4**.

### Key Technical Choices

- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts) — automatic memoization, no need for manual `useMemo`/`useCallback`
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: Tailwind v4 via `@tailwindcss/postcss` — utilities applied directly in JSX, dark mode via `prefers-color-scheme` media query, CSS variables for theme colors (`--background`, `--foreground`)
- **Fonts**: Geist font family loaded via `next/font/google` with CSS custom properties (`--font-geist-sans`, `--font-geist-mono`)
- **ESLint**: Extends `next/core-web-vitals` and `next/typescript` configs

## Skills & Agents

### Skills (invoke with `/skill-name`)

- **`/frontend-design`** — Always use when building or modifying UI (pages, components, layouts, or any visual elements). This is a fresh app, so every UI task should go through this skill to ensure high design quality from the start.
- **`/react-best-practices`** — Use when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns (components, data fetching, bundle optimization).
- **`/ui-design-system`** — Use for creating design systems, design tokens, component documentation, responsive design calculations, and developer handoff.
- **`/git-commit-helper`** — Use when committing code to generate descriptive commit messages from git diffs.
- **`/keybindings-help`** — Use when customizing keyboard shortcuts or modifying keybindings.

### Agents (used automatically via Task tool)

- **nextjs-architecture-expert** — Use proactively for Next.js architecture decisions, App Router patterns, Server Components, and performance optimization.
- **Explore** — Use for codebase exploration, finding files by pattern, and searching code for keywords.
- **Plan** — Use for designing implementation strategies and step-by-step plans for complex tasks.
