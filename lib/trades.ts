/**
 * The jobs a given trade actually gets called about.
 *
 * Onboarding's slowest step is the services list: a blank box somebody has to
 * fill in from memory, at the exact moment they are least invested. It is also
 * the step that decides how good their receptionist is, because these are the
 * things it will recognise when a caller describes a problem badly.
 *
 * We already ask what they do on the previous step, so asking them to type the
 * obvious answers again is friction we created ourselves. Suggestions are
 * offered, never imposed — every one still has to be tapped, and the list stays
 * theirs to edit, because a plumber who does not touch oil boilers should not
 * find one on their list because we assumed it.
 *
 * `emergency` marks the jobs worth waking somebody for. It maps to
 * service.emergency_eligible, which is what lets the receptionist tell a burst
 * pipe from a dripping tap.
 */

export type TradeService = { name: string; emergency: boolean };

export type Trade = {
  id: string;
  /** What a tradesperson would type when asked what they do. */
  aliases: readonly string[];
  /** Used in the UI: "Common for a plumber". */
  noun: string;
  services: readonly TradeService[];
};

export const TRADES: readonly Trade[] = [
  {
    id: "plumbing",
    noun: "plumber",
    aliases: ["plumber", "plumbing", "plumber and heating", "plumbing and heating"],
    services: [
      { name: "Burst pipes", emergency: true },
      { name: "Leaks", emergency: true },
      { name: "Blocked drains", emergency: false },
      { name: "Boiler repair", emergency: true },
      { name: "Radiators", emergency: false },
      { name: "Taps and showers", emergency: false },
      { name: "Toilets", emergency: false },
      { name: "Bathroom fitting", emergency: false },
    ],
  },
  {
    id: "electrical",
    noun: "electrician",
    aliases: ["electrician", "electrical", "electrics", "sparks"],
    services: [
      { name: "Power cut or tripping fuseboard", emergency: true },
      { name: "Burning smell or scorched socket", emergency: true },
      { name: "Sockets and switches", emergency: false },
      { name: "Lighting", emergency: false },
      { name: "Fuseboard upgrade", emergency: false },
      { name: "EV charger installation", emergency: false },
      { name: "Rewiring", emergency: false },
      { name: "Electrical certificate", emergency: false },
    ],
  },
  {
    id: "heating",
    noun: "heating engineer",
    aliases: ["heating", "gas", "gas engineer", "boiler", "heating engineer", "oil"],
    services: [
      { name: "No heating or hot water", emergency: true },
      { name: "Smell of gas", emergency: true },
      { name: "Boiler repair", emergency: true },
      { name: "Boiler service", emergency: false },
      { name: "Boiler replacement", emergency: false },
      { name: "Radiators and valves", emergency: false },
      { name: "Thermostat or controls", emergency: false },
      { name: "Power flush", emergency: false },
    ],
  },
  {
    id: "roofing",
    noun: "roofer",
    aliases: ["roofer", "roofing", "roofs"],
    services: [
      { name: "Roof leak", emergency: true },
      { name: "Storm damage", emergency: true },
      { name: "Slipped or missing slates", emergency: false },
      { name: "Gutters and downpipes", emergency: false },
      { name: "Flat roof repair", emergency: false },
      { name: "Chimney and flashing", emergency: false },
      { name: "Full roof replacement", emergency: false },
    ],
  },
  {
    id: "carpentry",
    noun: "carpenter",
    aliases: ["carpenter", "carpentry", "joiner", "joinery"],
    services: [
      { name: "Doors and locks", emergency: false },
      { name: "Skirting and architrave", emergency: false },
      { name: "Fitted wardrobes", emergency: false },
      { name: "Kitchen fitting", emergency: false },
      { name: "Decking", emergency: false },
      { name: "Stairs and handrails", emergency: false },
      { name: "Attic floors and hatches", emergency: false },
    ],
  },
  {
    id: "painting",
    noun: "painter",
    aliases: ["painter", "painting", "decorator", "decorating", "painter and decorator"],
    services: [
      { name: "Interior painting", emergency: false },
      { name: "Exterior painting", emergency: false },
      { name: "Wallpapering", emergency: false },
      { name: "Plaster repair and filling", emergency: false },
      { name: "Woodwork and doors", emergency: false },
      { name: "Spray painting", emergency: false },
    ],
  },
  {
    id: "locksmith",
    noun: "locksmith",
    aliases: ["locksmith", "locks"],
    services: [
      { name: "Locked out", emergency: true },
      { name: "Break-in repair", emergency: true },
      { name: "Broken key in lock", emergency: true },
      { name: "Lock change", emergency: false },
      { name: "Window locks", emergency: false },
      { name: "Safes", emergency: false },
    ],
  },
  {
    id: "tiling",
    noun: "tiler",
    aliases: ["tiler", "tiling", "tiles"],
    services: [
      { name: "Bathroom tiling", emergency: false },
      { name: "Kitchen splashback", emergency: false },
      { name: "Floor tiling", emergency: false },
      { name: "Regrouting and sealing", emergency: false },
      { name: "Cracked tile repair", emergency: false },
    ],
  },
  {
    id: "plastering",
    noun: "plasterer",
    aliases: ["plasterer", "plastering", "skimming"],
    services: [
      { name: "Skimming and re-skimming", emergency: false },
      { name: "Crack and hole repair", emergency: false },
      { name: "Plasterboard and stud walls", emergency: false },
      { name: "Coving and cornice", emergency: false },
      { name: "External rendering", emergency: false },
    ],
  },
  {
    id: "landscaping",
    noun: "landscaper",
    aliases: ["landscaper", "landscaping", "gardener", "gardening", "garden"],
    services: [
      { name: "Fallen tree or storm damage", emergency: true },
      { name: "Garden maintenance", emergency: false },
      { name: "Hedge and tree cutting", emergency: false },
      { name: "Lawns and turfing", emergency: false },
      { name: "Patios and paving", emergency: false },
      { name: "Fencing", emergency: false },
      { name: "Garden clearance", emergency: false },
    ],
  },
  {
    id: "cleaning",
    noun: "cleaner",
    aliases: ["cleaner", "cleaning", "domestic cleaning", "commercial cleaning"],
    services: [
      { name: "Regular house cleaning", emergency: false },
      { name: "Deep clean", emergency: false },
      { name: "End of tenancy clean", emergency: false },
      { name: "Carpet and upholstery", emergency: false },
      { name: "Window cleaning", emergency: false },
      { name: "Office cleaning", emergency: false },
    ],
  },
  {
    id: "building",
    noun: "builder",
    aliases: ["builder", "building", "construction", "general builder"],
    services: [
      { name: "Structural damage", emergency: true },
      { name: "Extensions", emergency: false },
      { name: "Attic conversions", emergency: false },
      { name: "Renovations", emergency: false },
      { name: "Garden rooms", emergency: false },
      { name: "Groundworks and foundations", emergency: false },
      { name: "Dry lining and insulation", emergency: false },
    ],
  },
  {
    id: "handyman",
    noun: "handyman",
    aliases: ["handyman", "handy man", "odd jobs", "maintenance"],
    services: [
      { name: "Flat-pack assembly", emergency: false },
      { name: "Shelves and TV mounting", emergency: false },
      { name: "Door and lock adjustments", emergency: false },
      { name: "Small repairs", emergency: false },
      { name: "Gutter clearing", emergency: false },
      { name: "Painting touch-ups", emergency: false },
    ],
  },
  {
    id: "appliance-repair",
    noun: "appliance engineer",
    aliases: ["appliance repair", "appliances", "washing machine", "white goods"],
    services: [
      { name: "Leaking appliance", emergency: true },
      { name: "Washing machine repair", emergency: false },
      { name: "Dishwasher repair", emergency: false },
      { name: "Oven and hob repair", emergency: false },
      { name: "Fridge and freezer repair", emergency: false },
      { name: "Dryer repair", emergency: false },
    ],
  },
  {
    id: "pest-control",
    noun: "pest controller",
    aliases: ["pest control", "pest", "exterminator"],
    services: [
      { name: "Wasp or bee nest", emergency: true },
      { name: "Rats and mice", emergency: true },
      { name: "Ants and insects", emergency: false },
      { name: "Fleas and bedbugs", emergency: false },
      { name: "Bird proofing", emergency: false },
      { name: "Prevention and proofing", emergency: false },
    ],
  },
  {
    id: "glazing",
    noun: "glazier",
    aliases: ["glazier", "glazing", "windows", "window fitter", "double glazing"],
    services: [
      { name: "Broken or smashed window", emergency: true },
      { name: "Boarding up", emergency: true },
      { name: "Misted double glazing", emergency: false },
      { name: "Window and door replacement", emergency: false },
      { name: "Handles, hinges and locks", emergency: false },
      { name: "Splashbacks and mirrors", emergency: false },
    ],
  },
  {
    id: "flooring",
    noun: "floor fitter",
    aliases: ["flooring", "floor fitter", "floors", "carpet fitter"],
    services: [
      { name: "Laminate and vinyl", emergency: false },
      { name: "Solid and engineered wood", emergency: false },
      { name: "Carpet fitting", emergency: false },
      { name: "Floor sanding and sealing", emergency: false },
      { name: "Subfloor levelling", emergency: false },
    ],
  },
  {
    id: "driveways",
    noun: "paving contractor",
    aliases: ["driveways", "paving", "tarmac", "cobblelock", "driveway"],
    services: [
      { name: "New driveway", emergency: false },
      { name: "Cobblelock and paving", emergency: false },
      { name: "Tarmac", emergency: false },
      { name: "Patios", emergency: false },
      { name: "Power washing and resealing", emergency: false },
      { name: "Drainage and kerbing", emergency: false },
    ],
  },
];

