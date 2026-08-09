import "server-only";

import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
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

/**
 * The tappable route from a text message to the job it is about.
 *
 * Short by design — see the migration that adds lead.code. Built here rather
 * than inlined so the SMS and the email agree on where a job lives.
 */
function jobLink(lead: Lead): string | null {
  if (!lead.code) return null;

  try {
    return `${siteUrl()}/j/${lead.code}`;
  } catch (error) {
    /*
     * A missing NEXT_PUBLIC_SITE_URL must never cost somebody the job itself.
     * The alert is worth far more without a link than not sent at all, so this
     * degrades to the old text-only format and says so in the log.
     */
    console.error("No site URL, sending job alert without a link", error);
    return null;
  }
}

function jobSummary(lead: Lead, urgent: boolean): string {
  return jobAlert({
    urgent,
    callerName: lead.caller_name,
    jobType: lead.job_type,
    location: lead.location,
    neededBy: lead.preferred_time,
    callerNumber: lead.caller_number,
    link: jobLink(lead),
  });
}

function jobEmailBody(lead: Lead, business: Business): string {
  const link = jobLink(lead);

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
    // Same destination as the text, so a job is one place wherever you were told
    // about it.
    link ? `Open the job: ${link}` : "",
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
export type NotifyOutcome = {
  /** Channels that accepted a message. Zero means the job reached nobody. */
  delivered: number;
  /** Channels we tried. Zero with a lead means nothing was configured to try. */
  attempted: number;
};

export async function notifyAfterCall(options: {
  business: Business;
  profile: BusinessProfile;
  lead: Lead | null;
}): Promise<NotifyOutcome> {
  const { business, profile, lead } = options;

  // No lead means no job to tell anyone about — not a delivery failure.
  if (!lead) return { delivered: 0, attempted: 0 };

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

  /*
   * A qualified job that nobody was told about is the worst outcome the product
   * has, so every route to it is alarmed — including the two that reach it
   * without anything failing.
   *
   * The check used to require `attempted > 0`, which meant a business with no
   * rules, or none matching this lead, dropped every job in complete silence:
   * nothing threw, nothing logged, and it would surface as a quiet week that
   * nobody could explain. Both states are guarded in the UI — the last rule
   * cannot be deleted, and the per-lead toggles are not exposed — but they are
   * representable in the database, and this log exists for the case nobody
   * planned for.
   *
   * Sharper since urgency became optional: most leads are now `normal`, so
   * `on_new_lead` governs almost everything, and a rule left on urgent-only
   * would quietly drop nearly all of a customer's work.
   */
  if (delivered === 0) {
    const reason =
      rules.length === 0
        ? "business has no notification rules"
        : attempted === 0
          ? "no rule matched this lead"
          : "every notification channel failed";

    console.error(`JOB NOT DELIVERED: ${reason}`, {
      businessId: business.id,
      leadId: lead.id,
      urgent,
      rules: rules.length,
      attempted,
    });
  }

  return { delivered, attempted };
}
