# Going live

Every step here is external — accounts, keys and dashboards that only you can
touch. The order matters: Twilio and Stripe both need a public URL to send
webhooks to, so deployment comes before either of them.

Roughly an hour end to end, most of it waiting for Stripe and Twilio dashboards.

---

## A. Database and local development

### A1. Apply the migrations

Supabase Dashboard → **SQL Editor** → New query. Run these four in order,
pasting the contents of each and checking it succeeds before the next:

```
supabase/migrations/20260731120000_initial_schema.sql
supabase/migrations/20260731120100_bootstrap_business.sql
supabase/migrations/20260731120200_create_business_rpc.sql
supabase/migrations/20260731120300_call_notified_at.sql
```

Verify: **Table Editor** should now list `business`, `business_member`,
`business_profile`, `service`, `qualification_question`, `notification_rule`,
`call` and `lead`. Each should show **RLS enabled**. If any does not, stop —
that table would be readable across tenants.

### A2. Auth settings

Supabase → **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` for now; change to your real domain in step B.
- Redirect URLs: add `http://localhost:3000/auth/callback`.

Under **Authentication → Providers → Email**, decide on confirmation:

- **Off** — faster onboarding, someone can sign up with any address.
- **On** — slower, but addresses are real.

The code handles both. On is the safer default for a paid product; off is
defensible while you are getting first customers in front of it.

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

### C2. Credentials

From the Twilio Console dashboard, add to Vercel:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

### C3. Webhooks

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

## Known gaps

**Call allowances are counted but not capped.** Usage is tracked and shown on
the billing page with a nudge toward a bigger plan, but nothing stops a customer
going over. That is deliberate — the pricing page promises "we never cut you off
mid-month" — though it does mean a Starter customer could take Business-level
volume indefinitely without paying for it. Revisit if anyone actually does.

**Nothing has run against a real database or phone line.** 60 tests pass,
including eleven that drive the real webhook handlers through a whole simulated
call with fakes only at the database, Twilio and model boundaries. That found
one bug that would otherwise have shipped silently — notifications never being
sent for completed calls. But the first genuine run through section E is still
where remaining bugs will surface.

**Voice is turn-based.** Twilio `<Gather>` rather than ConversationRelay, so
there is a pause between the caller finishing and the reply, and no barge-in.
This was chosen to avoid standing up a WebSocket server before there was a
product; revisit when latency is the thing holding you back.

**No Docker on the dev machine**, so migrations cannot be executed locally.
`npm run validate:sql` parses them with the real PostgreSQL grammar, which
catches syntax but not semantics.
