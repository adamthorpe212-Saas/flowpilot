# FlowPilot Decisions

Phase 0 output: the foundational choices everything else is built on, recorded as
they are made. This is the informal record the roadmap calls for — it is **not**
`docs/ARCHITECTURE.md`, which gets written later, once these have survived contact
with real implementation.

Each decision records what was chosen, what it rules out, and what still needs
verifying before it can be relied on.

---

## D1 — Missed calls are captured by conditional call forwarding

**Status:** Decided
**Phase:** 0 · blocks Phase 1 data model and Phase 2 provisioning

**Decision**
Pilot businesses keep their existing number and configure forward-on-no-answer
(and busy / unreachable) to a FlowPilot-provisioned Irish mobile number.
FlowPilot receives the forwarded call, records it as a missed call, and opens the
SMS conversation from that FlowPilot number.

**Why**
It is the only mechanism that gets a working receptionist live in an afternoon,
which is what Phase 2 needs in order to test its hypothesis at all. The business
changes nothing about its van, website, cards or Google listing.

**Known tradeoff — accepted**
The caller dials the business's number and receives a text from a different
number. This cannot be avoided: sending as the business's own number is exactly
what Ireland's SMS Sender ID Registry exists to prevent. Mitigated by the first
message naming the business, which is already how the marketing site depicts it.

**Rejected for now**
- *New advertised FlowPilot number* — requires the business to change its
  advertised number everywhere. Realistic only for brand-new businesses.
- *Porting the existing number* — best end state, worst pilot experience. Days of
  lead time and paperwork on the number the business lives on.

Both remain viable later. The Phase 1 data model must therefore treat "how this
business's calls reach FlowPilot" as per-business configuration, not a global
assumption, so either can be added additively.

**Still to verify**
- Behaviour of conditional forwarding across Vodafone, Three and Eir — the GSM
  codes are standard but carrier handling differs.
- Who is billed for the forwarded call leg (varies by carrier and plan).

---

## D2 — Twilio is the telephony/SMS provider for the MVP

**Status:** Decided
**Phase:** 0 · enables Phase 2 provisioning

**Decision**
Twilio provides the Irish mobile numbers, receives the forwarded calls from D1,
and carries the SMS conversation.

**Why**
At pilot scale (5–10 businesses) the per-message cost difference between
providers is noise — tens of euro a month. What actually matters is
documentation quality, how quickly a live conversation pipeline can be debugged,
and whether their regulatory team will answer the Irish numbering questions
below. Twilio is strongest on all three.

**Tradeoff — accepted**
Twilio is the most expensive per unit. That only becomes material at Phase 3+
volume, by which point real usage data exists to evaluate against. Revisit then;
do not pre-optimise now.

**Structural note**
Do *not* build a provider-agnostic abstraction. Keep telephony behind a small
module boundary so it isn't spread through the codebase — ordinary structure,
not speculative portability.

**Verification status** — researched, partially resolved

*Resolved favourably — one bundle covers every number.*
Twilio regulatory bundles are keyed to `(IsoCountry, NumberType, EndUserType)`,
not to individual numbers or end customers. One Business end-user record for
FlowPilot plus one Irish bundle therefore covers every number purchased. Numbers
can be bought on demand via API and attached to the existing bundle — no bulk
purchase, no per-customer paperwork. Fully automated instant provisioning is
architecturally viable, so onboarding does **not** need a "number pending" state.
Strong inference from Twilio's v2 Bundles API design rather than an Ireland
specific written guarantee; confirm when creating the first bundle.

*Open, but blocks scale rather than pilots.*
Twilio's Ireland terms prohibit sub-assigning, transferring, leasing or selling
Irish numbers to end users. The on-behalf-of model — numbers held in FlowPilot's
account, dedicated per business, customer holds no porting or ownership rights,
platform mediates all traffic — is how most vertical SaaS on Twilio operates and
is very likely the intended safe case, but "sub-assignment" is a regulatory term
of art that only Twilio's compliance team can rule on. Get sign-off in writing,
describing the architecture explicitly, before scaling past a handful of numbers.
Start now (it takes weeks) but do not block build work on it — pilots are a
handful of numbers.

*ANSWERED for Twilio, 2026-07-31 — Twilio has no SMS-capable Irish numbers.*
Console check (Buy a Number → Ireland) returned **Voice and Fax only**. The SMS
and MMS capability filters are greyed out and unselectable. Every result is type
**Local** — no Mobile number type is offered for Ireland at all. Address
Requirement is "Local" (an Irish address, which FlowPilot has — this supports the
single-bundle model in Q3 above). Monthly fee $1.80.

