"use client";

import { motion } from "motion/react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { storySteps } from "@/lib/content";

function StoryCards({ className = "" }: { className?: string }) {
  return (
    <div className={`mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 ${className}`}>
      {storySteps.map((step) => (
        <div
          key={step.number}
          className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
        >
          <div className="flex items-start gap-4">
            <span className="text-xs text-zinc-600">{step.number}</span>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {step.text}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StorySection() {
  const {
    animationRef,
    orbScale,
    orbRotate,
    orbGlow,
    callOpacity,
    callY,
    callScale,
    callIncomingOpacity,
    callMissedOpacity,
    messageOpacity,
    messageX,
    messageScale,
    leadOpacity,
    leadX,
    leadScale,
    bookedOpacity,
    bookedY,
    bookedScale,
  } = useScrollAnimation();

  return (
    <section
      ref={animationRef}
      id="how-it-works"
      className="relative scroll-mt-20 border-t border-white/10 bg-zinc-950 lg:h-[150svh]"
    >
      <div className="px-5 py-16 sm:px-6 sm:py-20 lg:sticky lg:top-20 lg:flex lg:h-[calc(100svh-5rem)] lg:items-center lg:py-4">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="relative z-20">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
              The FlowPilot experience
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
              From missed call to booked job.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              Scroll through a complete customer enquiry handled without your
              team lifting a finger.
            </p>
            <StoryCards className="hidden lg:grid" />
          </div>

          <div className="relative flex min-h-[580px] items-center justify-center sm:min-h-[640px] lg:h-[calc(100svh-7rem)] lg:min-h-[480px] lg:max-h-[640px]">
            <motion.div
              style={{
                scale: orbScale,
                rotate: orbRotate,
                opacity: orbGlow,
              }}
              className="absolute h-72 w-72 rounded-full border border-white/15 bg-white/[0.03] shadow-[0_0_150px_rgba(255,255,255,0.22)] sm:h-[420px] sm:w-[420px]"
            />

            <motion.div
              style={{
                scale: orbScale,
                rotate: orbRotate,
              }}
              className="absolute flex h-44 w-44 items-center justify-center rounded-full border border-white/20 bg-black shadow-[0_0_100px_rgba(255,255,255,0.18)] sm:h-64 sm:w-64"
            >
              <div className="absolute h-full w-full rounded-full border border-white/10" />
              <div className="absolute h-[72%] w-[72%] rounded-full border border-white/10" />
              <div className="absolute h-[42%] w-[42%] rounded-full bg-white shadow-[0_0_75px_rgba(255,255,255,0.55)]" />
              <div className="absolute h-[15%] w-[15%] rounded-full bg-black" />
            </motion.div>

            <motion.div
              style={{
                opacity: callOpacity,
                y: callY,
                scale: callScale,
              }}
              className="absolute left-1/2 top-[15%] z-20 w-[84%] max-w-[320px] -translate-x-1/2 rounded-3xl border border-white/15 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:top-[14%] sm:p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="relative h-4">
                    <motion.p
                      style={{ opacity: callIncomingOpacity }}
                      className="absolute inset-0 text-xs uppercase tracking-[0.2em] text-zinc-500"
                    >
                      Incoming call
                    </motion.p>
                    <motion.p
                      style={{ opacity: callMissedOpacity }}
                      className="absolute inset-0 text-xs uppercase tracking-[0.2em] text-zinc-400"
                    >
                      Missed call
                    </motion.p>
                  </div>
                  <p className="mt-2 text-lg font-semibold">John Murphy</p>
                  <p className="text-sm text-zinc-500">Mobile number</p>
                </div>
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"
                >
                  ☎
                </div>
              </div>
            </motion.div>

            <motion.div
              style={{
                opacity: messageOpacity,
                x: messageX,
                scale: messageScale,
              }}
              className="absolute left-[3%] top-1/2 z-20 w-[72%] max-w-[300px] -translate-y-1/2 rounded-3xl border border-white/15 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl sm:w-[48%] sm:p-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                FlowPilot
              </p>
              <p className="mt-3 leading-7 text-zinc-200">
                Hi John, thanks for calling. Can you tell me what happened and
                where the job is located?
              </p>
              <div
                aria-hidden="true"
                className="mt-5 flex items-end gap-1"
              >
                {[10, 20, 14, 28, 18, 32, 16, 24, 12].map((height, index) => (
                  <motion.span
                    key={index}
                    animate={{ height: [height, height + 14, height] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: index * 0.08,
                    }}
                    className="block w-1 rounded-full bg-white motion-reduce:animate-none"
                    style={{ height }}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              style={{
                opacity: leadOpacity,
                x: leadX,
                scale: leadScale,
              }}
              className="absolute right-[3%] top-[58%] z-20 w-[72%] max-w-[300px] -translate-y-1/2 rounded-3xl border border-white/15 bg-white p-4 text-black shadow-2xl sm:w-[48%] sm:p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    New qualified lead
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">John Murphy</h3>
                </div>
                <div className="rounded-full bg-black px-3 py-1 text-xs text-white">
                  Urgent
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm sm:mt-5">
                <div className="flex justify-between border-b border-black/10 pb-3">
                  <span className="text-zinc-500">Job</span>
                  <span className="font-medium">Burst pipe</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-3">
                  <span className="text-zinc-500">Location</span>
                  <span className="font-medium">Raheny, Dublin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Preferred time</span>
                  <span className="font-medium">Today</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              style={{
                opacity: bookedOpacity,
                y: bookedY,
                scale: bookedScale,
              }}
              className="absolute bottom-[4%] left-1/2 z-20 w-[84%] max-w-[340px] -translate-x-1/2 rounded-3xl border border-white/15 bg-black/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-[6%] sm:p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-black"
                >
                  ✓
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Appointment confirmed
                  </p>
                  <p className="mt-2 font-semibold">Today · 4:30 PM</p>
                  <p className="text-sm text-zinc-500">
                    Added to team calendar
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <StoryCards className="lg:hidden" />
        </div>
      </div>
    </section>
  );
}
