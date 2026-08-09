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
import { getUsage, shouldAnswerCalls, trialStatus } from "@/lib/usage";
import ReceptionistStatus from "./ReceptionistStatus";
import type { Lead } from "@/types/database";

export const metadata: Metadata = {
  title: "Leads — FlowPilot",
  robots: { index: false },
};

const URGENCY_STYLES: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/10 text-red-200",
  normal: "border-white/15 bg-white/5 text-zinc-300",
  low: "border-white/10 bg-white/[0.03] text-zinc-400",
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

  const [{ data }, { count: todoCount }, { count: undelivered }, usage] =
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
      // Alongside the others rather than after them: four sequential round trips
      // is four times the wait on the page somebody opens most often.
      business ? getUsage(business) : Promise.resolve(null),
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

  // A trial running out is a different problem from a subscription lapsing,
  // and telling someone to "sort out billing" when they never had a bill is
  // confusing at exactly the wrong moment.
  const trial = business ? trialStatus(business) : null;
  const onTrial =
    business?.subscription_status === "incomplete" && !trial?.expired;
  const trialExpired =
    business?.subscription_status === "incomplete" && trial?.expired;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-400">
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

      {business && (
        <div className="mt-6">
          <ReceptionistStatus
            live={isLive}
            phoneNumber={business.phone_number}
            forwardingConfirmed={Boolean(business.forwarding_verified_at)}
            usage={usage}
          />
        </div>
      )}

      {/*
        The product owning a failure rather than blaming the customer for it.
        Almost always this is our sending channel, not their settings, and
        "check your notification settings" would be pinning our problem on
        somebody whose phone did nothing wrong. It says what happened, says the
        work is safe, and points at the one thing they can usefully check —
        without implying they caused it.

        Above the trial nudge on purpose: a job nobody heard about outranks a
        renewal date.
      */}
      {(undelivered ?? 0) > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-100">
            {undelivered === 1
              ? "We couldn't get an alert to you about 1 job this week."
              : `We couldn't get an alert to you about ${undelivered} jobs this week.`}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-100/80">
            Nothing is lost — every one of them is in the list below with the
            caller&apos;s number. This is usually something at our end, and
            we&apos;re on it.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-block text-sm font-medium text-amber-100 underline underline-offset-4 transition hover:text-white"
          >
            Check where your alerts go
          </Link>
        </div>
      )}

      {onTrial && trial && trial.daysRemaining <= 5 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
          <p className="text-sm text-amber-100">
            {trial.daysRemaining === 0
              ? "Your free trial ends today."
              : `${trial.daysRemaining} ${trial.daysRemaining === 1 ? "day" : "days"} left on your free trial.`}{" "}
            Calls stop being answered after that.
          </p>
          <Link
            href="/billing"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Choose a plan
          </Link>
        </div>
      )}

      {!isLive && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-300">
            {trialExpired
              ? "Your free trial has ended, so calls aren't being answered."
              : suspended
                ? "Your subscription has lapsed, so calls aren't being answered."
                : "Your receptionist isn't answering calls yet."}
          </p>
          <Link
            href={suspended ? "/billing" : "/onboarding"}
            className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {suspended ? (trialExpired ? "Choose a plan" : "Sort out billing") : "Finish setup"}
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
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
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
                        <span className="text-zinc-400"> · {lead.location}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
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
                    <span className="text-xs text-zinc-500">
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
