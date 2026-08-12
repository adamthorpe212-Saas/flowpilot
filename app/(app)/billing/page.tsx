import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/auth";
import { formatPrice, getPlan } from "@/lib/plans";
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
      detail: "Everything's running normally.",
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

  const plan = getPlan(business.plan);
  const status = STATUS_COPY[business.subscription_status] ?? STATUS_COPY.incomplete;
  const hasSubscription = Boolean(business.stripe_subscription_id);
  const usage = await getUsage(business);

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
          Thanks — that&apos;s all set. It can take a few seconds to show below.
        </p>
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
