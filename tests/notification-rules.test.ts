import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

let business: Business | null = null;
let rules: Record<string, unknown>[] = [];
let insertError: { message: string } | null = null;
const inserted: Record<string, unknown>[] = [];
const deleted: string[] = [];

vi.mock("@/lib/auth", () => ({ getCurrentBusiness: async () => business }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const filters: Record<string, unknown> = {};

      const builder: Record<string, unknown> = {
        select: (_columns?: string, options?: { head?: boolean }) => {
          builder._head = options?.head;
          return builder;
        },
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return builder;
        },
        maybeSingle: async () => ({
          data:
            rules.find(
              (rule) =>
                rule.channel === filters.channel &&
                rule.destination === filters.destination,
            ) ?? null,
          error: null,
        }),
        insert: async (payload: Record<string, unknown>) => {
          if (insertError) return { error: insertError };
          inserted.push(payload);
          return { error: null };
        },
        delete: () => {
          builder._deleting = true;
          return builder;
        },
        then: (resolve: (value: unknown) => unknown) => {
          if (builder._deleting) {
            deleted.push(String(filters.id));
            return Promise.resolve({ error: null }).then(resolve);
          }
          return Promise.resolve({ count: rules.length, error: null }).then(resolve);
        },
      };

      return builder;
    },
  }),
}));

const { addNotificationRule, removeNotificationRule } = await import(
  "@/app/(app)/settings/notification-actions"
);

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

beforeEach(() => {
  business = {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: [],
    timezone: "Europe/Dublin",
    phone_number: null,
    phone_number_sid: null,
    forwarding_verified_at: null,
    plan: "starter",
    subscription_status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  };
  rules = [];
  insertError = null;
  inserted.length = 0;
  deleted.length = 0;
});

describe("addNotificationRule", () => {
  it("adds an email destination", async () => {
    const result = await addNotificationRule(
      { error: null },
      form({ channel: "email", destination: "dave@obrienplumbing.ie" }),
    );

    expect(result.error).toBeNull();
    expect(inserted[0]).toMatchObject({
      channel: "email",
      destination: "dave@obrienplumbing.ie",
    });
  });

  it("normalises a mobile number before storing it", async () => {
    // Stored in one shape, so comparisons elsewhere actually match.
    await addNotificationRule(
      { error: null },
      form({ channel: "sms", destination: "087 123 4567" }),
    );

    expect(inserted[0].destination).toBe("+353871234567");
  });

  it("rejects a malformed email", async () => {
    const result = await addNotificationRule(
      { error: null },
      form({ channel: "email", destination: "dave@" }),
    );

    expect(result.error).toContain("email address");
    expect(inserted).toHaveLength(0);
  });

  it("rejects a malformed mobile", async () => {
    const result = await addNotificationRule(
      { error: null },
      form({ channel: "sms", destination: "hello" }),
    );

    expect(result.error).toContain("Irish mobile");
    expect(inserted).toHaveLength(0);
  });

  it("refuses a duplicate rather than doubling every alert", async () => {
    rules = [{ id: "r1", channel: "email", destination: "dave@obrienplumbing.ie" }];

    const result = await addNotificationRule(
      { error: null },
      form({ channel: "email", destination: "dave@obrienplumbing.ie" }),
    );

    expect(result.error).toContain("already");
    expect(inserted).toHaveLength(0);
  });

  it("translates the database cap into something a customer understands", async () => {
    // The trigger message is about rows and limits; a customer needs to know
    // what to do instead.
    insertError = { message: "A business can have at most 5 notification rules" };

    const result = await addNotificationRule(
      { error: null },
      form({ channel: "email", destination: "new@obrienplumbing.ie" }),
    );

    expect(result.error).toContain("Remove one first");
    expect(result.error).not.toContain("notification rules");
  });
});

describe("removeNotificationRule", () => {
  it("removes a destination when others remain", async () => {
    rules = [
      { id: "r1", channel: "email", destination: "a@example.ie" },
      { id: "r2", channel: "sms", destination: "+353871234567" },
    ];

    await removeNotificationRule(form({ rule_id: "r1" }));

    expect(deleted).toEqual(["r1"]);
  });

  it("refuses to remove the last one", async () => {
    /*
     * A business with no rules has a receptionist that answers perfectly and
     * tells nobody. Nothing in the product announces that, so it would be
     * discovered as a quiet week.
     */
    rules = [{ id: "r1", channel: "email", destination: "a@example.ie" }];

    await removeNotificationRule(form({ rule_id: "r1" }));

    expect(deleted).toEqual([]);
  });
});
