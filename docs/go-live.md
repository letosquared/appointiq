# Go-live with real GoHighLevel

The demo runs entirely on the sandbox so it costs $0 and needs no credentials.
Going live with a real Mercy Medical Centre GoHighLevel sub-account is a
configuration change — no code changes required.

## Deploy the demo to Vercel (5 minutes)

The app deploys with zero environment variables — `GHL_MODE` defaults to
`sandbox` and the store falls back to in-memory + auto-seed, so every fresh
visitor sees the seeded Mercy clinic and can run the landing-page qualifier.

1. **Import the repo** at [vercel.com/new](https://vercel.com/new) →
   `appointiq` → framework preset **Next.js**.
2. **No env vars required** to start. Recommended before sharing the link:
   - `PUBLIC_BASE_URL` = `https://<your-project>.vercel.app` (enables the app's
     own webhook receiver so automation events fire and show in the dashboard).
   - `WEBHOOK_SECRET` = a long random string (n8n + cron use this as `X-API-Secret`).
3. **Persistent state (optional).** Memory store resets per serverless instance.
   For a persistent multi-visitor demo, add Upstash from the Vercel Marketplace
   (free tier) — it sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically;
   set `SANDBOX_STORE=upstash`. No code changes.
4. **Cron.** `vercel.json` already declares `0 */6 * * *` →
   `/api/cron/followups`; enable the "Cron" feature in project Settings.
5. **Verify** after deploy: open `/`, click a scenario in *Try the qualifier*,
   then open `/dashboard` → *Outbox* → *Approve & send*.

> Local dev uses `SANDBOX_STORE=file` (see `apps/web/.env.local`) so demo data
> survives restarts. Never use `file` on Vercel — the filesystem is ephemeral
> and per-instance.

## Prerequisites

- A GoHighLevel sub-account for Mercy Medical Centre.
- API credentials from GHL Marketplace (an agency plan provides these).
- The n8n instance the clinic uses, or Vercel Cron for follow-ups.

## Switch the transport

The client is chosen in `apps/web/lib/ghl.ts` from `GHL_MODE`:

| Env var | Value | Effect |
|---|---|---|
| `GHL_MODE` | `sandbox` (default) or `live` | which transport the client uses |
| `GHL_API_KEY` | your private integration key | required when `live` |
| `GHL_LOCATION_ID` | the Mercy Medical sub-account location id | scopes contacts/calendars |
| `PUBLIC_BASE_URL` | `https://appointiq.vercel.app` | for webhook subscription + cron |
| `WEBHOOK_SECRET` | a long random string | shared with n8n (`X-API-Secret`) |
| `SANDBOX_STORE` | `file` / `upstash` / `memory` | demo vs multi-instance |

Set `GHL_MODE=live` and add `GHL_API_KEY` + `GHL_LOCATION_ID` in the Vercel
project → Settings → Environment Variables.

## Map the sandbox seed to the real sub-account

The seed data in `packages/sandbox/src/seed.ts` mirrors what you must create in
GHL:

| Sandbox entity | Real GHL equivalent |
|---|---|
| `cal_gynae_mwangi`, `cal_antenatal_mwangi`, `cal_infertility_wahome`, `cal_wellness_okello` | Calendar events for Dr. Wanjiru (Gynae), Dr. Mwangi (Antenatal), Dr. Wahome (Infertility), Dr. Okello (Wellness) |
| Doctors + `cf_treatment_interest` | Contact custom field "Treatment interest" |
| `cf_lead_score`, `cf_lead_stage`, `cf_followup_due` | Custom fields; pipeline stages in GHL (New → Contacted → Qualified → Booked) |

Create the same custom fields and calendars in GHL, then the engine maps
1:1. Custom-field IDs in `apps/web/lib/automation.ts` (`FIELD`) can stay as-is;
GHL looks fields up by their id string.

## Wire webhooks

In GHL **Settings → Webhooks** subscribe to:

- `ContactCreated` → n8n webhook (`/webhook/ghl-lead`) or directly to
  `https://appointiq.vercel.app/api/webhooks/ghl`
- `AppointmentStatusChanged` → n8n (`/webhook/ghl-appointment`) or the same
  app URL (the no-show rebooking flow listens for `no-show`).

If you point GHL at n8n, n8n calls `/api/automations/qualify` and
`/api/automations/rebook` with `X-API-Secret`. If you point GHL straight at
Vercel, the webhook receiver runs the pipeline in-process (authentic path).

## WhatsApp / SMS delivery

The demo writes replies to a simulated outbox (`/api/outbox`). For real
delivery, connect GHL's WhatsApp Business account and swap `enqueueReply`
(`apps/web/lib/automation.ts`) for the GHL WhatsApp send (`/messages/...`),
or let n8n pick the message out of the outbox and send it via the WhatsApp
node.

## Follow-up reminders

- Sandbox demo: `npm run cron` or the in-app sweep.
- Production: Vercel Cron hits `/api/cron/followups` (respects `cf_followup_due`).

## Cutover checklist

- [ ] Real calendars + doctors created, seed mappings verified
- [ ] Custom fields created with the same ids
- [ ] `GHL_MODE=live` + creds set in Vercel
- [ ] Webhook subscriptions tested in sandbox first, then GHL
- [ ] WhatsApp channel connected; one real test lead end-to-end
- [ ] n8n workflows imported and pointed at production URL
