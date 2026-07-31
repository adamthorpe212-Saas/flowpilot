"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { normaliseIrishNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { isTwilioConfigured, placeCall } from "@/lib/twilio";

export type ForwardingState = { error: string | null; message?: string };

export async function saveMobile(
  _previous: ForwardingState,
  formData: FormData,
): Promise<ForwardingState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const raw = String(formData.get("mobile") ?? "");
  const mobile = normaliseIrishNumber(raw);

  if (!mobile) {
    return { error: "That doesn't look like an Irish mobile number." };
  }

  const supabase = await createClient();

  await supabase
    .from("notification_rule")
    .delete()
    .eq("business_id", business.id)
    .eq("channel", "sms");

  const { error } = await supabase.from("notification_rule").insert({
    business_id: business.id,
    channel: "sms",
    destination: mobile,
    on_new_lead: true,
    on_urgent_lead: true,
    outside_hours: true,
  });

  if (error) {
    console.error("Failed to save mobile", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/onboarding", "layout");
  return { error: null };
}

/**
 * Verifies forwarding by ringing the customer's own phone and letting it ring
 * out.
 *
 * This is the only honest test. Calling the FlowPilot number directly would
 * prove the receptionist answers, which was never in doubt — what needs proving
 * is that the carrier actually forwards, and the only way to observe that is to
 * make a call that goes unanswered and watch for it arriving at the other end.
 *
 * The inbound webhook completes the check: a forwarded call carries
 * `ForwardedFrom`, and seeing it is what sets forwarding_verified_at.
 */
export async function startForwardingTest(
  _previous: ForwardingState,
): Promise<ForwardingState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  if (!business.phone_number) {
    return { error: "Get your FlowPilot number first." };
  }

  const supabase = await createClient();
  const { data: rule } = await supabase
    .from("notification_rule")
    .select("destination")
    .eq("business_id", business.id)
    .eq("channel", "sms")
    .maybeSingle();

  if (!rule?.destination) {
    return { error: "Add your mobile number first." };
  }

  if (!isTwilioConfigured()) {
    return {
      error: "Test calls aren't switched on yet. We'll be in touch shortly.",
    };
  }

  try {
    await placeCall({
      to: rule.destination,
      from: business.phone_number,
      twimlUrl: `${siteUrl()}/api/voice/test`,
    });

    return {
      error: null,
      message:
        "We're ringing you now. Don't answer — let it ring out, and we'll confirm below.",
    };
  } catch (error) {
    console.error("Failed to place test call", error);
    return { error: "Couldn't place the test call. Try again in a moment." };
  }
}
