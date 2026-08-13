import type { ReceptionistContext } from "@/lib/receptionist";

/**
 * Words to tell Twilio's speech recognition to expect.
 *
 * Written after reading real call transcripts, which showed the same failure
 * over and over: the model was handling the conversation well and being fed
 * nonsense. "Donnybrook" came through as domain, Donna made, Donna Meade and
 * Dynamite across four attempts. "Finglas" became Stainless. Every one of those
 * calls cost the caller patience the business will be blamed for.
 *
 * The tell is which place name worked. "Raheny" transcribed correctly first
 * time, and Raheny is in that business's service area — a word FlowPilot
 * already had in its database and was not passing on. Twilio's `hints`
 * attribute exists precisely for this: a list of words the recogniser should
 * weight towards, which is how a general-purpose model handles proper nouns it
 * has no reason to know.
 *
 * This is not a substitute for a better recogniser. It is the cheapest large
 * improvement available, it costs nothing per call, and it targets the exact
 * words that matter to each business rather than guessing.
 */

/**
 * Twilio caps hints at 500 words. Staying well under is deliberate: hints bias
 * the recogniser, and a list padded with everything in Ireland would pull real
 * speech towards places the caller never said. Specific beats exhaustive.
 */
const MAX_HINTS = 200;

/**
 * Places common enough to be worth expecting from any Irish caller.
 *
 * Deliberately short. A business's own service area is far more valuable than
 * this list and goes first — these are the fallback for a caller ringing from
 * outside the patch, which is exactly when the area is least predictable and
 * the transcript most likely to be gibberish.
 *
 * Dublin-weighted because that is where the customers are, with the larger
 * cities and towns after. Names chosen for being commonly mistranscribed rather
 * than for being large: "Cork" survives most recognisers, "Dun Laoghaire" does
 * not.
 */
const IRISH_PLACES = [
  // Dublin areas, the ones that break recognisers.
  "Raheny", "Clontarf", "Donnybrook", "Finglas", "Rathmines", "Ranelagh",
  "Drumcondra", "Glasnevin", "Cabra", "Crumlin", "Tallaght", "Blanchardstown",
  "Swords", "Malahide", "Howth", "Sutton", "Baldoyle", "Portmarnock",
  "Blackrock", "Dun Laoghaire", "Dalkey", "Killiney", "Stillorgan", "Sandyford",
  "Sandymount", "Ballsbridge", "Terenure", "Templeogue", "Rathfarnham",
  "Dundrum", "Clondalkin", "Lucan", "Palmerstown", "Castleknock", "Coolock",
  "Artane", "Marino", "Fairview", "Santry", "Ballymun", "Beaumont", "Killester",
  "Balbriggan", "Skerries", "Rush", "Lusk", "Donaghmede", "Kilbarrack",
  // Counties and cities.
  "Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny", "Wexford",
  "Wicklow", "Meath", "Kildare", "Louth", "Drogheda", "Dundalk", "Navan",
  "Naas", "Maynooth", "Bray", "Greystones", "Athlone", "Sligo", "Ennis",
  "Tralee", "Killarney", "Carlow", "Portlaoise", "Mullingar", "Tullamore",
];

/**
 * Trade words a caller reaches for when describing a job.
 *
 * These get mangled the same way place names do, and a wrong one changes what
 * the job record says. "Immersion" and "trip switch" are Irish usage a
 * general-purpose recogniser has no particular reason to expect.
 */
const TRADE_WORDS = [
  "immersion", "trip switch", "fuse board", "consumer unit", "socket",
  "sockets", "fuse", "wiring", "rewire", "down lights", "downlights",
  "spotlights", "light fitting", "extractor fan", "shower", "boiler",
  "radiator", "stopcock", "cylinder", "attic", "storage heater", "meter box",
  "ESB", "RCD", "MCB", "earth", "circuit", "breaker", "leak", "burst",
];

/**
 * The hints for one business, most specific first.
 *
 * Order matters on the way out only because of the cap: if a business covers
 * fifty areas and offers thirty services, their own words should survive
 * truncation and the generic list should be what gets dropped.
 */
export function speechHints(context: ReceptionistContext): string {
  const seen = new Set<string>();
  const hints: string[] = [];

  const add = (value: string) => {
    const word = value.trim();
    if (!word) return;
    // Commas separate hints, so one inside a value would silently split it into
    // two words that are each wrong.
    const safe = word.replace(/,/g, " ").replace(/\s+/g, " ");
    const key = safe.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    hints.push(safe);
  };

  // The business's own patch, first. This is the highest-value data here and
  // the whole reason the bug was visible: Raheny worked, Donnybrook did not.
  context.serviceArea.forEach(add);
  // Then the work they actually do, so a caller naming a service is understood.
  context.services.forEach((service) => add(service.name));
  // Then the business name — callers say it back, and getting it wrong in a
  // transcript makes the whole record look unreliable.
  add(context.businessName);

  IRISH_PLACES.forEach(add);
  TRADE_WORDS.forEach(add);

  return hints.slice(0, MAX_HINTS).join(",");
}

/**
 * The attributes every Gather in the call should carry.
 *
 * `speechModel="phone_call"` is Twilio's model trained on 8kHz telephone audio,
 * which is what every one of these calls is. The default model expects clean
 * wideband audio and degrades badly on a mobile in a van.
 *
 * `enhanced="true"` goes with it. Both are set here, once, rather than repeated
 * across three routes — the previous arrangement, where each Gather was written
 * out by hand, is how one of them ends up missing an attribute and only some
 * calls transcribe well.
 */
export function gatherAttributes(context: ReceptionistContext): string {
  return (
    ` language="en-IE" speechModel="phone_call" enhanced="true"` +
    ` hints="${escapeXmlAttribute(speechHints(context))}"`
  );
}

/**
 * Hints go into an XML attribute, and a business name with an apostrophe —
 * O'Brien Plumbing — would otherwise produce malformed TwiML and a call that
 * fails outright rather than transcribing badly.
 */
function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
