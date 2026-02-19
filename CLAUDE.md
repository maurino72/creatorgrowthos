# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow: Plan vs Execute

- **When the user provides a detailed plan or PRD** — Skip plan mode. Go straight to implementation: create task tracking, explore the codebase for context, then execute task-by-task following TDD.
- **When requirements are ambiguous or open-ended** — Ask clarifying questions first, then enter plan mode (`EnterPlanMode`) to design the approach before coding.
- **Trivial fixes** (typos, one-line bugs) — Just do it directly.

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

### Realistic Mocks

**Mocks MUST replicate real service behavior, including error cases.** A mock that always succeeds hides production bugs.

- **Default to failure, not success.** Mock methods should return errors by default (e.g., Supabase `.single()` → PGRST116 error for 0 rows). Tests explicitly override to success only for the paths they exercise. This way, if production code calls the wrong method, the test breaks.
- **Separate chains per query.** When a function makes multiple DB calls (e.g., upsert then fallback select), use separate mock chains via `mockReturnValueOnce()` — not one shared object for all calls. Each query in production gets its own builder; tests should mirror that.
- **Assert which methods were called.** Don't just check the return value — verify the code used the right Supabase method (e.g., `expect(chain.maybeSingle).toHaveBeenCalled()` + `expect(chain.single).not.toHaveBeenCalled()`).
- **Test both paths of conditional flows.** If code has a fallback (try A, if null do B), write tests for both: A succeeds, and A returns null → B succeeds.
- **Test error propagation.** Every external call that can fail should have a test asserting the error is thrown/handled correctly.

## Commit Rules

- **NEVER include `Co-Authored-By` lines in commit messages.** No AI attribution footers of any kind.
- Follow conventional commits format (`type(scope): description`).
- Use the `/git-commit-helper` skill when committing.

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

## CRITICAL: Always Use the Right Skill

**You MUST invoke the matching skill BEFORE writing any code.** This is non-negotiable. Every time you write or modify code, check which skill applies and invoke it first:

- **Writing UI** (pages, components, layouts, any visual elements) → invoke `/frontend-design` FIRST
- **Writing React/Next.js logic** (components, data fetching, hooks, optimization) → invoke `/react-best-practices` FIRST
- **Creating design systems, tokens, or responsive calculations** → invoke `/ui-design-system` FIRST
- **Committing code** → invoke `/git-commit-helper` FIRST

Skipping the relevant skill is a mistake. When in doubt, invoke it.

### All Skills (invoke with `/skill-name`)

- **`/frontend-design`** — UI pages, components, layouts, visual elements
- **`/react-best-practices`** — React/Next.js code patterns, performance, data fetching
- **`/ui-design-system`** — Design systems, tokens, component docs, responsive design
- **`/git-commit-helper`** — Commit message generation from diffs
- **`/keybindings-help`** — Keyboard shortcut customization

### Agents (used automatically via Task tool)

- **nextjs-architecture-expert** — Next.js architecture decisions, App Router, Server Components, performance
- **Explore** — Codebase exploration, file search, keyword search
- **Plan** — Implementation strategies and step-by-step plans
