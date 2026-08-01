"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { shouldAnswerCalls } from "@/lib/usage";
import {
  findAvailableIrishNumbers,
  isTwilioConfigured,
  purchaseNumber,
  releaseNumber,
} from "@/lib/twilio";

export type ProvisionState = { error: string | null; phoneNumber?: string };

/**
 * Buys an Irish number and attaches it to the business.
 *
 * Idempotent by design: a customer who double-submits, or refreshes mid-request,
 * must not end up paying for two numbers. The existing-number check runs first
 * and returns successfully rather than erroring, because from the customer's
 * point of view "you already have a number" is success, not failure.
 */
export async function provisionNumber(
  _previous: ProvisionState,
): Promise<ProvisionState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  if (business.phone_number) {
    return { error: null, phoneNumber: business.phone_number };
  }

  /*
   * A number costs monthly rental from the moment it is bought, so a customer
   * whose subscription has lapsed must not be able to buy one. Without this
   * check, cancelling and then provisioning is a way to make FlowPilot pay
   * indefinitely for a number that will never answer a call — shouldAnswerCalls
   * would decline every one of them.
   */
  if (!shouldAnswerCalls(business)) {
    return {
      error:
        "Your subscription isn't active, so we can't set up a number yet. Sort out billing and come back.",
    };
  }

  if (!isTwilioConfigured()) {
    // Says only what is true. The previous wording promised an email that
    // nothing sends — a small lie, but the kind that costs trust exactly when
    // a customer is deciding whether this product is real.
    return {
      error:
        "Phone numbers aren't switched on yet. Everything else is set up — this is the last piece.",
    };
  }

  try {
    const available = await findAvailableIrishNumbers(1);

    if (available.length === 0) {
      return {
        error:
          "No Irish numbers are free right now. We're on it — try again shortly.",
      };
    }

    const purchased = await purchaseNumber(available[0].phoneNumber);

    /*
     * Admin client, deliberately.
     *
     * phone_number is no longer writable by a customer — it decides which
     * business an incoming call is routed to, so letting a user set it would
     * let them point their business at a number they do not own. Attaching the
     * number FlowPilot just purchased is a privileged act, and this is the
     * server having verified it, not the customer asserting it.
     */
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("business")
      .update({
        phone_number: purchased.phoneNumber,
        phone_number_sid: purchased.sid,
      })
      .eq("id", business.id);

    if (error) {
      /*
       * The number is bought and billing has started, but it is attached to
       * nobody. Rather than logging it for someone to reconcile off the Twilio
       * bill later, give it straight back — an orphaned number is a permanent
       * monthly cost that nothing in the product will ever surface again.
       *
       * If the release also fails there is genuinely nothing left to do but
       * shout, so that case is logged with both identifiers needed to find it.
       */
      console.error("Failed to attach purchased number, releasing it", {
        businessId: business.id,
        phoneNumber: purchased.phoneNumber,
        error,
      });

      try {
        await releaseNumber(purchased.sid);
      } catch (releaseError) {
        console.error(
          "PROVISIONING ORPHAN: number bought, not attached, and not released",
          {
            businessId: business.id,
            phoneNumber: purchased.phoneNumber,
            sid: purchased.sid,
            releaseError,
          },
        );
      }

      return {
        error: "Couldn't finish setting up your number. Try again in a moment.",
      };
    }

    revalidatePath("/onboarding", "layout");
    return { error: null, phoneNumber: purchased.phoneNumber };
  } catch (error) {
    console.error("Failed to provision number", error);
    return {
      error: "Couldn't get a number just now. Try again in a moment.",
    };
  }
}
