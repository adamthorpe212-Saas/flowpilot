import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import BusinessForm from "@/app/(app)/onboarding/business/BusinessForm";
import ServicesForm from "@/app/(app)/onboarding/services/ServicesForm";
import OpeningHoursForm from "./OpeningHoursForm";
import NotificationRules from "./NotificationRules";
import QuestionsForm from "./QuestionsForm";
import VoiceForm from "./VoiceForm";
import ReceptionistPreview from "./ReceptionistPreview";
import { getCurrentBusiness } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { formatIrishNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessProfile,
  NotificationRule,
  QualificationQuestion,
  Service,
} from "@/types/database";

export const metadata: Metadata = {
  title: "Your receptionist — FlowPilot",
  robots: { index: false },
};

/**
 * One heading treatment, defined once.
 *
 * Every section used to repeat `text-sm font-medium text-zinc-300` above a
 * `mt-14 border-t pt-10`, which made eight different things look like eight
 * copies of the same thing. Pulling it out is not only tidier — it is what
 * makes it obvious when a section is missing its blurb.
 */
function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-white/10 pt-10">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {blurb && (
        <p className="mt-1.5 max-w-lg text-sm leading-6 text-zinc-400">
          {blurb}
        </p>
      )}
      {children}
    </section>
  );
}

/**
 * Reuses the onboarding forms rather than reimplementing them. They differ only
 * in where they go on save, which is why the destination is a form field —
 * a second copy of these forms would be two places to fix every future change.
 */
export default async function SettingsPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();

  const [
    { data: serviceRows },
    { data: ruleRows },
    { data: profileRow },
    { data: questionRows },
  ] = await Promise.all([
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
    // Alongside the others rather than after them: this page already made three
    // round trips, and a fourth in series is a fourth wait for no reason.
    supabase
      .from("qualification_question")
      .select("*")
      .eq("business_id", business.id)
      .order("sort_order"),
  ]);

  const services = (serviceRows ?? []) as Service[];
  const rules = (ruleRows ?? []) as NotificationRule[];
  const profile = (profileRow as BusinessProfile) ?? null;
  const questions = (questionRows ?? []) as QualificationQuestion[];
  const emailAvailable = isEmailConfigured();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Your receptionist
      </h1>
      <p className="mt-1.5 text-sm leading-6 text-zinc-400">
        How it answers, what it asks, and what it knows about you.
      </p>

      {/*
        Ordered by what somebody opened this page to do.

        It used to run business details, services, preview, voice, hours,
        number, notifications, diagnostics — eight sections with identical
        headings and identical rules between them, so nothing looked more
        important than anything else and the thing people actually come here to
        change sat fourth.

        Now the receptionist comes first and the plumbing is folded away at the
        bottom behind a heading that says it is plumbing. Same forms, same
        actions, different order and different weight.
      */}
      <Section
        title="How it answers"
        blurb="The first thing a caller hears, how it should sound, and what it must never say."
      >
        {profile && (
          <VoiceForm profile={profile} businessName={business.name} />
        )}
      </Section>

      <Section
        title="What it asks for"
        blurb="Every caller gets asked these, one at a time, in your words."
      >
        {questions.length > 0 ? (
          <QuestionsForm questions={questions} />
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-zinc-400">
            Your questions haven&apos;t been set up yet.
          </p>
        )}
      </Section>

      <Section
        title="Hear it before a customer does"
        blurb="Type what a caller might say and watch the job build itself."
      >
        <ReceptionistPreview />
      </Section>

      <Section
        title="About your business"
        blurb="Your name is said out loud on every call. The areas decide which jobs get flagged as out of your patch."
      >
        <BusinessForm
          name={business.name}
          industryLabel={business.industry_label ?? ""}
          serviceArea={business.service_area}
          submitLabel="Save changes"
        />
      </Section>

      <Section
        title="The work you take"
        blurb="So it knows what sounds like a job for you, and what doesn't."
      >
        <ServicesForm
          services={services.map((service) => service.name)}
          emergency={services
            .filter((service) => service.emergency_eligible)
            .map((service) => service.name)}
          industryLabel={business.industry_label}
          submitLabel="Save changes"
        />
      </Section>

      <Section
        title="When you're available"
        blurb="And what it should do with a call outside those hours."
      >
        {profile && (
          <OpeningHoursForm
            openingHours={profile.opening_hours}
            behaviour={profile.out_of_hours_behaviour}
          />
        )}
      </Section>

      <Section
        title="Where jobs go"
        blurb="Every qualified job is sent to everyone here."
      >
        <NotificationRules rules={rules} emailAvailable={emailAvailable} />
      </Section>

      <Section title="Your number">
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          {business.phone_number ? (
            <>
              <p className="text-sm text-zinc-400">Calls are answered on</p>
              <p className="mt-1 text-lg font-semibold">
                {formatIrishNumber(business.phone_number)}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
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
      </Section>

      {/*
        Quiet on purpose. Diagnostics is for the day something is wrong, and
        giving it the same weight as the receptionist's own settings made the
        page feel like a control panel rather than somewhere you set up a
        receptionist.
      */}
      <div className="mt-16 border-t border-white/10 pt-6">
        <Link
          href="/settings/diagnostics"
          className="inline-flex min-h-11 items-center text-sm text-zinc-500 transition hover:text-white"
        >
          Something not working? Check what&apos;s connected →
        </Link>
      </div>
    </div>
  );
}
