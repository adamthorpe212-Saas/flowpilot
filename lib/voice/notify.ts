import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import type { Business, BusinessProfile, Lead } from "@/types/database";

/**
 * Fills {{placeholders}} in a template, leaving nothing visible if unknown.
 *
 * Exported for testing — this text is sent to a customer, so a missing value
 * leaking a raw `{{job_type}}` into their inbox is a real failure.
 */
export function render(template: string, values: Record<string, string>): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

/**
 * Everything that happens after the caller hangs up.
 *
 * Run from the status callback rather than mid-call: an SMS API taking two
 * seconds is invisible here, but would be two seconds of silence on the line if
 * it ran while the caller was still listening.
 *
 * Failures are logged and swallowed. A notification that does not send is bad;
 * an exception that aborts the handler and loses the rest of the work is worse,
 * and the lead is already safely stored by this point.
 */
export async function notifyAfterCall(options: {
  business: Business;
  profile: BusinessProfile;
  lead: Lead | null;
}): Promise<void> {
  const { business, profile, lead } = options;

  if (!lead || !business.phone_number) return;

  const values = {
    caller_name: lead.caller_name ?? "there",
    job_type: lead.job_type ?? "your job",
    location: lead.location ?? "",
    business_name: business.name,
  };

  // Confirmation to the caller. This is the written record that a voice-only
  // product would otherwise lack — a misheard address becomes something the
  // customer can see and correct rather than a van at the wrong house.
  try {
    await sendSms({
      to: lead.caller_number,
      from: business.phone_number,
      body: render(profile.confirmation_sms_template, values),
    });
  } catch (error) {
    console.error("Failed to send confirmation SMS", {
      businessId: business.id,
      leadId: lead.id,
      error,
    });
  }

  const supabase = createAdminClient();
  const { data: rules } = await supabase
    .from("notification_rule")
    .select("*")
    .eq("business_id", business.id)
    .eq("channel", "sms");

  const urgent = lead.urgency === "high";

  for (const rule of rules ?? []) {
    if (urgent ? !rule.on_urgent_lead : !rule.on_new_lead) continue;

    const summary = [
      urgent ? "URGENT — new job" : "New job",
      lead.job_type ?? "Enquiry",
      lead.location ?? "",
      lead.caller_number,
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      await sendSms({
        to: rule.destination,
        from: business.phone_number,
        body: summary,
      });
    } catch (error) {
      console.error("Failed to notify owner", {
        businessId: business.id,
        destination: rule.destination,
        error,
      });
    }
  }
}
