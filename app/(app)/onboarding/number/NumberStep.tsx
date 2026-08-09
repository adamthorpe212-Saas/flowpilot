"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  provisionNumber,
  type ProvisionState,
} from "@/app/(app)/onboarding/number/actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";

const INITIAL: ProvisionState = { error: null };

export default function NumberStep({
  existingNumber,
}: {
  existingNumber: string | null;
}) {
  const [state, formAction] = useActionState(provisionNumber, INITIAL);
  const phoneNumber = state.phoneNumber ?? existingNumber;

  if (phoneNumber) {
    return (
      <div className="mt-8">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-6 text-center">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">
            Your number
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {phoneNumber}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This is where your missed calls will go. You don&apos;t need to give
            it to anyone.
          </p>
        </div>

        <Link
          href="/onboarding/forwarding"
          className="mt-6 block rounded-xl bg-white px-5 py-3 text-center text-[15px] font-semibold text-black transition hover:bg-zinc-200"
        >
          Continue
        </Link>
      </div>
    );
  }

  /*
   * Waiting on us, not on them.
   *
   * Regulatory approval and account configuration are not fixed by pressing a
   * button again, and a customer left tapping one that will never work decides
   * the product is broken rather than pending. So the retry disappears, the
   * reason is stated plainly, and they are given somewhere to go — everything
   * before this step is already saved, and they will come back to a number
   * waiting for them.
   */
  if (state.pending) {
    return (
      <div className="mt-8">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-300">
            Waiting on us
          </p>
          <p className="mt-3 text-[15px] leading-7 text-zinc-200">
            {state.error}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Irish numbers need regulatory approval before they can be handed
            out, and yours is in the queue. Everything you&apos;ve set up so far
            is saved. We&apos;ll let you know the moment your number is live,
            and the last step takes a minute.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 block rounded-xl border border-white/20 px-5 py-3 text-center text-[15px] transition hover:border-white/40 hover:bg-white/5"
        >
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <FormError message={state.error} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-500">
              1
            </span>
            We reserve an Irish number for your business.
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-500">
              2
            </span>
            You point your missed calls at it — takes about a minute.
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-500">
              3
            </span>
            We ring you to check it worked.
          </li>
        </ul>
      </div>

      <SubmitButton>Get my number</SubmitButton>

      <p className="text-center text-xs text-zinc-500">
        Included in your plan. No extra charge.
      </p>
    </form>
  );
}
