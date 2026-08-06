# Going live

Every step here is external — accounts, keys and dashboards that only you can
touch. The order matters: Twilio and Stripe both need a public URL to send
webhooks to, so deployment comes before either of them.

Roughly an hour end to end, most of it waiting for Stripe and Twilio dashboards.

---

## A. Database and local development

### A1. Apply the migrations

Supabase Dashboard → **SQL Editor** → New query. Run these eight in order,
pasting the contents of each and checking it succeeds before the next:

```
supabase/migrations/20260731120000_initial_schema.sql
supabase/migrations/20260731120100_bootstrap_business.sql
supabase/migrations/20260731120200_create_business_rpc.sql
supabase/migrations/20260731120300_call_notified_at.sql
supabase/migrations/20260731120400_atomic_replacements.sql
supabase/migrations/20260731120500_restrict_business_columns.sql
supabase/migrations/20260731120600_sms_abuse_limits.sql
supabase/migrations/20260731120700_trial_reminders.sql
```

Verify: **Table Editor** should now list `business`, `business_member`,
`business_profile`, `service`, `qualification_question`, `notification_rule`,
`call` and `lead`. Each should show **RLS enabled**. If any does not, stop —
that table would be readable across tenants.

### A1b. Run the smoke test

Paste and run `supabase/smoke-test.sql`. It creates a business, exercises the
database functions, checks the results and rolls everything back — so it is
safe to run and leaves nothing behind.

Expect a single row reading **ALL CHECKS PASSED — database is ready**.

This is not optional belt-and-braces. `npm run validate:sql` cannot check inside
plpgsql function bodies — to that parser a function body is one string literal,
so a misspelled variable parses cleanly and only fails when a real customer
saves their services. That has already happened once in this codebase. Running
the functions is the only way to know.

### A2. Auth settings

Supabase → **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` for now; change to your real domain in step B.
- Redirect URLs: add `http://localhost:3000/auth/callback`.

Under **Authentication → Providers → Email**, decide on confirmation:

- **Off** — faster onboarding, someone can sign up with any address.
- **On** — slower, but addresses are real.

The code handles both. On is the safer default for a paid product; off is
defensible while you are getting first customers in front of it.

### A2b. Email — do this before Twilio

Job alerts can go by email as well as SMS, and email is worth setting up first
because it needs no regulator's approval.

Outbound SMS depends on the ComReg sender ID from section C2, which takes time.
Until that lands, a job is captured perfectly and the tradesperson is never
told — the product's whole promise, waiting on paperwork. Email closes that gap
in about five minutes.

Sign up at resend.com, verify a sending domain, and set:

- `RESEND_API_KEY`
- `EMAIL_FROM` — e.g. `jobs@flowpilot.ie`

### A3. Local environment

```bash
cp .env.example .env.local
```

Fill in from Supabase → **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, bypasses row-level security

And from console.anthropic.com:

- `ANTHROPIC_API_KEY`

> **Apply the migrations before you add Anthropic credit, not after.**
>
> The public demo on the marketing site calls the model on every message. Its
> per-visitor cap lives in the `demo_usage` table, and `withinRateLimit()` fails
> *open* when that table is missing — a marketing page that silently stops
> working is worse than a briefly uncapped one. Add credit to an account whose
> migrations have not been applied and the first thing you have is an uncapped
> public endpoint spending your money. `/settings/diagnostics` reports this as
> **Demo rate limit — Broken** if it happens.

> **Temporary API keys expire.** A key created with an expiry looks identical to
> a working one in `.env.local`, and the only symptom is every caller hearing
> "I'll take your details and have someone come back to you". The diagnostics
> page now calls the model for real and tells an expired key apart from an empty
> balance, because the fix for each is in a different part of the console.

### A4. Check it works

```bash
npm run dev
```

Sign up at `/signup`. You should land on `/onboarding` and be able to complete
"Your business" and "What you do". In Supabase → Table Editor, `business`
should have your row, `business_profile` should have one row created by the
trigger, and `qualification_question` should have five default questions.

If that all holds, the foundation is sound.

---

## B. Deploy

Twilio and Stripe cannot call `localhost`, so this has to happen before them.

Push to GitHub, import the repo in Vercel, and add every variable from
`.env.local` in **Settings → Environment Variables**. Also set:

