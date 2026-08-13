import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { networkFromCarrier, networkReassurance } from "@/lib/irish-networks";
import { createClient } from "@/lib/supabase/server";
import { lookupCarrierName } from "@/lib/twilio";
import ForwardingStep from "./ForwardingStep";

export const metadata: Metadata = {
  title: "Forward your calls — FlowPilot",
  robots: { index: false },
};

export default async function ForwardingStepPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data: rule } = await supabase
    .from("notification_rule")
    .select("destination")
    .eq("business_id", business.id)
    .eq("channel", "sms")
    .maybeSingle();

  /*
   * Detected, never asked.
   *
   * A "which network are you on?" dropdown is a question a customer can answer
   * wrong — plenty of people on gomo will pick Eir and plenty on 48 will pick
   * Three — and a wrong answer produces confidently wrong instructions. Twilio
   * already knows, from the mobile they have to enter anyway.
   *
   * Decoration on a step that works regardless, so a failed lookup degrades to
   * a generic line rather than blocking anything.
   */
  const mobile = rule?.destination ?? null;
  const reassurance = networkReassurance(
    networkFromCarrier(mobile ? await lookupCarrierName(mobile) : null),
  );

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/onboarding"
        className="text-sm text-zinc-400 transition hover:text-white"
      >
        ← Setup
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Forward your calls
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        The last step. You keep your own number — this just tells your network
        where to send calls you don&apos;t pick up.
      </p>

      <ForwardingStep
        flowpilotNumber={business.phone_number}
        mobile={mobile}
        networkReassurance={reassurance}
        verified={Boolean(business.forwarding_verified_at)}
      />
    </div>
  );
}
