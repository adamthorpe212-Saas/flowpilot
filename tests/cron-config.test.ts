import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every scheduled job in vercel.json has to exist as a route.
 *
 * Nothing else checks this. A cron pointing at a deleted route fails silently
 * every night in production — Vercel calls it, gets a 404, and no test, build or
 * typecheck ever notices. It was caught by hand after the trial reminder route
 * was removed and its schedule was left behind, which is exactly the way this
 * class of mistake survives.
 */
describe("scheduled jobs", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const crons: { path: string; schedule: string }[] = config.crons ?? [];

  it("schedules at least one job", () => {
    // Guards the parse: an empty list would make every assertion below vacuous.
    expect(crons.length).toBeGreaterThan(0);
  });

  it("points every schedule at a route that exists", () => {
    const missing = crons
      .map((cron) => cron.path)
      .filter((path) => !existsSync(`app${path}/route.ts`));

    expect(missing, "scheduled but no route file").toEqual([]);
  });

  it("gives every job a schedule", () => {
    for (const cron of crons) {
      expect(cron.schedule, `${cron.path} has no schedule`).toBeTruthy();
    }
  });
});