- `NEXT_PUBLIC_SITE_URL` — your real origin, e.g. `https://flowpilot.ie`

This one matters more than it looks: Twilio signs webhooks against the exact URL
it was configured with, and that value is what the app rebuilds to check the
signature. Wrong, and every webhook is rejected as forged.

Then go back to Supabase → **Authentication → URL Configuration** and update
Site URL and Redirect URLs to the deployed domain.

---

## C. Twilio

### C1. Regulatory bundle — start this first, it takes days

Twilio Console → **Phone Numbers → Regulatory Compliance → Bundles**. Create a
Business bundle for **Ireland / Local**, in FlowPilot's name with FlowPilot's
Irish address.

Two things still need confirming with Twilio support, and they decide how far
onboarding can be automated:

1. Can numbers stay allocated to FlowPilot and be used *on behalf of* each
   customer, without breaching their prohibition on sub-assigning Irish numbers?
2. Does one bundle in your name cover every number you buy, or is an end-user
   bundle required per customer business?

If the answer to (2) is per-customer, provisioning gains a document-upload step
and stops being instant. See D2 in `docs/DECISIONS.md`.

Once approved, add to Vercel:

- `TWILIO_ADDRESS_SID`
- `TWILIO_BUNDLE_SID`

Provisioning passes both through when present and works without them in test.

### C2. SMS sender — also start early, ComReg registration takes time

The confirmation text and the job alert cannot be sent from the number you
provision. Irish numbers have **no SMS capability at all** in Twilio's
inventory, so sending from one fails every time.

