import { describe, expect, it } from "vitest";
import { TRADES, tradeFor, withSuggestions } from "@/lib/trades";

/**
 * Suggesting the wrong trade's job list is worse than suggesting nothing: a
 * wrong list has to be read and dismissed, an empty one is simply typed into.
 * So the matching is tested for what it refuses as much as what it accepts.
 */

describe("tradeFor", () => {
  it("matches what a tradesperson would actually type", () => {
    expect(tradeFor("Plumbing")?.id).toBe("plumbing");
    expect(tradeFor("plumber")?.id).toBe("plumbing");
    expect(tradeFor("Electrician")?.id).toBe("electrical");
    expect(tradeFor("Roofer")?.id).toBe("roofing");
  });

  it("ignores casing and stray punctuation", () => {
    expect(tradeFor("  ELECTRICAL. ")?.id).toBe("electrical");
    expect(tradeFor("Painter & Decorator")?.id).toBe("painting");
  });

  it("finds the trade inside a longer description", () => {
    expect(tradeFor("general builder, Dublin")?.id).toBe("building");
    expect(tradeFor("emergency locksmith")?.id).toBe("locksmith");
  });

  it("returns null rather than guessing", () => {
    expect(tradeFor(null)).toBeNull();
    expect(tradeFor("")).toBeNull();
    expect(tradeFor("   ")).toBeNull();
    expect(tradeFor("mobile dog grooming")).toBeNull();
  });

  it("does not match a word that merely contains an alias", () => {
    // "gas" inside "gasket" must not make somebody a heating engineer.
    expect(tradeFor("gasket manufacturing")).toBeNull();
  });
});

describe("withSuggestions", () => {
  const empty = { services: [], emergency: [] };

  it("ticks the emergency box for jobs worth waking someone for", () => {
    /*
     * The reason the catalogue is curated at all. A tradesperson setting up at
     * nine at night is not going to reason about which of eight services counts
     * as an emergency, and getting it wrong means a burst pipe is handled like
     * a dripping tap.
     */
    const next = withSuggestions(empty, [
      { name: "Burst pipes", emergency: true },
      { name: "Radiators", emergency: false },
    ]);

    expect(next.services).toEqual(["Burst pipes", "Radiators"]);
    expect(next.emergency).toEqual(["Burst pipes"]);
  });

  it("gives the same result one at a time as all at once", () => {
    // Otherwise which button you pressed would change your configuration.
    const all = withSuggestions(empty, [
      { name: "Leaks", emergency: true },
      { name: "Taps", emergency: false },
    ]);

    const oneByOne = withSuggestions(
      withSuggestions(empty, [{ name: "Leaks", emergency: true }]),
      [{ name: "Taps", emergency: false }],
    );

    expect(oneByOne).toEqual(all);
  });

  it("does not add a service the customer already typed", () => {
    const current = { services: ["burst pipes"], emergency: [] };
    const next = withSuggestions(current, [
      { name: "Burst pipes", emergency: true },
    ]);

    // Their own casing survives, and they do not get it twice.
    expect(next.services).toEqual(["burst pipes"]);
    expect(next.emergency).toEqual([]);
  });

  it("leaves existing choices alone", () => {
    const current = { services: ["Gutters"], emergency: ["Gutters"] };
    const next = withSuggestions(current, [
      { name: "Roof leak", emergency: true },
    ]);

    expect(next.services).toEqual(["Gutters", "Roof leak"]);
    expect(next.emergency).toEqual(["Gutters", "Roof leak"]);
  });

  it("does not mutate what it was given", () => {
    const current = { services: ["Leaks"], emergency: [] };
    withSuggestions(current, [{ name: "Boiler repair", emergency: true }]);

    // React state must not be edited in place, or the re-render is skipped.
    expect(current).toEqual({ services: ["Leaks"], emergency: [] });
  });
});

describe("the trade catalogue", () => {
  it("has unique ids", () => {
    const ids = TRADES.map((trade) => trade.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every trade something to suggest", () => {
    for (const trade of TRADES) {
      expect(trade.services.length, `${trade.id} has no services`).toBeGreaterThan(2);
      expect(trade.aliases.length, `${trade.id} has no aliases`).toBeGreaterThan(0);
    }
  });

  it("never lists the same service twice within a trade", () => {
    for (const trade of TRADES) {
      const names = trade.services.map((service) => service.name.toLowerCase());
      expect(new Set(names).size, `${trade.id} repeats a service`).toBe(names.length);
    }
  });

  it("resolves every alias back to its own trade", () => {
    /*
     * Two trades claiming the same word would make the suggestion depend on
     * catalogue order, which is invisible and would be found by a customer
     * rather than by us.
     */
    for (const trade of TRADES) {
      for (const alias of trade.aliases) {
        expect(tradeFor(alias)?.id, `"${alias}" does not resolve to ${trade.id}`).toBe(
          trade.id,
        );
      }
    }
  });
});
