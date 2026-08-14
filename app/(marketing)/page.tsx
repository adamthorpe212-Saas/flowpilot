import Link from "next/link";
import CustomerJourney from "@/components/CustomerJourney";
import DiaryPreview from "@/components/DiaryPreview";
import Faq from "@/components/Faq";
import LeadInbox from "@/components/LeadInbox";
import LeadRecord from "@/components/LeadRecord";
import { HOME_FAQ_IDS, faqItems } from "@/lib/faq";
import { formatPrice, soldPlan, weeklyPrice } from "@/lib/plans";

/**
 * The homepage sells. It does not explain.
 *
 * Six sections, and each one earns its place by saying something the others do
 * not: the promise, the whole journey in four steps, where the leads live, how
 * the diary works, what it costs, and the objections.
 *
 * It was eight, and three of them were arguing the same point — a benefits list
 * about answering, an emotional beat about answering, and a setup section that
 * repeated the forwarding story already told twice. All three said "FlowPilot
 * answers your missed calls", which was also the problem with the page as a
 * whole: it sold a call-answering service and barely mentioned that the leads
 * and the diary are most of what somebody pays for after the first week.
 *
 * So the product visuals carry the argument now, and each shows a different
 * screen of the real app: the list on a phone, one job opened with its
 * transcript, and the week. Setup moved to /how-it-works, where somebody who
 * has decided they want it goes to find out what is involved.
 */

