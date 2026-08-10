# AGENTS.md

Guidelines for AI coding agents (opencode / Claude Code / Cursor) working in this repo.
This file exists because this repository is itself a demonstration of agent-first
development — the project for the application was scaffolded and shipped with an
AI coding agent as the primary author.

## Repo layout

- `apps/web` — Next.js (App Router) application deployed to Vercel. Hosts the public
  booking site, the ops dashboard, and every API route (GHL proxy, webhook receiver,
  automations, cron).
- `packages/ghl` — the typed GoHighLevel v2 SDK. One client, two transports: it talks
  to the real HighLevel API (`services.leadconnectorhq.com`) or to our GHL-compatible
  sandbox. This package must never import anything from `apps/web`.
- `packages/sandbox` — a GHL-compatible API: the same routes, payload shapes and error
  codes as the real platform, implemented against a pluggable store (memory / file /
  Upstash Redis). This is the "GHL clone" that makes the demo run with $0 subscriptions.
- `automations/n8n` — n8n workflows, versioned as JSON exports, plus import/setup docs.
- `docs` — architecture, go-live guide, demo script, application copy.

## Build commands

```bash
npm install
npm run check    # typecheck (root tsconfig + web app)
npm test         # unit tests for packages/ghl and packages/sandbox
npm run build    # production build of the web app
npm run dev      # run the web app locally (http://localhost:3000)
```

## Conventions

- TypeScript, strict mode. No `any` except at explicitly marked transport boundaries.
- Domain types live in `packages/ghl/src/types.ts` and are the single source of truth
  for GHL payload shapes. The sandbox reuses the same types so the contract cannot drift.
- Storage is behind the `Store` interface in `packages/sandbox/src/store.ts`. New
  backends implement the interface; they do not touch business logic.
- The GHL client is constructed with a `transport`. In `apps/web` the server-side
  singleton (`lib/ghl.ts`) picks `sandbox` vs `live` from `GHL_MODE` — never hardcode.
- Dates/times: store everything as UTC ISO strings; format for display at the edge.
  Slot math lives only in `packages/sandbox/src/schedule.ts` (single source of truth).
- All changes land via feature branches and PRs; CI runs typecheck + tests + build.
- No secrets in code. Env vars are listed in `.env.example`.

## Agent-first workflow (what we are demonstrating)

- Write a failing test first for behaviour changes in `packages/*`, then implement.
- Commit in small, conventional-commit messages (`feat:`, `fix:`, `test:`, `docs:`).
- Update this file and the build log (`docs/build-log.md`) when you add a capability
  worth telling the Conek team about.
- Run `npm run check` and `npm test` before opening a PR.
