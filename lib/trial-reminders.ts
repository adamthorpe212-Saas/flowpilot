import { trialStatus } from "@/lib/usage";
import type { Business } from "@/types/database";

/** Days remaining at which the first warning goes out. */
export const ENDING_SOON_DAYS = 3;

export type ReminderStage = "ending_soon" | "expired";

/**
 * Which reminder, if any, a business is due.
 *
 * Only applies to businesses that never went through checkout — once Stripe
 * owns the subscription it sends its own dunning, and two systems emailing the
 * same person about the same money is worse than one.
 *
 * Returns null when the last thing sent is still the right thing, so the daily
 * job is safe to run repeatedly.
 */
export function dueReminder(
  business: Business,
  now = new Date(),
): ReminderStage | null {
  if (business.subscription_status !== "incomplete") return null;

  const trial = trialStatus(business, now);
  const sent = business.trial_reminder_stage;

  if (trial.expired) {
    return sent === "expired" ? null : "expired";
  }

  if (trial.daysRemaining <= ENDING_SOON_DAYS) {
    // Not re-sent once expired has gone out, which can only happen if a clock
    // moved backwards — but silence is the right response either way.
    return sent === null ? "ending_soon" : null;
  }

  return null;
}

export function reminderSubject(
  stage: ReminderStage,
  business: Business,
): string {
  return stage === "expired"
    ? `${business.name}: your receptionist has stopped answering`
    : `${business.name}: your free trial ends in a few days`;
}

export function reminderBody(
  stage: ReminderStage,
  business: Business,
  billingUrl: string,
  now = new Date(),
): string {
  const trial = trialStatus(business, now);

  if (stage === "expired") {
    return [
      `Your free trial has ended, so FlowPilot has stopped answering calls for ${business.name}.`,
      "",
      "Nothing has been deleted. Your number, your settings and every job you've taken are exactly as you left them — choose a plan and it picks straight back up.",
      "",
      billingUrl,
      "",
      "If you'd rather not continue, you don't need to do anything.",
    ].join("\n");
  }

  const days = trial.daysRemaining;

  return [
    `Your FlowPilot trial ends in ${days} ${days === 1 ? "day" : "days"}.`,
    "",
    `After that we stop answering calls for ${business.name}, so anyone who rings while you're on a job will ring out.`,
    "",
    `Choose a plan here: ${billingUrl}`,
    "",
    "Nothing is deleted either way, and you can cancel any time.",
  ].join("\n");
}
