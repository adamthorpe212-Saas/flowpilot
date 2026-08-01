import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Business } from "@/types/database";

/**
 * The preview must behave exactly like a live call, because its whole purpose
 * is letting someone trust their configuration before a paying customer rings.
 * A preview that diverged would be worse than none — it would build confidence
 * in behaviour that does not exist.
 */

let business: Business | null = null;
let modelConfigured = true;
let profileRow: Record<string, unknown> | null = null;
const nextReplyCalls: { transcript: { role: string; text: string }[] }[] = [];

vi.mock("@/lib/auth", () => ({ getCurrentBusiness: async () => business }));

vi.mock("@/lib/receptionist", () => ({
  isModelConfigured: () => modelConfigured,
  openingLine: () => "Hello, O'Brien Plumbing. What can I help you with?",
  nextReply: async (
    _context: unknown,
    transcript: { role: string; text: string }[],
  ) => {
    nextReplyCalls.push({ transcript });
    return {
      speech: "That sounds urgent. Whereabouts are you?",
      captured: { job_type: "Burst pipe", urgency: "high" },
      complete: false,
    };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "business_profile" ? profileRow : null,
          }),
          order: async () => ({ data: [] }),
        }),
      }),
    }),
  }),
}));

const { previewReply } = await import("@/app/(app)/settings/preview-actions");
const { EMPTY_PREVIEW } = await import("@/app/(app)/settings/preview-state");

function form(said: string): FormData {
  const data = new FormData();
  data.append("said", said);
  return data;
}

beforeEach(() => {
  business = {
    id: "biz-1",
    name: "O'Brien Plumbing",
    industry_label: null,
    service_area: ["Raheny"],
    timezone: "Europe/Dublin",
    phone_number: null,
    phone_number_sid: null,
    forwarding_verified_at: null,
    plan: "starter",
    subscription_status: "active",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: "active",
    trial_reminder_stage: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  };
  modelConfigured = true;
  profileRow = { business_id: "biz-1", tone: "Friendly." };
  nextReplyCalls.length = 0;
});

describe("previewReply", () => {
  it("opens with the same greeting a real caller hears", async () => {
    const result = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));

    expect(result.turns[0]).toEqual({
      role: "assistant",
      text: "Hello, O'Brien Plumbing. What can I help you with?",
    });
    expect(result.turns[1]).toEqual({ role: "caller", text: "My pipe burst" });
  });

  it("shows what the receptionist understood", async () => {
    const result = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));

    expect(result.captured).toMatchObject({
      job_type: "Burst pipe",
      urgency: "high",
    });
  });

  it("carries the conversation forward across turns", async () => {
    const first = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));
    const second = await previewReply(first, form("Raheny"));

    // The model must see the whole exchange, not just the latest line —
    // otherwise the preview would answer better or worse than a real call.
    const lastCall = nextReplyCalls[nextReplyCalls.length - 1];
    expect(lastCall.transcript.map((turn) => turn.text)).toEqual([
      "Hello, O'Brien Plumbing. What can I help you with?",
      "My pipe burst",
      "That sounds urgent. Whereabouts are you?",
      "Raheny",
    ]);
    expect(second.turns).toHaveLength(5);
  });

  it("does not greet twice", async () => {
    const first = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));
    const second = await previewReply(first, form("Raheny"));

    const greetings = second.turns.filter((turn) =>
      turn.text.startsWith("Hello, O'Brien Plumbing"),
    );
    expect(greetings).toHaveLength(1);
  });

  it("keeps captured details from earlier turns", async () => {
    const first = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));
    const second = await previewReply(
      { ...first, captured: { ...first.captured, location: "Raheny" } },
      form("Anything else?"),
    );

    expect(second.captured.location).toBe("Raheny");
    expect(second.captured.job_type).toBe("Burst pipe");
  });

  it("says so plainly when the model isn't connected", async () => {
    modelConfigured = false;

    const result = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));

    expect(result.error).toContain("isn't connected");
    expect(result.turns).toHaveLength(0);
  });

  it("ignores an empty message without losing the conversation", async () => {
    const first = await previewReply(EMPTY_PREVIEW, form("My pipe burst"));
    const result = await previewReply(first, form("   "));

    expect(result.error).toBeTruthy();
    expect(result.turns).toEqual(first.turns);
  });
});
