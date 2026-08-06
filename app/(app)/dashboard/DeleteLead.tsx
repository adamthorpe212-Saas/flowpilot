"use client";

import { useState } from "react";
import { deleteLead } from "@/app/(app)/dashboard/actions";

/**
 * Two steps, on purpose.
 *
 * This is the only irreversible action in the product, and it sits on the same
 * screen as six status buttons that are all one tap and all undoable. A delete
 * that looked like its neighbours would eventually be pressed by somebody who
 * meant to press "Lost".
 *
 * A native confirm() would be fewer lines and worse: it cannot say what will
 * actually happen, and what happens here is broader than the screen implies —
 * the transcript goes too.
 */
export default function DeleteLead({ leadId }: { leadId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
      >
        Delete this lead
      </button>
    );
  }

  return (
    <form
      action={deleteLead}
      className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-5"
    >
      <input type="hidden" name="lead_id" value={leadId} />

      <p className="text-sm text-white">Delete this permanently?</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">
        The job details and the full transcript are erased — everything the
        caller told us. The call itself stays on your account so your usage
        stays right, but nothing that identifies them survives. This is what to
        use if they&apos;ve asked you to remove their details.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="min-h-11 rounded-full bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400"
        >
          Yes, erase it
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-11 rounded-full border border-white/20 px-5 text-sm text-zinc-300 transition hover:border-white/40 hover:text-white"
        >
          Keep it
        </button>
      </div>
    </form>
  );
}
