/**
 * Answers to customer questions, defined once.
 *
 * These were previously written out separately on the homepage and the pricing
 * page, and had already drifted: cancelling was described as happening "from
 * your dashboard" in one place and "from your billing settings" in the other,
 * ending either "the month" or "the period" you had paid for. Both cannot be
 * right, and the one a customer remembers is whichever they read first.
 *
 * Every answer here is checked against what the product actually does. An FAQ
 * is read at the moment somebody is deciding whether to trust us, so a claim
 * the code does not honour costs more than saying nothing.
 */

import { AI_DISCLOSURE_EXAMPLE } from "@/lib/disclosure";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

const ITEMS: FaqItem[] = [
  {
    id: "keep-number",
    question: "Do I have to change my number?",
    answer:
      "No. You keep the number that's on your van, your website and your Google listing. You dial one short code once, and calls you don't pick up land with FlowPilot instead of voicemail. Nothing else about how you work changes.",
  },
  {
    id: "is-it-a-machine",
    question: "Will my customers know they're talking to a machine?",
    answer:
      /*
       * Quoted from the source rather than retyped. This answer sat here still
       * promising "This is an automated assistant, and I'll take notes" after
       * the greeting had been rewritten — an FAQ describing words no caller
       * hears, on the page where somebody decides whether to trust us.
       */
      `Yes, because we tell them. Every call opens with "${AI_DISCLOSURE_EXAMPLE}" before your own greeting. You can't switch that off, and that's deliberate — somebody describing an emergency in their kitchen deserves to know what they're speaking to.`,
  },
  {
    id: "misunderstands",
    question: "What if it doesn't understand the job?",
    answer:
      "It asks again. If it still can't tell, it takes whatever details it has and flags the job for you rather than guessing — you get a lead marked as needing a human. It never quotes a price and never promises a time you haven't agreed to.",
  },
  {
    /*
     * The product's strongest trust argument, and the site never made it.
     *
     * Settings has had "What your receptionist says", "What details it gets
     * from callers" and "Callers it should never answer" for months, and a
     * visitor deciding whether to hand over their phone line could not learn
     * any of it without buying first. The fear being answered is specific —
     * that a machine will speak for their business and say something that
     * costs them a customer.
     */
    id: "control-what-it-says",
    question: "Can I control what it says?",
    answer:
      "All of it. You write how it introduces itself, the questions it asks, the details it collects and the things it must never say — and you can try it yourself in settings before a customer ever hears it. It won't quote a price or promise a time unless you've told it to.",
  },
  {
    id: "out-of-hours",
    question: "What happens outside my working hours?",
    answer:
      "Whatever you tell it to. Answer and text you straight away, answer and hold the job until morning, or don't answer at all. You set your hours and the behaviour separately, so a Saturday emergency and a Tuesday teatime can be handled differently.",
  },
  {
    id: "recording",
    question: "Are you recording my customers' calls?",
    answer:
      "No. Calls are transcribed, not recorded — there is no audio file, anywhere. You can delete a caller's details from your dashboard, and that clears the transcript too, so erasing someone genuinely erases them.",
  },
  {
    id: "answered-call",
    question: "What counts as an answered call?",
    answer:
      "A call your receptionist actually picks up and handles. Calls you answer yourself never touch FlowPilot and are never counted.",
  },
  {
    id: "over-allowance",
    question: "What if I go over my calls?",
    answer:
      "We'll tell you before you get close, and your receptionist keeps answering — we never cut you off mid-month. It's a fair-use figure, not a wall. If you're regularly well over it we'll talk to you before anything changes.",
  },
  {
    id: "time-to-live",
    question: "How long until it's actually answering calls?",
    answer:
      "Most of it is done while you set it up — the number is bought and configured for you in the background. The one thing only you can do is dial the forwarding code on your own handset, which takes about ten seconds.",
  },
  {
    id: "cancel",
    question: "Can I cancel?",
    answer:
      "Any time, from your billing settings. It keeps answering until the end of the month you've paid for. There's no notice period and nothing to ring anyone about.",
  },
];

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

/**
 * The questions for a given page, in the order given.
 *
 * Throws on an unknown id rather than skipping it: a silently missing answer
 * looks like a design choice and would survive review.
 */
export function faqItems(ids: readonly string[]): FaqItem[] {
  return ids.map((id) => {
    const item = BY_ID.get(id);
    if (!item) throw new Error(`Unknown FAQ id: ${id}`);
    return item;
  });
}

/**
 * Every answer we have written, whichever page happens to show it.
 *
 * For anything that must not depend on page layout — the Ask assistant's
 * knowledge, and the tests that check answers do not contradict each other.
 * Deriving those from the page lists meant that trimming a page silently took
 * knowledge away from the chat.
 */
export function allFaqItems(): FaqItem[] {
  return [...ITEMS];
}

/**
 * The two objections left standing by the time somebody reaches the price.
 *
 * This was five, and three of them are now answered better upstairs than a
 * collapsed paragraph ever managed. The control section shows the block list,
 * the switch, the question builder and what the receptionist may know about the
 * diary — so "can I control what it says", "is it obvious it's a machine" and
 * "what if it misunderstands someone" are being asked of a reader who has just
 * been shown the answer.
 *
 * What survives is the pair that no screenshot can settle: whether he keeps the
 * number on his van, and how long before it is actually working. Both stay on
 * /faq as well, so nothing is lost — only moved off the page where the reader
 * is deciding rather than researching.
 */
export const HOME_FAQ_IDS = ["keep-number", "time-to-live"] as const;

/** The full set, for somebody reading the page that explains the product. */
export const LEARN_FAQ_IDS = [
  "keep-number",
  "is-it-a-machine",
  "misunderstands",
  "control-what-it-says",
  "out-of-hours",
  "recording",
  "time-to-live",
  "cancel",
] as const;

/** Questions asked with a card in hand — what am I buying, and can I stop. */
export const PRICING_FAQ_IDS = [
  "answered-call",
  "over-allowance",
  "keep-number",
  "cancel",
] as const;
