import Link from "next/link";
import Control from "@/components/Control";
import CustomerJourney from "@/components/CustomerJourney";
import StickyCta from "@/components/StickyCta";
import WeekStrip, { weekFrom } from "@/components/WeekStrip";
import Faq from "@/components/Faq";
import LeadRecord from "@/components/LeadRecord";
import { HOME_FAQ_IDS, faqItems } from "@/lib/faq";
import { previewAppointments } from "@/lib/app-preview";
import { formatPrice, soldPlan, weeklyPrice } from "@/lib/plans";
import { isoDateIn, startOfDayIn } from "@/lib/today";

/**
 * The homepage sells. It does not explain.
 *
 * Each section earns its place by saying something the others do not: the
 * promise, the whole journey in four steps, where the jobs live, the four
 * things no competitor does, what it costs, and the objections.
 *
 * The control section sits between the product and the price on purpose. By
 * then a reader knows what FlowPilot does, and the question that stops him
 * buying has changed from "what is this" to "what will it do to my customer
 * when I'm not listening". Answering that immediately above the price is also
 * what let the FAQ below drop from five questions to two.
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

  // Ireland's day, not the server's — Vercel runs UTC.
  const now = startOfDayIn();
  const week = weekFrom(previewAppointments(now), now);
  const today = isoDateIn();

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

        {/*
          Centred, and nothing beside it.

          A phone sat to the right of this and it made the landing page worse in
          the way a second thing always does: the headline stopped being the
          only place to look. A hero has one job — say what this is, once,
          large — and the product has three sections below to prove itself in.
          One column also means one layout, so the page a tradesperson sees on
          a phone is the page everyone else sees.
        */}
        <div className="relative mx-auto w-full max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[12px] font-medium text-zinc-300 backdrop-blur">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            />
            Made for Irish trades
          </p>

          {/*
            Sized so each sentence holds one line on a 375px phone. At 36px they
            both wrapped — "Your business / answers." over "Even when you /
            don't." — which breaks the only thing the headline is doing. The two
            halves are a matched pair, and the second lands because it mirrors
            the first.
          */}
          <h1 className="mt-8 text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-6xl sm:leading-[1.03] lg:text-7xl">
            Your business answers.
            <br />
            <span className="text-zinc-500">Even when you don&apos;t.</span>
          </h1>

          {/*
            Both halves, and the second one named in words a tradesperson uses.
            "One simple app" is what a software person calls it; a job book and
            a diary are what the man buying it already keeps, badly, in a van.
          */}
          <p className="mx-auto mt-7 max-w-xl text-pretty text-[16px] leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            An AI receptionist that answers the calls you miss — and a job book
            and diary that keep every job, conversation and booking in one
            place.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
                Not "hear it answer a call". This links to a typed demo with no
                audio in it at all, onto a page that opens "Say something a
                customer would say" — so the button promised a sound the visitor
                then went looking for and could not find.
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

          {/*
            The price, in the first screen.

            "159" did not appear until 69% of the way through the page text,
            which is four and a half screens on a phone. "How much" is the first
            question a tradesperson asks, and paid traffic will not scroll to
            find it — they assume it is expensive and leave. Stating it early
            also filters: somebody who reads €159 and keeps going is worth far
            more than somebody who reaches the pricing card and bounces.
          */}
          <p className="mt-6 text-[14px] text-zinc-400">
            <span className="font-semibold text-white">
              {formatPrice(plan)} a month
            </span>{" "}
            · one plan · cancel any time
          </p>

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
      </section>

      {/*
        Follows them down the page. The hero button is the last chance to buy
        for four thousand pixels otherwise — see the component for the numbers.
      */}
      <StickyCta price={formatPrice(plan)} allowance={plan.callAllowance} />

      {/* 2 — The whole thing, once, in four steps. */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl">
            {/*
              The competitive claim, in six words.

              This read "A customer rings while you're under a sink" — a scene,
              not a reason. It described the problem a tradesperson already knows
              intimately and said nothing about why FlowPilot beats the thing
              they currently have, which is voicemail. Naming the alternative is
              what makes the difference concrete: everyone understands what a
              voicemail gets you, and "the job" against "a message" is the whole
              product in one comparison.
            */}
            {/*
              Smaller on a phone than the other section headings, deliberately.

              At 32px each sentence wrapped, so the pair became four ragged
              lines — "Voicemail takes a / message." over "FlowPilot takes the /
              job." The contrast is the entire point of the line and it only
              works if each half is read as one thing. A slightly smaller
              heading that lands beats a larger one that falls apart.
            */}
            <h2 className="text-[1.6rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-4xl sm:leading-[1.08]">
              Voicemail takes a message.
              <br />
              FlowPilot takes the job.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              It answers in your business&apos;s name, finds out what the work
              is, where they are and when they need it — then has the whole job
              waiting on your phone. Ring them back when you&apos;re free, or put
              it straight in the diary.
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

      {/*
        3 — The job book and the diary, in one section.

        These were two, and together they came to 2,221px on a phone — 2.7
        screens making one point twice. "Every lead in one place" and "your
        calls and calendar working together" are the same argument told from
        either end, and a visitor from an ad does not stay for the second
        telling.

        One heading, then the two screens that prove it: a job as it arrives,
        and the week it lands in. The panels that used to sit under the week —
        the customer's text and the line the next caller hears — moved to the
        tour on /how-it-works, where somebody has already chosen to look
        properly. On a landing page they were detail in front of somebody still
        deciding whether to read on.
      */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            {/*
              "Jobs", to match the app. The nav inside FlowPilot says Jobs and
              the tour says Jobs; only the sales page still called them leads,
              which taught a buyer a word he would never see again after paying.
            */}
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Jobs
            </p>
            <h2 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
              Every call. Every job. One place.
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-zinc-400">
              See who called, what they need and when they want it. Ring them
              back, or put the work straight in your diary.
            </p>
            {/*
              The manual half, said out loud rather than left as a clause.
              A tradesman's week is mostly regulars, referrals and favours that
              never rang the FlowPilot number, and a diary that only holds the
              calls it answered is a diary he keeps twice — which means he
              keeps it nowhere.
            */}
            <p className="mt-4 text-[16px] leading-7 text-zinc-400">
              Work that never came through a call goes in yourself — a regular,
              a foreman, a favour. Those count too, so when the receptionist
              looks at how busy you are, it sees the whole week and not just its
              own half of it.
            </p>
          </div>

          {/*
            No phone and no transcript here. The homepage argues; the app is
            walked through on /how-it-works.

            The transcript in particular was the tallest object on the landing
            page — nine turns of a plumber's phone call, in front of somebody
            deciding in fifteen seconds whether to keep reading. It is the most
            convincing thing FlowPilot has and the wrong thing to meet first.
          */}
          <div className="mt-12">
            <LeadRecord transcript={false} />
          </div>

          <div className="mt-4">
            <WeekStrip days={week} today={today} />
          </div>

          <p className="mt-8 text-sm text-zinc-400">
            <Link
              href="/how-it-works#tour"
              className="text-white underline underline-offset-4 transition hover:text-zinc-300"
            >
              Have a look around the app
            </Link>{" "}
            — the real screens, with a made-up week in them.
          </p>
        </div>
      </section>

      {/* 4 — The four things nobody else does. */}
      <Control />

      {/* 5 — What it costs. */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-28">
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
        className="scroll-mt-20 border-t border-white/10 px-5 py-14 sm:px-6 sm:py-24"
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
