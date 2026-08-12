import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { dashboardAlert } from "@/lib/dashboard-alert";
import { LEAD_VIEWS, resolveView } from "@/lib/lead-views";
import { createClient } from "@/lib/supabase/server";
import LeadCard from "./LeadCard";
import type { Lead } from "@/types/database";

export const metadata: Metadata = {
  title: "Jobs — FlowPilot",
  robots: { index: false },
};

/**
 * How far back the undelivered-jobs warning looks.
 *
 * A function rather than a value computed in the component: reading the clock
 * during render is impure, and the lint rule that says so is right even here,
 * where this only ever runs on the server.
 */
function oneWeekAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
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

  const [{ data }, { count: todoCount }, { count: undelivered }] =
    await Promise.all([
      query,
      supabase
        .from("lead")
        .select("id", { count: "exact", head: true })
        .in("status", LEAD_VIEWS[0].statuses ?? []),
      /*
       * Jobs we took and then failed to tell anyone about.
       *
       * notified_at is claimed before sending and delivered_at only once a
       * channel accepts, so this pair is the product admitting it dropped
       * something. Worth a query on the page somebody opens every morning,
       * because the alternative is finding out when a customer rings to ask why
       * nobody called them back. Bounded to a week so one bad afternoon does not
       * nag forever.
       */
      supabase
        .from("call")
        .select("id", { count: "exact", head: true })
        .not("notified_at", "is", null)
        .is("delivered_at", null)
        .gte("started_at", oneWeekAgo()),
    ]);

  const leads = (data ?? []) as Lead[];

  /*
   * At most one, ordered by what stops what — see lib/dashboard-alert.ts. The
   * usage query that used to run here went with the panel it fed: calls used
   * this month is a billing question, and Billing already draws it properly.
   */
  const alert = dashboardAlert({
    business,
    undeliveredCount: undelivered ?? 0,
  });

  return (
    <div>
      {/*
        This is the home screen. Three blocks used to sit above the first job —
        a receptionist panel, an undelivered-alerts banner and a subscribe
        prompt — and on a phone they pushed the actual work past two scrolls.

        Every one of them was a copy of something else: the number and
        forwarding state are on Settings, calls used is on Billing. What is left
        is a heading, at most one line if something is wrong, and jobs.
      */}
      <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {todoCount
          ? `${todoCount} waiting on you.`
          : "Every call your receptionist has taken."}
      </p>

      {/*
        At most one line, and only when something is actually wrong. What used
        to live here — the number, forwarding state, calls used — is on Settings
        and Billing already, which is where somebody goes to change it. This
        page is for jobs.
      */}
      {alert && (
        <Link
          href={alert.href}
          className={`mt-4 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-sm transition ${
            alert.tone === "warning"
              ? "border-amber-500/25 bg-amber-500/10 text-amber-100 hover:border-amber-500/40"
              : "border-white/12 bg-white/[0.03] text-zinc-300 hover:border-white/25"
          }`}
        >
          <span>{alert.message}</span>
          <span className="font-medium underline underline-offset-4">
            {alert.action} →
          </span>
        </Link>
      )}

      <nav aria-label="Filter jobs" className="mt-6 flex flex-wrap gap-2">
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
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
              When someone rings and you can&apos;t pick up, the job will land
              here — with what they need and where they are.
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {leads.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
