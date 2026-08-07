import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types/database";
import ServicesForm from "./ServicesForm";

export const metadata: Metadata = {
  title: "What you do — FlowPilot",
  robots: { index: false },
};

export default async function ServicesStepPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("service")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order");

  const services = (data ?? []) as Service[];

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/onboarding"
        className="text-sm text-zinc-400 transition hover:text-white"
      >
        ← Setup
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">What you do</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        This is the vocabulary your receptionist listens for. A caller saying
        &ldquo;my boiler&apos;s making a noise&rdquo; gets matched against this
        list.
      </p>

      <ServicesForm
        services={services.map((service) => service.name)}
        emergency={services
          .filter((service) => service.emergency_eligible)
          .map((service) => service.name)}
        industryLabel={business.industry_label}
        next="/onboarding/number"
      />
    </div>
  );
}
