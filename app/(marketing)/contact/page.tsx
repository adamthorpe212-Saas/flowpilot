import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { formatPrice, soldPlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Talk to us — FlowPilot",
  description:
    "Questions before you sign up? Email us and we'll walk you through FlowPilot, or set it up with you over the phone.",
};

/**
 * A way to reach a person.
 *
 * The site had exactly one: a "Contact" link in the footer, in grey, below the
 * privacy policy. For a €159-a-month product being sold to tradespeople who
 * decide by talking to somebody, that is not a contact route, it is a legal
 * formality.
 *
 * Deliberately NOT a form. A contact form needs somewhere to send, and email is
 * not configured on this deployment yet — RESEND_API_KEY is unset, so a form
 * would accept a message, thank the visitor, and drop it. A page that loses a
 * sales enquiry silently is worse than no page, and considerably worse than a
 * mailto that always works.
 *
 * When email is configured this should become a form with a callback request,
 * because "ring me" converts better than "email us" with this audience. Until
 * then it says only what is true.
 */
export default function ContactPage() {
  const plan = soldPlan();

  return (
    <>
      <section className="px-5 pb-4 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.06]">
            Talk to a person.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-300">
            Not sure it suits your trade, or want it set up with you? Say so and
            we&apos;ll come back to you the same day.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-md">
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-7 text-center sm:p-9">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Email us
            </p>

            {/*
              The address in full, not hidden behind the button. Plenty of
              phones have no mail app configured, and somebody who taps a
              mailto and gets nothing concludes the business is not reachable.
              Shown as text, it can be copied into whatever they actually use.
            */}
            <a
              href={`mailto:${LEGAL.email}?subject=${encodeURIComponent("FlowPilot — a question")}`}
              className="mt-4 flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
            >
              {LEGAL.email}
            </a>

            <p className="mt-5 text-[13px] leading-6 text-zinc-400">
              Tell us your trade and where you work. If you want it set up on a
              call rather than on your own, say that and we&apos;ll arrange a
              time.
            </p>
          </div>

          {/*
            The three things people email to ask, answered here so the ones who
            only wanted that never have to write at all.
          */}
          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-[15px] font-medium">What does it cost?</dt>
              <dd className="mt-1.5 text-[14px] leading-6 text-zinc-400">
                {formatPrice(plan)} a month excluding VAT, one plan,{" "}
                {plan.callAllowance} answered calls included. No setup fee, and
                you can cancel in one click.
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-medium">
                Do I have to change my number?
              </dt>
              <dd className="mt-1.5 text-[14px] leading-6 text-zinc-400">
                No. You keep the number on your van — you forward the calls you
                miss, and nothing else about how you work changes.
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-medium">Can I see it working?</dt>
              <dd className="mt-1.5 text-[14px] leading-6 text-zinc-400">
                Yes —{" "}
                <Link
                  href="/how-it-works#tour"
                  className="text-white underline underline-offset-4 transition hover:text-zinc-300"
                >
                  have a look around the app
                </Link>{" "}
                or{" "}
                <Link
                  href="/how-it-works#demo"
                  className="text-white underline underline-offset-4 transition hover:text-zinc-300"
                >
                  try the receptionist yourself
                </Link>
                . Neither needs an account.
              </dd>
            </div>
          </dl>

          <p className="mt-10 text-center text-sm text-zinc-400">
            Ready to go?{" "}
            <Link
              href="/signup"
              className="text-white underline underline-offset-4 transition hover:text-zinc-300"
            >
              Set it up yourself in a few minutes
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
