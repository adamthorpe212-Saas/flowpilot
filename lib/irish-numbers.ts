/**
 * Choosing a phone number that looks like it belongs to the business.
 *
 * Twilio's Irish inventory is heavily weighted towards small rural exchanges —
 * an unfiltered search returns Portumna, Scarriff and Skibbereen long before it
 * returns anything urban. Buying the first result would hand a Dublin plumber a
 * Galway landline, and a customer who rings a "local" tradesperson and sees an
 * unfamiliar area code assumes a call centre or a scam. The number is the most
 * public thing FlowPilot gives a business, so it has to look right.
 *
 * The signal we have is service_area: the places the business already told us
 * it works in. Mapping those to a landline prefix is a lookup, not a guess, so
 * it lives here as data rather than being inferred at the call site.
 */

/**
 * Irish geographic area codes, keyed by the places a tradesperson would
 * plausibly type as their service area.
 *
 * Deliberately not exhaustive down to every townland. Covering counties, cities,
 * Dublin postal districts and the larger commuter suburbs matches how people
 * actually describe where they work, and an unmatched entry degrades to the
 * national fallback rather than to a wrong answer.
 */
const AREA_CODES: ReadonlyArray<{ code: string; places: readonly string[] }> = [
  {
    code: "01",
    places: [
      "dublin", "co dublin", "north dublin", "south dublin", "dublin city",
      "raheny", "clontarf", "glasnevin", "drumcondra", "santry", "beaumont",
      "artane", "coolock", "donnycarney", "marino", "fairview", "killester",
      "howth", "sutton", "baldoyle", "portmarnock", "malahide", "swords",
      "kinsealy", "donabate", "rush", "lusk", "skerries", "balbriggan",
      "finglas", "ballymun", "cabra", "phibsborough", "stoneybatter",
      "castleknock", "blanchardstown", "clonsilla", "lucan", "palmerstown",
      "clondalkin", "tallaght", "firhouse", "templeogue", "terenure",
      "rathfarnham", "knocklyon", "crumlin", "drimnagh", "walkinstown",
      "inchicore", "rialto", "kimmage", "harolds cross", "rathmines",
      "ranelagh", "donnybrook", "ballsbridge", "sandymount", "ringsend",
      "dundrum", "sandyford", "stillorgan", "blackrock", "booterstown",
      "monkstown", "dun laoghaire", "dalkey", "killiney", "shankill",
      "cabinteely", "foxrock", "leopardstown", "churchtown", "milltown",
      "bray", "greystones",
    ],
  },
  { code: "021", places: ["cork", "co cork", "cork city", "carrigaline", "ballincollig", "midleton", "cobh", "kinsale", "coachford", "blarney", "douglas", "bishopstown", "carrigtwohill"] },
  { code: "022", places: ["mallow"] },
  { code: "023", places: ["bandon", "clonakilty", "dunmanway"] },
  { code: "024", places: ["youghal"] },
  { code: "025", places: ["fermoy"] },
  { code: "026", places: ["macroom"] },
  { code: "027", places: ["bantry"] },
  { code: "028", places: ["skibbereen", "baltimore", "schull"] },
  { code: "029", places: ["kanturk"] },
  { code: "041", places: ["drogheda", "ardee", "co louth", "louth"] },
  { code: "042", places: ["dundalk", "carrickmacross", "castleblayney"] },
  { code: "043", places: ["longford", "co longford", "granard"] },
  { code: "044", places: ["mullingar", "westmeath", "co westmeath", "castlepollard"] },
  { code: "045", places: ["naas", "kildare", "co kildare", "newbridge", "sallins", "clane", "kilcullen", "athy"] },
  { code: "046", places: ["navan", "meath", "co meath", "trim", "kells", "athboy", "oldcastle"] },
  { code: "047", places: ["monaghan", "co monaghan", "clones"] },
  { code: "049", places: ["cavan", "co cavan", "virginia", "belturbet"] },
  { code: "051", places: ["waterford", "co waterford", "waterford city", "tramore", "new ross", "carrick on suir"] },
  { code: "052", places: ["clonmel", "cahir", "cashel"] },
  { code: "053", places: ["wexford", "co wexford", "gorey", "enniscorthy", "bunclody"] },
  { code: "056", places: ["kilkenny", "co kilkenny", "castlecomer", "callan", "thomastown"] },
  { code: "057", places: ["portlaoise", "laois", "co laois", "tullamore", "offaly", "co offaly", "birr", "portarlington", "edenderry", "mountmellick"] },
  { code: "058", places: ["dungarvan"] },
  { code: "059", places: ["carlow", "co carlow", "tullow", "baltinglass", "muine bheag"] },
  { code: "061", places: ["limerick", "co limerick", "limerick city", "shannon", "ennis road", "castleconnell", "scarriff", "killaloe"] },
  { code: "062", places: ["tipperary", "co tipperary", "tipperary town"] },
  { code: "063", places: ["charleville"] },
  { code: "064", places: ["killarney", "kenmare"] },
  { code: "065", places: ["ennis", "clare", "co clare", "kilrush", "kilkee", "lahinch", "ennistymon"] },
  { code: "066", places: ["tralee", "kerry", "co kerry", "dingle", "castleisland", "cahersiveen"] },
  { code: "067", places: ["nenagh", "roscrea", "thurles"] },
  { code: "068", places: ["listowel", "ballybunion"] },
  { code: "069", places: ["newcastle west", "rathkeale"] },
  { code: "071", places: ["sligo", "co sligo", "carrick on shannon", "leitrim", "co leitrim", "manorhamilton", "ballymote"] },
  { code: "074", places: ["letterkenny", "donegal", "co donegal", "buncrana", "ballybofey", "dungloe", "carndonagh"] },
  { code: "090", places: ["athlone", "roscommon", "co roscommon", "ballinasloe", "portumna", "boyle", "castlerea"] },
  { code: "091", places: ["galway", "co galway", "galway city", "oranmore", "loughrea", "gort", "athenry", "salthill", "barna"] },
  { code: "093", places: ["tuam", "ballinrobe", "headford"] },
  { code: "094", places: ["castlebar", "mayo", "co mayo", "claremorris", "knock", "ballyhaunis", "swinford"] },
  { code: "095", places: ["clifden", "connemara"] },
  { code: "096", places: ["ballina", "enniscrone"] },
  { code: "097", places: ["belmullet"] },
  { code: "098", places: ["westport", "louisburgh", "newport"] },
];

