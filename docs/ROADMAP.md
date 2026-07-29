# FlowPilot Roadmap

This roadmap sequences FlowPilot from its current state (a static marketing page) to a
production-ready SaaS. It is written to be read by engineering and by the business side —
every phase states not just what gets built, but why it's being built at that point and
what it costs us if we get the order wrong.

## Guiding principles

These principles constrain every phase below. Any future addition to this roadmap should
be checked against them before it's added.

1. **FlowPilot is industry-agnostic, not trade-specific.** The platform serves any service
   business — plumbers, electricians, builders, roofers, cleaners, landscapers, HVAC,
   locksmiths, pest control, flooring, decorators, mechanics, and others. Nothing in the
   architecture, data model, or AI behaviour should assume a single trade. Businesses are
   configured, not templated — services, FAQs, qualification questions, and AI behaviour
   are per-business data, not hardcoded logic. Marketing may target specific industries;
   the product never does.
2. **Prove value before automating monetisation.** Early customers are onboarded and
   billed manually. Self-service onboarding and subscription billing are built once the
   core product is proven — but the system is architected from day one so that self-serve
   can be added additively, without a redesign, when the time comes.
3. **SMS before voice.** The MVP is a text-based AI receptionist. Voice AI is a later,
   harder phase (latency, speech quality, failure handling, materially higher cost) that
   is only justified once the SMS workflow has proven it converts missed calls into
   booked work.
4. **Foundations are not deferred.** Authentication, multi-tenancy, environment
   management, security, logging, and observability are built from the beginning at a
   baseline level, because every later feature depends on them and retrofitting any of
   them is a rewrite, not an upgrade. A dedicated hardening/maturity pass comes later, but
   the baseline exists from Phase 1.
5. **No architecture is committed in this document.** Where a phase depends on a choice of
   provider, framework, or infrastructure pattern that has not yet been decided (telephony,
   AI orchestration, hosting, database), this roadmap names the decision that needs making,
   not an assumed answer. Those decisions belong in a future `docs/ARCHITECTURE.md`, written
   once they are actually made — not before.

---

## Phase 0 — Foundational Decisions & Compliance Groundwork

**Objective**
Make the decisions that everything else depends on, before writing product code against
assumptions that later turn out wrong.

**Commercial reasoning**
Every week spent building on an undecided or wrong foundation is a week that gets partly
thrown away. Compliance groundwork is not optional polish — this product will hold call/SMS
content and customer PII for small businesses in an EU market from the first pilot onward.

**Product scope**
None — this phase produces decisions and documentation, not shipped product surface.

**Technical scope**
- Decide: telephony/SMS provider, AI/LLM orchestration approach, database and
  multi-tenancy strategy, hosting/infrastructure, auth approach.
- Define the initial configurable "business profile" schema at a conceptual level: what
  varies per business (services offered, FAQs, qualification questions, hours, escalation
  rules, tone of voice) versus what is shared platform logic.
- Draft a data-processing and retention policy (GDPR-aligned) for call/SMS content and
  customer PII.
- Draft consent language for call/SMS handling ahead of the first real phone number being
  provisioned.

**Success criteria**
- Every open technical decision listed above has an owner and a documented answer (even if
  the answer is written down informally first, ahead of a future `docs/ARCHITECTURE.md`).
- A compliance stance exists that a real pilot customer's data can be handled against.

**Exit criteria**
No unresolved "TBD" on provider/infrastructure choices needed to start Phase 1. Compliance
groundwork reviewed by whoever is accountable for it (legal/founder).

**Risks**
- Rushing this phase to "get to code" reproduces the exact problem it exists to prevent.
- Compliance treated as an afterthought becomes a launch blocker later, at a worse time.

**Explicitly out of scope**
Writing `docs/ARCHITECTURE.md`. Any application code. Vendor contracts beyond what's needed
to validate a decision.

---

## Phase 1 — Platform Foundations

**Objective**
Build the load-bearing systems every later feature sits on: multi-tenancy, auth, the
configurable business-profile data model, environment management, and a security/
observability baseline.

**Commercial reasoning**
Invisible to customers, but the single highest-leverage phase to get right — mistakes here
(especially in multi-tenancy and the business-profile model) are the most expensive to fix
later, because Phase 2 onward builds directly on top of them.

**Product scope**
None customer-facing yet, beyond the existing marketing site.

**Technical scope**
- Multi-tenant data model: business → users → business profile (services, FAQs,
  qualification questions, hours, escalation rules) → leads → conversations →
  appointments. Designed for tenant isolation from the start.
