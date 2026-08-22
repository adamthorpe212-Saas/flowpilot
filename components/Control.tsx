import type { ReactNode } from "react";
import { previewWeekLoad } from "@/lib/app-preview";
import { DEMO_BUSINESS, DEMO_QUESTIONS } from "@/lib/demo";
import {
  DEMO_CALLER_E164,
  DEMO_CALLER_E164_ALT,
  DEMO_CALLER_E164_THIRD,
} from "@/lib/demo-numbers";
import { aiDisclosure, DEFAULT_GREETING } from "@/lib/disclosure";
import { formatIrishNumber } from "@/lib/phone";
import { FIELD_LABELS } from "@/lib/question-labels";
import { startOfDayIn } from "@/lib/today";

/**
 * The four things nobody else does.
 *
 * The rest of the homepage sells answering the phone, which every AI
 * receptionist on the market also sells. This section is the part a competitor
 * cannot copy off the page: the owner decides who it answers, what it asks,
 * what it is allowed to know about his week, and whether it is on at all.
 *
 * One claim per block, deliberately. The first draft had seven, and three of
 * them were the same argument told from different ends — a page that lists
 * everything reads as a page with nothing to lead on.
 *
 * Every screen below is real markup rather than a screenshot, for the same
 * reason LeadRecord and WeekStrip are: a PNG of a dark UI is unreadable at
 * 375px, cannot be zoomed or selected, and goes stale the first time somebody
 * changes a label. The strings come from the modules the app itself renders
 * from, so they cannot quietly drift either.
 */

/**
 * One block: the claim, then the proof.
 *
 * `flip` moves the screen to the left on desktop so four of these do not read
 * as one stacked column. It is a column assignment rather than a DOM reorder,
 * which is the load-bearing part on a phone: the heading has to come first
 * every time, because somebody who scrolls into a screenshot with no sentence
 * above it has to work out what he is looking at.
 */
function Block({
  title,
  children,
  screen,
  flip = false,
}: {
  title: ReactNode;
  children: ReactNode;
  screen: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid gap-6 border-t border-white/10 py-10 first:border-t-0 first:pt-0 sm:grid-cols-2 sm:items-center sm:gap-12 sm:py-16">
      <div className={flip ? "sm:col-start-2" : undefined}>
        <h3 className="text-balance text-[1.4rem] font-semibold leading-[1.18] tracking-[-0.025em] sm:text-[1.75rem] sm:leading-[1.15]">
          {title}
        </h3>
        <p className="mt-4 text-[15px] leading-7 text-zinc-400">{children}</p>
      </div>

      <div className={flip ? "sm:col-start-1 sm:row-start-1" : undefined}>
        {screen}
      </div>
    </div>
  );
}

/** The 000 block, so nothing on this page can dial a stranger. */
const BLOCKED = [
  {
    label: "Mam",
    number: DEMO_CALLER_E164,
    detail: "Blocked 4 times, last Tuesday",
  },
  {
    label: "Dermot (site foreman)",
    number: DEMO_CALLER_E164_ALT,
    detail: "Blocked once, last Friday",
  },
  {
    label: "Wholesaler",
    number: DEMO_CALLER_E164_THIRD,
    detail: "Hasn't rung since",
  },
];

