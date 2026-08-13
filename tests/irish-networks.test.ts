import { describe, expect, it } from "vitest";
import { networkFromCarrier, networkReassurance } from "@/lib/irish-networks";

describe("networkFromCarrier", () => {
  it("maps Meteor to Eir", () => {
    /*
     * The case that prompted this. Lookup returns "Meteor" — Eir's old network
     * name — for both Eir and gomo numbers, and a gomo customer told nothing
     * about Eir would assume we had got their network wrong.
     */
    expect(networkFromCarrier("Meteor")?.id).toBe("eir");
    expect(networkFromCarrier("Eir Mobile")?.id).toBe("eir");
  });

  it("handles the several names each network trades under", () => {
    // These strings are inconsistent and change without notice, which is why
    // matching is on substrings rather than equality.
    expect(networkFromCarrier("Vodafone Ireland plc")?.id).toBe("vodafone");
    expect(networkFromCarrier("Three Ireland")?.id).toBe("three");
    expect(networkFromCarrier("Hutchison 3G Ireland Ltd")?.id).toBe("three");
  });

  it("is not case sensitive", () => {
    expect(networkFromCarrier("VODAFONE IRELAND")?.id).toBe("vodafone");
  });

  it("returns null rather than guessing", () => {
    /*
     * A perfectly good answer. The dial codes are identical on every network,
     * so an unrecognised carrier costs one line of reassurance and nothing
     * else — whereas a wrong guess would send somebody down a blind alley.
     */
    expect(networkFromCarrier("Some New MVNO")).toBeNull();
    expect(networkFromCarrier(null)).toBeNull();
    expect(networkFromCarrier("")).toBeNull();
  });
});

describe("networkReassurance", () => {
  it("names the resellers so a gomo customer isn't told the wrong thing", () => {
    const line = networkReassurance(networkFromCarrier("Meteor"));
    expect(line).toContain("Eir");
    expect(line).toContain("gomo");
  });

  it("still says something useful when the network is unknown", () => {
    // Must never leave a blank or an apology where reassurance should be.
    const line = networkReassurance(null);
    expect(line).toContain("every Irish network");
  });
});
