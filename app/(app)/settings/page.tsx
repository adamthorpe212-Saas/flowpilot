import type { Metadata } from "next";
import Link from "next/link";
import BusinessForm from "@/app/(app)/onboarding/business/BusinessForm";
import ServicesForm from "@/app/(app)/onboarding/services/ServicesForm";
import OpeningHoursForm from "./OpeningHoursForm";
import NotificationRules from "./NotificationRules";
import { getCurrentBusiness } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { formatIrishNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type { BusinessProfile, NotificationRule, Service } from "@/types/database";

export const metadata: Metadata = {
  title: "Settings — FlowPilot",
  robots: { index: false },
};

/**
 * Reuses the onboarding forms rather than reimplementing them. They differ only
 * in where they go on save, which is why the destination is a form field —
 * a second copy of these forms would be two places to fix every future change.
 */
export default async function SettingsPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();

  const [{ data: serviceRows }, { data: ruleRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from("service")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order"),
    supabase
      .from("notification_rule")
      .select("*")
      .eq("business_id", business.id),
    supabase
      .from("business_profile")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle(),
  ]);

  const services = (serviceRows ?? []) as Service[];
  const rules = (ruleRows ?? []) as NotificationRule[];
  const profile = (profileRow as BusinessProfile) ?? null;
  const emailAvailable = isEmailConfigured();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Change what your receptionist knows and how it sounds.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-zinc-300">Your business</h2>
        <BusinessForm
          name={business.name}
          industryLabel={business.industry_label ?? ""}
          serviceArea={business.service_area}
          submitLabel="Save changes"
        />
      </section>

      <section className="mt-14 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium text-zinc-300">What you do</h2>
        <ServicesForm
          services={services.map((service) => service.name)}
          emergency={services
            .filter((service) => service.emergency_eligible)
            .map((service) => service.name)}
          submitLabel="Save changes"
        />
      </section>

      <section className="mt-14 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium text-zinc-300">When you answer</h2>
        {profile && (
          <OpeningHoursForm
            openingHours={profile.opening_hours}
            behaviour={profile.out_of_hours_behaviour}
          />
        )}
      </section>

      <section className="mt-14 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium text-zinc-300">Your number</h2>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {business.phone_number ? (
            <>
              <p className="text-sm text-zinc-500">Calls are answered on</p>
              <p className="mt-1 text-lg font-semibold">
                {formatIrishNumber(business.phone_number)}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                {business.forwarding_verified_at
                  ? "Forwarding is confirmed working."
                  : "Forwarding hasn't been confirmed yet."}
              </p>
              {!business.forwarding_verified_at && (
                <Link
                  href="/onboarding/forwarding"
                  className="mt-4 inline-block rounded-full border border-white/20 px-5 py-2 text-sm transition hover:bg-white/5"
                >
                  Finish forwarding setup
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                You don&apos;t have a FlowPilot number yet.
              </p>
              <Link
                href="/onboarding/number"
                className="mt-4 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Get my number
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-14 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium text-zinc-300">Where jobs go</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Every qualified job is sent to everyone here.
        </p>

        <NotificationRules rules={rules} emailAvailable={emailAvailable} />
      </section>

      <section className="mt-14 border-t border-white/10 pt-10">
        <h2 className="text-sm font-medium text-zinc-300">Something not working?</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Check what&apos;s connected and what isn&apos;t.
        </p>
        <Link
          href="/settings/diagnostics"
          className="mt-4 inline-block rounded-full border border-white/20 px-5 py-2 text-sm transition hover:bg-white/5"
        >
          Run diagnostics
        </Link>
      </section>
    </div>
  );
}
