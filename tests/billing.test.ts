import { describe, expect, it, vi } from "vitest";
import {
  formatPrice,
  getPlan,
  PLANS,
  soldPlan,
  weeklyPrice,
} from "@/lib/plans";
import { toSubscriptionStatus } from "@/lib/stripe";
import { render } from "@/lib/voice/notify";

describe("plans", () => {
  it("sells exactly one plan, and defines only that one", () => {
    /*
     * A tier table asks a tradesperson to work out which version of the product
     * they are before they know what it is. There is one.
     *
     * The length check is the load-bearing half. Withdrawn tiers used to stay
     * defined so legacy ids resolved, and that is exactly how every new signup
     * ended up written as Starter — the tier kept alive for old rows became the
     * default for new ones. A second entry here is a product decision, not a
     * refactor, and should not arrive by accident.
     */
    expect(PLANS).toHaveLength(1);
    expect(PLANS.filter((plan) => plan.sold)).toHaveLength(1);
    expect(soldPlan().id).toBe("pro");

    /*
     * Pinned so the price cannot move by accident. It is not the test's job to
     * decide what FlowPilot costs, but a figure that appears on every page and
     * inside Stripe should take two deliberate edits to change, not one typo.
     *
     * Changing this means also creating a new Price in Stripe and repointing
     * STRIPE_PRICE_PRO — otherwise the site advertises one number and a card is
     * debited another. Diagnostics checks that live.
     */
    expect(soldPlan().price).toBe(159);

    /*
     * Pinned for the same reason as the price, and it took a real bill to find
     * out why. At 200 the allowance quietly cost more than the margin could
     * carry: an answered call measures at about €0.38 all in — speech
     * recognition billed per 15 second interval, two SMS, the model, the
     * voice — so a customer at the cap consumed €77 of a €159 subscription.
     *
     * An allowance is a cost commitment written as a marketing number, which is
     * exactly the kind of figure that drifts upward to win an argument. Moving
     * it should mean re-reading the unit economics, not editing one line.
     */
    expect(soldPlan().callAllowance).toBe(120);
  });

  it("still resolves a withdrawn tier without breaking the page", () => {
    /*
     * Starter and Business are no longer defined. An account still carrying one
     * of those ids must render its dashboard and billing page — falling back to
     * the plan on sale — rather than throwing over a stale string in a column.
     */
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => getPlan("starter")).not.toThrow();
    expect(getPlan("business").id).toBe(soldPlan().id);

    // Logged, not swallowed: it is still worth someone finding.
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("only advertises features the product actually has", () => {
    /*
     * This list once promised "full call recordings", which FlowPilot has never
     * done — calls are transcribed, never recorded. A pricing page is the worst
     * place to overstate, so the words that would imply it are barred.
     */
    const copy = soldPlan().features.join(" ").toLowerCase();
    expect(copy).not.toMatch(/recording/);
    expect(copy).not.toMatch(/unlimited/);
  });

  it("formats prices as whole euro", () => {
    expect(formatPrice(soldPlan())).toBe("€159");
  });

  it("never overstates the weekly figure in our own favour", () => {
    /*
     * The weekly line is the selling point, so it is the one most tempting to
     * round down. It is derived and rounded UP: a tradesperson who does the
     * multiplication should find we understated what he gets, never that we
     * shaved the number to look cheaper.
     */
    const plan = soldPlan();
    const weekly = Number(weeklyPrice(plan).replace(/[^\d.]/g, ""));
    const trueWeekly = plan.price / (52 / 12);

    expect(weekly).toBeGreaterThanOrEqual(trueWeekly);
    expect(weekly).toBeLessThan(trueWeekly + 1);
  });

  it("keeps the weekly figure honest against the monthly one", () => {
    // Twelve of these must still be a year's subscription, give or take the
    // rounding — the framing changes, the money does not.
    const plan = soldPlan();
    const weekly = Number(weeklyPrice(plan).replace(/[^\d.]/g, ""));

    expect(weekly * 52).toBeGreaterThanOrEqual(plan.price * 12);
    expect(weekly * 52).toBeLessThan(plan.price * 12 + 52);
  });

  it("never invents a price for an id it does not know", () => {
    /*
     * It used to throw here, which was right while withdrawn tiers were still
     * defined — an unknown id meant a bug worth surfacing loudly. With one plan
     * left, throwing would take down somebody's billing page over a stale
     * string, so it falls back instead. What must never happen is quietly
     * inventing a tier: whatever comes back is the plan actually on sale, at
     * the price the site advertises.
     */
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    // @ts-expect-error deliberately invalid
    const resolved = getPlan("enterprise");

    expect(resolved).toEqual(soldPlan());
    expect(resolved.price).toBe(159);
    errors.mockRestore();
  });
});

describe("toSubscriptionStatus", () => {
  it("maps the states we act on", () => {
    expect(toSubscriptionStatus("trialing")).toBe("trialing");
    expect(toSubscriptionStatus("active")).toBe("active");
    expect(toSubscriptionStatus("canceled")).toBe("canceled");
  });

  it("collapses unpaid into past_due", () => {
    // Both mean the same thing to a customer — fix your card, service
    // continues — so splitting them would be two paths that always agree.
    expect(toSubscriptionStatus("past_due")).toBe("past_due");
    expect(toSubscriptionStatus("unpaid")).toBe("past_due");
  });

  it("treats an expired incomplete signup as cancelled", () => {
    expect(toSubscriptionStatus("incomplete_expired")).toBe("canceled");
  });

  it("falls back to incomplete for anything unrecognised", () => {
    expect(toSubscriptionStatus("paused")).toBe("incomplete");
  });
});

describe("render", () => {
  it("substitutes placeholders", () => {
    expect(
      render("Thanks {{caller_name}} — {{job_type}} in {{location}}.", {
        caller_name: "John",
        job_type: "burst pipe",
        location: "Raheny",
      }),
    ).toBe("Thanks John — burst pipe in Raheny.");
  });

  it("never leaks a raw placeholder to a customer", () => {
    const result = render("Thanks {{caller_name}} — {{job_type}}.", {
      caller_name: "John",
    });

    expect(result).not.toContain("{{");
    expect(result).toBe("Thanks John —.");
  });

  it("tidies the whitespace a missing value leaves behind", () => {
    expect(render("Job: {{job_type}} , {{location}} .", {})).toBe("Job:,.");
  });
});

describe("what a new business is created on", () => {
  it("only ever creates on a plan that is actually sold", () => {
    /*
     * Two halves of one hole, and either alone leaves it open.
     *
     * lib/auth.ts used to fall back to the literal "starter" when signup
     * metadata was missing, and the create_business RPC validated against
     * ('starter', 'pro', 'business') — a list written when all three were on
     * sale. So a magic link, a restored session, or a crafted metadata value
     * could write a business onto a withdrawn tier at an allowance nobody had
     * costed.
     *
     * That is the same defect that once billed customers against Starter's 50
     * calls while they paid for Pro: a withdrawn tier left reachable because
     * removing it looked riskier than leaving it.
     *
     * The SQL side is pinned in the migration. This pins the invariant both
     * sides depend on — that there is exactly one creatable plan, and it is the
     * one on sale.
     */
    const creatable = PLANS.filter((plan) => plan.sold).map((plan) => plan.id);

    expect(creatable).toEqual(["pro"]);
    expect(soldPlan().id).toBe("pro");
  });

  it("never falls back to a plan it does not define", () => {
    /*
     * The guard against writing the fallback out as a literal again. Whatever
     * a new business is created on has to be a plan this file knows about, so
     * the row and the rendered page can never disagree.
     */
    const defined = PLANS.map((plan) => plan.id);
    expect(defined).toContain(soldPlan().id);
  });
});
