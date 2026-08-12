import { LEGAL } from "@/lib/legal";
import type { Business } from "@/types/database";

/**
 * The one thing wrong with somebody's receptionist, if anything is.
 *
 * The jobs page used to stack every problem it knew about: a three-column
 * receptionist panel, an undelivered-alerts banner, and a subscribe prompt,
 * all above the first job. Each was individually defensible and together they
 * pushed the actual work off the screen — on a phone, past two full scrolls.
 *
 * Worse, they were duplicates. The number and forwarding state live on
 * Settings, the call count lives on Billing. The dashboard was showing three
 * copies of other pages before showing anyone their own jobs.
 *
 * So this returns at most ONE alert, and the ordering is the point. These are
 * not equally urgent and they are not independent: telling somebody their
 * forwarding is unconfirmed when they have not subscribed sends them round a
 * loop they cannot finish, because there is no number to forward to yet.
 *
 * Returning null — the normal case — means the page is just jobs.
 */

export type DashboardAlert = {
  /** One line. It has to fit on a phone without wrapping to three. */
  message: string;
  action: string;
  href: string;
  /** `warning` is us or their billing; `info` is a step only they can do. */
  tone: "warning" | "info";
};

export function dashboardAlert(options: {
  business: Business | null;
  undeliveredCount: number;
}): DashboardAlert | null {
  const { business, undeliveredCount } = options;
  if (!business) return null;

  /*
   * Ordered by what stops what. Everything below a given line is unreachable
   * until that line is cleared, which is why only one is ever shown.
   */

  /*
   * Suspended by us. Above billing because paying will not lift it, and
   * sending somebody to a checkout that cannot fix their problem is worse than
   * saying plainly that this one is not theirs to solve.
   */
  if (business.status === "suspended") {
    return {
      message: "This account is suspended, so calls aren't being answered.",
      action: "Get in touch",
      // A real address rather than a /contact route, which does not exist. An
      // alert about a broken account must not itself lead to a 404.
      href: `mailto:${LEGAL.email}`,
      tone: "warning",
    };
  }

  // Calls are being declined right now, and money is the only reason.
  if (business.subscription_status === "past_due") {
    return {
      message: "Your payment failed, so calls aren't being answered.",
      action: "Sort out billing",
      href: "/billing",
      tone: "warning",
    };
  }

  if (business.subscription_status === "canceled") {
    return {
      message: "Your subscription ended, so calls aren't being answered.",
      action: "Restart",
      href: "/billing",
      tone: "warning",
    };
  }

  // Never subscribed is a different sentence from lapsed. "Sort out billing"
  // to somebody who has never had a bill reads as an error they caused.
  if (business.subscription_status === "incomplete") {
    return {
      message: "Subscribe to get your number and start answering calls.",
      action: "Subscribe",
      href: "/billing",
      tone: "info",
    };
  }

  if (!business.phone_number) {
    return {
      message: "You don't have a FlowPilot number yet.",
      action: "Get my number",
      href: "/onboarding/number",
      tone: "info",
    };
  }

  /*
   * Above undelivered alerts deliberately. Unconfirmed forwarding means calls
   * may never arrive at all; undelivered alerts mean they arrived, were
   * captured, and are sitting in the list below. Total loss outranks partial.
   */
  if (!business.forwarding_verified_at) {
    return {
      message: "Calls won't reach your receptionist until forwarding is set up.",
      action: "Set up forwarding",
      href: "/onboarding/forwarding",
      tone: "info",
    };
  }

  /*
   * Us admitting we dropped something. Last because everything above it means
   * the receptionist is not working at all, but it still belongs on this page
   * rather than buried — the alternative is finding out when a customer rings
   * to ask why nobody called them back.
   */
  if (undeliveredCount > 0) {
    return {
      message:
        undeliveredCount === 1
          ? "We couldn't get an alert to you about 1 job this week. It's in the list below."
          : `We couldn't get an alert to you about ${undeliveredCount} jobs this week. They're in the list below.`,
      action: "Check where alerts go",
      href: "/settings",
      tone: "warning",
    };
  }

  return null;
}