const REASSURANCES = [
  "Keep your own number",
  "Answers 24/7",
  "Nothing changes on your van",
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

export default function Home() {
  const plan = soldPlan();

  return (
    <>
      {/* 1 — The promise, and proof it is a real product. */}
      <section className="relative overflow-hidden px-5 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        {/*
          Two layers of light behind the headline, both inert to the pointer so
          nothing here can eat a tap on the buttons underneath.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(ellipse_58%_52%_at_50%_-10%,rgba(16,185,129,0.16),transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="fp-grid pointer-events-none absolute inset-x-0 top-0 h-[38rem]"
        />

        <div className="relative mx-auto w-full max-w-6xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_auto] lg:gap-16">
            <div className="text-center lg:text-left">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-zinc-300 backdrop-blur">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                />
                Made for Irish trades
              </p>

              {/*
                Sized so each sentence holds one line on a 375px phone. At 36px
                they both wrapped — "Your business / answers." over "Even when
                you / don't." — which breaks the only thing the headline is
                doing. The two halves are a matched pair, and the second lands
                because it mirrors the first.
              */}
              <h1 className="mt-7 text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-6xl sm:leading-[1.04]">
                Your business answers.
                <br />
                <span className="text-zinc-500">Even when you don&apos;t.</span>
              </h1>

              {/*
                Both halves of the product in one sentence. The old line stopped
                at "has it on your phone", which is why the whole site read as a
                texting service.
              */}
              <p className="mx-auto mt-6 max-w-xl text-pretty text-[16px] leading-7 text-zinc-300 sm:text-lg sm:leading-8 lg:mx-0">
                FlowPilot answers the calls you miss, captures the job, and puts
                every lead, conversation and booking into one simple app.
              </p>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
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
                  {/*
                    Not "hear it answer a call". This links to a typed demo with
                    no audio in it at all, onto a page that opens "Say something
                    a customer would say" — so the button promised a sound the
                    visitor then went looking for and could not find.
                  */}
                  See how it replies
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

              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-zinc-400 lg:justify-start">
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

            {/*
              The app itself, beside the headline rather than a scroll below it.
              A tradesperson deciding in fifteen seconds should see the product
              without moving, and the real LeadCard shows the urgency flag, the
              status and the date in one glance.
            */}
            <div className="flex justify-center">
              <LeadInbox />
            </div>
          </div>
        </div>
      </section>

      {/* 2 — The whole thing, once, in four steps. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              A customer rings while you&apos;re under a sink.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              FlowPilot answers as your business, finds out what the job is and
              when they need it, and has it waiting in your app. You ring back
              when your hands are free — or put it straight in the diary.
            </p>
          </div>

          <div className="mt-12">
            <CustomerJourney />
          </div>

          {/*
            The limits close the sequence, where the sceptical question lands:
            fine, but what will it say to my customer?
          */}
          <ul className="mt-12 flex flex-col gap-2.5 border-t border-white/10 pt-7 text-[14px] text-zinc-400 sm:flex-row sm:flex-wrap sm:gap-x-8">
            {NEVERS.map((never) => (
              <li key={never} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 flex-none rounded-full bg-zinc-600"
                />
                {never}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3 — Where the work lives. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Leads &amp; Jobs
            </p>
            <h2 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              Every lead. Every job. One place.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              See who called, what they need, where they are and when they want
              it. Ring them back, move it along, and book the work — without
              relying on scraps of paper or voicemail.
            </p>
          </div>

          <div className="mt-12">
            <LeadRecord />
          </div>
        </div>
      </section>

      {/* 4 — And the diary it feeds. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Your calendar
            </p>
            <h2 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              Your calls and calendar, working together.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              Book a job straight from the call, or add the ones that never came
              through FlowPilot — the referral, the WhatsApp, the customer you
              have had for ten years. Your receptionist can see which days are
              heavy. It never arranges anything itself.
            </p>
          </div>

          <div className="mt-12">
            <DiaryPreview />
          </div>
        </div>
      </section>

      {/* 5 — What it costs. */}
      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-[2rem] font-semibold tracking-[-0.03em] sm:text-5xl">
            One saved job could pay for the month.
          </h2>

          <div className="mt-12 rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 text-left sm:p-9">
            <p className="text-sm text-zinc-400">{plan.name}</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-[-0.03em] sm:text-6xl">
                {formatPrice(plan)}
              </span>
              <span className="text-sm text-zinc-400">/month</span>
            </p>
            {/*
              The weekly figure is derived, never typed. A tradesperson compares
              a monthly bill against every other monthly bill and a weekly one
              against a couple of hours of labour — but the billing is monthly
              and the line has to say so, or the first invoice is a surprise.
            */}
            <p className="mt-2 text-sm text-zinc-400">
              About {weeklyPrice(plan)} a week. Billed monthly, excluding VAT.
            </p>

            <ul className="mt-8 space-y-3.5 text-sm">
              {/*
                The allowance leads, because it is the one number a buyer wants
                and the one the site used to bury in small print under the fold.
              */}
              {[
                `${plan.callAllowance} answered calls a month`,
                ...plan.features,
              ].map((feature) => (
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
            No trial to mention. What replaces it is the thing that actually
            reduces the risk of pressing the button: cancelling is genuinely one
            click with no notice period, so the commitment is one month rather
            than a subscription somebody has to ring up to escape.
          */}
          <p className="mt-6 text-xs leading-5 text-zinc-400">
            One plan, no setup fee. Cancel any time in one click — your
            receptionist keeps answering until the end of the month you&apos;ve
            paid for.
          </p>
        </div>
      </section>

      {/* 6 — The objections, then the ask. */}
      <section
        id="faq"
        className="scroll-mt-20 border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[2rem] font-semibold tracking-[-0.03em] sm:text-4xl">
            Questions worth asking
          </h2>

          <div className="mt-10">
            <Faq items={faqItems(HOME_FAQ_IDS)} />
          </div>

          {/*
            The five that block a sale stay here, under the price, where the
            objections actually fire. The rest — and the chat for the one we
            did not think of — moved to /faq, which is a page somebody can
            share, bookmark and find from Google.
          */}
          <p className="mt-8 text-sm text-zinc-400">
            <Link
              href="/faq"
              className="text-white underline underline-offset-4 transition hover:text-zinc-300"
            >
              Read every question
            </Link>{" "}
            — or ask us one of your own.
          </p>

          <div className="mt-20 text-center">
            <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              Never lose a job to a missed call.
            </h2>
            <Link
              href="/signup"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-9 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
            >
              Get FlowPilot
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