Register an alphanumeric sender ID with ComReg — `FlowPilot`, 3–11 characters —
via Twilio Console → **Messaging → Sender IDs**, or the
[ComReg SMS Sender ID Registry](https://www.comreg.ie/industry/electronic-communications/nuisance-communications/sms-sender-id-registry/).
Unregistered sender IDs are delivered to Irish phones labelled **"Likely Scam"**,
which is worse than not sending at all.

Then set one of these in Vercel:

- `TWILIO_MESSAGING_SERVICE_SID` — preferred; Twilio picks the sender
- `TWILIO_SMS_SENDER_ID` — the registered alphanumeric ID

There is one sender for all customers, because ComReg registration is
per-organisation and cannot be automated per business. The message body names
the business instead, which is what the default templates already do.

Alphanumeric senders cannot receive replies. That is fine for a confirmation,
and no worse than Irish numbering already forces.

**If neither is set, no confirmation and no job alert is ever sent.** The logs
will say `SMS NOT CONFIGURED` — check for it after your first test call.

### C3. Credentials

From the Twilio Console dashboard, add to Vercel:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

### C4. Webhooks

Numbers bought through the app configure their own webhooks automatically. If
you buy one by hand, set it under **Phone Numbers → Manage → Active numbers**:

- A call comes in: `https://YOUR_DOMAIN/api/voice/incoming` (HTTP POST)
- Call status changes: `https://YOUR_DOMAIN/api/voice/status` (HTTP POST)

---

## D. Stripe

### D1. Products

Stripe Dashboard → **Products**. Create three recurring monthly products
matching `lib/plans.ts`:

| Product | Price |
| --- | --- |
| FlowPilot Starter | €49/month |
| FlowPilot Pro | €99/month |
| FlowPilot Business | €199/month |

Copy each **price ID** (starts `price_`) into Vercel:

- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`

Use test mode first. Price IDs differ between test and live, which is why they
are environment values — swapping modes is a variable change, not a code change.

### D2. Webhook

Stripe → **Developers → Webhooks → Add endpoint**:

- URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`

Copy the signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`.

This webhook is the only thing in the system that can grant a subscription.
Without the secret set, every delivery is rejected and nobody ever becomes a
paying customer — so verify it shows a successful delivery before trusting it.

### D3. Also add



- `STRIPE_SECRET_KEY`

---

## E. End-to-end check

**Before you start: open `/settings/diagnostics`.**

It checks every external service and reports what is connected and what is not,
without ever showing a secret value. Almost every way this product fails looks
identical from outside — a phone that rings out, a text that never arrives — so
starting here turns "why isn't this working" into a named cause.

It also shows the exact webhook URLs to paste into Twilio and Stripe, built from
the same site URL that signature verification uses. If they look wrong there,
they are wrong everywhere.

Green on everything before you place a call, and the rest of this section should
mostly just work.

Use a real Irish mobile you can answer.

1. Sign up on the deployed site and complete onboarding.
2. **Get my number** — a real Irish number should appear within seconds. Check
   Twilio → Active numbers shows it, with the voice webhook already set.
3. On your mobile, dial the forwarding code the app shows.
4. **Ring my phone** — let it ring out, do not answer. Within a few seconds the
   page should confirm forwarding.
5. From a different phone, ring your mobile and let it ring out. The receptionist
   should answer, ask what the job is, take a location, and close.
6. Check the caller's phone for the confirmation text, and yours for the job
   alert.
7. The lead should be on `/dashboard` with the full transcript.

If step 5 answers but sounds wrong, that is prompt tuning in `lib/receptionist.ts`
and the business profile — not plumbing. If it does not answer at all, check
Twilio → **Monitor → Logs → Errors**; a 403 there means `NEXT_PUBLIC_SITE_URL`
does not match the URL Twilio is calling.

---

## F. Scheduled jobs

Set `CRON_SECRET` in Vercel to any long random string. Vercel sends it as a
bearer token to the endpoints listed in `vercel.json`, and the reclaim job
refuses to run without it — the job deletes phone numbers, so an
unauthenticated version of it would be a way for anyone to disconnect every
customer at once.

Two jobs run daily. One warns customers before their trial ends and tells them when it has — without it, a trial expiring means a receptionist that silently stops answering, which a customer discovers as a quiet week. The other gives back numbers belonging to businesses whose trial
or subscription ended more than a fortnight ago. Without it, every abandoned
trial leaves a number billed to you every month forever, findable only by
reading the Twilio invoice line by line.

---

## Known gaps

**No privacy policy, terms, or data processing agreement — this blocks launch.**
FlowPilot processes personal data belonging to members of the public who never
signed up: their name, phone number, home address and what is wrong with it.
That makes FlowPilot a processor acting for each business, and an Article 28
contract is a legal requirement rather than paperwork. Stripe will also expect
published terms before approving a live account. `docs/DATA-PROCESSING.md` is
the factual inventory a solicitor needs to draft these — what is collected,
where it goes, and the five gaps that need a decision rather than code. Callers
are told they are speaking to a machine and that notes are taken (D9); nothing
else is in place.

**Caller data is kept forever until you choose a retention period.** The nightly
purge is built and wired up, but deliberately does nothing until `RETENTION_DAYS`
is set in Vercel — the right period is a decision about the business, not one to
default. Set it to a whole number of days (minimum 30) and anything older is
redacted: transcript, caller number, and the lead with the name and address. The
call row survives so billed usage stays honest. Diagnostics warns while it is
unset. See `docs/DATA-PROCESSING.md`.

**Call allowances are counted but not capped.** Usage is tracked and shown on
the billing page with a nudge toward a bigger plan, but nothing stops a customer
going over. That is deliberate — the pricing page promises "we never cut you off
mid-month" — though it does mean a Starter customer could take Business-level
volume indefinitely without paying for it. Revisit if anyone actually does.

**Nothing has run against a real phone line.** 200 tests pass, including a set
that drives the real webhook handlers through a whole simulated call with fakes
only at the database, Twilio and model boundaries. Those have caught several
bugs that would otherwise have shipped silently — notifications never sent for
completed calls, and a model failure hanging up on a live caller. But the first
genuine run through section E is still where remaining bugs will surface.

**The Twilio account is still a trial account.** Trial accounts can only call
numbers you have verified in advance, and Twilio prepends its own recorded
message to every call. Neither is acceptable in front of a customer, so this has
to be upgraded before the first paying signup — not before testing. Verified
against the API on 2026-08-06, along with the fact that Irish voice numbers are
available in all 44 area codes at $1.80/month.

**Voice is turn-based.** Twilio `<Gather>` rather than ConversationRelay, so
there is a pause between the caller finishing and the reply, and no barge-in.
This was chosen to avoid standing up a WebSocket server before there was a
product; revisit when latency is the thing holding you back.

**No Docker on the dev machine**, so migrations cannot be executed locally.
`npm run validate:sql` parses them with the real PostgreSQL grammar, which
catches syntax but not semantics.
