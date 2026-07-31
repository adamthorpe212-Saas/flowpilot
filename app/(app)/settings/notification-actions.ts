"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { normaliseIrishNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export type NotificationState = { error: string | null; saved?: boolean };

/** Deliberately permissive — the authority on a deliverable address is the send. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addNotificationRule(
  _previous: NotificationState,
  formData: FormData,
): Promise<NotificationState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const channel = String(formData.get("channel") ?? "");
  const raw = String(formData.get("destination") ?? "").trim();

  if (channel !== "sms" && channel !== "email") {
    return { error: "Pick text or email." };
  }

  if (!raw) return { error: "Where should we send new jobs?" };

  let destination = raw;

  if (channel === "sms") {
    const normalised = normaliseIrishNumber(raw);
    if (!normalised) {
      return { error: "That doesn't look like an Irish mobile number." };
    }
    destination = normalised;
  } else if (!EMAIL.test(raw)) {
    return { error: "That doesn't look like an email address." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("notification_rule")
    .select("id")
    .eq("business_id", business.id)
    .eq("channel", channel)
    .eq("destination", destination)
    .maybeSingle();

  // Adding the same destination twice would double every alert to that person.
  if (existing) {
    return { error: "That's already on the list." };
  }

  const { error } = await supabase.from("notification_rule").insert({
    business_id: business.id,
    channel,
    destination,
    on_new_lead: true,
    on_urgent_lead: true,
    outside_hours: true,
  });

  if (error) {
    // The database caps rules per business, to stop the platform being turned
    // into an SMS pump. Translate that into something a customer understands
    // rather than surfacing a trigger message.
    if (error.message?.includes("at most")) {
      return {
        error: "That's as many places as we can send to. Remove one first.",
      };
    }

    console.error("Failed to add notification rule", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function removeNotificationRule(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const id = String(formData.get("rule_id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  const { count } = await supabase
    .from("notification_rule")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  /*
   * Refuse to remove the last one. A business with no notification rules has a
   * receptionist that answers perfectly and tells nobody — and nothing in the
   * product would announce that, so it would be discovered as a quiet week.
   */
  if ((count ?? 0) <= 1) return;

  await supabase
    .from("notification_rule")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  revalidatePath("/", "layout");
}
