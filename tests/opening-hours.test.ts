import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

let business: Business | null = null;
let saved: Record<string, unknown> | null = null;

vi.mock("@/lib/auth", () => ({ getCurrentBusiness: async () => business }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        saved = payload;
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

const { saveOpeningHours } = await import("@/app/(app)/settings/hours-actions");

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
  saved = null;
});

describe("saveOpeningHours", () => {
  it("stores always-open as no restriction", async () => {
    /*
     * Empty hours is what isWithinOpeningHours reads as "always answer". It is
     * the default deliberately: the product's whole pitch is answering on
     * holidays and at weekends, so a business opts in to being unavailable.
     */
    const result = await saveOpeningHours({ error: null }, form({ always_open: "on" }));

    expect(result.error).toBeNull();
    expect(saved?.opening_hours).toEqual({});
  });

  it("stores a weekday schedule with weekends closed", async () => {
    const result = await saveOpeningHours(
      { error: null },
      form({
        mon_open: "on", mon_from: "08:00", mon_to: "18:00",
        tue_open: "on", tue_from: "08:00", tue_to: "18:00",
        out_of_hours_behaviour: "answer_and_hold",
      }),
    );

    expect(result.error).toBeNull();
    expect(saved?.opening_hours).toMatchObject({
      mon: { open: "08:00", close: "18:00" },
      tue: { open: "08:00", close: "18:00" },
      wed: null,
      sat: null,
      sun: null,
    });
    expect(saved?.out_of_hours_behaviour).toBe("answer_and_hold");
  });

  it("rejects a day that closes before it opens", async () => {
    const result = await saveOpeningHours(
      { error: null },
      form({ mon_open: "on", mon_from: "18:00", mon_to: "08:00" }),
    );

    expect(result.error).toContain("Monday");
    expect(saved).toBeNull();
  });

  it("rejects a malformed time", async () => {
    const result = await saveOpeningHours(
      { error: null },
      form({ mon_open: "on", mon_from: "8am", mon_to: "18:00" }),
    );

    expect(result.error).toContain("Monday");
    expect(saved).toBeNull();
  });

  it("refuses a schedule that is closed every day", async () => {
    /*
     * Saving no open days would look like a schedule and behave like a
     * permanently dead receptionist — every call declined, with nothing on
     * screen explaining why.
     */
    const result = await saveOpeningHours({ error: null }, form({}));

    expect(result.error).toContain("at least one");
    expect(saved).toBeNull();
  });

  it("falls back to a safe behaviour if an unknown one is submitted", async () => {
    const result = await saveOpeningHours(
      { error: null },
      form({
        mon_open: "on", mon_from: "08:00", mon_to: "18:00",
        out_of_hours_behaviour: "delete_everything",
      }),
    );

    expect(result.error).toBeNull();
    expect(saved?.out_of_hours_behaviour).toBe("answer_and_notify");
  });
});
