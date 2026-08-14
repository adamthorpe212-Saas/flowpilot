import { describe, expect, it } from "vitest";
import { EXAMPLE_TURNS, DEMO_BUSINESS_NAME, DEMO_GREETING } from "@/lib/demo-example";
import { composeOpening } from "@/lib/disclosure";
import { allFaqItems } from "@/lib/faq";
import { soldPlan } from "@/lib/plans";
import {
  DEMO_CALLER_DISPLAY,
  DEMO_CALLER_E164,
  DEMO_CALLER_E164_ALT,
  DEMO_CALLER_E164_THIRD,
} from "@/lib/demo-numbers";
import { previewLeads } from "@/lib/app-preview";

/**
 * Claims the public site makes, checked against the product that ships.
 *
 * Every one of these guards a defect that actually reached production. This
 * codebase's characteristic failure is not a crash — it is the site quietly
 * describing a FlowPilot that stopped existing: the disclosure line, the
 * default greeting, the animated phone, the demo fallback transcript, and a
 * pricing page still advertising a trial that had been deleted.
 *
 * Marketing copy has no runtime, so nothing else can catch it. A visitor does.
 */

describe("the demo transcript", () => {
  it("opens with the words a real caller hears", () => {
    /*
     * Shown only when the live demo is unavailable — which is exactly when a
     * sceptical visitor is looking hardest. It spent months opening "This is an
     * automated assistant, and I'll take notes" after the disclosure had been
     * rewritten, so the fallback for "you can't try the real thing" was itself
     * a stale imitation of the real thing.
     */
    expect(EXAMPLE_TURNS[0].text).toBe(
      composeOpening(DEMO_BUSINESS_NAME, DEMO_GREETING),
    );
  });

  it("discloses that it is not a person, before anything else", () => {
    // Not configurable in the product, so it must not be droppable here either.
    expect(EXAMPLE_TURNS[0].text).toMatch(/automated assistant/i);
    expect(EXAMPLE_TURNS[0].role).toBe("assistant");
  });
});

describe("sample phone numbers", () => {
  const shown = [
    DEMO_CALLER_E164,
    DEMO_CALLER_E164_ALT,
    DEMO_CALLER_E164_THIRD,
    ...previewLeads(new Date()).map((lead) => lead.caller_number),
  ];

  it("cannot ring a real person", () => {
    /*
     * The dashboard preview on the marketing page renders the real LeadCard,
     * which turns caller_number into a `tel:` link. A plausible number there is
     * one mis-scoped `inert` away from a visitor dialling a stranger who never
     * agreed to be in an advert.
     */
    for (const number of shown) {
      expect(number).toMatch(/^\+3538[356789]000\d{4}$/);
    }
  });

  it("still looks like an Irish mobile, so the product formats it correctly", () => {
    expect(DEMO_CALLER_DISPLAY).toMatch(/^08\d 000 \d{4}$/);
  });
});

describe("what the site promises", () => {
  it("never advertises a free trial, because there is not one", () => {
    /*
     * TRIAL_DAYS was deleted from lib/plans.ts along with every branch hanging
     * off it, and the pricing page's meta description — the line Google prints
     * under the result — kept offering one to everybody searching.
     */
    const claims = allFaqItems()
      .map((item) => `${item.question} ${item.answer}`)
      .join(" ");

    expect(claims).not.toMatch(/free trial/i);
  });

  it("answers whether the owner controls the wording", () => {
    // The product's strongest trust argument. It shipped unmentioned.
    const answer = allFaqItems().find(
      (item) => item.id === "control-what-it-says",
    );

    expect(answer).toBeDefined();
    expect(answer?.answer).toMatch(/never say|must never/i);
  });

  it("quotes the allowance the plan actually grants", () => {
    // 120, not the 200 that predated anyone reading a Twilio bill.
    expect(soldPlan().callAllowance).toBe(120);
  });
});
