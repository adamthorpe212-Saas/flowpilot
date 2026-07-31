import type { Plan } from "@/types/database";

/**
 * Plan definitions.
 *
 * Kept in code rather than the database: they change rarely, and once billing
 * is live Stripe is the source of truth for what a customer is actually paying.
 * Duplicating that into a table invites the two drifting apart.
 *
 * Pricing is built up from real unit costs, not picked from the air. A two
 * minute answered call costs roughly €0.15–0.30 all-in — Twilio inbound voice,
 * speech-to-text, the model, text-to-speech, and the confirmation SMS. The
 * number rental is about €1.65 a month on top. The call allowances below are
 * set so that a customer at their cap still leaves a healthy margin, and most
 * customers sit well under it.
 *
 * The value anchor is a recovered job: one burst pipe a plumber would otherwise
 * have lost is worth €150–500. Starter pays for itself several times over on a
 * single recovered call.
 */

export type PlanDefinition = {
  id: Plan;
  name: string;
  price: number;
  currency: string;
  tagline: string;
  callAllowance: number;
  features: string[];
  highlighted?: boolean;
};

export const TRIAL_DAYS = 14;

export const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    currency: "EUR",
    tagline: "For a one-van operation that keeps missing calls.",
    callAllowance: 50,
    features: [
      "Up to 50 answered calls a month",
      "Your own Irish phone number",
      "Job details texted to you after every call",
      "Confirmation text sent to your customer",
      "30 days of call history",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    currency: "EUR",
    tagline: "For a busy trade with a phone that never stops.",
    callAllowance: 200,
    features: [
      "Up to 200 answered calls a month",
      "Everything in Starter",
      "Your own qualification questions",
      "Alerts to up to 3 people",
      "Full call recordings and transcripts",
      "Unlimited call history",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: 199,
    currency: "EUR",
    tagline: "For a team running multiple jobs at once.",
    callAllowance: 500,
    features: [
      "Up to 500 answered calls a month",
      "Everything in Pro",
      "Alerts to your whole team",
      "Priority support",
    ],
  },
];

export function getPlan(id: Plan): PlanDefinition {
  const plan = PLANS.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

export function formatPrice(plan: PlanDefinition): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: plan.currency,
    minimumFractionDigits: 0,
  }).format(plan.price);
}
