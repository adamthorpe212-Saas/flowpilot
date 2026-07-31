import type { Metadata } from "next";
import Link from "next/link";
import { getPlan, PLANS, TRIAL_DAYS, formatPrice } from "@/lib/plans";
import type { Plan } from "@/types/database";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Get started — FlowPilot",
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: requested } = await searchParams;

  const isKnownPlan = PLANS.some((plan) => plan.id === requested);
  const planId = (isKnownPlan ? requested : "starter") as Plan;
  const plan = getPlan(planId);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your receptionist
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        {TRIAL_DAYS} days free. No card needed to get set up.
      </p>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div>
          <p className="text-sm font-medium">{plan.name}</p>
          <p className="text-xs text-zinc-500">
            {formatPrice(plan)}/month after your trial
          </p>
        </div>
        <Link
          href="/pricing"
          className="text-xs text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
        >
          Change
        </Link>
      </div>

      <SignupForm plan={planId} />

      <p className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
