import type { Metadata } from "next";
import Link from "next/link";
import Faq from "@/components/Faq";
import { PRICING_FAQ_IDS, faqItems } from "@/lib/faq";
import { formatPrice, soldPlan, weeklyPrice } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing — FlowPilot",
  /*
   * No trial is mentioned, because there isn't one. This said "Free trial, no
   * setup fee" — the trial was removed from lib/plans.ts along with every
   * branch hanging off it, and this description was missed. It is the text
   * Google shows under the result, so it was advertising a free trial to
   * everybody searching, on the page whose entire job is being straight about
   * what things cost.
   */
  description:
    "One plan, €159 a month excluding VAT, for an AI receptionist that answers the calls you miss. 120 answered calls included. No setup fee, cancel any time.",
};

export default function PricingPage() {
  const plan = soldPlan();

  return (
    <>
      <section className="px-5 pb-4 pt-24 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            One missed call pays for it.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            No setup fee. Cancel whenever you like.
          </p>
        </div>
      </section>

      {/*
        One plan, one price. A tier table asks a tradesperson to work out which
        version of the product they are, before they know what the product is —
        and every tier we do not sell is a decision we have handed to somebody
        who has no basis to make it.
      */}
      <section className="px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-lg">
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-7 sm:p-9">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-400">
              {plan.tagline}
            </p>

            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-tight">
                {formatPrice(plan)}
              </span>
              <span className="text-sm text-zinc-400">/month</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Works out at {weeklyPrice(plan)} a week. Billed monthly.
            </p>

            <Link
              href={`/signup?plan=${plan.id}`}
              className="mt-7 flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
            >
              Get FlowPilot
            </Link>

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
                    className="mt-0.5 h-4 w-4 flex-none text-zinc-400"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-zinc-400">
            Prices exclude VAT. Your Irish number and every call are included —
            no per-minute charges on top. Fair use is {plan.callAllowance}{" "}
            answered calls a month, and we will never cut you off mid-month.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Questions worth asking
          </h2>
          <div className="mt-8">
            <Faq items={faqItems(PRICING_FAQ_IDS)} />
          </div>

          {/*
            The four asked with a card in hand stay here. Everything else is a
            click away rather than repeated underneath a price.
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
        </div>
      </section>
    </>
  );
}
