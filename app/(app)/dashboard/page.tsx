import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import {
  LEAD_VIEWS,
  resolveView,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/lead-views";
import { createClient } from "@/lib/supabase/server";
import { shouldAnswerCalls } from "@/lib/usage";
import type { Lead } from "@/types/database";

export const metadata: Metadata = {
  title: "Leads — FlowPilot",
  robots: { index: false },
};

const URGENCY_STYLES: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/10 text-red-200",
  normal: "border-white/15 bg-white/5 text-zinc-300",
  low: "border-white/10 bg-white/[0.03] text-zinc-500",
};

function formatWhen(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: requested } = await searchParams;
  const view = resolveView(requested);

  const business = await getCurrentBusiness();
  const supabase = await createClient();

  let query = supabase
    .from("lead")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (view.statuses) query = query.in("status", view.statuses);

  const [{ data }, { count: todoCount }] = await Promise.all([
    query,
    supabase
      .from("lead")
      .select("id", { count: "exact", head: true })
      .in("status", LEAD_VIEWS[0].statuses ?? []),
  ]);

  const leads = (data ?? []) as Lead[];

  // Setup being finished is not the same as the receptionist actually
  // answering. A lapsed subscription declines calls, and showing a green badge
  // while that happens would be the worst kind of dashboard: reassuring and
  // wrong.
  const setupDone = Boolean(
    business?.phone_number && business?.forwarding_verified_at,
  );
  const isLive = setupDone && business ? shouldAnswerCalls(business) : false;
  const suspended = setupDone && !isLive;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {todoCount
              ? `${todoCount} waiting on you.`
              : "Every call your receptionist has taken."}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs ${
            isLive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : suspended
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {isLive
            ? "Receptionist live"
            : suspended
              ? "Not answering"
              : "Setup not finished"}
        </span>
      </div>

      {!isLive && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-300">
            {suspended
              ? "Your subscription has lapsed, so calls aren't being answered."
              : "Your receptionist isn't answering calls yet."}
          </p>
          <Link
            href={suspended ? "/billing" : "/onboarding"}
            className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {suspended ? "Sort out billing" : "Finish setup"}
          </Link>
        </div>
      )}

      <nav aria-label="Filter leads" className="mt-8 flex flex-wrap gap-2">
        {LEAD_VIEWS.map((option) => (
          <Link
            key={option.slug}
            href={`/dashboard?view=${option.slug}`}
            aria-current={option.slug === view.slug ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              option.slug === view.slug
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-base font-medium text-zinc-300">{view.empty}</h2>
          {view.slug === "all" && (
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
              When someone rings and you can&apos;t pick up, the job will land
              here — with what they need and where they are.
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/dashboard/${lead.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {lead.job_type ?? "Enquiry"}
                      {lead.location ? (
                        <span className="text-zinc-500"> · {lead.location}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {lead.caller_name ?? "Unknown caller"} ·{" "}
                      {lead.caller_number}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[lead.status]}`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                    {lead.urgency === "high" && (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${URGENCY_STYLES.high}`}
                      >
                        Urgent
                      </span>
                    )}
                    <span className="text-xs text-zinc-600">
                      {formatWhen(lead.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
