"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { OpeningHours, OutOfHoursBehaviour } from "@/types/database";

export type HoursState = { error: string | null; saved?: boolean };

export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

const BEHAVIOURS: OutOfHoursBehaviour[] = [
  "answer_and_notify",
  "answer_and_hold",
  "do_not_answer",
];

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function saveOpeningHours(
  _previous: HoursState,
  formData: FormData,
): Promise<HoursState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const alwaysOpen = formData.get("always_open") === "on";

  /*
   * Always-open is stored as an empty object, which isWithinOpeningHours treats
   * as "no restriction". That is deliberately the default: the whole pitch is
   * answering on holidays and at weekends, so a business has to opt in to being
   * unavailable rather than opt out.
   */
  let openingHours: OpeningHours = {};

  if (!alwaysOpen) {
    const hours: OpeningHours = {};

    for (const day of DAYS) {
      if (formData.get(`${day.key}_open`) !== "on") {
        hours[day.key] = null;
        continue;
      }

      const open = String(formData.get(`${day.key}_from`) ?? "");
      const close = String(formData.get(`${day.key}_to`) ?? "");

      if (!TIME.test(open) || !TIME.test(close)) {
        return { error: `Check the times for ${day.label}.` };
      }

      if (open >= close) {
        return {
          error: `${day.label} closes before it opens. Overnight hours aren't supported yet.`,
        };
      }

      hours[day.key] = { open, close };
    }

    const anyOpen = Object.values(hours).some((window) => window !== null);
    if (!anyOpen) {
      return {
        error:
          "That closes you every day of the week. Pick at least one, or choose to answer any time.",
      };
    }

    openingHours = hours;
  }

  const requested = String(formData.get("out_of_hours_behaviour") ?? "");
  const behaviour: OutOfHoursBehaviour = BEHAVIOURS.includes(
    requested as OutOfHoursBehaviour,
  )
    ? (requested as OutOfHoursBehaviour)
    : "answer_and_notify";

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_profile")
    .update({
      opening_hours: openingHours,
      out_of_hours_behaviour: behaviour,
    })
    .eq("business_id", business.id);

  if (error) {
    console.error("Failed to save opening hours", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
