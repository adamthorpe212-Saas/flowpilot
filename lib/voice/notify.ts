import "server-only";

import { isEmailConfigured, sendEmail } from "@/lib/email";
import { jobAlert, render } from "@/lib/messages";
import { createAdminClient } from "@/lib/supabase/server";
import { isSmsConfigured, sendSms } from "@/lib/twilio";
import type {
  Business,
  BusinessProfile,
  Lead,
  NotificationRule,
} from "@/types/database";

/*
 * Wording lives in lib/messages.ts so the marketing site can show a customer
 * the actual text they will receive. Re-exported because this has been the
 * import site since before that split.
 */
export { render };

function jobSummary(lead: Lead, urgent: boolean): string {
  return jobAlert({
    urgent,
    jobType: lead.job_type,
    location: lead.location,
    callerNumber: lead.caller_number,
  });
}

function jobEmailBody(lead: Lead, business: Business): string {
  return [
    `${lead.job_type ?? "Enquiry"}${lead.location ? ` in ${lead.location}` : ""}`,
    "",
    `Caller: ${lead.caller_name ?? "Not given"}`,
    `Number: ${lead.caller_number}`,
    `Urgency: ${lead.urgency}`,
    lead.preferred_time ? `Wants: ${lead.preferred_time}` : "",
    lead.out_of_area ? "Note: this is outside your usual area." : "",
    "",
    `Ring them back: ${lead.caller_number}`,
    "",
    `— FlowPilot, for ${business.name}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Everything that happens after the caller hangs up.
 *
 * Run from the status callback rather than mid-call: an SMS or email API taking
 * two seconds is invisible here, but would be two seconds of silence on the
 * line if it ran while the caller was still listening.
 *
 * Individual failures are logged and swallowed so one dead channel cannot stop
 * the others. A total failure — nothing delivered by any route — is logged
 * distinctly, because that is the case where a business has a working
 * receptionist and no idea a job came in.
 */
export async function notifyAfterCall(options: {
  business: Business;
  profile: BusinessProfile;
  lead: Lead | null;
}): Promise<void> {
  const { business, profile, lead } = options;

  if (!lead) return;

  const values = {
    caller_name: lead.caller_name ?? "there",
    job_type: lead.job_type ?? "your job",
    location: lead.location ?? "",
    business_name: business.name,
  };

  /*
   * Confirmation to the caller — SMS only, since it has to reach a phone that
   * just rang. This is the written record a voice-only product would otherwise
   * lack: a misheard address becomes something the customer can see and correct
   * rather than a van at the wrong house.
   */
  if (isSmsConfigured()) {
    try {
      await sendSms({
        to: lead.caller_number,
        body: render(profile.confirmation_sms_template, values),
      });
    } catch (error) {
      console.error("Failed to send confirmation SMS", {
        businessId: business.id,
        leadId: lead.id,
        error,
      });
    }
  } else {
    console.error(
      "SMS NOT CONFIGURED: caller received no written confirmation. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_SENDER_ID.",
      { businessId: business.id, leadId: lead.id },
    );
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notification_rule")
    .select("*")
    .eq("business_id", business.id);

  const rules = (data ?? []) as NotificationRule[];
  const urgent = lead.urgency === "high";

  let delivered = 0;
  let attempted = 0;

  for (const rule of rules) {
    if (urgent ? !rule.on_urgent_lead : !rule.on_new_lead) continue;
    attempted += 1;

    try {
      if (rule.channel === "email") {
        if (!isEmailConfigured()) {
          throw new Error("Email is not configured");
        }
        await sendEmail({
          to: rule.destination,
          subject: jobSummary(lead, urgent),
          text: jobEmailBody(lead, business),
        });
      } else {
        if (!isSmsConfigured()) {
          throw new Error("SMS is not configured");
        }
        await sendSms({ to: rule.destination, body: jobSummary(lead, urgent) });
      }

      delivered += 1;
    } catch (error) {
      console.error("Failed to notify owner", {
        businessId: business.id,
        channel: rule.channel,
        destination: rule.destination,
        error,
      });
    }
  }

  if (attempted > 0 && delivered === 0) {
    // The worst outcome the product has: a qualified job, captured perfectly,
    // that nobody was told about. Distinct message so it is findable in logs.
    console.error(
      "JOB NOT DELIVERED: every notification channel failed for this lead",
      { businessId: business.id, leadId: lead.id, attempted },
    );
  }
}
