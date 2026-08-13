"use client";

import { useMemo, useState } from "react";
import { removeAppointment } from "@/app/(app)/calendar/actions";
import NotifyCustomer from "@/app/(app)/calendar/NotifyCustomer";
import { formatIrishNumber } from "@/lib/phone";
import {
  isoDate,
  monthGrid,
  monthName,
  shiftMonth,
  WEEKDAY_LABELS,
} from "@/lib/month-grid";
import type { Appointment } from "@/types/database";

const SLOT_LABELS: Record<Appointment["slot"], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  anytime: "Anytime",
};

/** Matches the threshold the receptionist uses, so both agree what "full" is. */
const FULL_DAY_JOBS = 3;

/**
 * The month, as a month.
 *
 * A list of upcoming jobs answers "what's next". A grid answers "how does next
 * week look", which is the question somebody opens a diary to settle — and it
 * makes a heavy Thursday beside three empty days visible without reading a word.
 *
 * All the month's data is already in memory, so paging between months and
 * picking a day are instant and need no round trip. A tradesman flicking
 * through his week on a phone in a van should never wait on a network.
 */
export default function CalendarGrid({
  appointments,
  businessName,
}: {
  appointments: Appointment[];
  businessName: string;
}) {
  const today = isoDate(new Date());

  const [viewing, setViewing] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selected, setSelected] = useState(today);

  /** Jobs keyed by day, so a cell is a lookup rather than a scan. */
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const existing = map.get(appointment.scheduled_for) ?? [];
      existing.push(appointment);
      map.set(appointment.scheduled_for, existing);
    }
    return map;
  }, [appointments]);

  const weeks = useMemo(
    () => monthGrid(viewing.year, viewing.month),
    [viewing],
  );

  const selectedJobs = byDay.get(selected) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight">
          {monthName(viewing.year, viewing.month)}
        </h2>

        <div className="flex items-center gap-1">
          <MonthButton
            label="Previous month"
            onClick={() => setViewing(shiftMonth(viewing.year, viewing.month, -1))}
          >
            <path d="M15 6l-6 6 6 6" />
          </MonthButton>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setViewing({ year: now.getFullYear(), month: now.getMonth() + 1 });
              setSelected(today);
            }}
            className="min-h-11 rounded-xl px-3 text-sm text-zinc-400 transition hover:text-white"
          >
            Today
          </button>
          <MonthButton
            label="Next month"
            onClick={() => setViewing(shiftMonth(viewing.year, viewing.month, 1))}
          >
            <path d="M9 6l6 6-6 6" />
          </MonthButton>
        </div>
      </div>

      <div
        role="grid"
        aria-label={monthName(viewing.year, viewing.month)}
        className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-3"
      >
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, index) => (
            <div
              key={index}
              className="pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day) => {
            const jobs = byDay.get(day.date) ?? [];
            const isSelected = day.date === selected;
            const isToday = day.date === today;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day.date)}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${day.date}, ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                  isSelected
                    ? "bg-white font-semibold text-black"
                    : day.inMonth
                      ? "text-zinc-200 hover:bg-white/10"
                      : "text-zinc-600 hover:bg-white/5"
                }`}
              >
                <span
                  className={
                    isToday && !isSelected
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-white/15 font-semibold text-white"
                      : undefined
                  }
                >
                  {day.day}
                </span>

                {/*
                  Dots rather than a number. Three dots read as "busy" at a
                  glance without anybody counting, which is the whole reason to
                  look at a month rather than a list.
                */}
                {jobs.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 flex gap-0.5"
                  >
                    {Array.from({
                      length: Math.min(jobs.length, FULL_DAY_JOBS),
                    }).map((_, index) => (
                      <span
                        key={index}
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? "bg-black/50"
                            : jobs.length >= FULL_DAY_JOBS
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-medium text-zinc-200">
            {selected === today ? "Today" : longDay(selected)}
          </h3>
          {selectedJobs.length >= FULL_DAY_JOBS && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
              Full day
            </span>
          )}
        </div>

        {selectedJobs.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-zinc-500">
            Nothing booked in.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedJobs.map((job) => (
              <li
                key={job.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{job.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {[SLOT_LABELS[job.slot], job.customer_name, job.location]
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
                  <NotifyCustomer appointment={job} businessName={businessName} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/10 hover:text-white"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        {children}
      </svg>
    </button>
  );
}

/** "Thursday 21 August" — no comma, matching how it is said aloud elsewhere. */
function longDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(year, month - 1, day))
    .replace(/,/g, "");
}
