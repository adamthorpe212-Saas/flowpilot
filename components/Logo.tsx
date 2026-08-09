/**
 * The FlowPilot logo, defined once.
 *
 * It was written out by hand in four places — the marketing navbar, the app
 * header, the auth pages and the footer — each with slightly different markup
 * and weight. A brand that renders four ways is one nobody trusts, and the
 * cost of that only shows up when it changes: a new mark would have meant
 * finding every copy.
 *
 * THE MARK IS NOT HERE YET. Adam has an FP monogram with motion lines, but a
 * raster pasted into a chat cannot become a repo file, and drawing an
 * approximation of somebody's real logo is worse than showing none — an
 * 80%-right mark is a wrong mark that nobody notices until it is on a van.
 * So this is a wordmark for now, which is a legitimate thing to be (Stripe and
 * Linear ship wordmarks) rather than a placeholder pretending to be a mark.
 *
 * To add it: drop the file at public/flowpilot-mark.svg and set HAS_MARK true.
 * Every surface picks it up from here.
 */

const HAS_MARK = false;

/** Where the asset lives once it exists. */
const MARK_SRC = "/flowpilot-mark.svg";

export default function Logo({
  /** Bigger on marketing pages than in the app chrome. */
  size = "default",
  className = "",
}: {
  size?: "default" | "large";
  className?: string;
}) {
  const markSize = size === "large" ? "h-8 w-8" : "h-7 w-7";
  const textSize = size === "large" ? "text-lg sm:text-xl" : "text-[15px]";

  return (
    <span
      className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${textSize} ${className}`}
    >
      {HAS_MARK && (
        /*
         * Plain <img>, not next/image. The mark is a fixed-size SVG in the
         * header of every page, so there is nothing for the optimiser to do
         * and a layout-shifting wrapper around it is a cost with no return.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={MARK_SRC}
          alt=""
          aria-hidden="true"
          className={`${markSize} flex-none`}
        />
      )}
      FlowPilot
    </span>
  );
}
