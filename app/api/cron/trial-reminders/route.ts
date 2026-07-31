import { NextResponse, type NextRequest } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";
import {
  dueReminder,
  reminderBody,
  reminderSubject,
} from "@/lib/trial-reminders";
import type { Business, NotificationRule } from "@/types/database";

export const runtime = "nodejs";

/**
 * Warns customers before their trial ends, and tells them when it has.
 *
 * The trial genuinely expires now, which means a receptionist stops answering
 * on a schedule. Without this the first sign is a quiet week and a customer who
 * rang somebody else — and the dashboard banner only reaches people who happen
 * to log in, which is exactly the group least likely to notice.
 *
 * Scheduled by vercel.json alongside the reclaim job.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorisation = request.headers.get("authorization");

  if (!secret || authorisation !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isEmailConfigured()) {
    // Not an error: email is optional configuration. But a silent no-op here
    // would look identical to "nobody was due", so say which it was.
    console.warn("Trial reminders skipped: email is not configured");
    return NextResponse.json({ skipped: "email not configured" });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("subscription_status", "incomplete");

  if (error) {
    console.error("Trial reminders: could not load businesses", error);
    return new NextResponse("Error", { status: 500 });
  }

  const businesses = (data ?? []) as Business[];
  const billingUrl = `${siteUrl()}/billing`;
  let sent = 0;

  for (const business of businesses) {
    const stage = dueReminder(business);
    if (!stage) continue;

    /*
     * Reuse whatever addresses already receive job alerts. Asking for a
     * separate billing contact would be one more onboarding field, and the
     * person who gets the jobs is the person who cares that they are about to
     * stop.
     */
    const { data: ruleRows } = await supabase
      .from("notification_rule")
      .select("*")
      .eq("business_id", business.id)
      .eq("channel", "email");

    const recipients = ((ruleRows ?? []) as NotificationRule[]).map(
      (rule) => rule.destination,
    );

    if (recipients.length === 0) {
      console.warn("Trial reminder has nowhere to go", {
        businessId: business.id,
        stage,
      });
      continue;
    }

    try {
      for (const recipient of recipients) {
        await sendEmail({
          to: recipient,
          subject: reminderSubject(stage, business),
          text: reminderBody(stage, business, billingUrl),
        });
      }

      /*
       * Recorded only after a successful send. Marking first would silently
       * swallow a failed reminder — and the whole point is that the customer
       * hears about this before their phone goes quiet.
       */
      await supabase
        .from("business")
        .update({ trial_reminder_stage: stage })
        .eq("id", business.id);

      sent += 1;
    } catch (sendError) {
      console.error("Trial reminder failed to send", {
        businessId: business.id,
        stage,
        error: sendError,
      });
    }
  }

  return NextResponse.json({ considered: businesses.length, sent });
}
