import { NextResponse, type NextRequest } from "next/server";
import { retentionPolicy } from "@/lib/retention";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Never redact more than this in one run, so a misconfiguration is survivable. */
const MAX_PER_RUN = 500;

/** Stands in for a redacted caller's number, which the schema requires. */
const REDACTED_NUMBER = "redacted";

/**
 * Ages out callers' personal data.
 *
 * Redacts rather than deletes, for the same reason the manual erasure on the
 * lead screen does: usage is counted from call rows, so removing them would
 * quietly reduce a customer's billed usage as a side effect of a privacy job.
 * What goes is everything identifying a member of the public — the transcript,
 * their number, their name, their address. What stays is the business's own
 * record that a call happened, when, and for how long.
 *
 * Does nothing at all unless RETENTION_DAYS is set. See lib/retention.ts for
 * why that decision is not made here.
 */
export async function GET(request: NextRequest) {
  // Same reasoning as the reclaim job: without this the endpoint is a public
  // URL that destroys customer data.
  const secret = process.env.CRON_SECRET;
  const authorisation = request.headers.get("authorization");

  if (!secret || authorisation !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const policy = retentionPolicy();

  if (!policy.enabled) {
    // Reported rather than silent: "the purge is not running" must be
    // discoverable without reading the source.
    return NextResponse.json({ skipped: policy.reason });
  }

  const supabase = createAdminClient();
  const cutoff = policy.cutoff.toISOString();

  const { data, error } = await supabase
    .from("call")
    .select("id")
    .lt("started_at", cutoff)
    .neq("from_number", REDACTED_NUMBER)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("Purge: could not load calls", error);
    return new NextResponse("Error", { status: 500 });
  }

  const ids = (data ?? []).map((row) => (row as { id: string }).id);

  if (ids.length === 0) {
    return NextResponse.json({ retentionDays: policy.days, redacted: 0 });
  }

  /*
   * Leads first. If the run dies between the two, a lead left pointing at an
   * emptied call is a worse state than a transcript that survives one more day
   * — the second is caught by tomorrow's run, the first is a record that looks
   * complete and is not.
   */
  const { error: leadError } = await supabase
    .from("lead")
    .delete()
    .in("call_id", ids);

  if (leadError) {
    console.error("Purge: could not delete leads", leadError);
    return new NextResponse("Error", { status: 500 });
  }

  const { error: callError } = await supabase
    .from("call")
    .update({ transcript: [], from_number: REDACTED_NUMBER })
    .in("id", ids);

  if (callError) {
    console.error("Purge: could not redact calls", callError);
    return new NextResponse("Error", { status: 500 });
  }

  console.log("Purged callers' details past the retention period", {
    retentionDays: policy.days,
    cutoff,
    redacted: ids.length,
  });

  return NextResponse.json({
    retentionDays: policy.days,
    cutoff,
    redacted: ids.length,
    more: ids.length === MAX_PER_RUN,
  });
}
