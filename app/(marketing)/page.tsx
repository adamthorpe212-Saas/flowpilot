import Link from "next/link";
import AskFlowPilot from "@/components/AskFlowPilot";
import HeroShowcase from "@/components/HeroShowcase";
import PhoneMessage from "@/components/PhoneMessage";
import { jobAlert } from "@/lib/messages";
import { formatPrice, soldPlan, TRIAL_DAYS } from "@/lib/plans";

/**
 * The homepage sells. It does not explain.
 *
 * It had grown to eight sections and 5,270px, and three of them were making the
 * same argument: a row of cards saying "FlowPilot answers" three times, a row of
 * benefit cards saying it again, and a third section built around the same job
 * record already animating in the hero. The price didn't appear until 2,900px.
 *
 * What's left is the shortest path a tradesperson can take from "what is this"
 * to "I'll take it": the promise, the stakes, what lands on their phone, what it
 * costs, and a way to ask the one question we didn't answer. Everything that
 * explains the mechanism — the eight-step sequence, the live demo, the voicemail
 * comparison, the FAQ — lives on /how-it-works, which is where somebody goes
 * when they've decided they're interested and want to be convinced properly.
 */

const REASSURANCES = [
  "Keep your own number",
  "Live in minutes",
  "Answers 24/7",
];

/*
 * The limits are a selling point, not small print. Every one of them is a thing
 * a tradesperson is afraid an AI will do to their business, and saying them
 * plainly does more for trust than another paragraph of benefits.
 */
const NEVERS = [
  "Never quotes a price",
  "Never promises a time",
  "Never invents a service you don't offer",
];

const BENEFITS = [
  {
    title: "It answers as your business",
    body: "By name — and it tells the caller straight away that it's an assistant taking details.",
  },
  {
    title: "It finds out what the job is",
    body: "What's wrong, where they are, how urgent it is and when suits. One question at a time, like a person would.",
  },
  {
    title: "It's on your phone before you're free",
    body: "The moment the call ends, you get a text with the job and the number to ring back.",
  },
];

export default function Home() {
  const plan = soldPlan();

  return (
    <>
      <section className="relative overflow-hidden px-5 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        {/*
          Two layers of light behind the headline, both inert to the pointer so
          nothing here can eat a tap on the buttons underneath.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(ellipse_58%_46%_at_50%_-8%,rgba(16,185,129,0.16),transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="fp-grid pointer-events-none absolute inset-x-0 top-0 h-[46rem]"
        />

        <div className="relative mx-auto w-full max-w-5xl">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-zinc-300 backdrop-blur">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              />
              Made for Irish trades
            </p>

            {/*
              Sized so each sentence holds one line on a 375px phone.

              At 36px they both wrapped — "Your business / answers." over "Even
              when you / don't." — which breaks the only thing the headline is
              doing. The two halves are a matched pair, and the second one lands
              because it mirrors the first; split across four ragged lines there
              is no pair left to hear. text-balance stays as the safety net for
              anything narrower still.
            */}
            <h1 className="mx-auto mt-7 max-w-4xl text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-6xl sm:leading-[1.04] lg:text-7xl">
              Your business answers.
              <br />
              <span className="text-zinc-500">Even when you don&apos;t.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              FlowPilot picks up the calls you miss, finds out what the job is,
              and has it on your phone before you&apos;re back in the van.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-8 text-[15px] font-semibold text-black shadow-lg shadow-emerald-500/10 transition hover:bg-zinc-200 sm:w-auto"
              >
                Get FlowPilot
              </Link>
              <Link
                href="/how-it-works#demo"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 px-8 text-[15px] font-medium text-white transition hover:border-white/40 hover:bg-white/5 sm:w-auto"
              >
                Hear it answer a call
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M4 10h11" />
                  <path d="m10 5 5 5-5 5" />
                </svg>
              </Link>
            </div>

            <ul className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-zinc-400">
              {REASSURANCES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 flex-none text-emerald-400"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 sm:mt-20">
            <HeroShowcase />
          </div>
        </div>
      </section>

      {/*
        The stakes, stated once. This replaced two separate card sections that
        were both circling the same idea — type alone, so the page has a moment
        that isn't another grid of bordered boxes.
      */}
      <section className="border-t border-white/10 px-5 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            The job goes to
            <br />
            whoever picks up.
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[16px] leading-8 text-zinc-400">
            You can&apos;t answer a phone with both hands full. FlowPilot can —
            in your business&apos;s name, at half nine at night, on a bank
            holiday Monday.
          </p>

          <ul className="mx-auto mt-12 flex max-w-2xl flex-col items-center justify-center gap-3 border-t border-white/10 pt-8 text-[13px] text-zinc-400 sm:flex-row sm:gap-8">
            {NEVERS.map((never) => (
              <li key={never}>{never}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              Miss the call.
              <br />
              Not the job.
            </h2>

            <ol className="mt-10 space-y-8">
              {BENEFITS.map((benefit, index) => (
                <li key={benefit.title} className="flex gap-5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-[11px] font-semibold text-emerald-300"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-semibold tracking-tight">
                      {benefit.title}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-7 text-zinc-400">
                      {benefit.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/*
            The text, not the job card.

            A job card sat here first and was word-for-word the one the hero
            animation finishes on — same caller, same burst pipe, same address,
            1,500px apart. This proves the third claim instead of restating the
            first, and the body is rendered by the same function the live
            pipeline texts out, so it cannot quietly stop matching what a
            customer actually receives.
          */}
          <div className="flex justify-center">
            <PhoneMessage
              sender="FlowPilot"
              body={jobAlert({
                urgent: true,
                jobType: "Water coming through kitchen ceiling",
                location: "14 Griffith Avenue, Glasnevin",
                callerNumber: "087 412 9008",
              })}
              emphasis
              className="h-[340px] w-[196px] shadow-2xl shadow-black/60"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-[2rem] font-semibold tracking-[-0.03em] sm:text-5xl">
            One missed call pays for it.
          </h2>

          <div className="mt-12 rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 text-left sm:p-9">
            <p className="text-sm text-zinc-400">{plan.name}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">
                {formatPrice(plan)}
              </span>
              <span className="text-sm text-zinc-400">/month</span>
            </p>

            <ul className="mt-8 space-y-3.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-zinc-300">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 h-4 w-4 flex-none text-emerald-400"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-9 flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
            >
              Get FlowPilot
            </Link>
          </div>

          {/*
            The trial is mentioned, not led with. It is real — an account
            genuinely gets this long before it is billed — and a site that stays
            quiet about something that is happening is the one combination worth
            avoiding. But leading on "free" invites a tradesperson to look for
            the catch before they have understood the product.
          */}
          <p className="mt-6 text-xs leading-5 text-zinc-400">
            {`Your first ${TRIAL_DAYS} days are free. Prices exclude VAT. Cancel any time — your receptionist keeps answering until the end of the month you've paid for.`}
          </p>
        </div>
      </section>

      {/*
        The FAQ that used to sit here moved to /how-it-works. This answers the
        same questions from the same source — and the ones we never thought of.
      */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <AskFlowPilot />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 px-5 py-28 sm:px-6 sm:py-36">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[30rem] bg-[radial-gradient(ellipse_50%_60%_at_50%_110%,rgba(16,185,129,0.14),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            Take your time back.
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-[16px] leading-7 text-zinc-400">
            Your business can keep answering without you.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex min-h-12 items-center rounded-full bg-white px-9 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
          >
            Get FlowPilot
          </Link>
        </div>
      </section>
    </>
  );
}
