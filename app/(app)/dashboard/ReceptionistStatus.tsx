import Link from "next/link";
import { formatIrishNumber } from "@/lib/phone";
import type { Usage } from "@/lib/usage";

/**
 * The state of somebody's receptionist, on the page they land on.
 *
 * The dashboard opened straight into a list of leads. That is the right thing
 * once the product is working, and the wrong thing for everyone else: a new
 * customer saw an empty list, and a customer whose forwarding had never been
 * confirmed saw the same empty list and no reason for it. Their own FlowPilot
 * number — the thing they forward to, and the only piece of the product they
 * ever have to type — was two clicks away in settings.
 *
 * So the answer to "is this working, and what is my number" is now the first
 * thing on the page, and it says so plainly when the answer is no.
 */
export default function ReceptionistStatus({
  live,
  phoneNumber,
  forwardingConfirmed,
  usage,
}: {
  live: boolean;
  phoneNumber: string | null;
  forwardingConfirmed: boolean;
  usage: Usage | null;
}) {
  return (
    <section
      aria-label="Receptionist status"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <dl className="grid gap-5 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Receptionist
          </dt>
          <dd className="mt-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${
                live ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-[15px] font-medium">
              {live ? "Answering calls" : "Not answering yet"}
            </span>
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Your FlowPilot number
          </dt>
          <dd className="mt-2 text-[15px] font-medium">
            {phoneNumber ? (
              /*
               * Selectable on purpose. This is the number a customer types into
               * their handset to set forwarding, so being able to copy it is
               * the entire point of showing it.
               */
              <span className="select-all">
                {formatIrishNumber(phoneNumber)}
              </span>
            ) : (
              <span className="text-zinc-400">Not assigned yet</span>
            )}
          </dd>
          {phoneNumber && (
            <p className="mt-1.5 text-xs text-zinc-400">
              {forwardingConfirmed
                ? "Forwarding confirmed"
                : "Forwarding not confirmed"}
            </p>
          )}
        </div>

        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Answered this month
          </dt>
          <dd className="mt-2 text-[15px] font-medium">
            {usage ? (
              <>
                {usage.used}
                <span className="text-zinc-400"> of {usage.allowance}</span>
              </>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </dd>
          {usage?.nearingLimit && (
            <p className="mt-1.5 text-xs text-amber-300">
              Getting close. We never cut you off mid-month.
            </p>
          )}
        </div>
      </dl>

      {phoneNumber && !forwardingConfirmed && (
        /*
         * The one thing only the customer can do. Surfaced here rather than
         * left to the onboarding checklist, because a receptionist that has a
         * number but no forwarding looks finished and answers nothing.
         */
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
          <p className="text-sm text-zinc-300">
            Calls won&apos;t reach your receptionist until forwarding is set on
            your own phone.
          </p>
          <Link
            href="/onboarding/forwarding"
            className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm transition hover:border-white/40 hover:bg-white/5"
          >
            Set up forwarding
          </Link>
        </div>
      )}
    </section>
  );
}
