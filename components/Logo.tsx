/**
 * The FlowPilot logo, defined once.
 *
 * It was written out by hand in four places — the marketing navbar, the app
 * header, the auth pages and the footer — each with slightly different markup
 * and weight. A brand that renders four ways is one nobody trusts, and the
 * cost of that only shows up when it changes: a new mark would have meant
 * finding every copy.
 *
 * The mark is the FP monogram with motion lines, cropped out of the 1254px
 * original and scaled down — 699KB to 153KB, for something that renders at
 * 28px. Shipping the original would have been two-thirds of a megabyte on every
 * page load to draw a logo the size of a thumbnail.
 *
 * The crop matters as much as the resize. The source is a square canvas with
 * the artwork occupying only 45% of its width, so scaling it whole produced a
 * mark that was mostly empty black with a tiny glyph adrift in the middle. The
 * asset here is cropped to the artwork's actual bounds, found by scanning for
 * the first non-black pixel rather than guessed at by eye.
 *
 * It has no alpha channel: the source is white on solid black, which is why it
 * sits cleanly on this site without a cutout. That also means it must not be
 * placed on a light background — there is nothing else here that does, and if
 * one ever appears the mark needs a transparent version rather than a CSS
 * workaround.
 */

const HAS_MARK = true;

const MARK_SRC = "/flowpilot-mark.png";

export default function Logo({
  /** Bigger on marketing pages than in the app chrome. */
  size = "default",
  className = "",
}: {
  size?: "default" | "large";
  className?: string;
}) {
  /*
   * Sized by height with the width left to follow.
   *
   * The mark is wider than it is tall — it was being forced into a square, so
   * a 5:4 glyph was squashed and the whole thing read as tiny. `w-auto` lets it
   * keep its own proportions and take the width it needs.
   */
  const markSize = size === "large" ? "h-9 w-auto" : "h-7 w-auto";
  const textSize = size === "large" ? "text-xl sm:text-2xl" : "text-[15px]";

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