- The business-profile model must express *any* service business without code changes
  per industry — this is the concrete implementation of principle 1.
- Data model includes plan/subscription-status fields from the start (even though billing
  enforcement is manual in Phase 2), so Phase 3's self-serve billing is additive, not a
  migration.
- Authentication (business owner login).
- Environment and secrets management; a CI pipeline (lint, typecheck, build) on every
  change.
- Baseline security practices: input validation at boundaries, secrets never in source,
  least-privilege access to data.
- Baseline observability: structured logging and error tracking wired in from the first
  deployed backend code, not bolted on later.
- Deployment pipeline stood up early so every subsequent phase ships continuously.

**Success criteria**
- A business can be created, an owner can log in, and a business profile can be configured
  for a plumber and, separately, for a cleaner, using the same schema and no
  industry-specific code paths.
- CI blocks broken code from merging.

**Exit criteria**
Foundations are stable enough that Phase 2 is pure product work on top of them, not
infrastructure work in disguise.

**Risks**
- Under-investing in the business-profile model's flexibility now is the single most
  likely way principle 1 gets silently violated later.
- Skipping observability baseline "to move faster" makes Phase 2 debugging (a live AI
  conversation pipeline) much harder than it needs to be.

**Explicitly out of scope**
CRM features, billing integration, telephony integration, AI conversation logic.

---

## Phase 2 — MVP: AI SMS Receptionist

**Objective**
Ship the core value proposition and prove it works, with the least infrastructure built
around it that's honest to test with real customers.

**Commercial reasoning**
This is the actual product bet. It should be validated before any further investment goes
into automating onboarding or billing around it. Manual pilot onboarding (a sales
conversation, a manually provisioned number, a Stripe payment link or invoice) is
deliberately chosen over building self-serve signup first.

**Product scope**
The MVP flow, exactly:
1. A missed call is detected.
2. FlowPilot responds immediately by SMS.
3. The AI qualifies the lead using that business's configured services, FAQs, and
   qualification questions (not a fixed script).
4. The business owner receives the qualified lead.
5. The customer can progress toward a booking.

Voice AI is explicitly not part of this phase.

**Technical scope**
- Inbound call/SMS handling via the provider chosen in Phase 0.
- AI qualification logic driven by each business's configured profile from Phase 1 — the
  same conversation engine must produce sensibly different qualifying questions for a
  plumber versus a roofer versus a cleaner, purely from configuration data.
- Lead record creation and owner notification.
- A minimal internal dashboard to view leads/conversations — functional, not polished.
- Manual number provisioning and manual billing per pilot customer; no self-serve signup.

**Success criteria**
- 5–10 pilot businesses across *different* trades (not all plumbers) are live, to prove
  the industry-agnostic model actually holds under real use, not just in theory.
- Missed calls are reliably converted into qualified leads the owner acts on.
- At least one pilot business books a job that came through FlowPilot's SMS flow.

**Exit criteria**
Pilot businesses show the flow reliably produces qualified leads and owners find it
valuable enough to want to keep paying for it (informally validated before Phase 3 is
resourced).

**Risks**
- Testing with a single trade would falsely validate principle 1; pilots must span
  multiple industries.
- AI qualification quality is the whole product here — under-investing in prompt/behaviour
  quality for the sake of shipping fast undermines the entire pilot's signal.

**Explicitly out of scope**
Self-serve onboarding, subscription billing, CRM/scheduling beyond lead capture, voice AI,
team roles beyond a single owner.

---

## Phase 3 — Self-Serve Onboarding & Subscription Billing

**Objective**
Automate the business side of the product once the core AI receptionist flow is proven,
removing the founder as the onboarding/billing bottleneck.

**Commercial reasoning**
Only justified once Phase 2 shows real retention and willingness to pay. Building this
earlier would have been automating monetisation for an unproven product.

**Product scope**
- Self-serve signup and guided onboarding: business profile setup (services, hours,
  escalation rules) without a sales call.
- Subscription billing mapped to plan tiers, with plan-gated features.
- Automated number provisioning.

**Technical scope**
- Billing integration built on top of the plan/subscription-status fields already present
  in the Phase 1 data model — additive, not a data model migration.
- Onboarding flow UX for a non-technical business owner, across any trade.
- Automated provisioning replacing the manual Phase 2 process.

**Success criteria**
- A new business can go from signup to a live, working AI receptionist with no manual
  intervention from FlowPilot staff.
- Billing correctly enforces plan limits/tiers.

**Exit criteria**
Self-serve conversion and activation rates are healthy enough that manual onboarding is no
longer the default path.

