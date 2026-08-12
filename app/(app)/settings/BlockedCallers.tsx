"use client";

import { useActionState } from "react";
import {
  blockCaller,
  unblockCaller,
  type BlockedCallerState,
} from "@/app/(app)/settings/blocked-caller-actions";
import { controlClass } from "@/components/ui/field-styles";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import { formatLeadTime } from "@/lib/lead-time";
import { formatIrishNumber } from "@/lib/phone";
import type { BlockedCaller } from "@/types/database";

const INITIAL: BlockedCallerState = { error: null };

/**
 * Numbers the receptionist should never answer.
 *
 * Shows a block count beside each entry, which is not decoration: without it a
 * blocklist is a promise nobody can verify, and it is also how somebody
 * notices they have blocked a number they did not mean to.
 */
export default function BlockedCallers({
  callers,
}: {
  callers: BlockedCaller[];
}) {
  const [state, formAction] = useActionState(blockCaller, INITIAL);

  return (
    <div className="space-y-5">
      {callers.length > 0 && (
        <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] px-5">
          {callers.map((caller) => (
            <li
              key={caller.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">
                  {caller.label ?? formatIrishNumber(caller.number)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {caller.label && `${formatIrishNumber(caller.number)} · `}
                  {caller.blocked_count === 0
                    ? "Hasn't rung since"
                    : `Blocked ${caller.blocked_count === 1 ? "once" : `${caller.blocked_count} times`}${
                        caller.last_blocked_at
                          ? `, last ${formatLeadTime(caller.last_blocked_at).toLowerCase()}`
                          : ""
                      }`}
                </p>
              </div>

              <form action={unblockCaller}>
                <input type="hidden" name="id" value={caller.id} />
                <button
                  type="submit"
                  className="text-xs text-zinc-500 transition hover:text-white"
                >
                  Unblock
                  <span className="sr-only"> {caller.number}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />

        {state.saved && !state.error && (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            Saved. Your receptionist won&apos;t pick up to them again.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="blocked-number" className="sr-only">
              Phone number to block
            </label>
            <input
              id="blocked-number"
              name="number"
              type="tel"
              required
              placeholder="087 123 4567"
              className={controlClass}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="blocked-label" className="sr-only">
              Who it is
            </label>
            <input
              id="blocked-label"
              name="label"
              maxLength={40}
              placeholder="Who it is (optional)"
              className={controlClass}
            />
          </div>
        </div>

        <SubmitButton>Add</SubmitButton>
      </form>
    </div>
  );
}
