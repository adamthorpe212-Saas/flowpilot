"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const CONTACT_EMAIL = "hello@flowpilot.ie";

export default function CTA() {
  const [copied, setCopied] = useState(false);

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable in this browser — the mailto link above still works.
    }
  }

  return (
    <section
      id="contact"
      className="scroll-mt-20 border-t border-white/10 bg-zinc-950 px-5 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
          Never send another customer to voicemail
        </p>
        <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-7xl">
          Meet the receptionist that never clocks off.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Give every caller an instant response, even when your team is busy,
          offline or already on another job.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-10 inline-block rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-[1.02]"
        >
          Book your demo
        </a>

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <span>
            or email{" "}
            <span className="select-all text-zinc-400">{CONTACT_EMAIL}</span>
          </span>
          <button
            type="button"
            onClick={handleCopyEmail}
            aria-label="Copy email address to clipboard"
            className="text-zinc-500 transition hover:text-zinc-300"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={copied ? "copied" : "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="inline-block underline decoration-dotted underline-offset-4"
              >
                {copied ? "copied" : "copy"}
              </motion.span>
            </AnimatePresence>
          </button>
        </p>
      </div>
    </section>
  );
}
