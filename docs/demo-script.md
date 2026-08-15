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
- Note: the urgent-qualifier score is time-sensitive — it reads ~67 off-hours,
  ~68 weekend, ~71 in clinic hours. Don't narrate an exact number; let it land
  hot and let the reason chips tell the story.

---

## 0–35s — Cold open: a client we already know

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

## 35–90s — The qualifier: the wow moment, live

Click **"Urgent — bleeding in pregnancy"** and let the result animate in:

- Patient bubble: *"Hi, I am bleeding and very worried. Can I come in today
  please?"*
- Score chip landing **hot**, **auto-booked** badge
- The drafted WhatsApp reply on the green side
- The reason chips — especially the headline: *"clinical red-flag + Immediate
  urgency — safety override to hot"*

> "Watch the red one. By raw score she's not top of the list — but because she
> says 'bleeding' and her urgency is Immediate, the engine safety-overrides to
> hot: a patient like this can't be routed like routine traffic. It routed her
> to Dr. Mwangi's antenatal calendar and booked the next free slot, all in
> about a second. Now flip to 'Cold — just wants the price list.' Same pipeline,
> but that lead stays cold and just gets a nurture message. Same code, different
> intent — that's the engine thinking, not a script."

**Fit hint:** this is real clinical triage logic — scoring urgency, treatment
value, source and reachability, plus safety rules — written in TypeScript with
unit tests. Not a canned demo: it's the same code path end to end, one env var
(`GHL_MODE=live`) away from being wired to their real sub-account.

---

## 90–140s — The patient's side: book a real appointment

Switch to the **Book a visit** page (`/book`) and walk the flow as a patient:

> "Now let's see the other half of the story. As a real patient I can pick a
> service — say Gynaecology — pick Dr. Mwangi, and the calendar only shows
> genuinely free slots, in Nairobi time, and it won't let me double-book a
> doctor who already has an appointment that hour."

Complete a booking with a name and WhatsApp number, hit confirm.

> "Here's the part I like — that appointment isn't a demo prop. It went to the
> same GHL calendar the ops dashboard reads. A few taps from now we're going to
> see this exact booking sitting on Dr. Mwangi's calendar, with a webhook event
> to prove the platform talked to the app. Two sides of the product, one real
> record."

---

## 140–210s — The ops dashboard: the receipt

Open `/dashboard` and sign in as a staff member (username `w.ngugi`, password
`mercy` — the front desk account). The header shows **Logged in as Wanjiru
Ngugi · Front Desk**. Walk the tabs:

1. **Overview** — the revenue estimate (KES 223k in qualified pipeline),
   pipeline stats, recent automation runs.
   > "This is the receipt. The clinic can watch every decision the system
   > makes — nothing happens in a black box. Every run shows *why* the engine
   > scored it that way, not just the score."
2. **Outbox** — the drafted WhatsApp reply sits as **queued**. Hit
   **"Approve & send"** and watch it flip to **sent**.
   > "The AI drafts, the clinic approves, WhatsApp sends. Human-in-the-loop is
   > non-negotiable for a medical practice — the software triages, but a person
   > always signs off before a patient gets a message."
3. **Calendar** — the booking we just made as a patient, on Dr. Mwangi's
   calendar, Nairobi hours.
4. **Webhooks** — the GHL webhook outbox showing the delivered events (including
   our booking's), so they can see the platform talking to the app.

Mention the **Simulate lead** widget on the left: the clinic can replay any
scenario (or the whole demo) without waiting for a real WhatsApp message.

---

## 210–290s — Under the hood: the five proficiencies, shown for real

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
   > build pipeline, and I made a real engineering call there: I dropped Vercel
   > Cron because the free plan only allows one run a day, which is useless for
   > WhatsApp follow-ups — so scheduling lives in n8n instead."
3. **n8n (the automations)** — open `automations/n8n/` — three versioned,
   importable workflows: lead intake → score → route, no-show → auto-rebook +
   WhatsApp, and a weekly ops digest.
   > "These are importable, versioned workflows, wired to hit the app's
   > automation endpoints with a shared secret — same pipeline whether the
   > event comes through GHL's webhook directly or through n8n. The no-show
   > flow listens for the appointment event, rebooks the next free slot and
   > queues a WhatsApp apology. To be straight with you: they're pointed at
   > this live app and ready to import, but this demo runs on the app's own
   > webhook — n8n is the 'when we scale this to a second client' layer, so I
   > versioned it properly rather than hand-wave it."
4. **GitHub (CI + workflow)** — open `.github/workflows/ci.yml` and the commit
   history.
   > "Every push runs typecheck, 34 unit tests and a production build before
   > anything merges. Small conventional commits, feature-branch friendly —
   > this is how real teams ship, and it's how I ship."
5. **Claude Code (agent-first build)** — open `AGENTS.md` and
   `docs/build-log.md`.
   > "The whole thing was built agent-first — the repo is documented for AI
   > agents, tests-first package changes, conventional commits, CI gating. The
   > build log is the journey. That's the modern way to build with AI in the
   > loop, and it's what this role is about."

---

## 290–330s — Quality gates (quick cuts)

Split-screen or quick cuts, brief but visible:

- `npm test` → **34 tests passing** (engine, ghl SDK, sandbox)
- `npm run check` → typecheck green
- `npm run build` → production build green

> "This isn't a prototype that works by luck — it's tested, typed, and builds
> clean. That's the difference between a demo and something you hand a client."

---

## 330s–end — Why me: the fit, tied back to the client

> "Here's why this matters for the role. I don't just do one layer — I built
> the SDK transport, the GHL-compatible sandbox, the scoring engine, the
> dashboard, the booking flow, the n8n workflows, the CI and the Vercel
> deployment. That's the exact full-stack automation skill set this position
> needs: GoHighLevel strategy and engineering, AI-assisted delivery, GitHub
> discipline, Vercel deploys, n8n automation.
>
> And more importantly — this isn't an abstract exercise. Mercy Medical Centre
> is a client we already work with. I know their business, I built their
> website, and I came back and automated their front desk. That's the kind of
> proactive, client-owned work you get when you hire me — someone who doesn't
> wait to be asked, who turns a website client into a ten-year automation
> client, and who ships production code that costs them nothing to run.
>
> The repo is public — `letosquared/appointiq` on GitHub — and everything
> you've seen is in there, versioned. I'd love to walk you through any part of
> it live, or set it up against a real sub-account to prove the flip."

---

### Shot list

1. Landing scroll → counters → **Try the qualifier — live**
2. Qualifier: *Urgent — bleeding in pregnancy* → hot + auto-book + reply; then
   flip to *Cold — price list* for contrast
3. `/book` → pick service + doctor → real slot → confirm as a patient
4. `/dashboard` → staff sign in (`w.ngugi` / `mercy`, **Logged in as Wanjiru
   Ngugi**) → Overview (KES 223k + runs w/ reasons) → Outbox (*queued* →
   *Approve & send* → *sent*) → Calendar (shows our booking) → Webhooks
   (delivered events)
5. Repo: `packages/ghl` + `packages/sandbox` (SDK/transport flip)
6. Repo: `automations/n8n/` (three workflows)
7. Repo: `.github/workflows/ci.yml` + commit history
8. Repo: `AGENTS.md` + `docs/build-log.md`
9. Terminal: `npm test` / `npm run check` / `npm run build`
10. Back to live site for the close
