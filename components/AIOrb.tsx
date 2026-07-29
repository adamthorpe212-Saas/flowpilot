"use client";

import { motion, useReducedMotion } from "motion/react";

export default function AIOrb() {
  const reduceMotion = useReducedMotion();
  const breathe = reduceMotion
    ? undefined
    : { scale: [1, 1.045, 1], opacity: [0.75, 1, 0.75] };
  const breatheTransition = {
    duration: 3.4,
    ease: "easeInOut" as const,
    repeat: Infinity,
  };

  return (
    <>
      <div className="absolute h-64 w-64 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[0_0_130px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:h-80 sm:w-80" />
      <motion.div
        animate={breathe}
        transition={breatheTransition}
        className="absolute h-48 w-48 rounded-full border border-white/15 sm:h-60 sm:w-60"
      />
      <motion.div
        animate={reduceMotion ? undefined : { scale: [1, 1.03, 1] }}
        transition={breatheTransition}
        className="absolute h-24 w-24 rounded-full bg-white shadow-[0_0_100px_rgba(255,255,255,0.5)] sm:h-32 sm:w-32"
      />
      <div className="absolute h-8 w-8 rounded-full bg-black sm:h-10 sm:w-10" />

      <div className="absolute bottom-2 rounded-full border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-xs text-zinc-300 backdrop-blur-xl sm:bottom-4 sm:px-5 sm:py-3 sm:text-sm">
        Receptionist online · Ready to answer
      </div>
    </>
  );
}
