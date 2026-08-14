/**
 * Phone numbers for the marketing site, chosen so they cannot ring anybody.
 *
 * The site showed "087 412 9008" beside a name and a Dublin address, and the
 * app preview carried +353871234567 and two like it. Every one of those is a
 * well-formed Irish mobile in live allocation, which means each plausibly
 * belongs to a real person who never agreed to appear in an advert — and the
 * dashboard preview renders the real LeadCard, whose number is a `tel:` link.
 * One mis-scoped `inert` between a visitor and dialling a stranger.
 *
 * The 000 block is the fix. An Irish mobile is 08X followed by seven digits,
 * and operators allocate subscriber blocks from ranges that do not begin 000 —
 * so these parse and format exactly like real numbers everywhere in the
 * product, while reading as an obvious placeholder to anyone who lives here.
 *
 * Deliberately NOT presented as a regulator-reserved drama range. ComReg
 * publishes no equivalent of Ofcom's 07700 900xxx block, and claiming one in a
 * comment would be inventing a guarantee to justify a decision that stands on
 * its own.
 *
 * One module because these were scattered across four files, and a number that
 * has to be replaced in four places is a number that gets replaced in three.
 */

/** E.164, as the database and Twilio store it. */
export const DEMO_CALLER_E164 = "+353870000123";
export const DEMO_CALLER_E164_ALT = "+353860000456";
export const DEMO_CALLER_E164_THIRD = "+353850000789";

/**
 * The same number as a reader sees it, for copy that is not run through
 * formatIrishNumber() — the SMS previews, which show what a text looks like.
 */
export const DEMO_CALLER_DISPLAY = "087 000 0123";
