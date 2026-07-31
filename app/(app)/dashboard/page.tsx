import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

export default async function DashboardPage() {
  const business = await getCurrentBusiness();
  const supabase = await createClient();

  const { data } = await supabase
    .from("lead")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const leads = (data ?? []) as Lead[];
  const isLive = Boolean(business?.phone_number && business?.forwarding_verified_at);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every call your receptionist has taken.
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs ${
            isLive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {isLive ? "Receptionist live" : "Setup not finished"}
        </span>
      </div>

      {!isLive && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-300">
            Your receptionist isn&apos;t answering calls yet.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Finish setup
          </Link>
        </div>
      )}

      {leads.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="text-base font-medium text-zinc-300">No calls yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            When someone rings and you can&apos;t pick up, the job will land
            here — with what they need and where they are.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
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

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs capitalize ${
                        URGENCY_STYLES[lead.urgency] ?? URGENCY_STYLES.normal
                      }`}
                    >
                      {lead.urgency}
                    </span>
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
