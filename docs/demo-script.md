# Loom walkthrough script (~4–5 min)

Pitch: "I built a complete clinic-automation product on the GoHighLevel stack —
and it runs with $0 subscriptions because every GHL dependency is backed by a
compatible sandbox. Here's the tour."

Setup for the video:

- Use the **local dev server** (`npm run dev`, `SANDBOX_STORE=file` in
  `apps/web/.env.local`) so demo data persists and the flow is smooth.
- Restart the app first so you start with a clean-ish story, or hit
  `/api/demo/reset` before recording.
- Full-screen the browser, zoom to ~110%, and record at 1080p.

## 0–30s — Hook

> "Mercy Medical Centre in Nairobi is losing patients the same way every busy
> clinic does: leads message on WhatsApp and the phone rings off the hook.
> I built the system that answers, scores and books them automatically — and a
> dashboard where the clinic sees every decision live. No patient message goes
> unanswered, or un-booked."

Scroll the landing page: Mercy branding, then stop at the **Try the qualifier**
widget.

## 30–70s — The qualifier, live (the wow)

Click **"Urgent — bleeding in pregnancy"**.
Show the result appear in the WhatsApp-style chat:

- Patient bubble: *"Hi, I am bleeding and very worried…"*
- Score chip **68**, tier **hot**, **auto-booked** badge
- The drafted WhatsApp reply bubble on the green side
- The reason chips, including the headline: *"clinical red-flag + Immediate
  urgency — safety override to hot"*

> "Watch the red one. The score alone is 68 — warm by the numbers. But because
> the message describes bleeding and the intake says Immediate, the engine
> safety-overrides to **hot**: this patient cannot be treated as routine. It
> routed her to Dr. Mwangi's antenatal calendar and booked the next free slot —
> all in about a second. And a cold 'just send me the price list' lead? It stays
> cold and just gets nurtured."

## 70–120s — Ops dashboard: the receipt

Open `/dashboard`. Walk the tabs:

1. **Overview** — stats, pipeline, sources, latest automation runs.
2. **Outbox** — show the drafted reply sitting as **`queued`**.
   Hit **"Approve & send"** and watch it flip to **`sent`**.
   > "The AI drafts, the clinic approves, WhatsApp sends. Human in the loop —
   > that's non-negotiable for a medical practice, so I built it that way."
3. **Calendar** — the new booking on Dr. Mwangi's calendar with Nairobi hours.
4. **Webhooks** — the GHL webhook outbox showing delivered events.

## 120–200s — Under the hood (three beats)

1. **Dual-path automation**: a GHL `ContactCreated` event goes either straight to
   the app's webhook receiver (`/api/webhooks/ghl`, in-process) or through n8n →
   `/api/automations/qualify`. Same pipeline either way — show
   `apps/web/lib/automation.ts`.
2. **The sandbox**: open `packages/ghl` and `packages/sandbox` — a typed v2 SDK
   with two transports, and a GHL-compatible API on memory/file/Redis storage.
   `GHL_MODE=sandbox|live` flips the whole demo to the real platform with zero
   code changes.
3. **No-show → rebook**: open `automations/n8n/02-noshow-rebook.json` and the
   `/api/automations/rebook` route.
   > "When a patient misses an appointment, n8n sees the no-show, finds the next
   > free slot, rebooks them, and queues a WhatsApp apology."

## 200–260s — Quality gates

Split-screen or quick cuts:

- `npm test` → **33 tests passing** (engine, ghl SDK, sandbox)
- `npm run check` → typecheck green
- Open `.github/workflows/ci.yml`: typecheck + tests + build on every PR
- Show `AGENTS.md` + `docs/build-log.md`:
  > "The repo is documented for AI agents — the whole thing was built agent-first,
  > with tests-first package changes, conventional commits and CI gating. That's
  > what shipping looks like."

## 260s–end — Why me

> "I didn't wire up templates. I built the SDK transport, the GHL-compatible
> sandbox, the scoring engine, the dashboard and the automations — with tests.
> That's the exact skill set your clients need on GoHighLevel: strategy,
> engineering, automation, and the discipline to ship it clean. The same stack
> that runs this demo is one config change from running their real sub-account."

### Shot list

1. `/` landing — scroll, stop at the qualifier widget
2. Qualifier: click *Urgent — bleeding in pregnancy* → hot + auto-book + reply
3. `/dashboard` → Overview → Outbox (`queued` → *Approve & send* → `sent`)
4. Calendar + webhooks tabs
5. `apps/web/lib/automation.ts` + `packages/engine/src/scoring.ts` (brief)
6. `npm test` / `npm run check` green
7. `automations/n8n/*` + `.github/workflows/ci.yml` + `AGENTS.md`
