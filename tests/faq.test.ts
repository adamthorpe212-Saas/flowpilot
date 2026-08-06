import { describe, expect, it } from "vitest";
import {
  HOME_FAQ_IDS,
  PRICING_FAQ_IDS,
  faqItems,
  type FaqItem,
} from "@/lib/faq";

/**
 * The FAQ is read at the moment somebody decides whether to trust us, so the
 * failure that matters is an answer quietly disappearing from a page.
 */

describe("faqItems", () => {
  it("returns the questions in the order asked for", () => {
    const items = faqItems(["cancel", "keep-number"]);
    expect(items.map((item: FaqItem) => item.id)).toEqual([
      "cancel",
      "keep-number",
    ]);
  });

  it("throws on an unknown id rather than skipping it", () => {
    // Skipping would leave a page one answer short, which looks deliberate and
    // would survive review.
    expect(() => faqItems(["no-such-question"])).toThrow(/Unknown FAQ id/);
  });

  it("resolves every id both pages use", () => {
    expect(() => faqItems(HOME_FAQ_IDS)).not.toThrow();
    expect(() => faqItems(PRICING_FAQ_IDS)).not.toThrow();
  });
});

describe("the answers themselves", () => {
  const all = [...faqItems(HOME_FAQ_IDS), ...faqItems(PRICING_FAQ_IDS)];

  it("gives one answer per question across both pages", () => {
    /*
     * The reason this file exists. The homepage and the pricing page both
     * answer "do I need a new number" and "can I cancel", and before they
     * shared a source they gave different answers — cancelling happened from
     * "your dashboard" on one page and "your billing settings" on the other.
     */
    const byQuestion = new Map<string, Set<string>>();
    for (const item of all) {
      const answers = byQuestion.get(item.question) ?? new Set<string>();
      answers.add(item.answer);
      byQuestion.set(item.question, answers);
    }

    for (const [question, answers] of byQuestion) {
      expect(answers.size, `"${question}" has more than one answer`).toBe(1);
    }
  });

  it("never promises a price the plans do not charge", () => {
    // Prices belong next to the plans, where they are generated from the plan
    // definitions and cannot drift from what Stripe bills.
    for (const item of all) {
      expect(item.answer, `"${item.question}" hardcodes a price`).not.toMatch(
        /€\d/,
      );
    }
  });
});
