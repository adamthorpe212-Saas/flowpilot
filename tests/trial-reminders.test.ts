import { describe, expect, it } from "vitest";
import { TRIAL_DAYS } from "@/lib/plans";
import {
  dueReminder,
  ENDING_SOON_DAYS,
  reminderBody,
  reminderSubject,
} from "@/lib/trial-reminders";
import type { Business, SubscriptionStatus } from "@/types/database";

function business(overrides: Partial<Business> = {}): Business {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - 1);

  return {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: "+353871234567",
    phone_number_sid: "PN1",
    forwarding_verified_at: "2026-07-01T00:00:00Z",
    plan: "starter",
    subscription_status: "incomplete" as SubscriptionStatus,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    trial_reminder_stage: null,
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    ...overrides,
  };
}

function signedUpDaysAgo(days: number, overrides: Partial<Business> = {}) {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - days);
  return business({ created_at: createdAt.toISOString(), ...overrides });
}

describe("dueReminder", () => {
  it("says nothing early in the trial", () => {
    expect(dueReminder(signedUpDaysAgo(1))).toBeNull();
  });

  it("warns as the trial nears its end", () => {
    expect(dueReminder(signedUpDaysAgo(TRIAL_DAYS - ENDING_SOON_DAYS))).toBe(
      "ending_soon",
    );
  });

  it("tells them once it has expired", () => {
    expect(dueReminder(signedUpDaysAgo(TRIAL_DAYS + 1))).toBe("expired");
  });

  it("never repeats a reminder it already sent", () => {
    // The job runs daily, so this is what stops it emailing every morning.
    expect(
      dueReminder(
        signedUpDaysAgo(TRIAL_DAYS - 1, { trial_reminder_stage: "ending_soon" }),
      ),
    ).toBeNull();

    expect(
      dueReminder(
        signedUpDaysAgo(TRIAL_DAYS + 5, { trial_reminder_stage: "expired" }),
      ),
    ).toBeNull();
  });

  it("still sends the expiry notice to someone already warned", () => {
    // Two distinct messages: "this is about to stop" and "this has stopped".
    expect(
      dueReminder(
        signedUpDaysAgo(TRIAL_DAYS + 1, { trial_reminder_stage: "ending_soon" }),
      ),
    ).toBe("expired");
  });

  it("stays quiet once Stripe owns the subscription", () => {
    /*
     * Stripe sends its own dunning. Two systems emailing the same person about
     * the same money is worse than one, and ours would be the wrong one.
     */
    for (const status of ["active", "trialing", "past_due", "canceled"] as const) {
      expect(
        dueReminder(signedUpDaysAgo(TRIAL_DAYS + 5, { subscription_status: status })),
      ).toBeNull();
    }
  });
});

describe("reminder content", () => {
  it("names the business in the subject", () => {
    const target = business();
    expect(reminderSubject("ending_soon", target)).toContain("O'Brien Plumbing");
    expect(reminderSubject("expired", target)).toContain("O'Brien Plumbing");
  });

  it("says what actually happens, not that an account changed state", () => {
    const expired = reminderBody(
      "expired",
      business(),
      "https://flowpilot.ie/billing",
    );

    expect(expired).toContain("stopped answering calls");
    // Reassurance matters here: the fear is that their leads are gone.
    expect(expired).toContain("Nothing has been deleted");
    expect(expired).toContain("https://flowpilot.ie/billing");
  });

  it("warns in terms of missed calls, not billing", () => {
    const soon = reminderBody(
      "ending_soon",
      signedUpDaysAgo(TRIAL_DAYS - 2),
      "https://flowpilot.ie/billing",
    );

    expect(soon).toContain("ring out");
    expect(soon).toContain("cancel any time");
  });

  it("counts the days correctly in the warning", () => {
    const soon = reminderBody(
      "ending_soon",
      signedUpDaysAgo(TRIAL_DAYS - 2),
      "https://flowpilot.ie/billing",
    );

    expect(soon).toContain("2 days");
  });
});