const PLACE_TO_CODE = new Map<string, string>();
for (const area of AREA_CODES) {
  for (const place of area.places) PLACE_TO_CODE.set(place, area.code);
}

/**
 * Lowercased, unaccented, punctuation-free. "Dún Laoghaire", "Dun Laoghaire"
 * and "DUN LAOGHAIRE." all have to reach the same entry, because all three are
 * things a customer will type.
 */
function normalise(place: string): string {
  return place
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Strips the wrappers people put around a place name rather than in it. */
function stripQualifiers(place: string): string {
  return place
    .replace(/^(co|county|city of)\s+/, "")
    .replace(/\s+(city|county|area|and surrounds|surrounds)$/, "")
    .trim();
}

/**
 * The landline prefix a business's number should carry, or null if nothing in
 * its service area is recognisable.
 *
 * Entries are considered in the order the business listed them: the first one
 * they typed is the one they think of as home.
 */
export function areaCodeForServiceArea(
  serviceArea: readonly string[],
): string | null {
  for (const entry of serviceArea) {
    const normalised = normalise(entry);
    if (!normalised) continue;

    const direct = PLACE_TO_CODE.get(normalised);
    if (direct) return direct;

    const stripped = stripQualifiers(normalised);
    const qualified = PLACE_TO_CODE.get(stripped);
    if (qualified) return qualified;

    // "Dublin 3", "Dublin 15", "D24" — postal districts, all on 01.
    if (/^dublin\s*\d{1,2}$/.test(stripped) || /^d\s?\d{1,2}$/.test(stripped)) {
      return "01";
    }
  }

  return null;
}

/**
 * The search pattern Twilio wants for a given area code.
 *
 * Irish numbers are published nationally as 0AA XXXXXXX but dialled
 * internationally as +353 AA XXXXXXX — the trunk zero is dropped. Getting this
 * wrong returns an empty inventory rather than an error, which is exactly the
 * kind of silent failure that looks like "no numbers available" forever.
 */
export function searchPatternForAreaCode(areaCode: string): string {
  return `+353${areaCode.replace(/^0/, "")}*`;
}
