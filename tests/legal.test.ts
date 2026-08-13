import { describe, expect, it } from "vitest";
import { LEGAL, PUBLISHED_RETENTION_DAYS, SUB_PROCESSORS } from "@/lib/legal";
import { MINIMUM_RETENTION_DAYS, retentionPolicy } from "@/lib/retention";

/**
 * The privacy policy makes promises the code has to keep.
 *
 * A published policy is the one piece of writing on the site that a customer
 * could hold us to, and every claim in it is enforced somewhere else entirely —
 * in an environment variable, in a sub-processor list, in a price. Nothing
 * would notice those drifting apart, and the person who found out would be
 * whoever was harmed by it.
 */

describe("the published retention period", () => {
  it("matches what the purge job actually enforces", () => {
    /*
     * The page says a number; RETENTION_DAYS decides what happens. A policy
     * promising a year while the job deletes at ninety days is a promise broken
     * silently — the only person who finds out is a customer whose job history
     * vanished early.
     *
     * Skipped rather than failed when the variable is unset, because it is not
     * set locally by design: it is a production decision, and diagnostics
     * already warns while it is missing.
     */
    const policy = retentionPolicy();
    if (!policy.enabled) return;

    expect(policy.days).toBe(PUBLISHED_RETENTION_DAYS);
  });

  it("is a period the purge job would accept", () => {
    // Publishing a number the code refuses to run would leave the policy
    // describing a deletion that never happens.
    expect(PUBLISHED_RETENTION_DAYS).toBeGreaterThanOrEqual(
      MINIMUM_RETENTION_DAYS,
    );
    expect(Number.isInteger(PUBLISHED_RETENTION_DAYS)).toBe(true);
  });
});

describe("who we say we are", () => {
  it("does not claim to be a company", () => {
    /*
     * There is no CRO registration and no limited company. "FlowPilot Ltd"
     * anywhere on the site would be a false statement about a legal entity
     * rather than a stylistic slip, and it has to match Stripe, the Twilio
     * bundle and the domain registration — all of which are in a person's name.
     */
    const claims = [LEGAL.entity, LEGAL.tradingName].join(" ");

    expect(claims).not.toMatch(/\bltd\b|\blimited\b|\bteoranta\b|\bplc\b/i);
  });

  it("publishes no home address, and no owner's name", () => {
    /*
     * The owner works from home, so the only address available is a private
     * residence — where his family lives — and it was on every page of a
     * marketing site.
     *
     * A known gap rather than an oversight: the e-Commerce Directive expects an
     * online service provider to publish a geographic address, and the fix is a
     * registered office service rather than putting a house back on the
     * internet. Pinned so neither comes back while somebody is tidying.
     */
    expect(LEGAL.address).toBeNull();
    expect(LEGAL.entity).toBe("FlowPilot");
  });

  it("gives somewhere to actually reach a person", () => {
    expect(LEGAL.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("contacts the business, not a personal mailbox", () => {
    /*
     * On the domain, so the contact on a legal page survives a change of email
     * provider — and so somebody writing about their data is writing to the
     * business rather than into a person's inbox.
     */
    expect(LEGAL.email.endsWith("@flowpilot.ie")).toBe(true);
  });
});

describe("the sub-processor list", () => {
  it("names everyone that receives caller data", () => {
    /*
     * A customer's own GDPR position depends on this list being complete. These
     * four are load-bearing: the call cannot happen without Twilio, the
     * receptionist cannot answer without Anthropic, nothing is stored without
     * Supabase, and nothing is served without Vercel.
     */
    const names = SUB_PROCESSORS.map((p) => p.name);

    for (const required of ["Twilio", "Anthropic", "Supabase", "Vercel"]) {
      expect(names).toContain(required);
    }
  });

  it("says what each one actually receives", () => {
    // A list of company names with no explanation is not disclosure.
    for (const processor of SUB_PROCESSORS) {
      expect(processor.purpose.length).toBeGreaterThan(10);
      expect(processor.data.length).toBeGreaterThan(10);
    }
  });
});
