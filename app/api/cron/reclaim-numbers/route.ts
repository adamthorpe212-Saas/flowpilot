import { NextResponse, type NextRequest } from "next/server";
import { isReclaimable, RECLAIM_GRACE_DAYS } from "@/lib/reclaim";
import { createAdminClient } from "@/lib/supabase/server";
import { isTwilioConfigured, releaseNumber } from "@/lib/twilio";
import type { Business } from "@/types/database";

export const runtime = "nodejs";

/**
 * Gives back numbers belonging to businesses that stopped paying.
 *
 * Without this, every abandoned trial left a number billed to FlowPilot every
 * month, forever. Nothing in the product would ever surface it — the only way
 * to find them would be reading the Twilio invoice line by line, which is not a
 * thing anyone does until the bill is already large.
 *
 * Scheduled by vercel.json. Runs daily; doing nothing is the normal outcome.
 */
export async function GET(request: NextRequest) {
  /*
   * Vercel sends the CRON_SECRET as a bearer token. Without this check the
   * endpoint is a public URL that deletes customers' phone numbers.
   */
  const secret = process.env.CRON_SECRET;
  const authorisation = request.headers.get("authorization");

  if (!secret || authorisation !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({ skipped: "twilio not configured" });
  }

  const supabase = createAdminClient();

  // Only businesses that still hold a number are candidates.
  const { data, error } = await supabase
    .from("business")
    .select("*")
    .not("phone_number_sid", "is", null);

  if (error) {
    console.error("Reclaim: could not load businesses", error);
    return new NextResponse("Error", { status: 500 });
  }

  const businesses = (data ?? []) as Business[];
  const due = businesses.filter((business) => isReclaimable(business));

  let released = 0;

  for (const business of due) {
    try {
      await releaseNumber(business.phone_number_sid as string);

      /*
       * Clear the number only after Twilio confirms the release. Clearing first
       * would lose the sid on failure, leaving a number nothing can ever
       * reclaim — the exact permanent cost this job exists to prevent.
       */
      await supabase
        .from("business")
        .update({
          phone_number: null,
          phone_number_sid: null,
          forwarding_verified_at: null,
        })
        .eq("id", business.id);

      released += 1;

      console.log("Reclaimed number after grace period", {
        businessId: business.id,
        graceDays: RECLAIM_GRACE_DAYS,
      });
    } catch (releaseError) {
      console.error("Reclaim: failed to release number", {
        businessId: business.id,
        error: releaseError,
      });
    }
  }

  return NextResponse.json({ considered: businesses.length, released });
}
