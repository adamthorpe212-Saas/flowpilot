import { describe, expect, it } from "vitest";
import { dashboardAlert } from "@/lib/dashboard-alert";
import type { Business } from "@/types/database";

/** A working account: subscribed, has a number, forwarding confirmed. */
function business(overrides: Partial<Business> = {}): Business {
  return {
    id: "b1",
    name: "Byrne Plumbing",
    status: "active",
    subscription_status: "active",
    phone_number: "+353871234567",
    forwarding_verified_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  } as Business;
}

describe("dashboardAlert", () => {
  it("says nothing when nothing is wrong", () => {
    // The normal case, and the one that matters most: the page is just jobs.
    expect(
      dashboardAlert({ business: business(), undeliveredCount: 0 }),
    ).toBeNull();
  });

  it("returns at most one alert", () => {
    /*
     * An account that is wrong in every possible way still gets a single line.
     * Stacking them is what buried the jobs in the first place.
     */
    const alert = dashboardAlert({
      business: business({
        subscription_status: "incomplete",
        phone_number: null,
        forwarding_verified_at: null,
      }),
      undeliveredCount: 6,
    });

    expect(alert).not.toBeNull();
    expect(alert?.action).toBe("Subscribe");
  });

  it("does not send a suspended account to checkout", () => {
    /*
     * Paying does not lift a suspension. Offering a card form to somebody
     * whose problem money cannot fix wastes their time and takes their money.
     */
    const alert = dashboardAlert({
      business: business({ status: "suspended", subscription_status: "active" }),
      undeliveredCount: 0,
    });

    expect(alert?.href).not.toBe("/billing");
    expect(alert?.href.startsWith("mailto:")).toBe(true);
  });

  it("never sends anyone to a route that does not exist", () => {
    /*
     * An alert about a broken account leading to a 404 is the product failing
     * twice. Every destination is either an app route or a mail link.
     */
    const cases: Business[] = [
      business({ status: "suspended" }),
      business({ subscription_status: "past_due" }),
      business({ subscription_status: "canceled" }),
      business({ subscription_status: "incomplete" }),
      business({ phone_number: null }),
      business({ forwarding_verified_at: null }),
    ];

    for (const candidate of cases) {
      const alert = dashboardAlert({
        business: candidate,
        undeliveredCount: 0,
      });
      expect(alert?.href).toMatch(/^(\/|mailto:)/);
    }
  });

  it("tells someone who never subscribed something different from someone who lapsed", () => {
    const never = dashboardAlert({
      business: business({ subscription_status: "incomplete" }),
      undeliveredCount: 0,
    });
    const lapsed = dashboardAlert({
      business: business({ subscription_status: "past_due" }),
      undeliveredCount: 0,
    });

    // "Sort out billing" to somebody who has never had a bill reads as an
    // error they caused.
    expect(never?.message).not.toMatch(/failed|lapsed|ended/i);
    expect(lapsed?.message).toMatch(/failed/i);
  });

  it("asks for forwarding only once there is a number to forward to", () => {
    /*
     * The loop this avoids: "set up forwarding" shown to somebody with no
     * number, whose forwarding page has nothing to give them.
     */
    const alert = dashboardAlert({
      business: business({ phone_number: null, forwarding_verified_at: null }),
      undeliveredCount: 0,
    });

    expect(alert?.action).toBe("Get my number");
  });

  it("ranks unconfirmed forwarding above dropped alerts", () => {
    /*
     * Unconfirmed forwarding means calls may never arrive. Dropped alerts mean
     * they arrived, were captured, and are in the list below. Total loss
     * outranks partial.
     */
    const alert = dashboardAlert({
      business: business({ forwarding_verified_at: null }),
      undeliveredCount: 6,
    });

    expect(alert?.action).toBe("Set up forwarding");
  });

  it("owns a dropped alert rather than blaming their phone", () => {
    const alert = dashboardAlert({ business: business(), undeliveredCount: 6 });

    expect(alert?.message).toContain("We couldn't");
    // And says where the work went, so nobody thinks six jobs are gone.
    expect(alert?.message).toMatch(/list below/);
  });

  it("counts one job as one, not 1 jobs", () => {
    const alert = dashboardAlert({ business: business(), undeliveredCount: 1 });
    expect(alert?.message).toContain("1 job ");
  });

  it("says nothing when there is no business yet", () => {
    expect(
      dashboardAlert({ business: null, undeliveredCount: 3 }),
    ).toBeNull();
  });
});
