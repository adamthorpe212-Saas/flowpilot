"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { moveAppointment, removeAppointment } from "@/app/(app)/calendar/actions";
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

  /*
   * The job being moved, and how.
   *
   * Two mechanisms, because one is not enough. Native drag events never fire on
   * touch, and a tradesman is on a phone — but dragging is the obvious gesture
   * on a laptop and refusing it there would feel broken. `moving` drives the
   * tap-to-move path; `dragging` the pointer one. Both end in the same action.
   */
  const [moving, setMoving] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /*
   * Optimistic, so a move lands the instant it is made.
   *
   * Waiting on a round trip to see a job change day makes the grid feel dead,
   * and this is an edit somebody does repeatedly while thinking. If the write
   * fails the optimistic state is discarded on the next render and the message
   * below says so.
   */
  const [shown, applyMove] = useOptimistic(
    appointments,
    (current: Appointment[], move: { id: string; date: string }) =>
      current.map((appointment) =>
        appointment.id === move.id
          ? { ...appointment, scheduled_for: move.date }
          : appointment,
      ),
  );

  /** Jobs keyed by day, so a cell is a lookup rather than a scan. */
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of shown) {
      const existing = map.get(appointment.scheduled_for) ?? [];
      existing.push(appointment);
      map.set(appointment.scheduled_for, existing);
    }
    return map;
  }, [shown]);

  const active = moving ?? dragging;

  function moveTo(id: string, date: string) {
    const job = shown.find((appointment) => appointment.id === id);
    setMoving(null);
    setDragging(null);
    if (!job || job.scheduled_for === date) return;

    setError(null);
    startTransition(async () => {
      applyMove({ id, date });
      const result = await moveAppointment(id, date);
      if (result.error) setError(result.error);
    });
    // Follow the job, so he can see where it landed rather than watching it
    // vanish from the day he was looking at.
    setSelected(date);
  }

  // Escape cancels a move in progress. Somebody who starts one and changes
  // their mind should not have to find a button to get out of it.
  useEffect(() => {
    if (!moving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoving(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moving]);

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

      {active && (
        <p
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-3 text-sm text-zinc-200"
        >
          <span>Pick the day to move it to.</span>
          <button
            type="button"
            onClick={() => {
              setMoving(null);
              setDragging(null);
            }}
            className="text-xs text-zinc-400 underline underline-offset-4 transition hover:text-white"
          >
            Cancel
          </button>
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

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
                onClick={() =>
                  active ? moveTo(active, day.date) : setSelected(day.date)
                }
                onDragOver={(event) => {
                  // Without preventDefault the browser refuses the drop and the
                  // job silently springs back, which reads as a broken feature.
                  if (dragging) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragging) moveTo(dragging, day.date);
                }}
                aria-current={isToday ? "date" : undefined}
                aria-label={
                  active
                    ? `Move to ${day.date}`
                    : `${day.date}, ${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`
                }
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                  active
                    ? "ring-1 ring-inset ring-white/25 hover:bg-white/20 hover:ring-white/60"
                    : ""
                } ${
                  isSelected && !active
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
                          isSelected && !active
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
                /*
                  Draggable for pointers, with the Move button below for
                  everything else. Native drag events never fire on touch, so
                  this alone would leave a phone with no way to reschedule.
                */
                draggable
                onDragStart={(event) => {
                  setDragging(job.id);
                  event.dataTransfer.effectAllowed = "move";
                  // Firefox refuses to start a drag unless something is set.
                  event.dataTransfer.setData("text/plain", job.id);
                }}
                onDragEnd={() => setDragging(null)}
                className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition ${
                  dragging === job.id ? "opacity-40" : ""
                } ${pending ? "opacity-70" : ""}`}
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

                  <div className="flex flex-none items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setMoving(moving === job.id ? null : job.id)
                      }
                      className={`text-xs transition ${
                        moving === job.id
                          ? "text-white"
                          : "text-zinc-500 hover:text-white"
                      }`}
                    >
                      {moving === job.id ? "Picking day…" : "Move"}
                    </button>

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
