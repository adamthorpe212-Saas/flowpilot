import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import NumberStep from "./NumberStep";

export const metadata: Metadata = {
  title: "Your number — FlowPilot",
  robots: { index: false },
};

export default async function NumberStepPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/onboarding"
        className="text-sm text-zinc-400 transition hover:text-white"
      >
        ← Setup
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Your FlowPilot number
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        An Irish number that answers when you can&apos;t. You keep your own
        number — nothing on your van or website changes.
      </p>

      <NumberStep existingNumber={business.phone_number} />
    </div>
  );
}
