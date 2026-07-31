"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type VoiceState = { error: string | null; saved?: boolean };

const MAX_TEMPLATE = 320;

/** One rule per line, blanks dropped. */
function parseLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function saveVoiceSettings(
  _previous: VoiceState,
  formData: FormData,
): Promise<VoiceState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const greeting = String(formData.get("greeting") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const closingLine = String(formData.get("closing_line") ?? "").trim();
  const fallback = String(formData.get("fallback") ?? "").trim();
  const template = String(formData.get("confirmation_sms_template") ?? "").trim();
  const mustNot = parseLines(String(formData.get("must_not") ?? ""));

  if (!tone) return { error: "Say something about how it should sound." };
  if (!closingLine) return { error: "It needs something to say at the end." };
  if (!fallback) {
    return { error: "It needs something to say when it doesn't know." };
  }
  if (!template) return { error: "The confirmation text can't be empty." };

  /*
   * Checked here as well as in the database. The constraints exist because
   * outbound SMS goes through one ComReg-registered sender shared by every
   * customer, so one person's link gets the registration revoked for everyone —
   * but a constraint violation surfaces as a database error string, and this is
   * a person editing a form who deserves to be told what is wrong.
   */
  if (template.length > MAX_TEMPLATE) {
    return {
      error: `That confirmation text is too long — keep it under ${MAX_TEMPLATE} characters.`,
    };
  }

  if (/(https?:\/\/|www\.)/i.test(template)) {
    return {
      error:
        "Links aren't allowed in the confirmation text. Irish networks flag messages with links as scams, which would stop them reaching anyone.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_profile")
    .update({
      // Empty means "use the default opening line", which is why this is
      // nullable rather than stored as an empty string.
      greeting: greeting || null,
      tone,
      closing_line: closingLine,
      fallback,
      confirmation_sms_template: template,
      must_not: mustNot,
    })
    .eq("business_id", business.id);

  if (error) {
    console.error("Failed to save voice settings", error);
    return { error: "Couldn't save that. Try again in a moment." };
  }

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}
