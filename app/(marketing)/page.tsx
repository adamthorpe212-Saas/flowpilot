import Link from "next/link";
import Faq from "@/components/Faq";
import HeroShowcase from "@/components/HeroShowcase";
import JobCard from "@/components/JobCard";
import { HOME_FAQ_IDS, faqItems } from "@/lib/faq";
import { formatPrice, soldPlan, TRIAL_DAYS } from "@/lib/plans";

/**
 * The homepage answers four questions and then gets out of the way: what this
 * is, why it matters, how easy it is to start, and what to do next.
 *
 * The demo and the voicemail comparison used to live here, which made the page
 * three prototypes stacked on top of each other and pushed the first way to
 * sign up 3,900px down. They now live on /how-it-works, where somebody who
 * wants to be convinced in detail can go looking for them.
 */

const REASSURANCES = [
  "Keep your existing number",
  "Set up in minutes",
  "Answers 24/7",
];

const AWAY = [
  { when: "On another job", then: "FlowPilot answers." },
  { when: "At the weekend", then: "FlowPilot answers." },
  { when: "On holiday", then: "FlowPilot answers." },
];

const BENEFITS = [
  {
    title: "Every call answered",
    body: "FlowPilot takes over the moment you can't get to the phone — evenings, weekends, or halfway up a ladder.",
  },
  {
    title: "Every job qualified",
    body: "It asks what the job is, where they are, how urgent it is and when they need you. In your business's name.",
  },
  {
    title: "Everything sent to you",
    body: "Open your phone and the job is already there, with the number to ring back.",
  },
];

const SETUP = [
  {
    step: "01",
    title: "Tell us about your business",
    body: "Your services, the areas you cover and how you want calls handled.",
  },
  {
    step: "02",
    title: "Forward your missed calls",
    body: "Your customers keep ringing the same number they always have. Nothing on your van changes.",
  },
  {
    step: "03",
    title: "You're live",
    body: "FlowPilot answers what you can't, and the job lands on your phone.",
  },
];

export default function Home() {
  const plan = soldPlan();

  return (
    <>
      <section className="px-5 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center">
            <h1 className="mx-auto max-w-2xl text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl">
              Your business answers.
              <br />
              Even when you don&apos;t.
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              FlowPilot answers missed calls, qualifies the job and sends
              everything straight to you — whether you&apos;re on another job, at
              home, or away.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-8 text-[15px] font-semibold text-black transition hover:bg-zinc-200 sm:w-auto"
              >
                Get FlowPilot
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 px-8 text-[15px] font-medium text-white transition hover:border-white/40 hover:bg-white/5 sm:w-auto"
              >
                See how it works
              </Link>
            </div>

            <ul className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-zinc-400">
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
                    className="h-3.5 w-3.5 flex-none text-zinc-500"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-14 sm:mt-16">
            <HeroShowcase />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
            Switch off.
            <br />
            FlowPilot doesn&apos;t.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-400">
            On another job, over the weekend, or halfway across the world — your
            customers still get answered.
          </p>

          <ul className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-3">
            {AWAY.map((item) => (
              <li
                key={item.when}
                className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  {item.when}
                </p>
                <p className="mt-2 text-[15px] font-medium text-white">
                  {item.then}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <ul className="grid gap-4 md:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-7"
              >
                <h3 className="text-lg font-semibold tracking-tight">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {benefit.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
              Miss the call.
              <br />
              Not the job.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-zinc-400">
              FlowPilot turns the conversation into a job record — who rang, what
              they need, where they are and how urgent it is. You decide what
              happens next.
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-zinc-400">
              It never quotes a price, never promises a time, and never invents a
              service you don&apos;t offer.
            </p>
          </div>

          <JobCard
            name="John Murphy"
            number="087 xxx xxxx"
            urgency="Urgent"
            fields={[
              {
                label: "Job",
                value: "Burst pipe — water through the kitchen ceiling",
              },
              { label: "Address", value: "14 Griffith Avenue, Glasnevin" },
              { label: "Needed", value: "Today, any time after 6pm" },
            ]}
            className="mx-auto w-full max-w-sm"
          />
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
              Keep your number.
              <br />
              Change almost nothing.
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-zinc-400">
              Most of the setup is handled for you. The one thing only you can do
              takes about a minute on your own phone.
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
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            One missed call pays for it.
          </h2>

          <div className="mt-10 rounded-3xl border border-white/15 bg-white/[0.03] p-7 text-left sm:p-9">
            <p className="text-sm text-zinc-400">{plan.name}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-tight">
                {formatPrice(plan)}
              </span>
              <span className="text-sm text-zinc-400">/month</span>
            </p>

            <ul className="mt-7 space-y-3 text-sm">
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
                    className="mt-0.5 h-4 w-4 flex-none text-zinc-500"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
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
          <p className="mt-5 text-xs leading-5 text-zinc-400">
            {`Your first ${TRIAL_DAYS} days are free. Prices exclude VAT. Cancel any time — your receptionist keeps answering until the end of the month you've paid for.`}
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Questions worth asking
          </h2>
          <div className="mt-10">
            <Faq items={faqItems(HOME_FAQ_IDS)} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-24 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
            Take your time back.
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-7 text-zinc-400">
            Your business can keep answering without you.
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
