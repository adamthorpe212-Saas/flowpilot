import type { Metadata } from "next";
import Link from "next/link";
import ConversationDemo from "@/components/ConversationDemo";

export const metadata: Metadata = {
  title: "How FlowPilot works — one missed call, start to finish",
  description:
    "Watch a missed call handled end to end: FlowPilot answers the phone, finds out what the job is, and sends it straight to you.",
};

export default function HowItWorks() {
  return (
    <>
      <section className="flex-1 px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="mx-auto max-w-lg text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            You were on another site. This happened anyway.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
            One missed call, answered start to finish — and you didn&apos;t
            touch your phone once.
          </p>

          <div className="mt-10 sm:mt-12">
            <ConversationDemo />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            See it answer your calls.
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            Set up in minutes, around your services and the way you already
            work.
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
