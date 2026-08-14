import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

/**
 * Erasing a caller.
 *
 * A business tells a member of the public their details are gone. These tests
 * exist because a half-done erasure is worse than none: the business passes on
 * an assurance it cannot keep, and only finds out it was wrong if somebody
 * complains.
 */

type Row = Record<string, unknown>;

let business: Business | null = null;
let leads: Row[] = [];
let calls: Row[] = [];
let redirected: string | null = null;

function makeBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: ["Raheny"],
    timezone: "Europe/Dublin",
    phone_number: "+35319128718",
    phone_number_sid: "PN1",
    forwarding_verified_at: null,
    plan: "starter",
    subscription_status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    receptionist_paused_at: null,
    trial_reminder_stage: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

vi.mock("@/lib/auth", () => ({
  getCurrentBusiness: async () => business,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    redirected = to;
  },
}));

/**
 * A table-aware fake that honours the .eq() filters, because the whole point of
 * the action is that it scopes writes by business_id — a mock that ignored the
 * filters would pass no matter how badly that was broken.
 */
function table(rows: Row[]) {
  const filters: [string, unknown][] = [];

  const api = {
    select: () => api,
    eq(column: string, value: unknown) {
      filters.push([column, value]);
      return api;
    },
    matches(row: Row) {
      return filters.every(([column, value]) => row[column] === value);
    },
    async maybeSingle() {
      return { data: rows.find((row) => api.matches(row)) ?? null };
    },
    delete() {
      return {
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return this;
        },
        then(resolve: (value: unknown) => void) {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (api.matches(rows[i])) rows.splice(i, 1);
          }
          resolve({ error: null });
        },
      };
    },
    update(patch: Row) {
      return {
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return this;
        },
        then(resolve: (value: unknown) => void) {
          for (const row of rows) {
            if (api.matches(row)) Object.assign(row, patch);
          }
          resolve({ error: null });
        },
      };
    },
  };

  return api;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (name: string) => table(name === "lead" ? leads : calls),
  }),
}));

const { deleteLead } = await import("@/app/(app)/dashboard/actions");

function form(leadId: string): FormData {
  const data = new FormData();
  data.set("lead_id", leadId);
  return data;
}

beforeEach(() => {
  business = makeBusiness();
  redirected = null;

  leads = [
    {
      id: "lead-1",
      business_id: "biz-1",
      call_id: "call-1",
      caller_number: "+353871234567",
      caller_name: "John Murphy",
      location: "14 Griffith Avenue, Glasnevin",
    },
  ];

  calls = [
    {
      id: "call-1",
      business_id: "biz-1",
      from_number: "+353871234567",
      status: "completed",
      started_at: "2026-08-06T09:00:00Z",
      transcript: [
        { role: "assistant", text: "What's the problem?" },
        { role: "caller", text: "I'm John Murphy, 14 Griffith Avenue" },
      ],
    },
  ];
});

describe("deleteLead", () => {
  it("removes the lead", async () => {
    await deleteLead(form("lead-1"));

    expect(leads).toHaveLength(0);
    expect(redirected).toBe("/dashboard");
  });

  it("erases the transcript too, not just the lead", async () => {
    /*
     * The caller's name and address are in the transcript as well as the lead.
     * Deleting only the lead would leave the business telling someone their
     * details were removed while a full record of the conversation remained.
     */
    await deleteLead(form("lead-1"));

    expect(calls[0].transcript).toEqual([]);
    expect(JSON.stringify(calls[0])).not.toContain("John Murphy");
    expect(JSON.stringify(calls[0])).not.toContain("Griffith Avenue");
    expect(calls[0].from_number).not.toBe("+353871234567");
  });

  it("keeps the call so billed usage does not quietly drop", async () => {
    // Usage is counted from call rows. Deleting them would reduce a customer's
    // billed usage every time somebody exercised a right.
    await deleteLead(form("lead-1"));

    expect(calls).toHaveLength(1);
    expect(calls[0].status).toBe("completed");
    expect(calls[0].started_at).toBe("2026-08-06T09:00:00Z");
  });

  it("will not touch another business's lead", async () => {
    business = makeBusiness({ id: "biz-2" });

    await deleteLead(form("lead-1"));

    expect(leads).toHaveLength(1);
    expect(calls[0].transcript).toHaveLength(2);
  });

  it("does nothing without a signed-in business", async () => {
    business = null;

    await deleteLead(form("lead-1"));

    expect(leads).toHaveLength(1);
  });

  it("ignores a missing lead id", async () => {
    await deleteLead(new FormData());

    expect(leads).toHaveLength(1);
  });

  it("copes with a lead that has no call attached", async () => {
    leads[0].call_id = null;

    await deleteLead(form("lead-1"));

    expect(leads).toHaveLength(0);
    // The unrelated call is left alone.
    expect(calls[0].transcript).toHaveLength(2);
  });
});
