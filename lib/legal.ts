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
  /**
   * The trading name, published alone.
   *
   * This was "Adam Thorpe, trading as FlowPilot" with a home address beside it.
   * Both are gone from every public page: the owner works from home, and a
   * private residence on a marketing site is a different thing from a business
   * address — it is where his family lives, published to anyone who lands on
   * the pricing page.
   *
   * The sole trader position has not changed. There is still no company and no
   * CRO number, so nothing here says "Ltd" — that would be a false statement
   * about a legal entity rather than a stylistic choice. What changed is how
   * much of a private individual is on display to make that point.
   */
  entity: "FlowPilot",
  tradingName: "FlowPilot",
  /**
   * No geographic address published, and this is a known gap rather than an
   * oversight.
   *
   * The e-Commerce Directive expects an online service provider to publish one,
   * and GDPR expects a data controller to be contactable. The email below
   * carries the contact duty; the address duty is currently unmet, because the
   * only address available is a home one.
   *
   * The fix is a registered office service — roughly €100–250 a year from any
   * Irish formation agent or accountant — which gives a business address to
   * publish instead. Worth doing before FlowPilot has customers who might one
   * day need to serve notice on it.
   */
  address: null,
  /**
   * On the domain rather than a personal mailbox, so the contact on a legal
   * page survives the owner changing email provider — and so a customer writing
   * about their data is writing to the business.
   *
   * Twilio and Stripe still hold the real registered details separately. Those
   * are filings, not publications, and are not affected by what this page says.
   */
  email: "adam@flowpilot.ie",
  country: "Ireland",
} as const;

/**
 * When these documents last changed.
 *
 * A privacy policy with no date is one nobody can tell is current, and it is the
 * first thing anyone reviewing it looks for.
 */
export const LEGAL_UPDATED = "14 August 2026";

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