export type ServiceSelection = {
  services: string[];
  /** Names within `services` that are emergency-eligible. */
  emergency: string[];
};

/**
 * Adds suggested services to what the customer already has.
 *
 * A pure function rather than logic inside the form, because the services step
 * sits behind login and cannot be driven in a browser during development — so
 * without this the only check on "does adding a burst pipe tick the emergency
 * box" would be someone remembering to look.
 *
 * Emergency flags come along automatically. That flag is what lets the
 * receptionist tell a burst pipe from a dripping tap, and it is the setting a
 * tradesperson is least likely to think about unprompted — but it stays
 * editable afterwards, because we are seeding a decision, not making it.
 */
export function withSuggestions(
  current: ServiceSelection,
  additions: readonly TradeService[],
): ServiceSelection {
  const existing = new Set(
    current.services.map((service) => service.toLowerCase()),
  );

  const added = additions.filter((suggestion) => {
    const key = suggestion.name.toLowerCase();
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });

  return {
    services: [...current.services, ...added.map((s) => s.name)],
    emergency: [
      ...current.emergency,
      ...added.filter((s) => s.emergency).map((s) => s.name),
    ],
  };
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The trade someone means when they type what they do, or null.
 *
 * Matching is deliberately conservative — an exact alias, or an alias appearing
 * as a whole word. Suggesting an electrician's job list to a plumber is worse
 * than suggesting nothing, because a wrong list has to be read and dismissed
 * whereas an empty one is simply typed into.
 */
export function tradeFor(industryLabel: string | null): Trade | null {
  if (!industryLabel) return null;
  const label = normalise(industryLabel);
  if (!label) return null;

  for (const trade of TRADES) {
    for (const alias of trade.aliases) {
      if (label === alias) return trade;
    }
  }

  for (const trade of TRADES) {
    for (const alias of trade.aliases) {
      const pattern = new RegExp(`(^|\\s)${alias.replace(/\s+/g, "\\s+")}(\\s|$)`);
      if (pattern.test(label)) return trade;
    }
  }

  return null;
}
