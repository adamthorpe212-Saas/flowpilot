import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, PLANS, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing — FlowPilot",
  description:
    "Simple monthly pricing for an AI receptionist that answers the calls you miss. Free trial, no setup fee, cancel any time.",
};

const FAQS = [
  {
    question: "What counts as an answered call?",
    answer:
      "A call your receptionist actually picks up and handles. Calls you answer yourself never touch FlowPilot and are never counted.",
  },
  {
    question: "What if I go over my calls?",
    answer:
      "We'll tell you before you get close, and your receptionist keeps answering — we never cut you off mid-month. If you're regularly over, we'll move you up a plan.",
  },
  {
    question: "Do I need a new phone number?",
    answer:
      "No. You keep your number and set it to forward to FlowPilot when you can't answer. Nothing on your van, website or Google listing changes.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Any time, from your dashboard. You keep your receptionist until the end of the month you've paid for.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="px-5 pb-4 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            One missed call pays for it.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            {TRIAL_DAYS} days free. No setup fee. Cancel whenever you like.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-white/35 bg-white/[0.05]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-xs font-medium text-black">
                  Most popular
                </span>
              )}

              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 min-h-[2.5rem] text-sm leading-5 text-zinc-500">
                {plan.tagline}
              </p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">
                  {formatPrice(plan)}
                </span>
                <span className="text-sm text-zinc-500">/month</span>
              </p>

              <Link
                href={`/signup?plan=${plan.id}`}
                className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/20 text-white hover:bg-white/5"
                }`}
              >
                Start free trial
              </Link>

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
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-zinc-600">
          Prices exclude VAT. Your Irish number and all calls are included —
          there are no per-minute charges on top.
        </p>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Questions worth asking
          </h2>
          <dl className="mt-8 space-y-6">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-white/10 pb-6 last:border-0"
              >
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-6 text-zinc-400">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
