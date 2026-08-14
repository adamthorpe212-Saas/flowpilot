import type { Metadata } from "next";
import Link from "next/link";
import AfterTheCall from "@/components/AfterTheCall";
import CustomerJourney from "@/components/CustomerJourney";
import DiaryPreview from "@/components/DiaryPreview";
import LeadRecord from "@/components/LeadRecord";
import LiveDemo from "@/components/LiveDemo";

export const metadata: Metadata = {
  title: "How it works — FlowPilot",
  description:
    "What happens when a call is missed: FlowPilot answers as your business, finds out what the job is and when they need it done, then puts the lead in your app with the full conversation. Try the receptionist yourself.",
};

/**
 * The page for somebody who wants to be convinced properly.
 *
 * Four sections: the journey, try it, what lands in the app, and what setup
 * actually involves. It had six, and two of them were a full FAQ accordion and
 * a second copy of the homepage's closing pitch — a visitor who came here from
 * the hero was reading the same seven answers they had just scrolled past.
 *
 * The FAQ lives on the homepage, directly under the price, which is where the
 * objections actually fire. This page links to it rather than repeating it.
 */

const SETUP = [
  {
    step: "01",
    title: "Tell FlowPilot about your business",
    body: "The jobs you take, the areas you cover, and the questions you want asked. You write what it says and what it must never promise.",
  },
  {
    step: "02",
    title: "Forward the calls you miss",
    body: "One short code on your own handset, once. Your customers keep ringing the same number — nothing on your van, your website or your Google listing changes.",
  },
  {
    step: "03",
    title: "Test it, then go live",
    body: "Try the receptionist yourself in settings, and we ring you so you hear it answer before a real customer does.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <section className="px-5 pb-6 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.06]">
            What happens when you miss a call.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-300">
            From the call you couldn&apos;t take, to the job in your diary.
          </p>
        </div>
      </section>

      {/* 1 — The journey, same four steps as the homepage. */}
      <section className="px-5 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <CustomerJourney />
        </div>
      </section>

      {/*
        2 — Try it.

        The homepage's second call to action points straight here, so the
        heading has to clear the fixed navbar when the browser jumps to it —
        without scroll-margin the title lands underneath it.
      */}
      <section
        id="demo"
        className="scroll-mt-24 border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Say something a customer would say.
            </h2>
            {/*
              "This is the real receptionist, not a recording" was true and
              still misleading. It is the same engine a live call runs — the
              demo posts to the same nextReply() — but the visitor is TYPING,
              and a claim about being real, next to a text box, invites them to
              conclude the product is a website chatbot. Which is the one thing
              it is not.
            */}
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-7 text-zinc-400">
              On a real call this is spoken aloud, both ways. Here you type
              instead — but the questions come from the same receptionist that
              answers the phone, deciding what to ask as it goes.
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

      {/* 3 — What lands in the app. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              What lands with you
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-7 text-zinc-400">
              A text the moment they hang up, and the whole job waiting in your
              app — with what was said, so you can check exactly what they
              asked for.
            </p>
          </div>

          <div className="mt-12">
            <AfterTheCall />
          </div>

          <div className="mt-16 border-t border-white/10 pt-16">
            <LeadRecord />
          </div>

          <div className="mt-16 border-t border-white/10 pt-16">
            <div className="mx-auto max-w-2xl text-center">
              <h3 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Then it becomes work in your week.
              </h3>
              <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-zinc-400">
                Book it from the job itself, or add work that never came through
                FlowPilot at all.
              </p>
            </div>

            <div className="mt-10">
              <DiaryPreview />
            </div>
          </div>
        </div>
      </section>

      {/* 4 — What you actually have to do, then the ask. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              Keep your number. Change almost nothing.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              Most of it is done for you. The one thing only you can do takes
              about a minute on your own phone.
            </p>
          </div>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {SETUP.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-7"
              >
                <span
                  aria-hidden="true"
                  className="text-xs font-medium tracking-[0.14em] text-zinc-500"
                >
                  {item.step}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-zinc-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-16 text-center">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center rounded-full bg-white px-8 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
            >
              Get FlowPilot
            </Link>
            {/*
              The FAQ is on the homepage, under the price. Repeating all seven
              answers here was the single longest thing on this page, and every
              visitor arriving from the hero had just scrolled past them.
            */}
            <p className="mt-5 text-sm text-zinc-400">
              Still deciding?{" "}
              <Link
                href="/#faq"
                className="text-white underline underline-offset-4 transition hover:text-zinc-300"
              >
                Read the questions worth asking
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
