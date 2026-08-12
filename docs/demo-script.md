# Loom walkthrough script (~6 min) — AppointIQ for Mercy Medical Centre

**Pitch in one line:** Mercy Medical Centre is a client we already work with — we
built their website (`mercymedicalcentre.co.ke`, in our portfolio). This is the
next chapter: taking that relationship from "your website is live" to "your
front desk never sleeps," built on the full GoHighLevel stack and deployed on
Vercel for $0 a month.

**Setup for the video**

- Record against the **live site**: `https://appointiq-webp.vercel.app/`.
  It's already deployed, so the video proves it works in production, not just
  on your laptop.
- Reset the demo right before recording: `curl -X POST
  https://appointiq-webp.vercel.app/api/demo/reset` (or open the dashboard →
  Reset). This wipes to a clean, seeded state so the story is tidy.
- Full-screen the browser, zoom to ~110%, record at 1080p. Show the address bar
  so viewers can see it's a live URL, not a localhost trick.

---

## 0–40s — Cold open: a client we already know

> "Mercy Medical Centre in Nairobi is an existing client of ours — we built
> their website, you'll see them in our portfolio. So when we looked at their
> day-to-day, we saw the real problem: patients message on WhatsApp at all
> hours, the phone rings off the hook, and leads go cold just because nobody
> answered in time. So I went back and built them the thing their front desk
> wishes existed — a system that answers, scores, books and follows up
> automatically, and a dashboard where they can see every decision live.
> No patient message goes unanswered — or un-booked."

Scroll the landing page slowly: Mercy branding, the live counters (leads
tracked · booked · visits), the three-step "What happens the second a lead
arrives" strip. Stop at **Try the qualifier — live**.

---

## 40–100s — The qualifier: the wow moment, live

Click **"Urgent — bleeding in pregnancy"** and let the result animate in:

- Patient bubble: *"Hi, I am bleeding and very worried. Can I come in today
  please?"*
- Score chip **68**, tier **hot**, **auto-booked** badge
- The drafted WhatsApp reply on the green side
- The reason chips — especially the headline: *"clinical red-flag + Immediate
  urgency — safety override to hot"*

> "Watch the red one. By raw score she's 68 — warm. But because she says
> 'bleeding' and her urgency is Immediate, the engine safety-overrides to hot:
> a patient like this can't be routed like routine traffic. It routed her to
> Dr. Mwangi's antenatal calendar and booked the next free slot, all in about
> a second. Now flip to 'Cold — just wants the price list.' Same pipeline, but
> that lead stays cold and just gets a nurture message. Same code, different
> intent — that's the engine thinking, not a script."

**Fit hint:** this is real clinical triage logic — scoring urgency, treatment
value, source and reachability, plus safety rules — written in TypeScript with
unit tests. Not a canned demo: it's the same code the clinic's real
sub-account will run.

---

## 100–180s — The ops dashboard: the receipt

Open `/dashboard`, enter passcode `mercy`. Walk the tabs:

1. **Overview** — pipeline stats, appointments today, recent automation runs.
   > "This is the receipt. The clinic can watch every decision the system
   > makes — nothing happens in a black box."
2. **Outbox** — the drafted WhatsApp reply sits as **queued**. Hit
   **"Approve & send"** and watch it flip to **sent**.
   > "The AI drafts, the clinic approves, WhatsApp sends. Human-in-the-loop is
   > non-negotiable for a medical practice — the software triages, but a person
   > always signs off before a patient gets a message."
3. **Calendar** — the new booking on Dr. Mwangi's calendar, Nairobi hours.
4. **Webhooks** — the GHL webhook outbox showing delivered events, so they can
   see the platform talking to the app.

---

## 180–280s — Under the hood: the five proficiencies, shown for real

This is the part that shows what you actually know how to do:

1. **GoHighLevel (the SDK + sandbox)** — open `packages/ghl` and
   `packages/sandbox` in the repo.
   > "I wrote a typed v2 SDK — contacts, custom fields, tags, calendars,
   > appointments, workflows, webhooks — with two interchangeable transports:
   > the real HighLevel API, or our GHL-compatible sandbox with the same
   > routes, payloads and error codes. That's why the whole demo runs with
   > zero subscriptions. And it's a config flip, not a rewrite, to point it at
   > their real sub-account — one env var: `GHL_MODE=live` plus their API key
   > and location ID."
2. **Vercel (live deployment)** — gesture at the address bar.
   > "This is a real Next.js app, in production, right now — App Router, API
   > routes, serverless store. I deployed and debugged this through Vercel's
   > build pipeline, including the cron config and env management."
3. **n8n (the automations)** — open `automations/n8n/` — three importable
   workflows: lead intake → score → route, no-show → auto-rebook + WhatsApp,
   and a weekly ops digest.
   > "When a patient no-shows, n8n sees it, finds the next free slot, rebooks
   > them and queues a WhatsApp apology. The workflows hit the app's
   > automation endpoints with a shared secret — same pipeline whether the
   > event comes through GHL's webhook directly or through n8n."
4. **GitHub (CI + workflow)** — open `.github/workflows/ci.yml` and the commit
   history.
   > "Every push runs typecheck, 33 unit tests and a production build before
   > anything merges. Small conventional commits, feature-branch friendly —
   > this is how real teams ship, and it's how I ship."
5. **Claude Code (agent-first build)** — open `AGENTS.md` and
   `docs/build-log.md`.
   > "The whole thing was built agent-first — the repo is documented for AI
   > agents, tests-first package changes, conventional commits, CI gating. The
   > build log is the journey. That's the modern way to build with AI in the
   > loop, and it's what this role is about."

---

## 280–340s — Quality gates (quick cuts)

Split-screen or quick cuts, brief but visible:

- `npm test` → **33 tests passing** (engine, ghl SDK, sandbox)
- `npm run check` → typecheck green
- `npm run build` → production build green

> "This isn't a prototype that works by luck — it's tested, typed, and builds
> clean. That's the difference between a demo and something you hand a client."

---

## 340s–end — Why me: the fit, tied back to the client

> "Here's why this matters for the role. I don't just do one layer — I built
> the SDK transport, the GHL-compatible sandbox, the scoring engine, the
> dashboard, the n8n workflows, the CI and the Vercel deployment. That's the
> exact full-stack automation skill set this position needs: GoHighLevel
> strategy and engineering, AI-assisted delivery, GitHub discipline, Vercel
> deploys, n8n automation.
>
> And more importantly — this isn't an abstract exercise. Mercy Medical Centre
> is a client we already work with. I know their business, I built their
> website, and I came back and automated their front desk. That's the kind of
> proactive, client-owned work you get when you hire me — someone who doesn't
> wait to be asked, who turns a website client into a ten-year automation
> client, and who ships production code that costs them nothing to run."

---

### Shot list

1. Landing scroll → counters → **Try the qualifier — live**
2. Qualifier: *Urgent — bleeding in pregnancy* → hot + auto-book + reply; then
   flip to *Cold — price list* for contrast
3. `/dashboard` (passcode `mercy`) → Overview → Outbox (*queued* → *Approve &
   send* → *sent*) → Calendar → Webhooks
4. Repo: `packages/ghl` + `packages/sandbox` (SDK/transport flip)
5. Repo: `automations/n8n/` (three workflows)
6. Repo: `.github/workflows/ci.yml` + commit history
7. Repo: `AGENTS.md` + `docs/build-log.md`
8. Terminal: `npm test` / `npm run check` / `npm run build`
9. Back to live site for the close
