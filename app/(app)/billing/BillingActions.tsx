"use client";

import { useActionState } from "react";
import {
  openBillingPortal,
  startCheckout,
  type BillingState,
} from "@/app/(app)/billing/actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Plan } from "@/types/database";

const INITIAL: BillingState = { error: null };

export default function BillingActions({
  currentPlan,
  hasSubscription,
  compact = false,
}: {
  currentPlan: Plan;
  hasSubscription: boolean;
  compact?: boolean;
}) {
  const [checkoutState, checkoutAction] = useActionState(startCheckout, INITIAL);
  const [portalState, portalAction] = useActionState(openBillingPortal, INITIAL);

  if (hasSubscription) {
    return (
      <form action={portalAction} className="mt-6 space-y-3">
        <FormError message={portalState.error} />
        <SubmitButton className="!w-auto !bg-transparent !px-5 !text-white ring-1 ring-inset ring-white/20 hover:!bg-white/5">
          Manage billing
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={checkoutAction} className={compact ? "" : "mt-6 space-y-3"}>
      <input type="hidden" name="plan" value={currentPlan} />
      {!compact && <FormError message={checkoutState.error} />}
      <SubmitButton className={compact ? "!w-auto !px-5 !py-2 !text-sm" : "!w-auto !px-6"}>
        {compact ? "Choose" : "Start subscription"}
      </SubmitButton>
    </form>
  );
}
