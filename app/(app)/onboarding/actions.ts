"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/safe-redirect";

export type SaveState = { error: string | null; saved?: boolean };

/**
 * Where to go after a successful save.
 *
 * During onboarding these forms advance to the next step; from settings the
 * same form should stay put and confirm. Passing the destination in the form
 * rather than duplicating the actions keeps one implementation of each save.
 * Only internal paths are honoured, so the field cannot become an open redirect.
 */
function destination(formData: FormData): string | null {
  const next = String(formData.get("next") ?? "");
  const safe = safeInternalPath(next, "");
  return safe || null;
}

/** Splits a comma or newline separated list into trimmed, de-duplicated entries. */
function parseList(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false;
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function saveBusinessDetails(
  _previous: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const name = String(formData.get("name") ?? "").trim();
  const industryLabel = String(formData.get("industry_label") ?? "").trim();
  const serviceArea = parseList(String(formData.get("service_area") ?? ""));

  if (!name) return { error: "What's your business called?" };
  if (serviceArea.length === 0) {
    return { error: "Add at least one area you cover." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business")
    .update({
      name,
      industry_label: industryLabel || null,
      service_area: serviceArea,
    })
    .eq("id", business.id);

  if (error) {
    console.error("Failed to save business details", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/", "layout");

  const next = destination(formData);
  if (next) redirect(next);

  return { error: null, saved: true };
}

export async function saveServices(
  _previous: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const names = parseList(String(formData.get("services") ?? ""));
  const emergencyNames = new Set(
    formData.getAll("emergency").map((value) => String(value).toLowerCase()),
  );

  if (names.length === 0) {
    return { error: "Add at least one service you offer." };
  }

  const supabase = await createClient();

  /*
   * Replace rather than merge: the form shows the full list, so what is
   * submitted is the complete intended state, and merging would silently
   * resurrect services the user had just removed.
   *
   * Done in one database function rather than a delete followed by an insert.
   * As two round trips, a failure between them wiped every service and left the
   * receptionist with no vocabulary to match callers against — invisibly, and
   * with nothing to roll back to.
   */
  const { error } = await supabase.rpc("replace_services", {
    target_business_id: business.id,
    service_names: names,
    emergency_names: names.filter((name) =>
      emergencyNames.has(name.toLowerCase()),
    ),
  });

  if (error) {
    console.error("Failed to save services", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/", "layout");

  const next = destination(formData);
  if (next) redirect(next);

  return { error: null, saved: true };
}

export async function saveNotificationTarget(
  _previous: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const destination = String(formData.get("destination") ?? "").trim();

  if (!destination) {
    return { error: "Where should we send new jobs?" };
  }

  const supabase = await createClient();

  // One transaction — see replace_services above. A half-failure here would
  // leave the business with no notification rule, so qualified jobs would be
  // captured perfectly and then sent nowhere.
  const { error } = await supabase.rpc("replace_sms_notification", {
    target_business_id: business.id,
    sms_destination: destination,
  });

  if (error) {
    console.error("Failed to save notification rule", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/onboarding", "layout");
  return { error: null };
}
