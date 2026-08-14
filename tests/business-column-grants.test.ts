import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Which columns of `business` an owner may actually write.
 *
 * Row-level security gates rows, never columns, so 20260731120500 revoked
 * UPDATE on public.business and granted it back one column at a time — the only
 * thing stopping a customer writing `plan` or `subscription_status` and handing
 * themselves a free subscription. That is the right shape, and it has a trap:
 * every column added afterwards is silently read-only to the owner, and the
 * failure surfaces as a server action that just says no.
 *
 * It has now happened once. receptionist_paused_at was added, the switch in
 * Settings was built against it, everything type-checked and every unit test
 * passed, and the toggle failed in production for every customer with
 * "permission denied for column". Nothing in the codebase could have caught it,
 * because the bug lived in the gap between a migration and a server action.
 *
 * This closes the gap from both ends: the columns an authenticated write needs
 * must be granted, and the columns that decide entitlement must not be.
 */

const SQL = readFileSync("supabase/all-migrations.sql", "utf8");

/**
 * The columns `authenticated` may update on business, applied in file order.
 *
 * `revoke update on public.business` clears the set; each `grant update (...)`
 * adds to it. Replaying both in order is what the database does, and the naive
 * version — collecting every grant and ignoring the revokes — would report
 * columns as writable that a later revoke had taken away.
 */
function grantedColumns(): Set<string> {
  const granted = new Set<string>();
  const statement =
    /(revoke\s+update\s+on\s+public\.business\s+from\s+authenticated|grant\s+update\s*\(([^)]*)\)\s*on\s+public\.business\s+to\s+authenticated)/gi;

  for (const match of SQL.matchAll(statement)) {
    if (match[2] === undefined) {
      granted.clear();
      continue;
    }
    for (const column of match[2].split(",")) {
      const name = column.trim();
      if (name) granted.add(name);
    }
  }

  return granted;
}

describe("business column grants", () => {
  it("lets the owner pause and unpause their receptionist", () => {
    // app/(app)/settings/pause-actions.ts writes this with the user's own
    // session, so a missing grant is a switch that cannot be switched.
    expect(grantedColumns()).toContain("receptionist_paused_at");
  });

  it("lets the owner edit the details they entered themselves", () => {
    // app/(app)/onboarding/actions.ts and the settings forms.
    const granted = grantedColumns();
    for (const column of ["name", "industry_label", "service_area", "timezone"]) {
      expect(granted).toContain(column);
    }
  });

  it("never lets a customer write what they are entitled to", () => {
    /*
     * The reason the revoke exists. `plan` and `subscription_status` come from
     * Stripe webhooks and `status` is our suspension decision — all written by
     * the service role, which bypasses this entirely. A grant added here by
     * accident is a free subscription for anyone who can open devtools.
     */
    const granted = grantedColumns();
    for (const column of [
      "plan",
      "status",
      "subscription_status",
      "stripe_customer_id",
      "stripe_subscription_id",
      "phone_number",
      "phone_number_sid",
      "forwarding_verified_at",
      "trial_ends_at",
    ]) {
      expect(granted).not.toContain(column);
    }
  });
});
