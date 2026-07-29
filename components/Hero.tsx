"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export default function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[48%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.05] blur-3xl sm:h-[650px] sm:w-[650px]" />
        <div className="absolute left-1/2 top-[66%] h-px w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent sm:w-[70%]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-6 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 sm:text-xs sm:tracking-[0.28em]"
        >
          AI receptionist for service businesses
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-8xl"
        >
          Your business is calling.
          <span className="mt-2 block text-zinc-500">
            FlowPilot always answers.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:mt-8 sm:text-xl sm:leading-8"
        >
          When you can&apos;t pick up, FlowPilot does — texting back in
          seconds, finding out what the job is, and getting it booked before
          the customer calls someone else.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:mt-10 sm:w-auto sm:max-w-none sm:flex-row sm:gap-4"
        >
          <a
            href="mailto:hello@flowpilot.ie"
            className="rounded-full bg-white px-7 py-3.5 font-semibold text-black transition hover:scale-[1.02]"
          >
            Book a demo
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10"
          >
            See how it works
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.45 }}
          className="relative mt-14 flex h-[330px] w-full max-w-4xl items-center justify-center sm:mt-20 sm:h-[430px]"
        >
          {children}
        </motion.div>

        <div className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-600">
          Scroll to see FlowPilot work
        </div>
      </div>
    </section>
  );
}
