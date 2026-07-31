import type { Metadata } from "next";
import ConversationDemo from "@/components/ConversationDemo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "How FlowPilot works — one missed call, start to finish",
  description:
    "Watch a missed call handled end to end: FlowPilot answers in seconds, captures the job, and sends it straight to your phone.",
};

export default function HowItWorks() {
  return (
    <main className="flex min-h-full flex-col overflow-x-hidden bg-black text-white">
      <Navbar action="demo" />

      <section className="flex-1 px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="mx-auto max-w-lg text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            You were on another site. This happened anyway.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
            One missed call, start to finish — and you didn&apos;t touch your
            phone once.
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
            We&apos;ll set FlowPilot up around your services, your jobs and the
            way you already work.
          </p>
          <a
            href="mailto:hello@flowpilot.ie"
            className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:scale-[1.02] sm:text-base"
          >
            Book a demo
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
