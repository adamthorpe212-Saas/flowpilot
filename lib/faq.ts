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
      "Yes, because we tell them. Every call opens with \"This is an automated assistant, and I'll take notes\" before your greeting. You can't switch that off, and that's deliberate — somebody describing an emergency in their kitchen deserves to know what they're speaking to.",
  },
  {
    id: "misunderstands",
    question: "What if it doesn't understand the job?",
    answer:
      "It asks again. If it still can't tell, it takes whatever details it has and flags the job for you rather than guessing — you get a lead marked as needing a human. It never quotes a price and never promises a time you haven't agreed to.",
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
      "We'll tell you before you get close, and your receptionist keeps answering — we never cut you off mid-month. If you're regularly over, we'll move you up a plan.",
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

/** Objections that decide whether somebody trusts the product at all. */
export const HOME_FAQ_IDS = [
  "keep-number",
  "is-it-a-machine",
  "misunderstands",
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