**Risks**
- Onboarding UX that assumes too much of a "typical" business (falling back into
  trade-specific assumptions) undermines principle 1 at the exact point customers first
  configure their business.

**Explicitly out of scope**
CRM/scheduling features, voice AI, multi-user roles.

---

## Phase 4 — CRM Foundation & Scheduling

**Objective**
Turn "receptionist" into a system the business runs on daily, increasing retention and
switching cost.

**Commercial reasoning**
This is the retention and upsell layer — the difference between a tool that's nice to have
and one that's structurally hard to leave. It also justifies Pro/Business tier pricing.

**Product scope**
- Lead pipeline (new → qualified → booked → completed).
- Calendar/appointment booking.
- Team alerts when a new lead arrives.

**Technical scope**
- Scheduling/calendar integration.
- Pipeline state modelling on top of the existing lead/conversation data.
- Notification delivery (SMS/email/push).

**Success criteria**
- Business owners check FlowPilot's dashboard as part of their daily routine, not just
  when notified.
- Measurable increase in retention versus Phase 2/3 cohorts.

**Exit criteria**
CRM/scheduling is used, not just shipped — usage data shows regular engagement.

**Risks**
- Scope creep toward a full CRM before the basics (pipeline, calendar, alerts) are solid.

**Explicitly out of scope**
Voice AI, multi-role team accounts, third-party integrations beyond calendar.

---

## Phase 5 — Security, Observability & Reliability Maturity

**Objective**
A dedicated hardening pass beyond the Phase 1 baseline, sized to the trust and scale the
product now carries.

**Commercial reasoning**
FlowPilot holds phone numbers, call/SMS content, and PII for businesses trusting it with
their livelihood, sold at a premium price. A breach or a public outage is disproportionately
damaging to that positioning — this is not optional polish at this stage, it's what the
premium price is implicitly charging for.

**Product scope**
None directly customer-facing, though reliability is felt by customers.

**Technical scope**
- Rate limiting, audit logging, alerting on anomalies.
- Backup and disaster recovery tested, not just configured.
- Uptime monitoring against SLAs appropriate to a communications-critical product.
- External security review before scaling marketing spend.

**Success criteria**
- A tested restore from backup succeeds.
- A security review is completed with no unresolved high-severity findings.

**Exit criteria**
The team is confident scaling customer acquisition without reliability or security being
the limiting factor.

**Risks**
- Treating this as a one-time checklist rather than an ongoing discipline.

**Explicitly out of scope**
New product features.

---

## Phase 6 — Voice AI Receptionist

**Objective**
Add phone-call answering, the harder and more differentiated capability, once the SMS
workflow has proven the underlying qualification/booking logic works.

**Commercial reasoning**
Voice is likely the strongest marketing story (it's what the current landing page already
depicts) but is technically riskier and materially more expensive per interaction — it
belongs after the core loop is proven and revenue-generating, not before.

**Product scope**
- Live AI phone answering, using the same underlying business-profile and qualification
  logic already proven in the SMS flow.

**Technical scope**
- Speech-to-text / text-to-speech pipeline, latency and failure handling for live calls,
  cost-per-minute management.
- Reuse of the Phase 1–2 qualification and lead pipeline rather than a parallel system.

**Success criteria**
- Voice-originated leads convert at a rate comparable to SMS-originated leads.

**Exit criteria**
Voice is stable enough to be marketed as a core feature, not a beta.

**Risks**
- Building a separate qualification/AI system for voice instead of extending the existing
  one would duplicate logic and violate principle 1's "same platform, per-business
  configuration" model.

**Explicitly out of scope**
Anything not required to answer and qualify a live call.

---

## Phase 7 — Business OS & Scale-Out

**Objective**
Grow from "AI receptionist + CRM" into the broader operating system for service
businesses described in `docs/VISION.md`.

**Commercial reasoning**
Only valuable once the core receptionist and CRM have real usage to build on top of —
this is deliberately last.

**Product scope**
- Multi-user roles (owner, dispatcher, technician).
- End-customer payment collection, invoicing.
- Reporting and analytics.
- Third-party integrations (accounting software, etc.).

**Technical scope**
- Infrastructure scaling as customer count grows.
- Role-based access control.
- Integration/webhook surface for third parties.

**Success criteria / Exit criteria**
Defined when this phase is actually scoped, closer to the time — premature to fix targets
this far out.

**Risks**
Scope is inherently the least certain this far out; treat the items above as directional,
not committed.

**Explicitly out of scope**
Nothing yet ruled out — this phase is intentionally the least specified.