This does **not** yet mean Irish two-way SMS is impossible — only that Twilio
does not sell it self-serve. Early signals suggest it exists elsewhere: DIDWW
sells Irish virtual numbers with voice and SMS, and Irish long codes are
described as supporting inbound messaging and SMS conversations. Evidence is
thin; verify directly.

**Twilio is definitively closed.** The Exclusive Number request form (the
non-self-serve inventory behind "Can't find a number?") returns: *"Mobile phone
numbers with SMS capabilities are currently unavailable for Ireland in our
Exclusive Inventory."* Neither public nor exclusive inventory has them. Signed up
for availability notifications in case that changes.

**No Irish regulatory prohibition found.** ComReg's regime governs *sender ID
registration for outbound A2P*, not who may receive messages. Two-way SMS is
described as supported in Ireland. This is a Twilio supply gap, not an Irish ban.

**Critical distinction when evaluating other providers.** Almost all published
guidance covers *sending* A2P messages **to** Irish mobiles, which is well
supported and is not our requirement. What FlowPilot needs is to *rent an Irish
number that receives SMS* — inbound, delivered to the application by webhook.
That is the scarce capability, and conflating the two will produce false
positives when reading provider marketing.

Open actions:
1. Vonage — publishes an Ireland-specific SMS page; ask first.
2. DIDWW — advertises Irish virtual numbers with voice and SMS.
3. Sinch, Bird, Telnyx — European providers, historically better local numbering
   coverage than US-centric ones.

Ask each precisely: *can I rent an Irish (+353) number that both sends and
receives SMS, with inbound delivered by webhook?* Then: number type, monthly
cost, regulatory documentation.

If any provider has Irish two-way SMS, the product is unchanged; either migrate
off Twilio or run Twilio for voice and another provider for SMS (workable, but
prefer one provider for both absent a strong reason).

*Superseded framing — kept for context.*
Whether SMS-capable Irish numbers are purchasable at all. Twilio confirming
"two-way SMS is supported in Ireland" at country level is **not** the same claim
as "SMS-capable Irish numbers are in inventory." In most European numbering
plans, mobile ranges are tied to SIM subscriptions rather than leasable as
virtual numbers — Azure Communication Services offers no Irish mobile product at
all, only Local and Toll-Free, and some Irish local numbers are voice-only.

Answer it directly, not from documentation: Twilio Console → Phone Numbers → Buy
a Number → country Ireland → check the SMS capability filter separately for Local
and for Mobile. Inventory changes, so the Console is the only authoritative
source.

**Contingency if no provider has SMS-capable Irish numbers**
The SMS-first ordering in `docs/ROADMAP.md` assumes an SMS channel is available.
If none exists, voice stops being a later phase and becomes the only viable
channel — voice-capable Irish numbers are confirmed available at $1.80/month.
That is a genuine re-plan, not a tweak: the roadmap's principle 3 (SMS before
voice) would no longer be a choice, and Phase 6 would become Phase 2.

It would also invalidate the marketing site. Both `/` and `/how-it-works` depict
an SMS conversation — the lifecycle ring's phone screens and the entire two-phone
demo are text threads. A voice product needs both rebuilt.

Worth noting before accepting that outcome: voice is harder on every axis the
roadmap already documented — latency, cost per interaction, failure handling, and
Irish accents against speech-to-text. It also loses the written record, so a
misheard address produces a van at the wrong house with nothing to check against.
Exhaust the SMS provider options first.

---

## D3 — Supabase is the database and the auth provider

**Status:** Decided

**Decision**
Supabase (Postgres) holds all application data. Tenant isolation is enforced with
Postgres row-level security. Supabase Auth handles business-owner login.

**Why**
Row-level security means the database itself refuses to return another business's
rows even when a query forgets to filter — isolation enforced by the system
rather than by remembering. Given this is EU personal data belonging to other
people's customers, that guarantee should not rest on code review alone. Supabase
also closes the auth decision in the same move.

**Consequence for Phase 1**
Every tenant-scoped table carries `business_id` and ships with an RLS policy from
the moment it is created. Retrofitting RLS onto existing tables is a migration
with a data-exposure window; there is no reason to accept that later when it's
free now.

---

## D4 — Make.com does the setup chain; the conversation runs as code

**Status:** Decided

**Decision**
Make.com orchestrates purchase and provisioning: payment succeeds → business
record created → number provisioned → onboarding email → owner notified. The live
SMS conversation loop runs as code (Supabase Edge Functions).

**Why — cost arithmetic**
Make bills per operation. One inbound message costs roughly six (receive, load
business, load history, call model, persist, send). A six-message enquiry is
~40 operations. A 10,000-operation plan therefore covers ~250 enquiries per month
*across all customers* — about 25 each across ten businesses, which a busy trade
exceeds in a week. Cost would scale linearly with usage, the one metric the
business needs to grow. The same logic as code is effectively free at that volume.

