import { describe, expect, it } from "vitest";
import { gatherAttributes, speechHints } from "@/lib/voice/hints";
import type { ReceptionistContext } from "@/lib/receptionist";

/*
 * Built from a real transcript. "Donnybrook" came back as domain, Donna made,
 * Donna Meade and Dynamite across four attempts; "Finglas" became Stainless.
 * "Raheny" transcribed first time — and Raheny was the one word already in the
 * business's service area.
 */
function context(
  overrides: Partial<ReceptionistContext> = {},
): ReceptionistContext {
  return {
    businessName: "Thorpe Electrical",
    serviceArea: ["Raheny", "Clontarf"],
    services: [{ name: "Rewiring" }, { name: "Fuse board upgrades" }],
    questions: [],
    profile: {},
    ...overrides,
  } as ReceptionistContext;
}

describe("speechHints", () => {
  it("puts the business's own patch first", () => {
    /*
     * The highest-value words here, and the reason the defect was visible at
     * all. Ordering matters because of the 500-word cap: a business covering
     * fifty areas must not have its own words truncated away in favour of a
     * generic list.
     */
    const hints = speechHints(context()).split(",");
    expect(hints[0]).toBe("Raheny");
    expect(hints[1]).toBe("Clontarf");
  });

  it("includes the services they actually offer", () => {
    const hints = speechHints(context());
    expect(hints).toContain("Rewiring");
    expect(hints).toContain("Fuse board upgrades");
  });

  it("covers the place names that were actually being mangled", () => {
    const hints = speechHints(context());
    expect(hints).toContain("Donnybrook");
    expect(hints).toContain("Finglas");
  });

  it("never repeats a word, whatever the casing", () => {
    // Raheny is both in this service area and in the generic list. A duplicate
    // wastes one of a limited number of slots and biases nothing further.
    const hints = speechHints(context()).split(",");
    const lowered = hints.map((h) => h.toLowerCase());
    expect(new Set(lowered).size).toBe(lowered.length);
  });

  it("strips commas out of a value rather than letting it split", () => {
    /*
     * Commas separate hints. One inside a service name would silently become
     * two hints that are each wrong — the kind of fault that degrades accuracy
     * without ever looking like a bug.
     */
    const hints = speechHints(
      context({ serviceArea: ["Dublin 3, Northside"] }),
    ).split(",");

    expect(hints[0]).toBe("Dublin 3 Northside");
  });

  it("stays under Twilio's limit", () => {
    const many = Array.from({ length: 400 }, (_, i) => `Area${i}`);
    const hints = speechHints(context({ serviceArea: many })).split(",");

    expect(hints.length).toBeLessThanOrEqual(200);
    // And the business's own words are what survived.
    expect(hints[0]).toBe("Area0");
  });

  it("drops empty and whitespace-only entries", () => {
    const hints = speechHints(context({ serviceArea: ["", "   ", "Howth"] }));
    expect(hints.startsWith("Howth")).toBe(true);
  });
});

describe("gatherAttributes", () => {
  it("uses the telephone model, which is what these calls are", () => {
    /*
     * Every FlowPilot call is 8kHz phone audio. The default model expects clean
     * wideband and degrades badly on a mobile in a van, which is precisely the
     * condition it has to work in.
     */
    const attributes = gatherAttributes(context());
    expect(attributes).toContain('speechModel="phone_call"');
    expect(attributes).toContain('enhanced="true"');
    expect(attributes).toContain('language="en-IE"');
  });

  it("escapes a business name that would break the TwiML", () => {
    /*
     * O'Brien Plumbing inside an unescaped XML attribute produces malformed
     * TwiML, and Twilio drops the whole call rather than transcribing it badly.
     * Worse than the problem being fixed.
     */
    const attributes = gatherAttributes(
      context({ businessName: "O'Brien & Sons \"Plumbing\"" }),
    );

    expect(attributes).toContain("&apos;");
    expect(attributes).toContain("&amp;");
    expect(attributes).not.toMatch(/hints="[^"]*"[^ ]/);
  });
});

describe("Irish address coverage", () => {
  /*
   * A real call recorded "Tyler C11 42" when the caller said a Dublin 15
   * address. The business had no service area set, so the only thing the
   * recogniser had was this fallback list — and the entire D15 belt, some of
   * the most densely populated addresses in the country, was missing from it.
   */
  const anyBusiness = {
    businessName: "K.S Electrics",
    serviceArea: [],
    services: [],
  } as never;

  it("expects the Dublin 15 addresses a caller actually gives", () => {
    const hints = speechHints(anyBusiness).toLowerCase();
    for (const place of ["tyrrelstown", "ongar", "clonsilla", "mulhuddart"]) {
      expect(hints, `${place} missing from hints`).toContain(place);
    }
  });

  it("expects every Dublin postal district, spoken the way people say it", () => {
    // "Dublin 11", not "D11" — only one of those is speech.
    const hints = speechHints(anyBusiness);
    for (const n of [1, 6, 11, 15, 24]) {
      expect(hints).toContain(`Dublin ${n}`);
    }
    expect(hints).toContain("Dublin 6W");
  });

  it("still puts the business's own patch ahead of the generic list", () => {
    /*
     * The cap truncates, so anything added to the fallback must not be able to
     * push a business's own areas out. Their words are the ones that work.
     */
    const withArea = {
      businessName: "K.S Electrics",
      serviceArea: ["Tyrrelstown", "Blanchardstown"],
      services: [],
    } as never;

    const words = speechHints(withArea).split(",");
    expect(words[0]).toBe("Tyrrelstown");
    expect(words[1]).toBe("Blanchardstown");
  });
});
