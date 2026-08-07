import { describe, expect, it } from "vitest";
import { MINIMUM_RETENTION_DAYS, retentionPolicy } from "@/lib/retention";

/**
 * The purge deletes customer data irreversibly. Everything here is about it
 * refusing to run when it is not certain what it was told to do.
 */

const NOW = new Date("2026-08-06T00:00:00Z");

describe("retentionPolicy", () => {
  it("is off when nothing is configured", () => {
    /*
     * The default has to be "delete nothing". A plausible-looking default would
     * mean the first anyone heard of the policy was a customer noticing their
     * job history had evaporated.
     */
    for (const raw of [undefined, "", "   "]) {
      const policy = retentionPolicy(NOW, raw);
      expect(policy.enabled).toBe(false);
    }
  });

  it("says why it is off, rather than failing silently", () => {
    const policy = retentionPolicy(NOW, undefined);

    expect(policy.enabled).toBe(false);
    if (!policy.enabled) {
      expect(policy.reason).toContain("RETENTION_DAYS");
      expect(policy.reason).toContain("nothing is deleted");
    }
  });

  it("refuses anything that is not a plain whole number of days", () => {
    /*
     * "0x1E" and "1e3" are the interesting ones: Number() reads them as 30 and
     * 1000, so a setting meant to be obvious could silently mean something
     * else. This is the one config value whose misreading destroys data.
     */
    for (const raw of ["nonsense", "0", "-30", "90.5", "1e3", "0x1E", "90d"]) {
      const policy = retentionPolicy(NOW, raw);
      expect(policy.enabled, `expected "${raw}" to be rejected`).toBe(false);
    }
  });

  it("tolerates stray whitespace, which env vars collect", () => {
    const policy = retentionPolicy(NOW, " 90 ");

    expect(policy.enabled).toBe(true);
    if (policy.enabled) expect(policy.days).toBe(90);
  });

  it("refuses an implausibly short period", () => {
    // Someone meaning 365 and typing 3 should get an error, not an empty
    // dashboard. This is the typo that cannot be undone.
    const policy = retentionPolicy(NOW, "3");

    expect(policy.enabled).toBe(false);
    if (!policy.enabled) expect(policy.reason).toContain("minimum");
  });

  it("accepts the minimum exactly", () => {
    const policy = retentionPolicy(NOW, String(MINIMUM_RETENTION_DAYS));
    expect(policy.enabled).toBe(true);
  });

  it("works out the cutoff from the period", () => {
    const policy = retentionPolicy(NOW, "90");

    expect(policy.enabled).toBe(true);
    if (policy.enabled) {
      expect(policy.days).toBe(90);
      // 90 days before 6 August 2026.
      expect(policy.cutoff.toISOString()).toBe("2026-05-08T00:00:00.000Z");
    }
  });

  it("puts the cutoff in the past, never the future", () => {
    const policy = retentionPolicy(NOW, "365");

    expect(policy.enabled).toBe(true);
    if (policy.enabled) expect(policy.cutoff.getTime()).toBeLessThan(NOW.getTime());
  });
});
