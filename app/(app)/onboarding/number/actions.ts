"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  findAvailableIrishNumbers,
  isTwilioConfigured,
  purchaseNumber,
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

  if (!isTwilioConfigured()) {
    return {
      error:
        "Phone numbers aren't connected yet. We'll email you the moment yours is ready.",
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

    const supabase = await createClient();
    const { error } = await supabase
      .from("business")
      .update({
        phone_number: purchased.phoneNumber,
        phone_number_sid: purchased.sid,
      })
      .eq("id", business.id);

    if (error) {
      // The number is bought and billing has started, but it is not attached to
      // anyone. Log loudly rather than silently: this is the one failure here
      // that costs real money and needs a human to reconcile.
      console.error(
        "PROVISIONING ORPHAN: purchased number not saved to business",
        { businessId: business.id, phoneNumber: purchased.phoneNumber, error },
      );
      return {
        error: "We got your number but couldn't save it. We're looking into it.",
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
