# The Business Profile

The concrete implementation of `docs/ROADMAP.md` principle 1 — *FlowPilot is
industry-agnostic, not trade-specific.*

Everything that makes a plumber's receptionist behave differently from a
cleaner's lives in this document as **data**. Nothing in it is a code path. If a
new trade ever requires a code change, principle 1 has been broken and the fix
belongs here, not in a conditional.

**The test this design has to pass:** configure a plumber and a cleaner using the
same schema, with no industry-specific code anywhere, and have both produce
sensible, differently-worded qualification calls.

---

## What varies per business

### Identity and reach

| Field | Purpose | Example |
| --- | --- | --- |
| `business_name` | Spoken in the greeting | "O'Brien Plumbing" |
| `industry_label` | Marketing and reporting only — **never** branches logic | "Plumbing" |
| `service_area` | Places served; used to flag out-of-area jobs | Dublin 3, 5, 9, 13 |
| `opening_hours` | Per weekday, with closed days | Mon–Fri 08:00–18:00 |
| `timezone` | Always `Europe/Dublin` for now, but not hardcoded | `Europe/Dublin` |

### Services

A list, not an enum. Each entry:

- `name` — what the customer would call it ("burst pipe", "end-of-tenancy clean")
- `emergency_eligible` — can this ever be urgent?
- `typical_urgency` — the default when the caller doesn't signal otherwise

This list is the vocabulary the AI matches a caller's description against. It is
the single biggest reason a plumber and a cleaner sound different without any
difference in code.

### Qualification questions

Ordered, and each one:

- `prompt` — how to ask it, in this business's voice
- `captures` — which field of the lead it fills (`job_type`, `location`,
  `urgency`, `contact_name`, `preferred_time`)
- `required` — does the call fail its purpose without this?

Ships with a sensible default set that works for any service business. Businesses
override or reorder rather than starting from nothing — an empty questionnaire on
day one is how onboarding gets abandoned.

### Urgency rules

- What this business treats as urgent — conditions over services and caller
  language, not a fixed keyword list
- What urgency changes: notify immediately, out of hours, differently

A burst pipe is an emergency. An end-of-tenancy clean is not. Neither fact
belongs in the codebase.

### Notification and escalation

- Who is told about a new lead, and how (SMS, email)
- Whether urgent leads escalate differently
- What happens outside opening hours — still answer, still notify, or answer and
  hold until morning

### Voice and boundaries

- `tone` — brief guidance the model receives ("friendly, plain, no jargon")
- `greeting` — optional override of the default opening line
- `must_not` — things the AI is forbidden to do. Defaults matter here: **never
  quote a price, never promise an arrival time.** Both are how a receptionist
  loses a customer money.
- `faqs` — questions it *may* answer, per business
- `fallback` — what to say when it doesn't know. Never guess; capture and hand
  over.

### Call handling

- `max_duration` — hard stop, so a confused call can't run up cost
- `closing_line` — what it says before ending
- `confirmation_sms` — the template for the follow-up text (see D6 in
  `docs/DECISIONS.md`)

---

## What is shared platform logic

Deliberately **not** configurable — this is the product, and it must behave the
same for everyone:

- Detecting and recording the missed call
- Running the conversation loop and the turn-taking
- Matching what the caller says against the configured services
- Building the lead record and its state
- Sending notifications and the confirmation SMS
- Tenant isolation, audit trail, retention

A business configures *what* is asked and *how it sounds*. It never configures
*how FlowPilot works*.

---

## Shape in the database

```
business
  └── business_profile        1:1  · everything above
  └── service[]                    · the vocabulary
  └── qualification_question[]     · ordered
  └── notification_rule[]          · who hears what, when
  └── lead[]
        └── call                   · recording, transcript, duration
        └── captured_field[]       · what the questions actually filled
```

Every table carries `business_id` and ships with a row-level security policy from
the moment it is created — see D3 in `docs/DECISIONS.md`. Retrofitting RLS is a
migration with a data-exposure window, and there is no reason to accept that
later when it is free now.

`business` also carries `plan` and `subscription_status` from day one, even
though nothing reads them until self-serve billing exists. See D5 — this is what
makes that phase additive rather than a migration.

---

## Open questions

**Do services need per-business qualification questions?** A plumber may want to
ask different things about a burst pipe than about a boiler service. Modelling
questions per service rather than per business is more expressive and more
onboarding burden. Recommendation: start per-business, and only add per-service
overrides if a pilot actually asks for it.

**How much can the model infer versus be told?** A capable model can often work
out that a burst pipe is urgent without being configured to. The risk of relying
on that is silent inconsistency between businesses. Recommendation: configure it
explicitly, and let the model handle only the cases configuration didn't
anticipate.

**Does `service_area` gate anything, or just annotate?** Refusing out-of-area
callers outright is a bad first impression if the business would have travelled.
Recommendation: capture and flag, never refuse.
