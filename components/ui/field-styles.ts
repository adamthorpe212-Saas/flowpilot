/**
 * The type scale for anything a customer fills in.
 *
 * Settings had grown six treatments for the same idea: `text-sm font-medium`,
 * two different uppercase micro-labels at 11px and 12px with different letter
 * spacing, a bare `font-medium`, and hints at two sizes. Individually each was
 * fine. Together they read as six different kinds of thing, so nothing looked
 * more or less important than anything else and the page felt assembled rather
 * than designed.
 *
 * These are exported as values rather than left inline so that a seventh
 * treatment has to be a deliberate act rather than a copy-paste.
 */

/** Section titles. The only heading size inside a settings page. */
export const titleClass = "text-[17px] font-semibold tracking-tight";

/**
 * What a field is.
 *
 * Never uppercase. Small caps at 11px with wide tracking is decoration — it
 * says "this is a designed thing" rather than "this is what this box holds",
 * and it was being used for the labels that matter most.
 */
export const labelClass = "block text-sm font-medium text-zinc-200";

/** Why it matters, or what happens if it is left alone. */
export const hintClass = "text-[13px] leading-5 text-zinc-400";

/** Text inputs and textareas. */
export const controlClass =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] leading-6 text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50";
