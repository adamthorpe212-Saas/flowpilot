"use client";

import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The hero visual: one missed call, start to finish.
 *
 * Rebuilt because the previous composition failed the only test that matters —
 * on a 390px phone, where most of this traffic arrives, it put a 184px-wide
 * phone bezel at 603px and the job record at 931px, entirely below the fold,
 * with its labels set at 10px. The artefact that makes somebody understand
 * FlowPilot in five seconds was never on screen, and drawing a small phone
 * inside a phone spends the frame on something the visitor is already holding.
 *
 * So it is one object now, not two: the call across the top, the job filling in
 * underneath, full width on a phone at a readable size. The step rail carries
 * the sequence on desktop, where there is room for it beside the card.
 *
 * The animation runs once and holds on the finished job rather than looping,
 * because a permanent animation beside a headline competes with the headline.
 */

const STEPS = [
  { label: "Missed call", caption: "You're on the tools. It rings out." },
  {
    label: "FlowPilot answers",
    caption: "Picks up on your behalf, in your business's name.",
  },
  {
    label: "Details taken",
    caption: "Name, job, address, and when they want it done.",
  },
  {
    label: "Sent to you",
    caption: "On your phone before you're back in the van.",
  },
] as const;

/** Revealed one at a time from step 2, so the record visibly assembles. */
const FIELDS = [
  { label: "Job", value: "Move the sink and dishwasher, new radiator" },
  { label: "Address", value: "14 Griffith Avenue, Glasnevin" },
  { label: "Wants it", value: "Week of the 22nd, before the floors go down" },
];

const STEP_MS = 2200;

export default function HeroShowcase() {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  /*
   * Straight to the finished state when motion is unwanted: the outcome is the
   * point, and somebody who asked for less movement should not have to sit
   * through the sequence to reach it. Derived rather than stored, so the
   * setting takes effect on the first paint instead of after one.
   */
  const step = reduced ? STEPS.length - 1 : tick;

  useEffect(() => {
    if (reduced || tick >= STEPS.length - 1) return;
    const timer = setTimeout(() => setTick((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [tick, reduced]);

  const answering = step >= 1;
  const finished = step >= STEPS.length - 1;
  const visibleFields = FIELDS.slice(0, Math.max(0, step - 1));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:items-center lg:gap-12">
        {/*
          The sequence, as a rail on desktop only. On a phone it would be four
          more lines of text above the thing they actually need to look at, so
          there it collapses to the single caption underneath the card.
        */}
        <ol className="hidden lg:block">
          {STEPS.map((item, index) => {
            const done = index < step;
            const active = index === step;

            return (
              <li key={item.label} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 flex-none rounded-full transition-colors duration-500 ${
                    active
                      ? "bg-emerald-400"
                      : done
                        ? "bg-white/40"
                        : "bg-white/15"
                  }`}
                />
                <span
                  className={`text-sm transition-colors duration-500 ${
                    active
                      ? "font-medium text-white"
                      : done
                        ? "text-zinc-400"
                        : "text-zinc-600"
                  }`}
                >
                  {item.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c0c] shadow-2xl shadow-black/60">
            {/*
              The call itself, as a strip rather than a handset. It carries the
              same information the bezel did — who is ringing, that FlowPilot is
              speaking to them — in a fifth of the height, which is what buys the
              job record its place above the fold.
            */}
            <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/[0.06]">
                {answering ? (
                  <span
                    aria-hidden="true"
                    className="flex h-3.5 items-end gap-[2px]"
                  >
                    {[0, 1, 2, 3].map((bar) => (
                      <span
                        key={bar}
                        className="fp-wave-bar w-[2px] rounded-full bg-emerald-400"
                        style={{ height: "100%", animationDelay: `${bar * 110}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-4 w-4 text-red-400"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M5.5 9.5a16 16 0 0 0 9 9l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4h3l1 3.5z" />
                  </svg>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  {answering ? "FlowPilot answering" : "Missed call"}
                </span>
                <span className="mt-0.5 block truncate text-sm text-zinc-200">
                  {answering
                    ? finished
                      ? "“Dave will come back to you about the 22nd.”"
                      : "“When are you hoping to get it done?”"
                    : "John Murphy · 087 xxx xxxx"}
                </span>
              </span>
            </div>

            {/*
              Height reserved so the page does not jump as fields arrive. The
              card renders headerless because the strip above already says whose
              call this is.
            */}
            <JobCard
              name="John Murphy"
              number="087 xxx xxxx"
              fields={visibleFields}
              actions={finished}
              chromeless
              className="min-h-[15rem]"
            />
          </div>

          <p
            aria-live="polite"
            className="mt-4 text-center text-sm leading-6 text-zinc-400 lg:text-left"
          >
            <span className="font-medium text-white">{STEPS[step].label}.</span>{" "}
            {STEPS[step].caption}
          </p>
        </div>
      </div>
    </div>
  );
}
