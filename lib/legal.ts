/**
 * Who FlowPilot legally is, in one place.
 *
 * These details appear on the privacy policy, the terms, the footer and — the
 * reason they are centralised — in a Stripe account, a Twilio regulatory bundle
 * and a domain registration that all have to agree with each other. A trading
 * name that reads one way on the site and another on a card statement is what
 * makes somebody stop and wonder who they just paid.
 *
 * Sole trader, deliberately. There is no company and no CRO number yet, so
 * saying "FlowPilot Ltd" anywhere would be a false statement about a legal
 * entity rather than a stylistic choice.
 */

export const LEGAL = {
  /** The person actually contracting. Matches Stripe and the Twilio bundle. */
  entity: "Adam Thorpe, trading as FlowPilot",
  tradingName: "FlowPilot",
  address: "28 Glasnevin Park, Dublin 11, D11 N4F8, Ireland",
  /**
   * Also the address on file with Twilio for the Irish number and with Stripe
   * for the merchant account. Changing it means changing it in three places.
   */
  email: "adamthorpe212@gmail.com",
  country: "Ireland",
} as const;

/**
 * When these documents last changed.
 *
 * A privacy policy with no date is one nobody can tell is current, and it is the
 * first thing anyone reviewing it looks for.
 */
export const LEGAL_UPDATED = "12 August 2026";

/**
 * The retention period the privacy policy publishes.
 *
 * Separate from RETENTION_DAYS, which is what the purge job actually enforces,
 * because the two live in different places — one in an environment variable and
 * one on a public page — and nothing would notice them disagreeing. A policy
 * promising twelve months while the job deletes at ninety days is a promise
 * broken silently, and the only person who finds out is a customer whose job
 * history vanished.
 *
 * tests/legal.test.ts asserts they match whenever the env var is set, so the
 * page cannot quietly start describing a period nobody configured.
 */
export const PUBLISHED_RETENTION_DAYS = 365;

/**
 * Everyone who receives personal data, and what they get.
 *
 * Derived from docs/DATA-PROCESSING.md, which is derived from the code. A
 * sub-processor list assembled from memory is one that goes stale the first
 * time an integration changes, and this is the list a customer's own data
 * protection obligations depend on.
 */
export const SUB_PROCESSORS = [
  {
    name: "Twilio",
    purpose: "Carries the phone call and converts speech to text",
    data: "Both phone numbers, and everything the caller says",
  },
  {
    name: "Anthropic",
    purpose: "Decides what the receptionist says next",
    data: "The conversation so far, including any name and address given",
  },
  {
    name: "Supabase",
    purpose: "Database and sign-in",
    data: "Everything above, plus the business's own account details",
  },
  {
    name: "Vercel",
    // "Hosting" was the original wording and it undersold what happens here:
    // the code that answers a live call runs on Vercel, so caller speech passes
    // through it in transit rather than merely the marketing site.
    purpose: "Runs the website and the code that answers each call",
    data: "Request metadata, including IP addresses in server logs",
  },
  {
    name: "Stripe",
    purpose: "Subscription billing",
    data: "The business owner's billing details. Never a caller's data",
  },
] as const;
