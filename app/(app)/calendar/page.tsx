import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatIrishNumber } from "@/lib/phone";
import { removeAppointment } from "./actions";
import AppointmentForm from "./AppointmentForm";
import NotifyCustomer from "./NotifyCustomer";
import type { Appointment } from "@/types/database";

export const metadata: Metadata = {
  title: "Calendar — FlowPilot",
  robots: { index: false },
};

const SLOT_LABELS: Record<Appointment["slot"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  anytime: "Anytime",
};

/** Today in local terms. A date has no timezone; using ISO/UTC shifts the day. */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dayHeading(iso: string, today: string): string {
  if (iso === today) return "Today";

  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .replace(/,/g, "");
}

export default async function CalendarPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const today = todayIso();
  const supabase = await createClient();

  /*
   * Forward only. A diary is for what is coming — past jobs belong in the job
   * list, where they already are, and showing them here would bury the three
   * that matter under everything that already happened.
   */
  const { data } = await supabase
    .from("appointment")
    .select("*")
    .gte("scheduled_for", today)
    .order("scheduled_for")
    .order("slot");

  const appointments = (data ?? []) as Appointment[];

  const byDay = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const existing = byDay.get(appointment.scheduled_for) ?? [];
    existing.push(appointment);
    byDay.set(appointment.scheduled_for, existing);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      <p className="mt-1 text-sm leading-6 text-zinc-400">
        Jobs you&apos;ve booked in. Your receptionist can see which days are
        busy, so it can tell callers you&apos;re booked up — it never arranges
        anything itself.
      </p>

      {byDay.size === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
          <h2 className="text-base font-medium text-zinc-300">
            Nothing booked in yet.
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
            Add a job here, or book one straight from your jobs list.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[...byDay.entries()].map(([date, jobs]) => (
            <section key={date}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[15px] font-medium text-zinc-200">
                  {dayHeading(date, today)}
                </h2>
                {/*
                  Three is a working day with travel between calls — the same
                  threshold the receptionist uses to decide a day is full, so
                  what he sees here and what a caller is told agree.
                */}
                {jobs.length >= 3 && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                    Full day
                  </span>
                )}
              </div>

              <ul className="mt-2.5 space-y-2">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{job.title}</p>
                        <p className="mt-0.5 text-sm text-zinc-400">
                          {[
                            SLOT_LABELS[job.slot],
                            job.customer_name,
                            job.location,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <form action={removeAppointment}>
                        <input type="hidden" name="id" value={job.id} />
                        <button
                          type="submit"
                          className="text-xs text-zinc-500 transition hover:text-white"
                        >
                          Remove
                        </button>
                      </form>
                    </div>

                    {job.notes && (
                      <p className="mt-2.5 border-l-2 border-white/10 pl-3 text-sm text-zinc-400">
                        {job.notes}
                      </p>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3.5">
                      {job.customer_number && (
                        <a
                          href={`tel:${job.customer_number}`}
                          className="inline-flex min-h-11 items-center text-sm text-zinc-300 transition hover:text-white"
                        >
                          {formatIrishNumber(job.customer_number)}
                        </a>
                      )}
                      <NotifyCustomer
                        appointment={job}
                        businessName={business.name}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold tracking-tight">
          Add a job
        </h2>
        <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
          For work that never came through a phone call — a regular, a foreman,
          a favour. Your receptionist counts these too when it works out how
          busy you are.
        </p>
        <div className="mt-5">
          <AppointmentForm />
        </div>
      </section>
    </div>
  );
}
