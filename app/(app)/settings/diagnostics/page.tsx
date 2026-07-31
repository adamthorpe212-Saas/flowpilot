import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import CopyButton from "@/components/ui/CopyButton";
import { runDiagnostics, type CheckStatus } from "@/lib/diagnostics";

export const metadata: Metadata = {
  title: "Diagnostics — FlowPilot",
  robots: { index: false },
};

// Always fresh: a cached answer about whether configuration is currently
// working is worse than no answer.
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<CheckStatus, string> = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  fail: "border-red-500/30 bg-red-500/10 text-red-200",
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  ok: "OK",
  warn: "Check",
  fail: "Broken",
};

export default async function DiagnosticsPage() {
  const headerList = await headers();
  const host = headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : null;

  const { checks, webhookUrls, failures, warnings } =
    await runDiagnostics(origin);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/settings"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Settings
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Diagnostics</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        What&apos;s connected and what isn&apos;t. Most ways this product fails
        look identical from outside — a phone that rings out, a text that never
        arrives — so this is where to look first.
      </p>

      <div
        className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${
          failures > 0
            ? STATUS_STYLES.fail
            : warnings > 0
              ? STATUS_STYLES.warn
              : STATUS_STYLES.ok
        }`}
      >
        {failures > 0
          ? `${failures} thing${failures === 1 ? "" : "s"} broken. Calls won't work until these are fixed.`
          : warnings > 0
            ? `Everything essential is working. ${warnings} thing${warnings === 1 ? "" : "s"} worth checking.`
            : "Everything is connected."}
      </div>

      <ul className="mt-6 space-y-3">
        {checks.map((check) => (
          <li
            key={check.name}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-medium">{check.name}</p>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLES[check.status]}`}
              >
                {STATUS_LABELS[check.status]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{check.detail}</p>
            {check.fix && (
              <p className="mt-2 text-sm leading-6 text-zinc-500">{check.fix}</p>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-10 border-t border-white/10 pt-8">
        <h2 className="text-sm font-medium text-zinc-300">Webhook URLs</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          These are built from your configured site URL — the same value
          signature checks use. If they look wrong here, they are wrong
          everywhere.
        </p>

        <ul className="mt-4 space-y-3">
          {webhookUrls.map((webhook) => (
            <li
              key={webhook.url}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="min-w-0">
                <p className="text-sm text-zinc-400">{webhook.label}</p>
                <p className="mt-1 truncate font-mono text-xs text-zinc-200">
                  {webhook.url}
                </p>
              </div>
              <CopyButton value={webhook.url} />
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-xs text-zinc-600">
        No secret values are shown here — only whether each one is present and
        whether it works.
      </p>
    </div>
  );
}
