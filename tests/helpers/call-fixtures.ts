import { NextRequest } from "next/server";
import type { Tables } from "./fake-supabase";

export const FLOWPILOT_NUMBER = "+353870000001";
export const CALLER_NUMBER = "+353871234567";
export const OWNER_MOBILE = "+353879999999";
export const BUSINESS_ID = "biz-1";

/** A fully set-up, live business with one service and two questions. */
export function seedTables(overrides: { business?: Record<string, unknown> } = {}): Tables {
  return {
    business: [
      {
        id: BUSINESS_ID,
        name: "O'Brien Plumbing",
        industry_label: "Plumbing",
        service_area: ["Raheny", "Clontarf"],
        timezone: "Europe/Dublin",
        phone_number: FLOWPILOT_NUMBER,
        phone_number_sid: "PN1",
        forwarding_verified_at: "2026-07-01T00:00:00Z",
        plan: "starter",
        subscription_status: "active",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: "active",
        trial_reminder_stage: null,
        created_at: "2026-07-01T00:00:00Z",
        updated_at: "2026-07-01T00:00:00Z",
        ...overrides.business,
      },
    ],
    business_profile: [
      {
        business_id: BUSINESS_ID,
        greeting: null,
        tone: "Friendly and brief.",
        must_not: ["Never quote a price."],
        fallback: "I'll take your details and have someone come back to you.",
        closing_line: "Thanks — someone will be in touch shortly.",
        confirmation_sms_template:
          "{{business_name}}: {{job_type}}, {{location}}. We'll be in touch.",
        max_call_seconds: 180,
        // Empty means always open, which keeps these tests about the call flow
        // rather than the clock.
        opening_hours: {},
        out_of_hours_behaviour: "answer_and_notify",
        updated_at: "2026-07-01T00:00:00Z",
      },
    ],
    service: [
      {
        id: "svc-1",
        business_id: BUSINESS_ID,
        name: "Burst pipe",
        emergency_eligible: true,
        typical_urgency: "high",
        sort_order: 0,
        created_at: "2026-07-01T00:00:00Z",
      },
    ],
    qualification_question: [
      {
        id: "q-1",
        business_id: BUSINESS_ID,
        prompt: "What's the job?",
        captures: "job_type",
        required: true,
        sort_order: 1,
        created_at: "2026-07-01T00:00:00Z",
      },
      {
        id: "q-2",
        business_id: BUSINESS_ID,
        prompt: "Whereabouts are you?",
        captures: "location",
        required: true,
        sort_order: 2,
        created_at: "2026-07-01T00:00:00Z",
      },
    ],
    notification_rule: [
      {
        id: "rule-1",
        business_id: BUSINESS_ID,
        channel: "sms",
        destination: OWNER_MOBILE,
        on_new_lead: true,
        on_urgent_lead: true,
        outside_hours: true,
        created_at: "2026-07-01T00:00:00Z",
      },
    ],
    call: [],
    lead: [],
  };
}

/** Builds a signed-looking Twilio POST. Signature checking itself is mocked. */
export function twilioRequest(
  path: string,
  params: Record<string, string>,
): NextRequest {
  const body = new URLSearchParams(params).toString();

  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": "test-signature",
    },
    body,
  });
}

export async function twimlOf(response: Response): Promise<string> {
  return response.text();
}
