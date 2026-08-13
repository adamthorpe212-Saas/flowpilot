"use client";

import { useState } from "react";
import AppointmentForm from "@/app/(app)/calendar/AppointmentForm";
import type { Lead } from "@/types/database";

/**
 * Booking a job from the call it came from.
 *
 * Collapsed until asked for. Most jobs on this page are not ready to be booked
 * — he has not rung them back yet — so a form sitting open would push the
 * transcript down for every lead to serve a minority of them.
 *
 * The form is the same component the calendar uses, prefilled from the lead.
 * A second copy would be two places to fix every future change, and the two
 * would drift the first time one was touched.
 */
export default function BookJob({
  lead,
}: {
  lead: Pick<
    Lead,
    "id" | "job_type" | "caller_name" | "caller_number" | "location"
  >;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden="true"
          className="h-4 w-4"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
        </svg>
        Add to calendar
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-medium">Put it in the diary</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 transition hover:text-white"
        >
          Cancel
        </button>
      </div>
      <AppointmentForm lead={lead} />
    </div>
  );
}
