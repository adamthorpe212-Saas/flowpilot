import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_QUESTIONS } from "@/lib/demo";

/**
 * What the receptionist asks a caller, by default, on day one.
 *
 * These live in a database function rather than in code, which makes them the
 * easiest thing in the product to change by accident and the hardest to notice
 * afterwards — nothing type-checks a SQL string, and the effect only shows up on
 * a live call weeks later.
 *
 * The shape being guarded is the positioning: FlowPilot is for planned work.
 * Someone ringing a sparks about a rewire is not having an emergency, they want
 * a date. So the date is required and asked while the caller is still describing
 * the job, and urgency is optional and last.
 */

const migration = readFileSync(
  "supabase/migrations/20260809120000_ask_when_not_whether_urgent.sql",
  "utf8",
);

/** `(new.id, 'prompt', 'captures', required, sort_order)` */
function seededQuestions() {
  const rows = [
    ...migration.matchAll(
      /\(new\.id,\s*'([^']+)',\s*'(\w+)',\s*(true|false),\s*(\d+)\)/g,
    ),
  ];

  return rows.map((row) => ({
    prompt: row[1],
    captures: row[2],
    required: row[3] === "true",
    sortOrder: Number(row[4]),
  }));
}

describe("the questions a new business starts with", () => {
  it("asks all five", () => {
    // Guards the regex above as much as the migration: a parse that silently
    // matched nothing would make every assertion below vacuously true.
    expect(seededQuestions()).toHaveLength(5);
  });

  it("requires knowing when they want it done", () => {
    /*
     * This was optional, and it is the field a planned job turns on. A
     * receptionist allowed to skip it hands over a lead that cannot be answered
     * without ringing back to ask the one question that mattered.
     */
    const timing = seededQuestions().find(
      (question) => question.captures === "preferred_time",
    );

    expect(timing?.required).toBe(true);
  });

  it("asks about timing before it asks about urgency", () => {
    const questions = seededQuestions();
    const timing = questions.find((q) => q.captures === "preferred_time");
    const urgency = questions.find((q) => q.captures === "urgency");

    expect(timing!.sortOrder).toBeLessThan(urgency!.sortOrder);
  });

  it("does not make a caller classify their own job as an emergency", () => {
    /*
     * "Is this an emergency, or can it wait?" was required of everybody. It is a
     * question that only makes sense to a business selling emergency call-outs,
     * and it framed every call around a crisis the caller usually isn't having.
     */
    const urgency = seededQuestions().find((q) => q.captures === "urgency");

    expect(urgency?.required).toBe(false);
  });

  it("keeps the live demo asking what a real business asks", () => {
    /*
     * The demo on /how-it-works is the receptionist people judge us by. When it
     * asks different questions from the ones a customer's own receptionist will
     * ask, the demo is quietly selling a different product.
     */
    const seeded = seededQuestions().map((q) => ({
      captures: q.captures,
      required: q.required,
    }));

    const demo = [...DEMO_QUESTIONS]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({ captures: q.captures, required: q.required }));

    expect(demo).toEqual(seeded);
  });
});
