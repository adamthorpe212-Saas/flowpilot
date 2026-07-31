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

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <FormError message={state.error} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-600">
              1
            </span>
            We reserve an Irish number for your business.
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-600">
              2
            </span>
            You point your missed calls at it — takes about a minute.
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-zinc-600">
              3
            </span>
            We ring you to check it worked.
          </li>
        </ul>
      </div>

      <SubmitButton>Get my number</SubmitButton>

      <p className="text-center text-xs text-zinc-600">
        Included in your plan. No extra charge.
      </p>
    </form>
  );
}
