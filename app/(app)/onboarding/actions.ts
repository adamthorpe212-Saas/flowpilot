"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error: string | null };

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

  revalidatePath("/onboarding", "layout");
  redirect("/onboarding/services");
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

  // Replace rather than merge. The form shows the full list, so what the user
  // submits is the complete intended state — merging would silently resurrect
  // services they had just removed.
  const { error: deleteError } = await supabase
    .from("service")
    .delete()
    .eq("business_id", business.id);

  if (deleteError) {
    console.error("Failed to clear services", deleteError);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  const { error } = await supabase.from("service").insert(
    names.map((name, index) => ({
      business_id: business.id,
      name,
      emergency_eligible: emergencyNames.has(name.toLowerCase()),
      typical_urgency: emergencyNames.has(name.toLowerCase()) ? "high" : "normal",
      sort_order: index,
    })),
  );

  if (error) {
    console.error("Failed to save services", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/onboarding", "layout");
  redirect("/onboarding/number");
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

  await supabase
    .from("notification_rule")
    .delete()
    .eq("business_id", business.id)
    .eq("channel", "sms");

  const { error } = await supabase.from("notification_rule").insert({
    business_id: business.id,
    channel: "sms",
    destination,
    on_new_lead: true,
    on_urgent_lead: true,
    outside_hours: true,
  });

  if (error) {
    console.error("Failed to save notification rule", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/onboarding", "layout");
  return { error: null };
}
