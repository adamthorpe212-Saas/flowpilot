import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/onboarding"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Setup
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Forward your calls
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        The last step. You keep your own number — this just tells your network
        where to send calls you don&apos;t pick up.
      </p>

      <ForwardingStep
        flowpilotNumber={business.phone_number}
        mobile={rule?.destination ?? null}
        verified={Boolean(business.forwarding_verified_at)}
      />
    </div>
  );
}
