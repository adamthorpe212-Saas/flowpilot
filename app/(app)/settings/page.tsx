import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import BusinessForm from "@/app/(app)/onboarding/business/BusinessForm";
import ServicesForm from "@/app/(app)/onboarding/services/ServicesForm";
import { titleClass } from "@/components/ui/field-styles";
import BlockedCallers from "./BlockedCallers";
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
  BlockedCaller,
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
 * One section, one card.
 *
 * Sections used to be separated by a hairline rule, which is the weakest
 * division a page can have: eight topics down one column, each blending into
 * the next, so somebody looking for "what it asks callers" had to read the
 * whole page to find where one thing ended and another began.
 *
 * A card puts a real edge around each topic. It costs a little vertical space
 * and buys the thing that was missing — you can see, without reading, how many
 * separate decisions this page is asking you to make.
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
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <h2 className={titleClass}>{title}</h2>
      {blurb && (
        <p className="mt-1.5 max-w-lg text-[13px] leading-5 text-zinc-400">
          {blurb}
        </p>
      )}
      <div className="mt-5">{children}</div>
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
    { data: blockedRows },
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
    supabase
      .from("blocked_caller")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at"),
  ]);

  const services = (serviceRows ?? []) as Service[];
  const rules = (ruleRows ?? []) as NotificationRule[];
  const profile = (profileRow as BusinessProfile) ?? null;
  const questions = (questionRows ?? []) as QualificationQuestion[];
  const blockedCallers = (blockedRows ?? []) as BlockedCaller[];
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
        Ordered by what somebody opened this page to do: the receptionist first,
        the business behind it second, the plumbing last.

        Named for what a customer is deciding, not for what the data is called.
        "How it answers" and "What it asks for" were our words for our columns.
        Somebody scanning this page is looking for the thing their receptionist
        says out loud, and the details it comes back with.
      */}
      <Section
        title="What your receptionist says"
        blurb="Its opening line, how it should sound, and the things it must never say."
      >
        {profile && (
          <VoiceForm profile={profile} businessName={business.name} />
        )}
      </Section>

      <Section
        title="What details it gets from callers"
        blurb="Asked one at a time, in this order, in your own words. Untick one and it only asks if the conversation suits."
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
        title="Try it yourself"
        blurb="Type what a caller might say and watch the job build itself. Nothing here is saved or sent."
      >
        <ReceptionistPreview />
      </Section>

      <Section
        title="About your business"
        blurb="Your name is said out loud on every call. The areas decide which jobs get flagged as outside your patch."
      >
        <BusinessForm
          name={business.name}
          industryLabel={business.industry_label ?? ""}
          serviceArea={business.service_area}
          submitLabel="Save changes"
        />
      </Section>

      <Section
        title="The work you take on"
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
        blurb="Your hours, and what it should do with a call that comes in outside them."
      >
        {profile && (
          <OpeningHoursForm
            openingHours={profile.opening_hours}
            behaviour={profile.out_of_hours_behaviour}
          />
        )}
      </Section>

      <Section
        title="Where your jobs get sent"
        blurb="Every job goes to everyone on this list, the moment the call ends."
      >
        <NotificationRules rules={rules} emailAvailable={emailAvailable} />
      </Section>

      {/*
        Below notifications rather than up with the receptionist's words: this
        is an exception list, and most people will never add to it. It matters
        enormously to the ones who do — nobody wants their wife greeted by
        "I'm their automated assistant".
      */}
      <Section
        title="Callers it should never answer"
        blurb="Family, a supplier, a scam number. If one of these rings after you've missed it, your receptionist stays quiet and the call does whatever it did before FlowPilot — voicemail, or ringing out."
      >
        <BlockedCallers callers={blockedCallers} />
      </Section>

      <Section title="Your FlowPilot number">
        <div>
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
