# Architecture

AppointIQ is a clinic-automation demonstration for **Mercy Medical Centre**
(Kaunda Street, Nairobi) built on the **GoHighLevel stack**. It shows the full
pattern a Conek-style agency delivers: a public booking site, an AI lead
engine, a real-time ops dashboard, and automation — with **zero subscription
costs** because every GoHighLevel dependency is backed by a GHL-compatible
sandbox.

## Repository layout

| Path | Role |
|---|---|
| `apps/web` | Next.js (App Router) app → Vercel. Public booking site, ops dashboard, all API routes. |
| `packages/ghl` | Typed GoHighLevel v2 SDK. One client, two transports (real `services.leadconnectorhq.com` or sandbox). |
| `packages/sandbox` | GHL-compatible API: same routes, payload shapes and error codes as real GHL, on a pluggable store (memory / file / Upstash Redis). |
| `packages/engine` | Heuristic lead engine: scoring, reply drafting, routing. Deterministic, testable, no API keys. |
| `automations/n8n` | n8n workflows versioned as JSON + import/setup docs. |
| `docs` | This file, the go-live guide, the build log, demo script. |

## Dual path to automation

```
                 ┌──────────────┐   GHL webhook   ┌──────────────┐
  WhatsApp/FB/   │  GoHighLevel │ ───────────────►│  n8n (real)  │──┐
  Google/Website │  (or sandbox)│                  └──────────────┘  │
                 └──────┬───────┘                                    │
                        │ ContactCreated / AppointmentStatusChanged  │
                        ▼                                            ▼
                 ┌──────────────┐   same secret,   ┌──────────────┐  │
                 │ /api/webhooks│   same contract  │ /api/auto-   │  │
                 │   /ghl       │ ─────────────────► mations/     │◄─┘
                 └──────────────┘                  │ qualify,     │
                                                   │ rebook       │
                                                   └──────┬───────┘
                                                          ▼
                                               ┌─────────────────────┐
                                               │  packages/engine     │
                                               │  score + route +     │
                                               │  draft reply         │
                                               └─────────────────────┘
```

Two triggers run the *same* pipeline:

1. **Authentic path** — GHL (or the sandbox) fires a webhook to
   `/api/webhooks/ghl` (signature-verified), which runs `runLeadPipeline`.
2. **Orchestrator path** — n8n listens to GHL webhooks and calls
   `/api/automations/qualify` or `/api/automations/rebook` with the shared
   `X-API-Secret`. The in-dashboard "Simulate inbound lead" button calls the
   same routes, so the demo is honest: it exercises production code paths.

## The pipeline (`apps/web/lib/automation.ts`)

1. Load the contact from GHL (real or sandbox transport).
2. `scoreLead` — urgency, treatment value, source weight, message engagement,
   response timing, reachability → 0–100 + tier (hot/warm/cold).
3. `routeLead` — maps treatment interest → doctor calendar.
4. `draftReply` — writes a warm, service-specific reply and picks a channel.
5. Writes `cf_lead_score`, `cf_lead_stage`, `cf_followup_due` and tags back.
6. Enqueues the reply in the simulated WhatsApp/SMS outbox.
7. If the patient asked to book, books the next free slot on the routed
   calendar and moves the contact to **Booked**.
8. Records the run → visible live on `/dashboard` and `/`.

## Storage

- The `Store` interface (`packages/sandbox/src/store.ts`) has three backends:
  `memory`, `file`, and `upstash` (Redis). The web app defaults to file-backed
  data under `.sandbox-data/` so state survives restarts and is shared between
  API routes. Switch to `upstash` for a multi-instance deployment.
- Slot math lives only in `packages/sandbox/src/schedule.ts`.

## Deployment

- `apps/web` → Vercel (static + serverless). `vercel.json` pins the build.
- Vercel Cron (`/api/cron/followups`) runs the follow-up reminder sweep.
- See `docs/go-live.md` to switch the transport from sandbox to real GoHighLevel.
