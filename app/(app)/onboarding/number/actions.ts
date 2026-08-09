"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { bundleAreaCode } from "@/lib/irish-numbers";
import { createAdminClient } from "@/lib/supabase/server";
import { shouldAnswerCalls } from "@/lib/usage";
import {
  findAvailableIrishNumbers,
  isNumberSpecificFailure,
  isTwilioConfigured,
  purchaseNumber,
  type PurchasedNumber,
  releaseNumber,
} from "@/lib/twilio";

export type ProvisionState = {
  error: string | null;
  phoneNumber?: string;
  /**
   * True when the hold-up is ours, not the customer's.
   *
   * Regulatory approval, a missing configuration, or an area we cannot yet buy
   * in. None of these are fixed by pressing the button again, and a customer
   * left tapping one that will never work concludes the product is broken
   * rather than pending. The distinction changes what the screen says and
   * whether it offers a retry at all.
   */
  pending?: boolean;
};

/**
 * How many numbers to line up before trying to buy one.
 *
 * Enough that a run of wrong-exchange numbers does not exhaust the list, small
 * enough that a genuinely unservable area fails in seconds rather than grinding
 * through the whole inventory.
 */
const CANDIDATES = 10;

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
        "Phone numbers aren't switched on for your account yet. Everything else is ready — this last piece is on us.",
      pending: true,
    };
  }

  try {
    /*
     * Buy where the bundle allows, not where the customer happens to work.
     *
     * The FlowPilot number is never dialled by anyone: calls arrive by
     * conditional forwarding, so a caller rings the business's own number and
     * this one stays invisible. Matching it to the customer's county was
     * therefore solving a problem nobody has — and once the regulatory bundle
     * existed it made things worse, because Twilio requires a registered
     * address inside the number's own exchange area. Searching a Cork
     * customer's area with a Dublin address meant ten guaranteed rejections
     * before a national fallback that mostly failed too.
     */
    const available = await findAvailableIrishNumbers(
      CANDIDATES,
      bundleAreaCode(),
    );

    if (available.length === 0) {
      return {
        error:
          "No Irish numbers are free right now. We're on it — try again shortly.",
      };
    }

    /*
     * Try candidates in turn rather than betting everything on the first.
     *
     * Irish numbers carry a locality requirement, and an area code is far
     * broader than an exchange: 01 covers Dublin city, Balbriggan, Ashbourne and
     * dozens of villages. A Dublin address is valid for some 01 numbers and
     * refused for others, and Twilio only says which when the purchase is
     * attempted. Buying the first result meant a single unlucky pick — a
     * Balbriggan exchange against a Glasnevin address — failed the whole step
     * with "try again in a moment", which was never going to help.
     *
     * A refused purchase costs nothing, so working down the list is free.
     */
    let purchased: PurchasedNumber | null = null;
    let lastRejection: unknown = null;

    for (const candidate of available) {
      try {
        purchased = await purchaseNumber(candidate.phoneNumber);
        break;
      } catch (error) {
        if (!isNumberSpecificFailure(error)) throw error;
        lastRejection = error;
      }
    }

    if (!purchased) {
      /*
       * Every candidate was refused on locality. Retrying changes nothing —
       * this needs a registered address covering the area, which is a decision
       * somebody has to make rather than a wobble that passes.
       */
      console.error("No candidate number could be bought for this address", {
        businessId: business.id,
        areaCode: bundleAreaCode(),
        tried: available.length,
        lastRejection,
      });

      return {
        error:
          "We couldn't assign you a number yet. We've been told and we're on it — there's nothing for you to do.",
        pending: true,
      };
    }

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
