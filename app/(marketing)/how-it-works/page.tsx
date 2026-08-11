import type { Metadata } from "next";
import Link from "next/link";
import AfterTheCall from "@/components/AfterTheCall";
import Faq from "@/components/Faq";
import JobCard from "@/components/JobCard";
import LiveDemo from "@/components/LiveDemo";
import { LEARN_FAQ_IDS, faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "How it works — FlowPilot",
  description:
    "What happens when a call is missed: FlowPilot answers as your business, finds out what the job is and when they need it done, then sends it to your phone and your dashboard. Try the receptionist yourself.",
};

/**
 * The page for somebody who wants to be convinced properly.
 *
 * Rebuilt around two things it was getting wrong. It opened with eight numbered
 * steps, which is not a sequence anybody reads — it is a wall, and half of it
 * described things that happen to a phone network rather than to a customer.
 * Four steps carry the same story.
 *
 * And it never answered the question a tradesperson actually has, which is
 * "so what do I get?" The texts were shown near the bottom under a heading
 * about the call ending, the dashboard was not shown at all, and somebody could
 * read the whole page without learning whether this thing rings them, texts
 * them, or expects them to go looking. That section now has a name and says
 * both, plainly.
 *
 * One phone mockup per argument, and only one argument gets phones. A
 * voicemail-versus-FlowPilot comparison used to sit below, which meant four
 * bezels on one page — and its two sat empty until somebody pressed play, so by
 * default it was seven hundred pixels of blank screens. The point it made is
 * already made twice over: step 01 says calls go to FlowPilot "instead of
 * voicemail", and the FAQ takes it again. Recover from git if it is ever wanted
 * back, but it should not return alongside the texts.
 */

const SEQUENCE = [
  {
    step: "01",
    title: "They ring you. You can't get to it.",
    body: "Your own number, the one on the van. Unanswered calls go to FlowPilot instead of voicemail — you set that once on your handset, and it takes about a minute.",
  },
  {
    step: "02",
    title: "FlowPilot answers as your business",
    body: "By name, and it tells the caller straight away that it's an assistant taking details. It never quotes a price and never promises a time.",
  },
  {
    step: "03",
    title: "It finds out what the job is, and when they want it",
    body: "The work, the address, the date they're planning around, and who they are. One question at a time, the way a person would ask.",
  },
  {
    step: "04",
    title: "It reaches you two ways",
    body: "A text the second the call ends, with a link that opens the whole job. Everything stays in your dashboard, so you always know what's still waiting on you.",
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
            Four steps, and only one of them needs anything from you.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-6 sm:py-16">
        <ol className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
          {SEQUENCE.map((item) => (
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
              <h2 className="mt-3 text-[17px] font-semibold leading-6 tracking-tight">
                {item.title}
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-zinc-400">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/*
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
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-400">
              This is the real receptionist, not a recording. Tell it about a job
              and watch it build up beside you.
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

      {/*
        The question the page was not answering: does it text me, or is it all
        sitting in a dashboard I have to remember to open? Both, and saying so
        needs its own section rather than a line in a benefit card.
      */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              What lands with you
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-7 text-zinc-400">
              Two texts go out the moment the caller hangs up — one to you, one
              to them. No voicemail to sit through, and nothing you have to
              remember to check.
            </p>
          </div>

          <div className="mt-12">
            <AfterTheCall />
          </div>

          <div className="mt-16 border-t border-white/10 pt-16">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  And in your dashboard
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                  The full job, kept.
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-400">
                  The text is for the moment it comes in. The dashboard is where
                  it stays — every caller, what they wanted, when they wanted it,
                  and the whole conversation written out if you want to read it
                  back.
                </p>
                <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-400">
                  Mark it accepted, leave it for later, or ring them back. It
                  never commits you to the work.
                </p>
              </div>

              <JobCard
                name="John Murphy"
                number="087 412 9008"
                fields={[
                  {
                    label: "Job",
                    value: "Move the sink and dishwasher, new radiator",
                  },
                  { label: "Address", value: "14 Griffith Avenue, Glasnevin" },
                  {
                    label: "Wants it",
                    value: "Week of the 22nd, before the floors go down",
                  },
                ]}
                className="mx-auto w-full max-w-sm lg:max-w-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/*
        The full set. The homepage carries the five that stop a sale; somebody
        who has read this far wants the rest too — how out-of-hours behaves, and
        whether their customers are being recorded.
      */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Questions worth asking
          </h2>
          <div className="mt-10">
            <Faq items={faqItems(LEARN_FAQ_IDS)} />
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
