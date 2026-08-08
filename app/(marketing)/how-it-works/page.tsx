import type { Metadata } from "next";
import Link from "next/link";
import AfterTheCall from "@/components/AfterTheCall";
import LiveDemo from "@/components/LiveDemo";
import VoicemailComparison from "@/components/VoicemailComparison";

export const metadata: Metadata = {
  title: "How it works — FlowPilot",
  description:
    "What happens when a call is missed: the network forwards it, FlowPilot answers, the job is qualified and the details land on your phone. Try the receptionist yourself.",
};

/**
 * The page for somebody who wants to be convinced properly.
 *
 * The homepage answers "what is this and why should I care" in one screen. This
 * one answers "but what actually happens" — the sequence, the receptionist
 * itself, and an honest comparison with the thing every tradesperson already
 * has. The richer interactive pieces live here rather than on the homepage,
 * where three of them stacked together buried the first call to action nearly
 * four thousand pixels down.
 */

const SEQUENCE = [
  {
    step: "01",
    title: "A customer rings your number",
    body: "The same number on your van, your website and your Google listing. Nothing about how they reach you changes.",
  },
  {
    step: "02",
    title: "You can't get to it",
    body: "You're under a sink, up a ladder, driving, or it's half nine at night.",
  },
  {
    step: "03",
    title: "Your network forwards the call",
    body: "You set this once on your own phone — it takes about a minute. Unanswered calls go to your FlowPilot number instead of voicemail.",
  },
  {
    step: "04",
    title: "FlowPilot answers as your business",
    body: "By name, and it tells the caller straight away that it's an assistant taking details.",
  },
  {
    step: "05",
    title: "It has a real conversation",
    body: "One question at a time. What's the job, where are you, is it urgent, what's your name, when suits.",
  },
  {
    step: "06",
    title: "The job is written up",
    body: "Not a recording to sit through. A record with the fields filled in.",
  },
  {
    step: "07",
    title: "It lands on your phone",
    body: "A text with the job and the number to ring back, the moment the call ends.",
  },
  {
    step: "08",
    title: "You decide",
    body: "Ring them back knowing the job, or leave it. Either way you knew about it.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <section className="px-5 pb-6 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            What happens when
            <br />
            you miss a call.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-300">
            Eight steps, and only one of them needs anything from you.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-6 sm:py-16">
        <ol className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEQUENCE.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <span
                aria-hidden="true"
                className="text-xs font-medium tracking-[0.14em] text-zinc-500"
              >
                {item.step}
              </span>
              <h2 className="mt-3 text-[15px] font-semibold leading-6">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Say something a customer would say.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-400">
              This is the real receptionist, not a recording. Watch the job build
              itself as you talk.
            </p>
          </div>

          <div className="mt-12">
            <LiveDemo />
          </div>

          <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-5 text-zinc-500">
            Every question it asks is yours to change — your services, your
            wording, and what it must never say.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <VoicemailComparison />
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              The call ends. Your work is already done.
            </h2>
          </div>
          <div className="mt-12">
            <AfterTheCall />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
            Point your own number at it.
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-7 text-zinc-400">
            You keep your number. Nothing on your van, your website or your
            Google listing changes.
          </p>
          <Link
            href="/signup"
            className="mt-9 inline-flex min-h-12 items-center rounded-full bg-white px-8 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
          >
            Get FlowPilot
          </Link>
        </div>
      </section>
    </>
  );
}
