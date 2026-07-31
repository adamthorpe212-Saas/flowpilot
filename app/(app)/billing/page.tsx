import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/auth";
import { formatPrice, getPlan, PLANS, TRIAL_DAYS } from "@/lib/plans";
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
      detail: "Start your subscription to keep your receptionist answering.",
    },
    trialing: {
      label: "Free trial",
      tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      detail: "You're on your free trial. Nothing to pay yet.",
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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">
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
            <p className="mt-1 text-sm text-zinc-500">
              {formatPrice(plan)}/month · up to {plan.callAllowance} answered
              calls
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs ${status.tone}`}>
            {status.label}
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-400">{status.detail}</p>

        <BillingActions
          currentPlan={business.plan}
          hasSubscription={hasSubscription}
        />
      </div>

      {!hasSubscription && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-zinc-300">Other plans</h2>
          <ul className="mt-4 space-y-3">
            {PLANS.filter((candidate) => candidate.id !== business.plan).map(
              (candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <div>
                    <p className="font-medium">{candidate.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatPrice(candidate)}/month · {candidate.callAllowance}{" "}
                      calls
                    </p>
                  </div>
                  <BillingActions
                    currentPlan={candidate.id}
                    hasSubscription={false}
                    compact
                  />
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <p className="mt-8 text-xs text-zinc-600">
        {TRIAL_DAYS} days free on any plan. Prices exclude VAT. Cancel any time —
        your receptionist keeps answering until the end of the month you&apos;ve
        paid for.
      </p>
    </div>
  );
}
