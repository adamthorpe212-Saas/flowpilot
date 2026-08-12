import type { Metadata } from "next";
import Link from "next/link";
import { soldPlan, formatPrice } from "@/lib/plans";
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

  /*
   * Only ever the plan we sell. Old links, bookmarks and shared URLs still
   * carry ?plan=starter, and honouring one would sign somebody up to a tier
   * that is no longer offered, at a price the rest of the site does not show.
   */
  void requested;
  const plan = soldPlan();
  const planId = plan.id;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your receptionist
      </h1>
      {/*
        Still true, and still worth saying: creating the account and configuring
        the receptionist genuinely costs nothing. What changed is that the free
        part now ends at the phone number rather than after a fortnight.
      */}
      <p className="mt-2 text-sm text-zinc-400">
        No card needed to get set up.
      </p>

      {/*
        Both links here were text-xs with no padding, giving 16px and 18px tap
        targets on the one screen where somebody is committing to pay. Anything
        under about 44px is a coin flip with a thumb, and a missed tap on
        "Change" reads as a broken page at the worst possible moment.
      */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] py-2 pl-4 pr-2">
        <div>
          <p className="text-sm font-medium">{plan.name}</p>
          <p className="text-[13px] text-zinc-400">
            {formatPrice(plan)}/month once you go live
          </p>
        </div>
        <Link
          href="/pricing"
          className="-my-2 flex min-h-11 flex-none items-center rounded-lg px-3 text-[13px] text-zinc-300 transition hover:bg-white/5 hover:text-white"
        >
          Change
        </Link>
      </div>

      <SignupForm plan={planId} />

      <p className="mt-8 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="ml-1 inline-flex min-h-11 items-center rounded-lg px-2 text-white transition hover:bg-white/5"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
