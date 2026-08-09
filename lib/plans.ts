import type { Plan } from "@/types/database";

/**
 * Plan definitions.
 *
 * Kept in code rather than the database: they change rarely, and once billing is
 * live Stripe is the source of truth for what a customer is actually paying.
 * Duplicating that into a table invites the two drifting apart.
 *
 * Pricing is built up from real unit costs, not picked from the air. A two
 * minute answered call costs roughly €0.15–0.30 all-in — Twilio inbound voice,
 * speech-to-text, the model, text-to-speech, and the confirmation SMS. The
 * number rental is about €1.65 a month on top. The allowance below is set so a
 * customer at their cap still leaves a healthy margin, and most sit well under.
 *
 * The value anchor is a recovered job: one burst pipe a plumber would otherwise
 * have lost is worth €150–500. A single recovered call pays for several months.
 */

export type PlanDefinition = {
  id: Plan;
  name: string;
  price: number;
  currency: string;
  tagline: string;
  callAllowance: number;
  features: string[];
  /**
   * Whether new customers can buy this. Exactly one plan is sold at a time.
   *
   * The others stay defined because businesses already carry their id, and a
   * plan that cannot be looked up is a dashboard that throws rather than a page
   * that renders. Keeping them also means changing what is sold is an edit to
   * this file rather than a migration.
   */
  sold?: boolean;
};

export const TRIAL_DAYS = 14;

export const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    currency: "EUR",
    tagline: "Withdrawn. Kept so existing accounts still resolve.",
    callAllowance: 50,
    features: [],
  },
  {
    id: "pro",
    name: "FlowPilot",
    price: 99,
    currency: "EUR",
    tagline: "Everything, for one price.",
    callAllowance: 200,
    /*
     * Every line here has to be something the product actually does today. This
     * list previously promised "full call recordings", which FlowPilot has never
     * done — calls are transcribed by <Gather input="speech">, never recorded,
     * and the column that implied otherwise was dropped for the same reason.
     * A pricing page is the worst possible place to overstate.
     */
    features: [
      "A 24/7 receptionist on your own Irish number",
      "Keeps your existing number — nothing on your van changes",
      // Was "how urgent it is". The date is the field a planned job turns on,
      // and this list is where a customer decides what they are buying.
      "Every caller's name, job, address and when they want it done",
      "The job and the date texted to you the moment the call ends",
      "A confirmation text to your customer",
      "Your own services, questions and wording",
      "Every call and full transcript in your dashboard",
    ],
    sold: true,
  },
  {
    id: "business",
    name: "Business",
    price: 199,
    currency: "EUR",
    tagline: "Withdrawn. Kept so existing accounts still resolve.",
    callAllowance: 500,
    features: [],
  },
];

/** The plan a new customer buys. */
export function soldPlan(): PlanDefinition {
  const plan = PLANS.find((candidate) => candidate.sold);
  if (!plan) throw new Error("No plan is marked as sold.");
  return plan;
}

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
