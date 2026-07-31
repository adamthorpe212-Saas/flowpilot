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

const { saveVoiceSettings } = await import("@/app/(app)/settings/voice-actions");

const VALID = {
  tone: "Friendly and brief.",
  closing_line: "Thanks — someone will be in touch.",
  fallback: "I'll take your details and have someone come back to you.",
  confirmation_sms_template: "{{business_name}}: {{job_type}}, {{location}}.",
};

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...VALID, ...values })) {
    data.append(key, value);
  }
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

describe("saveVoiceSettings", () => {
  it("saves what makes one business sound different from another", async () => {
    const result = await saveVoiceSettings(
      { error: null },
      form({
        greeting: "O'Brien Plumbing, Dave speaking.",
        tone: "Blunt and quick. No small talk.",
        must_not: "Never quote a price.\nNever say we do gas work.",
      }),
    );

    expect(result.error).toBeNull();
    expect(saved).toMatchObject({
      greeting: "O'Brien Plumbing, Dave speaking.",
      tone: "Blunt and quick. No small talk.",
      must_not: ["Never quote a price.", "Never say we do gas work."],
    });
  });

  it("stores an empty greeting as null, meaning use the default", async () => {
    await saveVoiceSettings({ error: null }, form({ greeting: "   " }));
    expect(saved?.greeting).toBeNull();
  });

  it("drops blank lines from the must-never list", async () => {
    await saveVoiceSettings(
      { error: null },
      form({ must_not: "Never quote a price.\n\n\n  \nNever promise a time." }),
    );

    expect(saved?.must_not).toEqual([
      "Never quote a price.",
      "Never promise a time.",
    ]);
  });

  it("allows clearing the must-never list entirely", async () => {
    // Their business, their call — the defaults are a starting point, not a
    // rule we impose.
    await saveVoiceSettings({ error: null }, form({ must_not: "" }));
    expect(saved?.must_not).toEqual([]);
  });

  it("rejects a link in the confirmation text, in plain language", async () => {
    /*
     * The database rejects this too, but a constraint violation surfaces as a
     * database error string. This is a person editing a form, and the reason
     * matters: outbound SMS shares one registered sender across every customer,
     * so one link risks the registration for everyone.
     */
    const result = await saveVoiceSettings(
      { error: null },
      form({ confirmation_sms_template: "Book here: https://example.ie" }),
    );

    expect(result.error).toContain("Links aren't allowed");
    expect(result.error).toContain("scams");
    expect(saved).toBeNull();
  });

  it("rejects an over-long confirmation text", async () => {
    const result = await saveVoiceSettings(
      { error: null },
      form({ confirmation_sms_template: "x".repeat(400) }),
    );

    expect(result.error).toContain("too long");
    expect(saved).toBeNull();
  });

  it("will not let the receptionist be left with nothing to say", async () => {
    // Empty required fields would produce a receptionist that answers and then
    // says nothing at all.
    expect((await saveVoiceSettings({ error: null }, form({ tone: "" }))).error).toBeTruthy();
    expect(
      (await saveVoiceSettings({ error: null }, form({ closing_line: "" }))).error,
    ).toBeTruthy();
    expect(
      (await saveVoiceSettings({ error: null }, form({ fallback: "" }))).error,
    ).toBeTruthy();
    expect(saved).toBeNull();
  });
});
