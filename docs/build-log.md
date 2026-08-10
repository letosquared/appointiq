# Build log

Every capability worth telling the Conek team about, in order.

## 1. Monorepo scaffold
- npm workspaces: `apps/web`, `packages/ghl`, `packages/sandbox`, `packages/engine`.
- Shared strict TS base, prettier, CI-ready scripts (`check`, `test`, `build`).
- `AGENTS.md` documents the repo for any AI agent that joins later — itself a
  demonstration of agent-first development.

## 2. `packages/ghl` — typed GoHighLevel v2 SDK
- One client, two transports: real `services.leadconnectorhq.com` or the
  sandbox. Domain types are the single source of truth.
- Contacts (get/create/upsert/update-custom-fields), tags, calendars +
  free-slot query, appointments (list/get/create), workflow start, webhook
  subscriptions + event log.

## 3. `packages/sandbox` — GHL-compatible API
- Same routes, payload shapes and error codes as real GHL, so the app cannot
  tell sandbox from production.
- Pluggable store: memory / file / Upstash Redis (`Store` interface).
- Nairobi-based slot scheduling; working-day rules; `Africa/Nairobi` tz.
- Mercy Medical seed: 4 doctors, 4 calendars, ~12 realistic patients across
  the funnel, appointments, custom fields, outbox.

## 4. `packages/engine` — deterministic AI lead engine
- `scoreLead` (urgency / treatment value / source / engagement / timing /
  reachability → 0–100, hot/warm/cold), `routeLead` (interest → doctor),
  `draftReply` (tone per tier, service-specific).
- Deterministic + unit-tested: the demo behaviour is not a roll of the dice.

## 5. `apps/web` — public site + ops dashboard (Next.js → Vercel)
- Public booking flow: service → doctor → slot → details → confirmation.
- Ops dashboard: overview stats, pipeline kanban, calendar, automation runs,
  WhatsApp outbox, webhook health — all live from the store.
- Mercy Medical branding: coral `#ed5463` + deep teal `#224859`, Poppins +
  Rubik, real logo.

## 6. API routes + cron
- `/api/proxy/[...path]` — thin GHL proxy so the browser never holds keys.
- `/api/webhooks/ghl` — signature-verified webhook receiver (authentic path).
- `/api/automations/qualify`, `/api/automations/rebook` — n8n targets.
- `/api/dashboard`, `/api/outbox`, `/api/catalog`, `/api/book`, `/api/demo/*`.
- `/api/cron/followups` — Vercel Cron reminder sweep.

## 7. n8n workflows (JSON exports)
- Lead intake → score → route; no-show → auto rebook + WhatsApp; weekly ops
  digest. See `automations/n8n/README.md`.

## 8. CI
- GitHub Actions: typecheck + tests + production build on push/PR.

## 9. Docs
- `architecture.md` (dual-path automation, storage, deployment),
  `go-live.md` (real-GHL cutover + Vercel deploy guide), this log, demo script.

## 10. Clinical-safety scoring
- Red-flag language (bleeding / severe / emergency…) can never score a lead
  `cold`; combined with `Immediate` urgency it **safety-overrides to `hot`**.
- Hot leads route to a 24h booking window instead of 72h.
- Booking-intent regex tightened so a bare "please send price list" no longer
  triggers an auto-booking.

## 11. Human-in-the-loop outbox
- Replies are queued as `queued` (awaiting clinic approval), not `sent`.
- New `POST /api/outbox/send` "Approve & send" flips the queue to `sent`;
  dashboard Outbox tab ships the button.

## 12. Landing-page live qualifier
- `Try the qualifier` widget on `/`: pick a scenario (urgent bleeding / booking /
  IVF enquiry / cold price list), the real pipeline runs it, and the result
  renders as a WhatsApp-style chat — score, tier, safety reasons, routed
  calendar, auto-booked slot, and the drafted reply.
- Engine run records now carry `reasons` and the drafted `reply`.

## 13. README + deploy runbook
- Root `README.md` maps the repo to the GHL / Claude Code / GitHub / Vercel /
  n8n skill set (job-application evidence).
- `docs/go-live.md` gains a 5-minute Vercel deploy guide (zero-env start,
  Upstash for persistence, cron, verification steps).

## Test status
- `packages/engine`: 13 unit tests (scoring incl. safety overrides, routing
  windows, replies).
- `packages/sandbox`: GHL-contract tests (contacts, slots, appointments, tags).
- `apps/web`: typecheck via `tsc --noEmit`; production build green. Total: 33.
