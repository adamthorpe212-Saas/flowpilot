import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import BusinessForm from "./BusinessForm";

export const metadata: Metadata = {
  title: "Your business — FlowPilot",
  robots: { index: false },
};

export default async function BusinessStepPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/onboarding"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Setup
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Your business
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Your receptionist uses this to introduce itself and to spot jobs outside
        your patch.
      </p>

      <BusinessForm
        name={business.name}
        industryLabel={business.industry_label ?? ""}
        serviceArea={business.service_area}
      />
    </div>
  );
}
