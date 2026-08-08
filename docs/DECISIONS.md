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

*ANSWERED against the live API, 2026-08-06 — Irish voice numbers are real and buyable.*
Queried directly with FlowPilot's own credentials, not the console. All 44 Irish
geographic area codes return live inventory, Dublin included (`+3531*` → Dublin,
Tallaght, Balbriggan). $1.80/month rental, $0.010/minute inbound.
`addressRequirements: "local"` on every number.

*ANSWERED, 2026-08-06 — sub-assignment is an anticipated case, not a prohibited one.*
The `Ireland: Local - Business` regulation
(`RN5b82d0c001b4ef265770d022986f794f`) contains a required field
`is_subassigned`, described as "where an Independent Software Vendor (ISV)
assigns the phone number to their end customer", with YES as a permitted value —
alongside `business_identity`, which offers `INDEPENDENT_SOFTWARE_VENDOR`.
Twilio's own compliance flow therefore models FlowPilot's architecture as a
supported configuration. FlowPilot files as `INDEPENDENT_SOFTWARE_VENDOR` with
`is_subassigned = YES`. This supersedes the "open, blocks scale" note above; the
remaining unknown is vetting outcome, not whether the model is permitted.

*ANSWERED by pressing the button, 2026-08-08 — three requirements, not one.*
The question below was resolved by attempting a real purchase and reading what
Twilio refused. It rejects in sequence, each error hiding the next:

1. `21631 Phone Number Requires an Address` — an Address resource must exist.
   Created through the API in seconds, validated immediately, no review.
2. `21615 No valid address created for: Balbriggan, Ashbourne, Skerries…` — that
   Address must sit inside the exchange area of the specific number. An area
   code is far broader than an exchange: 01 spans Dublin city, Balbriggan and
   dozens of villages, and a Glasnevin address covers some 01 numbers and not
   others. Twilio only says which when the purchase is attempted, which is why
   provisioning now tries ten candidates rather than one (D7).
3. `21649 Bundle required and not provided for country: [IE]` — and then, on top
   of a valid locality-matching address, an approved regulatory bundle.

So the locality reading was the correct one: an address covers only its own area.
The obvious conclusion — collect every customer's address so each can have a
local number — was then rejected, because nobody ever sees the FlowPilot number.
See D7.

The Individual regulation is materially lighter than the Business one — photo ID
and a proof of address, no CRO number, no company. FlowPilot's first bundle
(`FlowPilot Ireland Local`) was submitted on that basis and is in review; Twilio
quotes 7 days. A Business bundle follows once the company exists, which is
needed for the terms and the DPA regardless.

*Superseded — the original open question, kept for the reasoning.*
The bundle's Proof of Address requirement reads: "Must include Eircode and be
within locality or region covered by the phone number's prefix; a PO Box is not
acceptable where a local address is required." Read strictly, one FlowPilot
address buys numbers only in FlowPilot's own area — which would contradict the
single-bundle inference above and mean a Cork customer cannot have a Cork
number. Read as applying per Address resource rather than per bundle, FlowPilot
creates one Twilio Address per customer from the address they give at
onboarding, and attaches it at purchase. The second reading is what the
`addressRequirements: "local"` field on each number implies, and it is the only
one compatible with selling nationally. **Confirm with Twilio compliance before
the first purchase**, because the answer decides whether onboarding must collect
a business address with Eircode. Design assumes it must.

*ANSWERED for Twilio, 2026-07-31 — Twilio has no SMS-capable Irish numbers.*
Console check (Buy a Number → Ireland) returned **Voice and Fax only**. The SMS
and MMS capability filters are greyed out and unselectable. Every result is type
**Local** — no Mobile number type is offered for Ireland at all. Address
Requirement is "Local" (an Irish address, which FlowPilot has — this supports the
single-bundle model in Q3 above). Monthly fee $1.80.

Re-confirmed against the API, 2026-08-06, this time beyond doubt: every Irish
number returns capabilities `{"MMS":false,"SMS":false,"voice":true}`, and
searching with `smsEnabled: true` returns zero results across both Local and any
other type. `AvailablePhoneNumbers/IE/Mobile` 404s — there is no Irish mobile
inventory to search. The console reading was correct.

*The way out, found 2026-08-06 — a UK mobile.*
UK **mobile** numbers (`+447…`) return `{"SMS":true,"voice":true}` with
`addressRequirements: "none"` — no bundle, no address, no ComReg registration,
buyable immediately. UK *local* numbers are voice-only like Ireland's, which is
why an earlier check missed this.

This does **not** change what customers are given. An Irish tradesperson's
callers are Irish; a `+44` number costs them more to ring and reads as a call
centre, which is the same trust failure D7 exists to prevent. The UK mobile is a
FlowPilot-owned sender and test line: it carries the confirmation texts and job
alerts that Irish numbers cannot, and it makes the pipeline testable end to end
before the Irish bundle clears. Unlike an alphanumeric sender it can also
receive replies, which leaves the door open to two-way SMS later.

Unverified: UK→Irish A2P deliverability. Test before depending on it.

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

## D7 — Numbers are bought where the bundle allows, not where the customer works

**Status:** Decided, implemented. Supersedes an earlier decision that did the opposite.
**Phase:** 2 · provisioning

**Decision**
Provisioning searches one area code — the one FlowPilot's regulatory bundle
covers, set by  and defaulting to Dublin. It does not
consider where the customer works.

**Why the earlier decision was wrong**
D7 originally matched the number to the business's own service area, justified
on the grounds that "the number is the most public artefact FlowPilot gives a
business". That is false. Calls reach FlowPilot by conditional forwarding: the
caller dials the tradesperson's own number, and the FlowPilot number is never
dialled, displayed or advertised. Nobody outside the product ever sees it, so a
Cork electrician holding a Dublin number costs nothing.

The mistake was reasoning from an analogy — an unfamiliar area code looks like a
call centre — without checking whether anyone was in a position to see it.

**Why it also became actively harmful**
Twilio requires a registered address inside the exchange area of the number
being bought. With one Dublin bundle, searching a Cork customer's area produced
ten guaranteed rejections followed by a national fallback that mostly failed
too: slower, and sometimes no number at all. The feature moved from useless to
damaging the moment the compliance requirement was understood.

**What was removed**
A map of counties, cities, Dublin postal districts and suburbs to the 44 Irish
area codes, and its tests. It is in the git history if regional numbers ever
earn their place. What survives is the candidate retry (a Dublin address covers
some 01 exchanges and not others, so ten are tried in turn) and the trunk-zero
search pattern, which is still needed and still easy to get silently wrong.

**Consequence for scale — accepted for now**
One bundle covers one area, so every customer gets a Dublin number regardless of
where they trade. The case where this shows is a customer who skips forwarding
and publishes the FlowPilot number as their own line; that is a support
conversation, not an architecture. Irish geographic numbers are nominally tied
to their region, which is worth raising with Twilio, but since the number is
never published the exposure is low.

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
