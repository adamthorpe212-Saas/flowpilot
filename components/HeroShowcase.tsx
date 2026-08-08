"use client";

import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import PhoneFrame from "@/components/PhoneFrame";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The hero visual: one missed call, start to finish.
 *
 * It replaced a small circular diagram with four labelled dots. That diagram
 * described the product in the abstract — a visitor had to read it, decode it,
 * and then imagine the software. This shows the software: a call arriving, the
 * receptionist answering it, and a job record assembling itself beside the
 * phone as the caller speaks.
 *
 * The animation exists to teach the sequence, which is the one thing a
 * tradesperson needs to understand and cannot be told in a headline. It runs
 * once through and holds on the finished job rather than looping forever,
 * because a permanent animation beside a headline competes with the headline.
 */

const STEPS = [
  { label: "Missed call", caption: "You're under a sink. It rings out." },
  { label: "FlowPilot answers", caption: "Picks up on your behalf, in your business's name." },
  { label: "Details taken", caption: "Name, job, address, how urgent it is." },
  { label: "Sent to you", caption: "The job is on your phone before you're back in the van." },
] as const;

/** Revealed one at a time from step 2, so the record visibly assembles. */
const FIELDS = [
  { label: "Job", value: "Burst pipe — water through the kitchen ceiling" },
  { label: "Address", value: "14 Griffith Avenue, Glasnevin" },
  { label: "Needed", value: "Today, any time after 6pm" },
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
      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <PhoneFrame className="mx-auto h-[19rem] w-[11.5rem] shadow-2xl shadow-black/60 lg:mx-0">
          <div className="flex h-full flex-col px-4 pb-4 pt-5 text-center">
            <p className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              {answering ? "In call" : "Incoming"}
            </p>

            <p className="mt-2 text-[13px] font-semibold text-white">
              John Murphy
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-500">087 xxx xxxx</p>

            <div className="mt-5 flex flex-1 flex-col items-center justify-center">
              {answering ? (
                <>
                  <div
                    aria-hidden="true"
                    className="flex h-7 items-end gap-[3px]"
                  >
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className="fp-wave-bar w-[3px] rounded-full bg-emerald-400"
                        style={{
                          height: "100%",
                          animationDelay: `${bar * 110}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-[10px] leading-4 text-zinc-300">
                    {finished
                      ? "“Dave will ring you straight back.”"
                      : "“Thanks for calling. What can we help you with?”"}
                  </p>
                </>
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-950/80 text-red-300">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-5 w-5"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M5.5 9.5a16 16 0 0 0 9 9l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4h3l1 3.5z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </PhoneFrame>

        <div className="min-w-0">
          {/*
            The record is present from the start but fills as the call goes on,
            so the connection between talking and capturing is visible rather
            than asserted. Its height is reserved to stop the page jumping.
          */}
          <JobCard
            name="John Murphy"
            number="087 xxx xxxx"
            urgency={step >= 2 ? "Urgent" : undefined}
            fields={visibleFields}
            actions={finished}
            className="min-h-[16rem] transition-opacity duration-500"
          />

          <p
            aria-live="polite"
            className="mt-4 text-center text-sm leading-6 text-zinc-400 lg:text-left"
          >
            <span className="font-medium text-white">
              {STEPS[step].label}.
            </span>{" "}
            {STEPS[step].caption}
          </p>
        </div>
      </div>
    </div>
  );
}
