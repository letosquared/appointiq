# Application copy

For the Conek application / interview — short answers grounded in this repo.

## Why this project?

Because it is the whole Conek job in miniature: a Nairobi clinic losing leads
to a slow front desk, and a system that answers, scores, books, follows up,
and reports — on the GoHighLevel stack, delivered as a real product instead of
a deck.

## The five areas, covered for real

### 1. GoHighLevel (GHL)
- `packages/ghl`: a typed GHL v2 SDK — contacts, custom fields, tags,
  calendars/free-slots, appointments, workflows, webhook subscriptions.
- `packages/sandbox`: a GHL-compatible API with the same routes, payload
  shapes and error codes, so the demo needs no live sub-account or API key.
- `GHL_MODE=sandbox|live` flips to real HighLevel with zero code changes
  (`docs/go-live.md`).

### 2. Claude Code
- This repository was built with an AI coding agent as the primary author —
  including `AGENTS.md`, which tells any future agent how to build, test and
  extend it. The commit history, build log and tests document the workflow.

### 3. GitHub
- Clean conventional commits, feature-branch-friendly layout, GitHub Actions
  CI (typecheck + 29 unit tests + production build) on every push/PR.

### 4. Vercel
- Next.js App Router app deployed to Vercel: public booking site, ops
  dashboard, and every API route (proxy, webhook receiver, automations, cron).

### 5. n8n
- Three versioned workflows as JSON: lead intake → score → route, no-show →
  auto-rebook + WhatsApp, and a weekly ops digest. Full import docs.

## What the demo shows a real client

- A patient who messages on WhatsApp with an urgent, bookable need gets
  scored **hot**, a drafted human reply, and an **auto-booked** slot — in one
  run, live on the dashboard.
- The clinic sees the receipt: pipeline, calendar, outbox, webhook health.
- The whole thing runs for $0/month and can be pointed at their real GHL
  sub-account in an afternoon.

## Numbers

- 3 packages + 1 app, ~2k lines across engine/sdk/sandbox/web.
- 29 unit/contract tests green; production build green; CI enforced.
- 3 n8n workflows, 4 doctor calendars, 12+ seeded patient journeys.

## One-liner

> "I built a patient-automation product for a Nairobi clinic on the full
> GoHighLevel stack — SDK, sandbox, scoring engine, booking site, dashboard,
> n8n and CI — with tests, docs, and a demo that costs nothing to run."
