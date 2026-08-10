# AppointIQ

**A lead-to-appointment pipeline for a busy clinic — built on the GoHighLevel API contract, n8n, Vercel, GitHub Actions, and an AI coding agent.**

AppointIQ is a working demonstration for **Mercy Medical Centre**: the moment a patient reaches out on WhatsApp, Facebook or the website, the system scores the lead for urgency and value, drafts a service-specific reply, routes them to the right OB/GYN, and auto-books the next free slot — then hands the clinic staff a dashboard with every decision, message and appointment.

It runs end-to-end with **$0 in subscriptions**: the GoHighLevel transport is a byte-compatible sandbox, and the "AI qualifier" is a deterministic engine that can be swapped for a real LLM behind one interface.

> **Live demo:** deploy in 5 minutes — see [`docs/go-live.md`](docs/go-live.md).
> **Video walkthrough:** [`docs/demo-script.md`](docs/demo-script.md).

---

## Why this exists

Clinics lose money three ways: after-hours leads go cold, no-shows leave empty chairs, and staff spend hours triaging WhatsApp messages by hand. AppointIQ automates the triage and booking part while keeping a human in the loop — the AI drafts, **staff approve**, then WhatsApp sends.

## What it does

| Moment | What happens |
|---|---|
| Patient messages the clinic | Engine scores urgency, treatment value, source, engagement and reachability (0–100, `hot/warm/cold`) |
| Lead is urgent | Clinical red-flag language + `Immediate` urgency **safety-overrides** to `hot`, routed to a 24h slot window |
| Booking intent detected | Next free slot is auto-booked on the right doctor's calendar |
| Reply drafted | Service-specific WhatsApp/SMS copy queued to an outbox for staff approval |
| Patient no-shows | n8n calls `/api/automations/rebook` → next free slot + "sorry we missed you" WhatsApp |
| Leads go quiet | `/api/cron/followups` (Vercel Cron) or n8n sends nurture reminders per `cf_followup_due` |

## The stack — and how each tool is used

This repository is built to be the evidence for the skills it demonstrates:

| Tool | Where it shows |
|---|---|
| **GoHighLevel** | `packages/ghl` — a typed **v2 SDK** with two swappable transports: the real `services.leadconnectorhq.com` API or our GHL-compatible sandbox (`packages/sandbox`). Same routes, payloads and error codes as the platform — workflows, custom fields, calendars, appointments, webhooks all exercised through it. |
| **Claude Code** | The repo is itself an agent-first build: `AGENTS.md` documents the conventions, `docs/build-log.md` the journey. Tests-first for the packages, conventional commits, CI gating every PR. |
| **GitHub** | `.github/workflows/ci.yml` runs typecheck + unit tests + production build on every push/PR. Everything lands via feature branches. |
| **Vercel** | Next.js (App Router) on Vercel, `vercel.json` cron, env-managed mode switch, serverless-friendly store selection (`memory`/`file`/`upstash`). |
| **n8n** | `automations/n8n/` — three importable workflows (lead intake → scoring, no-show → rebook, weekly ops digest) that call the app's automation endpoints with `X-API-Secret`. |

## Architecture

```
                ┌────────────────────────────────────────────┐
 WhatsApp ─────▶│  apps/web  (Next.js on Vercel)            │
 Web form ─────▶│  /                 landing + qualifier     │
 Facebook ─────▶│  /book             public booking          │
                │  /dashboard        ops console             │
                │  /api/*            webhooks, automations,  │
                │                    outbox, cron, demo       │
                └──────┬──────────┬──────────┬───────────────┘
                       │          │          │
        n8n workflows  │          │          │   GHL webhook receiver
        (qualify,      ▼          ▼          ▼
         rebook,  ┌─────────┐ ┌─────────┐ ┌──────────────┐
         digest)  │  @appointiq/engine  │ │ @appointiq/sandbox  │
                  │  scoring·replies·   │ │ GHL-compatible API  │
                  │  routing            │ │ on memory/file/     │
                  │  (LLM stand-in)     │ │ Upstash store       │
                  └─────────┘ └─────────┘ └──────────────┘
                                   │  both implement
                                   ▼
                       @appointiq/ghl  (typed v2 SDK types)
```

`packages/ghl` types are the single source of truth — the SDK, sandbox and engine
all share them, so the GHL contract cannot drift.

## Repo layout

```
apps/web                 Next.js app — pages, API routes, dashboard, theme
packages/ghl             Typed GoHighLevel v2 SDK (live + sandbox transports)
packages/sandbox         GHL-compatible API on a pluggable store
packages/engine          Deterministic scoring, reply drafting, routing
automations/n8n          Three versioned n8n workflow exports + setup notes
docs                     Architecture, go-live/deploy, build log, demo script
.github/workflows        CI: typecheck + tests + build
```

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000  (sandbox auto-seeds Mercy clinic)
```

Then try:
1. **Landing page** — the *Try the qualifier* widget: pick "Urgent — bleeding in pregnancy" and watch the engine score, draft the WhatsApp reply, and book a slot in about a second.
2. **Ops dashboard** (`/dashboard`) — pipeline, calendars, automation runs, and the **Outbox**: AI drafts land as `queued`, hit *Approve & send* to watch them become `sent`.

Production build and quality gates:

```bash
npm run check     # typecheck across all workspaces + web app
npm test          # 33 unit tests (engine, ghl SDK, sandbox)
npm run build     # production build
```

## Going live

Pointing the same code at a real GoHighLevel sub-account is a config change, not a rewrite: set `GHL_MODE=live` + `GHL_API_KEY` + `GHL_LOCATION_ID` in Vercel, create the custom fields/calendars from [`packages/sandbox/src/seed.ts`](packages/sandbox/src/seed.ts), connect WhatsApp, import the n8n workflows. Full runbook in [`docs/go-live.md`](docs/go-live.md).

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design and decisions
- [`docs/go-live.md`](docs/go-live.md) — Vercel deploy + real-GHL cutover
- [`docs/demo-script.md`](docs/demo-script.md) — the 5-minute walkthrough
- [`docs/application-copy.md`](docs/application-copy.md) — copy used across the app
- [`docs/build-log.md`](docs/build-log.md) — the agent-first build journal
- [`AGENTS.md`](AGENTS.md) — working agreements for AI agents in this repo

---

*AppointIQ — no patient message goes unanswered, or un-booked.*
