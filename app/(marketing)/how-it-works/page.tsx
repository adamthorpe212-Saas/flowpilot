import type { Metadata } from "next";
import Link from "next/link";
import LiveDemo from "@/components/LiveDemo";

export const metadata: Metadata = {
  title: "How FlowPilot works — one missed call, start to finish",
  description:
    "Try the receptionist yourself, then see what happens after the call: the job lands on your phone with everything you need to ring back.",
};

const AFTER = [
  {
    title: "The job lands on your phone",
    detail:
      "Name, number, what's wrong and where. You ring back already knowing the job.",
  },
  {
    title: "Your customer gets it in writing",
    detail:
      "A text confirming what was agreed, so a misheard address gets corrected before anyone drives anywhere.",
  },
  {
    title: "It's waiting in your dashboard",
    detail:
      "Every call, with the full transcript. Nothing depends on you remembering.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <section className="px-5 pb-4 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
            The whole thing
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            You were on another site. This happened anyway.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
            Someone rang, you couldn&apos;t pick up. Have the conversation
            yourself and see exactly what your customer would have got.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          <LiveDemo />
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              Then what
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              The call ends. Your work is already done.
            </h2>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {AFTER.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-xs text-zinc-400"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Point your own number at it.
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            You keep your number. Nothing on your van, your website or your
            Google listing changes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:text-base"
          >
            Get started
          </Link>
        </div>
      </section>
    </>
  );
}
