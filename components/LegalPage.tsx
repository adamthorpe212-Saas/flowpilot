import type { ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";

/**
 * Shared shell for the privacy policy and the terms.
 *
 * These are the two pages on the site somebody reads properly rather than
 * scans, usually because they are deciding whether to trust us with their
 * customers' details. So they get a narrower measure and looser leading than
 * the marketing pages — comfortable for prose rather than optimised for
 * skimming.
 *
 * The typography lives here rather than in each page so the two cannot drift
 * apart, which matters more than usual: a terms page that looks subtly
 * different from the privacy page reads as one of them having been bolted on.
 */
export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="px-5 pb-24 pt-20 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-5 text-[16px] leading-8 text-zinc-300">{intro}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Last updated {LEGAL_UPDATED}
        </p>

        {/*
          Spacing and type set once, on the container, so a page author writes
          plain headings and paragraphs and cannot accidentally style one
          section differently from the rest.
        */}
        <div
          className="
            mt-12 text-[15px] leading-7 text-zinc-300
            [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-white
            [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white
            [&_h3]:mt-8 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-white
            [&_li]:mt-2
            [&_p]:mt-4
            [&_strong]:font-semibold [&_strong]:text-white
            [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:marker:text-zinc-600
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}
