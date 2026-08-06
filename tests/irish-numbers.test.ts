import { describe, expect, it } from "vitest";
import {
  areaCodeForServiceArea,
  searchPatternForAreaCode,
} from "@/lib/irish-numbers";

/**
 * The area code decides what a business's customers see when the phone rings.
 * Getting it wrong is not a cosmetic bug — an unfamiliar area code on a "local"
 * tradesperson reads as a call centre.
 */

describe("areaCodeForServiceArea", () => {
  it("maps Dublin suburbs to 01", () => {
    expect(areaCodeForServiceArea(["Raheny"])).toBe("01");
    expect(areaCodeForServiceArea(["Clontarf"])).toBe("01");
    expect(areaCodeForServiceArea(["Tallaght"])).toBe("01");
  });

  it("maps Dublin postal districts to 01", () => {
    expect(areaCodeForServiceArea(["Dublin 3"])).toBe("01");
    expect(areaCodeForServiceArea(["Dublin 15"])).toBe("01");
    expect(areaCodeForServiceArea(["D24"])).toBe("01");
  });

  it("handles the ways people actually write a county", () => {
    expect(areaCodeForServiceArea(["Co. Cork"])).toBe("021");
    expect(areaCodeForServiceArea(["County Galway"])).toBe("091");
    expect(areaCodeForServiceArea(["Cork City"])).toBe("021");
  });

  it("ignores accents and casing", () => {
    // "Dún Laoghaire" and "Dun Laoghaire" are both typed constantly.
    expect(areaCodeForServiceArea(["Dún Laoghaire"])).toBe("01");
    expect(areaCodeForServiceArea(["DUN LAOGHAIRE"])).toBe("01");
  });

  it("takes the first place the business listed", () => {
    // The first entry is the one they think of as home.
    expect(areaCodeForServiceArea(["Galway", "Dublin"])).toBe("091");
    expect(areaCodeForServiceArea(["Dublin", "Galway"])).toBe("01");
  });

  it("skips entries it does not recognise rather than giving up", () => {
    expect(areaCodeForServiceArea(["anywhere really", "Limerick"])).toBe("061");
  });

  it("returns null when nothing is recognisable", () => {
    expect(areaCodeForServiceArea(["all over the country"])).toBeNull();
    expect(areaCodeForServiceArea([])).toBeNull();
    expect(areaCodeForServiceArea([""])).toBeNull();
  });

  it("does not confuse Newcastle West with anywhere else", () => {
    expect(areaCodeForServiceArea(["Newcastle West"])).toBe("069");
  });
});

describe("searchPatternForAreaCode", () => {
  it("drops the trunk zero", () => {
    // +35301... is not a number that exists. Getting this wrong returns an
    // empty inventory rather than an error, which looks like permanent
    // unavailability.
    expect(searchPatternForAreaCode("01")).toBe("+3531*");
    expect(searchPatternForAreaCode("021")).toBe("+35321*");
    expect(searchPatternForAreaCode("091")).toBe("+35391*");
  });
});
