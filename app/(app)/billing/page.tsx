import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { formatPrice, getPlan, soldPlan } from "@/lib/plans";
import { nextIncompleteStep, onboardingSteps } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { getUsage } from "@/lib/usage";
import BillingActions from "./BillingActions";

export const metadata: Metadata = {
  title: "Billing — FlowPilot",
  robots: { index: false },
};

const STATUS_COPY: Record<string, { label: string; tone: string; detail: string }> =
  {
    incomplete: {
      label: "No subscription",
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      detail:
        "Subscribe to get your number and start answering calls. Nothing has been charged yet.",
    },
    /*
     * Kept even though FlowPilot no longer starts trials.
     *
     * Stripe still reports `trialing` if one is ever applied — a promotion, or
     * a subscription set up by hand in the dashboard — and a status the billing
     * page cannot render would show a customer a blank box about their own
     * money. It costs four lines to handle a state we do not create.
     */
    trialing: {
      label: "Free trial",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      detail: "You're on a free trial. Nothing to pay yet.",
    },
    active: {
      label: "Active",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      // Says only what it knows: the money is fine. Whether the receptionist
      // is answering is a different question, answered by the panel above.
      detail: "Your subscription is active.",
    },
    past_due: {
      label: "Payment failed",
      tone: "border-red-500/30 bg-red-500/10 text-red-200",
      detail:
        "We couldn't take your last payment. Update your card to stay live.",
    },
    canceled: {
      label: "Cancelled",
      tone: "border-white/15 bg-white/5 text-zinc-300",
      detail: "Your receptionist has stopped answering. Resubscribe any time.",
    },
  };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const business = await getCurrentBusiness();
  if (!business) return null;

  /*
   * Somebody who has never subscribed is shown what they would be buying, not
   * whatever their row happens to say.
   *
   * Every signup used to be stamped 'starter' by a database default left over
   * from when three tiers were sold, so this page confidently offered "Starter
   * — €49/month · up to 50 answered calls", a plan that cannot be purchased at
   * a price that is not ours. The default is fixed, but the rule matters
   * independently: a withdrawn tier can only ever be right for somebody
   * actually paying for it.
   */
  /*
   * One source of truth for "are they paying us".
   *
   * This read stripe_subscription_id while the status badge three lines below
   * read subscription_status, so a business active in one column and empty in
   * the other was shown "Active" and "Start subscription" side by side. Two
   * columns describing one fact will always drift; subscription_status is the
   * one the webhook maintains and the one entitlement is decided from
   * everywhere else, so it wins here too.
   */
  const hasSubscription = ["active", "trialing", "past_due"].includes(
    business.subscription_status,
  );
  const plan = hasSubscription ? getPlan(business.plan) : soldPlan();
  const status = STATUS_COPY[business.subscription_status] ?? STATUS_COPY.incomplete;
  const usage = await getUsage(business);

  /*
   * Paying is not the same as working, and this page used to conflate them.
   *
   * "Active — everything's running normally" was shown to a customer who had
   * paid thirty seconds earlier and had no number and no forwarding. Nothing on
   * the page was false about the SUBSCRIPTION; it was simply answering a
   * question nobody asks here. What a tradesperson wants to know on the day
   * they hand over their phone line is "is it answering", and the honest answer
   * was no.
   *
   * Derived from the same fields the receptionist checks, so it cannot claim a
   * readiness the call path would not honour.
   */
  const supabase = await createClient();
  const { count: serviceCount } = await supabase
    .from("service")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  const steps = onboardingSteps(business, serviceCount ?? 0);
  const remaining = steps.filter((step) => !step.done);
  const nextStep = nextIncompleteStep(steps);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Your plan, your card, and anything you need to change.
      </p>

      {checkout === "success" && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {/*
            Was "that's all set", said to somebody with no number and no
            forwarding. Payment landing and the receptionist working are two
            different things and only one of them had happened.
          */}
          Payment received. It can take a few seconds to show below.
        </p>
      )}

      {/*
        The thing they actually came to find out.

        Sits above the subscription card because "is my phone covered" beats
        "what am I paying" every time, and because this is the page Stripe used
        to drop people on with nothing to do next.
      */}
      {hasSubscription && nextStep && (
        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
          <p className="flex items-center gap-2.5 text-[15px] font-medium">
            <span
              aria-hidden="true"
              className="h-2 w-2 flex-none rounded-full bg-amber-400"
            />
            Not answering calls yet
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
            You&apos;re paid up, but{" "}
            {remaining.length === 1
              ? "there's one thing left"
              : `there are ${remaining.length} things left`}{" "}
            before your receptionist can pick up.
          </p>

          <ul className="mt-4 space-y-1.5 text-[13px] text-zinc-300">
            {remaining.map((step) => (
              <li key={step.slug} className="flex items-baseline gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 flex-none translate-y-[-2px] rounded-full bg-zinc-600"
                />
                {step.title}
              </li>
            ))}
          </ul>

          <Link
            href={nextStep.href}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {nextStep.title} →
          </Link>
        </div>
      )}

      {checkout === "cancelled" && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-zinc-300"
        >
          No payment was taken. You can pick up where you left off whenever
          you&apos;re ready.
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{plan.name}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {formatPrice(plan)}/month · up to {plan.callAllowance} answered
              calls
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs ${status.tone}`}>
            {status.label}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-400">{status.detail}</p>

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-zinc-400">Calls answered this month</p>
            <p className="text-sm font-medium">
              {usage.used}
              <span className="text-zinc-500"> / {usage.allowance}</span>
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuenow={usage.used}
            aria-valuemin={0}
            aria-valuemax={usage.allowance}
            aria-label="Calls answered this month"
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className={`h-full rounded-full transition-all ${
                usage.overLimit
                  ? "bg-amber-400"
                  : usage.nearingLimit
                    ? "bg-amber-300"
                    : "bg-white"
              }`}
              style={{
                width: `${Math.min(100, Math.round((usage.used / usage.allowance) * 100))}%`,
              }}
            />
          </div>

          {(usage.nearingLimit || usage.overLimit) && (
            <p className="mt-3 text-sm leading-6 text-amber-200/80">
              {usage.overLimit
                ? "You're over your plan's calls this month. We'll keep answering — nothing stops — but a bigger plan would suit you better."
                : "You're getting close to your plan's calls for this month."}
            </p>
          )}
        </div>

        <BillingActions
          currentPlan={business.plan}
          hasSubscription={hasSubscription}
        />
      </div>

      {/*
        Built as one string rather than an expression sitting next to text.
        Rendered live, this line came out as "14days free on any plan" — React
        received the number and the words as separate children with the space
        between them gone, even though the source has it and the identical
        pattern on the pricing page renders correctly. Rather than leave copy
        that reads as a typo on the page where somebody is deciding whether to
        pay, the value and its unit are now a single string, which cannot be
        split by whitespace handling wherever it runs.
      */}
      <p className="mt-8 text-xs text-zinc-500">
        {`Prices exclude VAT. Cancel any time — your receptionist keeps answering until the end of the month you've paid for.`}
      </p>
    </div>
  );
}
