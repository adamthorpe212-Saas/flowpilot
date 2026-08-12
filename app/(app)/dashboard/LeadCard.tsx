import Link from "next/link";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/lead-views";
import { formatLeadTime } from "@/lib/lead-time";
import { formatIrishNumber } from "@/lib/phone";
import type { Lead } from "@/types/database";

/**
 * One job, in a list of jobs.
 *
 * Built around what a tradesperson is actually deciding while scrolling: what
 * is it, who is it, and when do they want it. That last one used to be missing
 * entirely — the receptionist asks every caller when they need the work done,
 * and the list never showed the answer.
 *
 * The card is a container rather than a link, with the title carrying a
 * stretched overlay. A `tel:` link cannot be nested inside another anchor, and
 * ringing back is the most common thing anyone does from this page, so the
 * whole card stays tappable and the number stays separately tappable.
 */
export default function LeadCard({ lead }: { lead: Lead }) {
  const number = formatIrishNumber(lead.caller_number);

  /*
   * "New" on a list where almost everything is new is a pill that costs a line
   * of attention and returns nothing. It appears once the status is something
   * he did — rang them, booked it, wrote it off.
   */
  const showStatus = lead.status !== "new";

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition focus-within:border-white/30 hover:border-white/25">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[17px] font-medium leading-6">
          <Link
            href={`/dashboard/${lead.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-white/40"
          >
            {lead.job_type ?? "Enquiry"}
          </Link>
        </h3>
        <span className="flex-none pt-0.5 text-xs text-zinc-500">
          {formatLeadTime(lead.created_at)}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-400">
        {[lead.caller_name ?? "Unknown caller", lead.location]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {/*
        Given its own line and full-strength text. This is the field the product
        is built around now — planned work with a date, not emergencies — and it
        is the difference between a job for Thursday and a job for next month.
      */}
      {lead.preferred_time && (
        <p className="mt-2.5 text-sm text-zinc-200">
          Wants it {lead.preferred_time}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
        {/*
          Above the card's own overlay, so a tap here rings rather than opens.
          min-h-11 because this is aimed at a thumb, often in a van.
        */}
        <a
          href={`tel:${lead.caller_number}`}
          className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20"
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
            <path d="M5.5 6.5a16 16 0 0 0 12 12l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 2.7 1.5 1.5 0 0 1 5 1h3l1 3.5z" />
          </svg>
          <span className="sr-only">Ring </span>
          {number}
        </a>

        {showStatus && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[lead.status]}`}
          >
            {STATUS_LABELS[lead.status]}
          </span>
        )}

        {lead.urgency === "high" && (
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200">
            Urgent
          </span>
        )}

        {lead.out_of_area && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            Outside your area
          </span>
        )}
      </div>
    </div>
  );
}
