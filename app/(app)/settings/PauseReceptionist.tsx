"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import {
  setReceptionistPaused,
  type PauseState,
} from "@/app/(app)/settings/pause-actions";

const INITIAL: PauseState = { error: null };

/**
 * On or off, as a switch that moves the moment it is pressed.
 *
 * The first version was a submit button and a server round trip, and it looked
 * broken: press it, wait, watch nothing happen. This is the one control that
 * answers "is my phone being covered right now", so it has to respond
 * immediately and say so plainly when it cannot.
 *
 * Optimistic, but never silent about failing. If the write is rejected the
 * switch snaps back to where it was and an error appears — a toggle that stays
 * in the new position after a failed save is worse than one that never moved,
 * because it lies.
 */
export default function PauseReceptionist({
  pausedAt,
}: {
  pausedAt: string | null;
}) {
  const [state, formAction] = useActionState(setReceptionistPaused, INITIAL);
  const [, startTransition] = useTransition();

  /*
   * Seeded from the server on every render, so a rejected write reverts by
   * itself when React discards the optimistic value — no manual rollback, and
   * no way for the UI to drift from the database after a failure.
   */
  const [paused, setPaused] = useOptimistic(Boolean(pausedAt));

  const live = !paused;

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        paused
          ? "border-amber-500/25 bg-amber-500/[0.07]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[15px] font-medium">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${
                live ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {live ? "Answering your missed calls" : "Switched off"}
          </p>
          <p className="mt-1.5 max-w-md text-[13px] leading-5 text-zinc-400">
            {live
              ? "Any call you don't pick up goes to your receptionist. Your own phone still rings first, every time."
              : "Callers hear it ring out, the same as before FlowPilot. Nothing is being answered and no jobs are being taken."}
          </p>
          {!live && pausedAt && (
            <p className="mt-1 text-[13px] text-zinc-500">
              Off since {formatWhen(pausedAt)}.
            </p>
          )}
        </div>

        <form
          action={formAction}
          className="flex-none"
          onSubmit={() => {
            // Move the switch now. The action follows; if it fails, React
            // discards this and the switch returns to the server's answer.
            startTransition(() => setPaused(!paused));
          }}
        >
          <input type="hidden" name="paused" value={paused ? "false" : "true"} />
          <button
            type="submit"
            role="switch"
            aria-checked={live}
            aria-label="Receptionist answering missed calls"
            className={`relative inline-flex h-9 w-16 flex-none items-center rounded-full transition ${
              live ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition ${
                live ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </form>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </p>
      )}

      {/*
        Said before somebody goes looking for the dial codes. Switching off here
        leaves the carrier setup alone, so coming back is one tap — whereas
        ##002# clears the voicemail they were told to disable during setup and
        takes two codes to undo.
      */}
      <p className="mt-4 border-t border-white/[0.07] pt-3.5 text-[13px] leading-5 text-zinc-500">
        Your forwarding stays set up either way, so switching back on takes one
        tap. You keep your number and nothing on your phone changes.
      </p>
    </div>
  );
}

/** "14 August" — a date, because a pause is measured in days not minutes. */
function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
