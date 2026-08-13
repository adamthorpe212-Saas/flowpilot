"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { appointmentText } from "@/lib/appointment-text";
import { createClient } from "@/lib/supabase/server";
import { normaliseIrishNumber } from "@/lib/phone";
import { isSmsConfigured, sendSms } from "@/lib/twilio";
import type { AppointmentSlot } from "@/types/database";

export type AppointmentState = { error: string | null; saved?: boolean };

const SLOTS: AppointmentSlot[] = ["morning", "afternoon", "anytime"];

/** Long enough to describe a job, short enough to read in a list. */
const MAX_TITLE = 80;
const MAX_NOTES = 500;

/**
 * Put a job in the diary.
 *
 * Only the business can reach this. There is deliberately no equivalent for the
 * receptionist — the whole safety argument for showing it the calendar is that
 * it cannot write to one, and an action it could reach would quietly undo that.
 */
export async function addAppointment(
  _previous: AppointmentState,
  formData: FormData,
): Promise<AppointmentState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "What's the job?" };

  const scheduledFor = String(formData.get("scheduled_for") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledFor)) {
    return { error: "Pick a day for it." };
  }

  const rawSlot = String(formData.get("slot") ?? "anytime") as AppointmentSlot;
  const slot = SLOTS.includes(rawSlot) ? rawSlot : "anytime";

  /*
   * The caller's number is normalised on the way in for the same reason it is
   * everywhere else: it may be texted later, and a number stored as somebody
   * typed it is a text that silently fails months after it was saved.
   */
  const rawNumber = String(formData.get("customer_number") ?? "").trim();
  const customerNumber = rawNumber ? normaliseIrishNumber(rawNumber) : null;
  if (rawNumber && !customerNumber) {
    return { error: "That doesn't look like a phone number." };
  }

  const leadId = String(formData.get("lead_id") ?? "").trim() || null;

  const supabase = await createClient();

  const { error } = await supabase.from("appointment").insert({
    business_id: business.id,
    lead_id: leadId,
    scheduled_for: scheduledFor,
    slot,
    title: title.slice(0, MAX_TITLE),
    customer_name: String(formData.get("customer_name") ?? "").trim() || null,
    customer_number: customerNumber,
    location: String(formData.get("location") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim().slice(0, MAX_NOTES) || null,
  });

  if (error) {
    console.error("Failed to add appointment", { businessId: business.id, error });
    return { error: "Couldn't save that. Try again." };
  }

  /*
   * Marking the lead booked is the whole reason somebody scheduled it. Done
   * after the insert and not awaited as a unit: a diary entry that saved and a
   * status that did not is untidy, whereas failing the whole thing over a
   * status update would lose the job he just booked.
   */
  if (leadId) {
    await supabase
      .from("lead")
      .update({ status: "booked" })
      .eq("id", leadId)
      .eq("business_id", business.id);
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { error: null, saved: true };
}

/**
 * Tell the customer when he's coming.
 *
 * Never automatic. This is a message in the tradesman's name to his own
 * customer, and one that fires unexpectedly is how somebody stops trusting the
 * feature entirely — so it happens when he taps send, and only then.
 */
export async function notifyCustomer(
  _previous: AppointmentState,
  formData: FormData,
): Promise<AppointmentState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Couldn't find that job." };

  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from("appointment")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!appointment) return { error: "Couldn't find that job." };
  if (!appointment.customer_number) {
    return { error: "No phone number saved for this one." };
  }

  // Nothing to say twice. Texting somebody the same appointment again reads as
  // a change of plan when nothing has changed.
  if (appointment.customer_notified_at) {
    return { error: null, saved: true };
  }

  if (!isSmsConfigured()) {
    return { error: "Texting isn't switched on yet. That one's on us." };
  }

  try {
    await sendSms({
      to: appointment.customer_number,
      body: appointmentText(appointment, business.name),
    });
  } catch (error) {
    console.error("Failed to text customer about appointment", { id, error });
    return { error: "That text didn't send. Try again in a moment." };
  }

  await supabase
    .from("appointment")
    .update({ customer_notified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", business.id);

  revalidatePath("/calendar");
  return { error: null, saved: true };
}

export async function removeAppointment(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("appointment")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  revalidatePath("/calendar");
}
