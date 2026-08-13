import type { ReactNode } from "react";

/**
 * A handset, rather than a rounded rectangle.
 *
 * This was a 1px border with a speaker slot at the top, and it read as a box
 * with text in it. The difference is almost entirely in the bezel: a real
 * phone has a black rim around a screen that is not quite black, and the eye
 * recognises that before it reads anything.
 *
 * Built with layered inset shadows rather than nested divs so the caller still
 * gets one element to size, and the "screen" stays a normal flow child that
 * content can fill.
 *
 * Sizing is always passed in, so the same frame can sit inside the lifecycle
 * ring on the home page and stand full height on /how-it-works.
 */
export default function PhoneFrame({
  children,
  className = "",
  /** The status bar and home indicator. Off for the small in-ring screens. */
  chrome = true,
}: {
  children: ReactNode;
  className?: string;
  chrome?: boolean;
}) {
  return (
    <div
      data-testid="phone-frame"
      className="flex flex-col overflow-hidden rounded-[2.1rem] bg-[#0a0a0b] p-1.5"
      /*
       * Written as a style rather than an arbitrary Tailwind class. The value
       * contains rgba(...) commas, which Tailwind's arbitrary-value parser
       * splits on — the class compiled, and every layer came out transparent.
       * A bezel that silently renders invisible is worse than no bezel.
       *
       * There was also a containerType: inline-size here, left over from an
       * earlier responsive idea. Inline-size containment makes an element's
       * width independent of its contents, so the frame collapsed to 12px —
       * its own padding — around a 218px screen.
       */
      style={{
        boxShadow: [
          "inset 0 0 0 1px rgba(255,255,255,0.16)",
          "inset 0 0 0 6px #000",
          "0 0 0 1px rgba(255,255,255,0.06)",
          // Lifts the handset off the page. Belongs on the frame rather than
          // the screen, which is inside overflow-hidden and clips it.
          "0 24px 50px -12px rgba(0,0,0,0.8)",
        ].join(", "),
      }}
    >
      <div className={`flex flex-col ${className}`}>
        {chrome && <StatusBar />}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {chrome && <HomeIndicator />}
      </div>
    </div>
  );
}

/**
 * Time, signal, battery.
 *
 * 9:41 is the time Apple puts in every screenshot, and using it here is the
 * cheapest possible signal that this is a phone. Costs about twenty pixels and
 * does more than any amount of bezel detailing.
 */
function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-none items-center justify-between px-3.5 pb-1 pt-2 text-[10px] tabular-nums text-zinc-200"
    >
      <span className="font-medium">9:41</span>
      <span className="flex items-center gap-[3px] text-zinc-400">
        <svg viewBox="0 0 16 12" className="h-2.5 w-3.5" fill="currentColor">
          <rect x="0" y="8" width="2.5" height="4" rx="0.6" />
          <rect x="4" y="5.5" width="2.5" height="6.5" rx="0.6" />
          <rect x="8" y="3" width="2.5" height="9" rx="0.6" />
          <rect x="12" y="0.5" width="2.5" height="11.5" rx="0.6" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          className="h-2.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1 4.2a10 10 0 0 1 14 0" />
          <path d="M3.6 7a6.5 6.5 0 0 1 8.8 0" />
          <circle cx="8" cy="10" r="0.9" fill="currentColor" stroke="none" />
        </svg>
        <svg viewBox="0 0 26 12" className="h-2.5 w-[18px]" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="22"
            height="11"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.5"
          />
          <rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor" />
          <path
            d="M24 4.5v3a1.8 1.8 0 0 0 0-3z"
            fill="currentColor"
            fillOpacity="0.5"
          />
        </svg>
      </span>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div aria-hidden="true" className="flex flex-none justify-center pb-1 pt-1.5">
      <div className="h-[3px] w-20 rounded-full bg-white/25" />
    </div>
  );
}
