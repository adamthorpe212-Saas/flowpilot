import { describe, expect, it } from "vitest";
import { addTags } from "@/lib/tags";

/**
 * The areas a business covers decide which jobs get flagged as outside its
 * patch, and it is the one field on the business page with real behaviour. It
 * sits behind a login and cannot be driven in a browser during development, so
 * without this the rule is unchecked.
 */

describe("addTags", () => {
  it("adds a single entry", () => {
    expect(addTags([], "Raheny")).toEqual(["Raheny"]);
  });

  it("splits a pasted list", () => {
    // Pasting a list must behave exactly like typing them one at a time.
    expect(addTags([], "Raheny, Clontarf, Dublin 5")).toEqual([
      "Raheny",
      "Clontarf",
      "Dublin 5",
    ]);
  });

  it("trims each entry", () => {
    expect(addTags([], "  Raheny  ,   Clontarf ")).toEqual(["Raheny", "Clontarf"]);
  });

  it("ignores empty entries and stray commas", () => {
    expect(addTags([], ", ,Raheny,,")).toEqual(["Raheny"]);
    expect(addTags(["Raheny"], "   ")).toEqual(["Raheny"]);
  });

  it("does not add something already there, whatever the casing", () => {
    expect(addTags(["Raheny"], "raheny")).toEqual(["Raheny"]);
    expect(addTags(["Raheny"], "RAHENY")).toEqual(["Raheny"]);
  });

  it("does not repeat itself within one paste", () => {
    // "Dublin" and "dublin" as two chips looks like a bug to the person who
    // pasted the list, because to them it is one place.
    expect(addTags([], "Dublin, dublin, DUBLIN")).toEqual(["Dublin"]);
  });

  it("keeps the spelling already on screen", () => {
    // Someone who typed "Raheny" then pastes "raheny" meant to add nothing, not
    // to restyle what they had.
    expect(addTags(["Raheny"], "raheny, Clontarf")).toEqual(["Raheny", "Clontarf"]);
  });

  it("leaves the existing list alone", () => {
    const existing = ["Raheny"];
    addTags(existing, "Clontarf");
    expect(existing).toEqual(["Raheny"]);
  });

  it("is stable when re-applied to its own output", () => {
    /*
     * The hidden field is computed as addTags(tags, draft) on every render, so
     * this runs constantly against values it has already produced. If it were
     * not idempotent the submitted value would drift as somebody typed.
     */
    const once = addTags(["Raheny"], "Clontarf");
    expect(addTags(once, "Clontarf")).toEqual(once);
  });
});
