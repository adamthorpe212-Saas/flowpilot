# What FlowPilot does with personal data

Written for the solicitor drafting the privacy policy and the Article 28 data
processing agreement. Everything here is derived from the schema and the code,
not from intent — where the code and the plan disagree, the code is what
customers actually get.

**This is not legal advice and not a privacy policy.** It is the factual
inventory those documents have to be built on.

Last derived from the codebase: 2026-08-06.

---

## The two roles FlowPilot plays at once

This distinction drives everything below, and it is the thing most easily got
wrong.

**Controller — for the business owner's own data.** They signed up, FlowPilot
decides what to collect and why.

**Processor — for the caller's data.** A member of the public rings a plumber.
FlowPilot answers, captures their details, and stores them *on that plumber's
behalf*. The plumber is the controller; FlowPilot only ever acts on their
instructions. This is what makes an Article 28 contract mandatory rather than
optional, and there is currently no such contract in place.

---

## Data about the business owner (FlowPilot is controller)

| What | Where | Why |
|---|---|---|
| Email address, hashed password | Supabase Auth (`auth.users`) | Sign-in |
| Business name, trade, areas covered, timezone | `business` | Configures what the receptionist says |
| FlowPilot phone number and its Twilio SID | `business.phone_number`, `phone_number_sid` | Routes incoming calls to the right business |
| Stripe customer and subscription IDs | `business.stripe_customer_id`, `stripe_subscription_id` | Billing |
| Their own mobile number or email | `notification_rule.destination` | Where job alerts are sent |

FlowPilot never sees or stores card details — Stripe Checkout is hosted, and
only the resulting identifiers come back.

---

## Data about callers (FlowPilot is processor, for the business)

This is the sensitive set. These people never signed up for anything, and in
most cases are ringing about a problem in their home.

| What | Where | Notes |
|---|---|---|
| Caller's phone number | `call.from_number`, `lead.caller_number` | Captured automatically from the network |
| Everything said, both sides | `call.transcript` (jsonb) | Free text — may contain anything the caller chose to say |
| Their name | `lead.caller_name` | Asked for by default |
| **Their home address** | `lead.location` | Asked for by default |
| What is wrong, and how urgent | `lead.job_type`, `urgency`, `preferred_time` | |
| Anything else a business configured a question for | `lead.captured` (jsonb) | Businesses can add their own questions |
| Call timing and duration | `call.started_at`, `ended_at`, `duration_seconds` | |

**No audio is recorded.** No Twilio `<Record>` verb is used anywhere; calls are
transcribed by speech recognition and nothing else. This is why the spoken
disclosure says *"I'll take notes"* rather than *"this call is recorded"* — the
latter would be untrue.

A `call.recording_url` column existed from the initial schema and was never
written to. It has been dropped
(`20260806120000_drop_recording_url.sql`), because a column with that name is
exactly what contradicts the paragraph above during an audit.

### What the caller is told

Since D9, every call opens with *"This is an automated assistant, and I'll take
notes."* before the business's own greeting, and it cannot be disabled. See
`lib/disclosure.ts`.

---

## Who else the data reaches

Each of these is a sub-processor and needs naming in the DPA, with its own
agreement in place.

| Sub-processor | What it receives | Why |
|---|---|---|
| **Supabase** | Everything in both tables above | Database and authentication |
| **Twilio** | The call itself, both phone numbers, and the caller's speech | Carries the call; performs the speech-to-text |
| **Anthropic** | The transcript text, including any name and address the caller gave, plus the business's configuration | Decides what the receptionist says next |
| **Stripe** | Business owner's billing details | Subscriptions |
| **Vercel** | Request metadata, including IP addresses in logs | Hosting |
| **Resend** | Lead details, where email alerts are enabled | Job alerts |

**Open question for the solicitor and for configuration:** the Supabase project
region has not been confirmed as EU. If it is not, personal data about Irish
callers is leaving the EEA and needs a transfer mechanism. This should be
checked before launch, not after.

---

## Anonymous data

`demo_usage.ip_hash` stores a salted SHA-256 hash of a visitor's IP address,
truncated to 32 characters, used only to rate-limit the public demo. The raw IP
is never written. This was a deliberate choice — counting requests does not
require keeping a record of who visited.

---

## Gaps that need decisions, not code

These are listed because a privacy policy cannot honestly be written around
them.

**1. A retention period still has to be chosen.** The purge job exists and runs
nightly (`/api/cron/purge-old-calls`), but it is **off** until `RETENTION_DAYS`
is set, and until then nothing is deleted. That default is deliberate: how long
a plumber genuinely needs a finished job on file is a decision about their
business, and a plausible-looking default would mean the first anyone heard of
the policy was a customer finding their job history had evaporated.

Set it and the job redacts anything older — transcript, caller number, and the
lead row with the name and address — while keeping the call row so billed usage
stays honest. It refuses periods under 30 days, and refuses anything that is not
plain digits, because `Number("0x1E")` is 30 and this is the one setting whose
misreading destroys data.

`/settings/diagnostics` reports **Caller data retention** as a warning while it
is unset, so it cannot be forgotten quietly.

**2. Erasure exists; the rest of the rights do not.** A business can now erase a
caller from the lead screen — it deletes the lead and clears the transcript and
caller number from the call, keeping only the timing the business needs for its
own usage count. That covers Article 17 requests passed on by a customer.

Still missing: access (Article 15) and portability (Article 20) have no
mechanism, and there is no documented process for a business that receives a
request and does not know what to do with it. The DPA has to state how FlowPilot
assists with Articles 15–22, and the answer for most of them is currently
"by hand".

**3. No Article 28 contract exists.** Every business whose callers FlowPilot
processes needs one, accepted at signup.

**4. No privacy policy, no terms of service, no cancellation policy.** Stripe
will expect published terms before approving a live account, and the pricing
page already makes promises ("cancel any time", "we never cut you off
mid-month") that belong in terms rather than only in marketing copy.

**5. No company identity anywhere on the site.** No registered name, address or
CRO number. This is a disclosure requirement, and it is also the reason a
stranger hesitates before entering a card. The same details are needed for the
Twilio regulatory bundle (see D2), so it is one gathering exercise, not two.

---

## Where this is enforced in code

- `lib/disclosure.ts` — the spoken disclosure, not configurable
- `lib/receptionist.ts` — `openingLine()` composes it ahead of the greeting
- `supabase/migrations/20260731120500_restrict_business_columns.sql` — customers cannot rewrite the columns that decide call routing
- Row-level security on every tenant table, added in the same migration that creates it
- `lib/demo.ts` — IP hashing for the public demo
