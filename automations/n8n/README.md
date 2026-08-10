# n8n workflows

Three versioned workflows that run the long game once a lead is in GHL.
They talk to the Vercel API with a shared webhook secret — the same functions
the dashboard uses, so behaviour is identical whether the run comes from n8n,
Vercel Cron, or a click in the demo.

| File | Trigger | What it does |
|---|---|---|
| `01-lead-intake-score-route.json` | Webhook — GHL `ContactCreated` | Calls `/api/automations/qualify`: score, stage, tags, drafted reply, optional auto-book |
| `02-noshow-rebook.json` | Webhook — GHL `AppointmentStatusChanged` | On `no-show`: calls `/api/automations/rebook` → books next free slot + queues WhatsApp apology |
| `03-weekly-ops-digest.json` | Cron — Mon 07:00 Africa/Nairobi | Pulls `/api/dashboard`, formats a digest, POSTs to a Slack/email webhook |

## Setup

1. **Environment variables** in n8n (Settings → Variables, or `N8N_ENV_VARS`):
   - `WEBHOOK_SECRET` — same value as the app's `WEBHOOK_SECRET` (used as the
     `X-API-Secret` header so n8n can call Vercel).
   - `PUBLIC_BASE_URL` — your app URL, e.g. `https://appointiq.vercel.app`.
2. **Import** — n8n UI → Workflows → "Import from file" → pick each JSON.
   Or CLI: `n8n import:workflow --file=automations/n8n/01-lead-intake-score-route.json`.
3. **Point GHL at n8n** — in GoHighLevel, add two webhook subscriptions under
   **Settings → Webhooks** (or use the sandbox `POST /webhooks`):
   - `ContactCreated` → `https://<n8n-host>/webhook/ghl-lead`
   - `AppointmentStatusChanged` → `https://<n8n-host>/webhook/ghl-appointment`
   The sandbox ships the same routes (`POST /webhooks`) so you can test locally.
4. **Digest delivery** — replace the Slack webhook URL in
   `03-weekly-ops-digest.json` with your own (Slack, Teams, email service).

## Notes

- The qualify and rebook endpoints are idempotent: the lead pipeline skips
  contacts that already have a `cf_lead_score`, so webhook replays are safe.
- In the sandbox demo the app subscribes its own `/api/webhooks/ghl`, and the
  in-process pipeline runs the same logic — n8n is the "real world" version of
  that path. See `docs/architecture.md` for the dual-path design.
