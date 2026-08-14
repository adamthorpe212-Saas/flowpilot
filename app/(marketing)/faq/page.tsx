import type { Metadata } from "next";
import Link from "next/link";
import AskFlowPilot from "@/components/AskFlowPilot";
import Faq from "@/components/Faq";
import { allFaqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Questions worth asking — FlowPilot",
  description:
    "Do I keep my number? Will callers know it's an AI? Can I control what it says? How fast is setup, and can I cancel? Straight answers about FlowPilot's AI receptionist for Irish trades.",
};

/**
 * Every question, on a page of its own.
 *
 * The navbar's "FAQ" used to be an anchor into the homepage, which is a link
 * that cannot be shared, cannot be indexed separately and lands somebody four
 * thousand pixels down a sales page with no idea where they are. A tradesperson
 * ringing round for answers wants a page, not a scroll position.
 *
 * Built from allFaqItems() rather than an id list. Every other page picks a
 * subset for its context — the homepage takes the five that block a sale, the
 * pricing page the ones asked with a card in hand — and this one is the
 * reference, so it must be impossible for an answer to exist and not appear
 * here. Deriving it means a new question is published the moment it is written,
 * instead of the moment somebody remembers to add it to a second list.
 *
 * The homepage keeps its five. Sending somebody to another page to find out
 * whether they keep their own number, at the moment they are looking at the
 * price, would cost more than the duplication does.
 */
export default function FaqPage() {
  const items = allFaqItems();

  return (
    <>
      <section className="px-5 pb-4 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.06]">
            Questions worth asking
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-zinc-300">
            Everything people ask before they hand over their phone line.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <Faq items={items} />

          {/* The one we didn't think of. */}
          <div className="mt-12">
            <AskFlowPilot />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
            Never lose a job to a missed call.
          </h2>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-7 text-zinc-400">
            Keep your own number. Nothing on your van changes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-white px-9 text-[15px] font-semibold text-black transition hover:bg-zinc-200"
          >
            Get FlowPilot
          </Link>
          <p className="mt-5 text-sm text-zinc-400">
            Or{" "}
            <Link
              href="/how-it-works"
              className="text-white underline underline-offset-4 transition hover:text-zinc-300"
            >
              see what happens when you miss a call
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
