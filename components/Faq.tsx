import type { FaqItem } from "@/lib/faq";

/**
 * The objections a tradesperson actually has, answered plainly.
 *
 * Built on native <details>/<summary> rather than a bespoke accordion: keyboard
 * operation, focus handling and screen-reader semantics come for free and it
 * works before hydration. There is no state here worth owning.
 *
 * The answers themselves live in lib/faq.ts, so the homepage and the pricing
 * page cannot give different versions of the same one — which they already had
 * started doing.
 */
export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-white/10 border-y border-white/10">
      {items.map(({ id, question, answer }) => (
        <details key={id} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[15px] font-medium text-white transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 [&::-webkit-details-marker]:hidden">
            {question}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4 flex-none text-zinc-500 transition-transform duration-200 group-open:rotate-45"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </summary>
          <p className="fp-rise-in pb-5 pr-8 text-sm leading-6 text-zinc-400">
            {answer}
          </p>
        </details>
      ))}
    </div>
  );
}
