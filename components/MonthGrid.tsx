import {
  monthGrid,
  monthName,
  WEEKDAY_LABELS,
} from "@/lib/month-grid";

/**
 * A month, drawn. No state, no actions, no idea what a job is.
 *
 * Extracted from the calendar page so the marketing site can show the real
 * grid rather than a screenshot of it. The alternative was a second
 * hand-written month for the public page, and this codebase has already been
 * caught out three times by a marketing copy of something drifting from the
 * product — the disclosure line, the default greeting, the animated phone all
 * showed things FlowPilot had stopped doing.
 *
 * It could not be reused as it stood: CalendarGrid imports moveAppointment and
 * removeAppointment, and server actions have no business in a public page
 * bundle. So the split is presentation here, interaction in the wrapper.
 *
 * Takes a count per day rather than appointments. What a public page is allowed
 * to know about somebody's diary is how busy it looks, which is the same
 * discipline lib/availability.ts applies to the receptionist — and it means
 * this component cannot leak a customer's name by accident because it never
 * receives one.
 */

/** Jobs in a day before it reads as full. Matches lib/availability.ts. */
export const FULL_DAY_JOBS = 3;

export default function MonthGrid({
  year,
  month,
  jobsByDay,
  selected,
  today,
  onSelect,
  onDayDragOver,
  onDayDrop,
  moving = false,
}: {
  year: number;
  month: number;
  /** ISO date → number of jobs. Days with none are simply absent. */
  jobsByDay: Map<string, number>;
  selected?: string;
  today?: string;
  /** Omitted on the marketing page, where the grid is a picture. */
  onSelect?: (date: string) => void;
  onDayDragOver?: (event: React.DragEvent, date: string) => void;
  onDayDrop?: (event: React.DragEvent, date: string) => void;
  /** A job is being moved, so every day is a target. */
  moving?: boolean;
}) {
  const weeks = monthGrid(year, month);
  const interactive = Boolean(onSelect);

  return (
    <div
      role="grid"
      aria-label={monthName(year, month)}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-3"
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
          const jobs = jobsByDay.get(day.date) ?? 0;
          const isSelected = day.date === selected;
          const isToday = day.date === today;
          const full = jobs >= FULL_DAY_JOBS;

          const surface =
            isSelected && !moving
              ? "bg-white font-semibold text-black"
              : day.inMonth
                ? "text-zinc-200"
                : "text-zinc-600";

          const content = (
            <>
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
                Dots rather than a number. Three dots read as "busy" at a glance
                without anybody counting, which is the whole reason to look at a
                month rather than a list.
              */}
              {jobs > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1.5 flex gap-0.5"
                >
                  {Array.from({ length: Math.min(jobs, FULL_DAY_JOBS) }).map(
                    (_, index) => (
                      <span
                        key={index}
                        className={`h-1 w-1 rounded-full ${
                          isSelected && !moving
                            ? "bg-black/50"
                            : full
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                      />
                    ),
                  )}
                </span>
              )}
            </>
          );

          const shape =
            "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition";

          /*
           * A div, not a disabled button, when there is nothing to click. A grid
           * of 42 disabled buttons is 42 things a screen reader announces as
           * unavailable — on a page where the grid is illustration, not a
           * control.
           */
          if (!interactive) {
            return (
              <div key={day.date} className={`${shape} ${surface}`}>
                {content}
              </div>
            );
          }

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect?.(day.date)}
              onDragOver={(event) => onDayDragOver?.(event, day.date)}
              onDrop={(event) => onDayDrop?.(event, day.date)}
              aria-current={isToday ? "date" : undefined}
              aria-label={
                moving
                  ? `Move to ${day.date}`
                  : `${day.date}, ${jobs} ${jobs === 1 ? "job" : "jobs"}`
              }
              className={`${shape} ${
                moving
                  ? "ring-1 ring-inset ring-white/25 hover:bg-white/20 hover:ring-white/60"
                  : ""
              } ${surface} ${
                isSelected && !moving
                  ? ""
                  : day.inMonth
                    ? "hover:bg-white/10"
                    : "hover:bg-white/5"
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