export default function Control() {
  // Ireland's day, not the server's — Vercel runs UTC.
  const now = startOfDayIn();

  /*
   * The real availability logic on the real fixture, so the card below cannot
   * promise something availability.ts would never actually tell a caller.
   */
  const load = previewWeekLoad(now);

  /*
   * Two of the five, not all of them.
   *
   * Three question cards plus the greeting made this block 856px on a phone
   * against roughly 500 for its neighbours — one feature reading as twice the
   * weight of the others, on a page whose whole argument is one idea at a time.
   * Two carries the claim: a numbered order, and the locked question beside an
   * optional one. The rest are named in a line underneath, which is cheaper
   * than a card and just as true.
   */
  const [job, where] = DEMO_QUESTIONS;

  return (
    <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Control
          </p>
          <h2 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
            You decide what it does.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-zinc-400">
            Every other AI receptionist promises it never misses a call.
            That&apos;s the easy part.
          </p>
        </div>

        <div className="mt-10 sm:mt-14">
          <Block
            title={<>It&rsquo;s your own phone. You say who it answers.</>}
            screen={
              <div>
                <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] px-5">
                  {BLOCKED.map((caller) => (
                    <li
                      key={caller.number}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-200">
                          {caller.label}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {formatIrishNumber(caller.number)} &middot;{" "}
                          {caller.detail}
                        </p>
                      </div>
                      <span className="flex-none text-xs text-zinc-500">
                        Unblock
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex gap-3">
                  <p className="flex min-h-11 flex-1 items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[13px] text-zinc-500">
                    087 123 4567
                  </p>
                  <p className="flex min-h-11 flex-none items-center rounded-full border border-white/15 px-6 text-[13px] text-zinc-300">
                    Add
                  </p>
                </div>
              </div>
            }
          >
            Your work number is the phone in your pocket. Add the ones you
            know — family, the lads, the foreman — and they ring out to your
            voicemail exactly like always, never knowing a receptionist exists.
            It only answers numbers you&apos;ve never seen, which is what a new
            customer is.
          </Block>

          <Block
            flip
            title={<>One tap and it&rsquo;s off.</>}
            screen={
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2.5 text-[15px] font-medium">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 flex-none rounded-full bg-amber-400"
                      />
                      Switched off
                    </p>
                    <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
                      Callers hear it ring out, the same as before FlowPilot.
                      Nothing is being answered and no jobs are being taken.
                    </p>
                    <p className="mt-1 text-[13px] text-zinc-500">
                      Off since 14 August.
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-16 flex-none items-center rounded-full bg-zinc-700"
                  >
                    <span className="inline-block h-7 w-7 translate-x-1 rounded-full bg-white shadow" />
                  </span>
                </div>

                <p className="mt-4 border-t border-white/[0.07] pt-3.5 text-[13px] leading-5 text-zinc-500">
                  Your forwarding stays set up either way, so switching back on
                  takes one tap. You keep your number and nothing on your phone
                  changes.
                </p>
              </div>
            }
          >
            Calls ring out exactly like they did before. Your forwarding stays
            set up, so switching back on is one tap — same number, nothing
            changes on your phone.
          </Block>

          <Block
            title={
              <>
                Your questions. Your words. Your order.
              </>
            }
            screen={
              <div>
                <ol className="space-y-2.5">
                  {[job, where].map((question, index) => (
                    <li
                      key={question.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-zinc-200">
                          <span
                            aria-hidden="true"
                            className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-zinc-400"
                          >
                            {index + 1}
                          </span>
                          <span className="truncate">
                            {FIELD_LABELS[question.captures]}
                          </span>
                        </span>

                        <span className="flex-none text-[11px] text-zinc-500">
                          {index === 0 ? "Always asked" : "Must ask"}
                        </span>
                      </div>

                      <p className="mt-3 flex min-h-11 items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[14px] text-white">
                        {question.prompt}
                      </p>
                    </li>
                  ))}
                </ol>

                <p className="mt-3 px-1 text-[13px] leading-6 text-zinc-500">
                  Then when they want it, their name, and whether it&apos;s
                  urgent.
                </p>

                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                    The first thing a caller hears
                  </p>
                  <p className="mt-2.5 text-[13px] leading-6 text-zinc-500">
                    <span className="text-white">
                      &ldquo;{aiDisclosure(DEMO_BUSINESS)}&rdquo;
                    </span>{" "}
                    — this part stays on.
                  </p>
                  <p className="mt-3 flex min-h-11 items-center rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[14px] text-white">
                    {DEFAULT_GREETING}
                  </p>
                </div>
              </div>
            }
          >
            Set what it asks, how it asks it, and which ones it must get. The
            opening line is yours too — only the part that tells them
            they&apos;re speaking to a machine is fixed.
          </Block>

          <Block
            flip
            title={<>It knows Thursday is full. It still won&rsquo;t book it.</>}
            screen={
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-[13px] font-medium text-zinc-300">
                  What your receptionist can see
                </p>

                <ul className="mt-4 space-y-2.5">
                  {load.map((day) => (
                    <li
                      key={day.date}
                      className="flex items-center justify-between gap-4 text-[14px]"
                    >
                      <span
                        className={
                          day.load === "full"
                            ? "text-amber-300"
                            : "text-zinc-300"
                        }
                      >
                        {weekdayOf(day.date)}
                      </span>
                      <span
                        className={`rounded-md px-2.5 py-1 text-[12px] ${
                          day.load === "full"
                            ? "bg-amber-500/15 text-amber-100"
                            : "bg-white/[0.07] text-zinc-400"
                        }`}
                      >
                        {day.load === "full" ? "Full" : "Some work on"}
                      </span>
                    </li>
                  ))}
                </ul>

                {/*
                  The limit is the feature. availability.ts throws everything
                  else away before it reaches a caller, and saying so is what
                  turns "it reads my calendar" from a worry into a reason.
                */}
                <p className="mt-5 border-t border-white/[0.07] pt-3.5 text-[13px] leading-5 text-zinc-500">
                  No names, no addresses, no times — and never that a day is
                  free.
                </p>
              </div>
            }
          >
            Your receptionist can see which days already have work on them, so
            it can tell a caller you&apos;re tight. It never arranges anything —
            you do that, with Add to calendar.
          </Block>
        </div>
      </div>
    </section>
  );
}

/** "Thursday" — the day on its own, since the card only covers this week. */
function weekdayOf(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IE", { weekday: "long" }).format(
    new Date(year, month - 1, day),
  );
}
