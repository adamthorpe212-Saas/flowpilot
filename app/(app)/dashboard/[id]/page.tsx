import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateLeadStatus } from "@/app/(app)/dashboard/actions";
import { formatIrishNumber } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type { Call, Lead, LeadStatus } from "@/types/database";

export const metadata: Metadata = {
  title: "Lead — FlowPilot",
  robots: { index: false },
};

const STATUS_FLOW: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Called back" },
  { value: "booked", label: "Booked" },
  { value: "completed", label: "Done" },
  { value: "lost", label: "Lost" },
];

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // No business_id filter needed — row-level security scopes this to the
  // signed-in user's business, so another tenant's id simply returns nothing.
  const { data } = await supabase
    .from("lead")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const lead = data as Lead;

  const { data: callRow } = lead.call_id
    ? await supabase.from("call").select("*").eq("id", lead.call_id).maybeSingle()
    : { data: null };

  const call = (callRow as Call) ?? null;
  const duration = formatDuration(call?.duration_seconds ?? null);

  const details = [
    ["Job", lead.job_type],
    ["Where", lead.location],
    ["When they'd like", lead.preferred_time],
    ["Name", lead.caller_name],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Leads
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.job_type ?? "Enquiry"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatWhen(lead.created_at)}
            {duration ? ` · ${duration} call` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lead.urgency === "high" && (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
              Urgent
            </span>
          )}
          {lead.out_of_area && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
              Outside your area
            </span>
          )}
        </div>
      </div>

      <a
        href={`tel:${lead.caller_number}`}
        className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-5 transition hover:border-white/30"
      >
        <span>
          <span className="block text-sm text-zinc-500">Call back</span>
          <span className="mt-1 block text-lg font-semibold">
            {formatIrishNumber(lead.caller_number)}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-black"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M5.5 6.5a16 16 0 0 0 12 12l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 2.7 1.5 1.5 0 0 1 5 1h3l1 3.5z" />
          </svg>
        </span>
      </a>

      {details.length > 0 && (
        <dl className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] px-5">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-4 text-sm">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-right text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-300">Where it&apos;s at</h2>
        <form action={updateLeadStatus} className="mt-3">
          <input type="hidden" name="lead_id" value={lead.id} />
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((option) => (
              <button
                key={option.value}
                type="submit"
                name="status"
                value={option.value}
                aria-pressed={lead.status === option.value}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  lead.status === option.value
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-300">What was said</h2>

        {call && call.transcript.length > 0 ? (
          <ol className="mt-3 space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            {call.transcript.map((turn, index) => (
              <li key={index}>
                <p
                  className={`text-[10px] uppercase tracking-[0.14em] ${
                    turn.role === "assistant" ? "text-white/60" : "text-zinc-600"
                  }`}
                >
                  {turn.role === "assistant" ? "FlowPilot" : "Caller"}
                </p>
                <p
                  className={`mt-1 text-sm leading-6 ${
                    turn.role === "assistant" ? "text-zinc-200" : "text-zinc-400"
                  }`}
                >
                  {turn.text}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-zinc-500">
            No transcript for this one.
          </p>
        )}
      </section>
    </div>
  );
}