**Why — the roadmap's own constraints**
Phase 1 requires CI to block broken code and observability from the first backend
code. Make scenarios are not in git, cannot be code-reviewed or tested, and cannot
roll back atomically with the application. The AI qualification logic is also the
part Phase 2 identifies as make-or-break and the part that will be iterated on
hardest — it belongs somewhere it can be versioned and evaluated.

**Why Make still earns its place**
The setup chain fires once per customer, not once per message. It spans several
systems, changes often, and benefits from being editable without a deploy. That is
exactly what the tool is good at.

---

## D5 — Automated onboarding is the target, built after the receptionist works

**Status:** Decided (sequencing)

**Goal**
A customer can purchase at any hour and reach a working service with no manual
involvement from FlowPilot staff.

**Two steps that cannot be fully automated away**
1. *Irish number provisioning* — requires identity and address documentation.
   Submittable via Twilio's API, so no human is needed on FlowPilot's side, but
   approval is not instant. Onboarding must therefore model a "number pending"
   state rather than assuming service is live at payment.
2. *Call forwarding* — configured on the customer's own handset via carrier GSM
   codes. There is no API for this. Mitigate with a tap-to-dial link and an
   automatic test call that confirms forwarding is working.

**Sequencing, and the actual reason**
Build the working receptionist first, then automate the funnel around it — not on
principle, but because until a number answers a call and a model answers a text
there is nothing for a checkout to sell, and provisioning someone into a product
that cannot answer their phone is worse than having no checkout.

**What must be designed for now, so the funnel is additive**
- Plan and subscription-status fields exist in the data model from the start, even
  while nothing reads them.
- The business profile is configurable data from the start — never hand-edited
  per customer, never industry-specific code paths.
- Account creation precedes payment. Payment-then-signup reliably produces the
  worst possible support case: money taken, account never created.

---

## D6 — FlowPilot is a voice receptionist, not SMS

**Status:** Decided, 2026-07-31
**Supersedes:** `docs/ROADMAP.md` principle 3 ("SMS before voice")

**Decision**
The AI answers the forwarded call by voice. A one-way confirmation SMS follows,
sent to the caller from a ComReg-registered sender ID.

**Why**
Forced, not preferred. Twilio has no SMS-capable Irish numbers in public or
exclusive inventory, and the alternatives were worse:
- *UK number for two-way SMS* — a +44 number texting an Irish caller about a job
  is the exact pattern Ireland's anti-smishing campaign trains people to ignore.
  Reply rate is the product. Also likely charges the customer to reply (UK is
  outside EU roaming) and risks carrier filtering as grey-route traffic.
- *Waiting for Irish SMS inventory* — indefinite, with no supplier identified.

Irish voice numbers are available today at $1.80/month, buyable via API, with the
address requirement satisfied by FlowPilot's own Irish address.

**What this recovers**
Outbound A2P SMS *to* Irish mobiles is well supported — that is what the ComReg
sender ID registry governs, and what every Irish bank and courier uses daily. So
the written record survives: the AI confirms the captured details by text after
the call. A misheard address becomes something the customer can see and correct,
rather than a van at the wrong house.

**Architectural consequence — the AI layer stays channel-agnostic**
With Twilio ConversationRelay, Twilio owns speech-to-text and text-to-speech; the
application receives transcribed text and returns text to be spoken. The
qualification engine is therefore text-in/text-out and has no knowledge of the
channel. If Irish two-way SMS ever becomes available, it plugs in without
rewriting the brain. This also satisfies the roadmap's Phase 6 warning against
building a separate qualification system per channel.

**Accepted costs**
- Real-time voice is harder than text: latency, interruption handling, and Irish
  accents against speech-to-text are all real problems.
- Roughly 3–5× the cost per interaction (per-minute voice + STT + model + TTS).
  Immaterial at pilot scale.
- The marketing site depicts SMS throughout and will need rework — scheduled
  *after* the product works, not before.

**De-risking**
Do not build free-flowing conversation first. Start narrow: answer, ask, capture,
read back for confirmation, end. A mediocre voice agent is worse than voicemail —
people forgive a machine that is obviously a form, not one that impersonates a
person and fumbles.

---

## Regulatory constraints that bound these decisions

**Ireland SMS Sender ID Registry (ComReg)** — live since 3 July 2025.
Unregistered alphanumeric sender IDs are labelled "Likely Scam" on delivery; a
blocking phase is deferred but intended. 5-digit sender registration is enforced
from 14 April 2026. Alphanumeric sender IDs are 3–11 characters.

**Implication for FlowPilot:** alphanumeric sender IDs are unusable regardless,
because they cannot receive replies and the product is a two-way conversation.
Every business needs a real Irish mobile number capable of two-way SMS. Irish
numbers carry identity and address requirements at provisioning time.
