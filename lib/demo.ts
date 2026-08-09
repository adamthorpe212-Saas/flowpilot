import "server-only";

import { createHash } from "node:crypto";
import { DEMO_BUSINESS_NAME, DEMO_GREETING } from "@/lib/demo-example";
import type { ReceptionistContext } from "@/lib/receptionist";
import { createAdminClient } from "@/lib/supabase/server";
import type { QualificationQuestion } from "@/types/database";

/**
 * The fictional business the public demo answers as.
 *
 * Hardcoded rather than read from the database on purpose: the demo must never
 * be able to reach a real customer's configuration, and a visitor typing
 * something odd must never affect anyone's live receptionist.
 *
 * Uses the same defaults a new signup gets, so what a visitor experiences is
 * genuinely what they would get — not a polished version of it.
 */
export const DEMO_BUSINESS = DEMO_BUSINESS_NAME;

/**
 * The same five questions a new business is seeded with.
 *
 * Named and exported so a test can hold them against the migration that creates
 * them. They had already drifted apart once — the demo asked for timing as
 * required while the database made it optional — and a demo that qualifies a
 * caller differently from the receptionist somebody buys is selling a product we
 * do not ship.
 *
 * Kept in step with supabase/migrations/20260809120000_ask_when_not_whether_urgent.sql.
 */
export const DEMO_QUESTIONS: QualificationQuestion[] = [
  { id: "1", business_id: "demo", prompt: "Can you tell me what the job is?", captures: "job_type", required: true, sort_order: 1, created_at: "" },
  { id: "2", business_id: "demo", prompt: "And whereabouts are you?", captures: "location", required: true, sort_order: 2, created_at: "" },
  { id: "3", business_id: "demo", prompt: "When are you hoping to get it done?", captures: "preferred_time", required: true, sort_order: 3, created_at: "" },
  { id: "4", business_id: "demo", prompt: "Can I take your name?", captures: "contact_name", required: true, sort_order: 4, created_at: "" },
  { id: "5", business_id: "demo", prompt: "Is it urgent, or can it wait?", captures: "urgency", required: false, sort_order: 5, created_at: "" },
];

export const DEMO_CONTEXT: ReceptionistContext = {
  businessName: DEMO_BUSINESS,
  serviceArea: ["Raheny", "Clontarf", "Glasnevin", "Dublin 3", "Dublin 5", "Dublin 9"],
  profile: {
    business_id: "demo",
    // The disclosure already names the business, so the greeting does not
    // introduce it a second time — it just asks the question.
    greeting: DEMO_GREETING,
    tone: "Friendly, plain-spoken and brief. No jargon. One short sentence at a time.",
    must_not: [
      "Never quote a price or estimate a cost.",
      "Never promise a specific arrival time.",
    ],
    fallback:
      "I'm not sure about that, but I'll take your details and have someone come back to you.",
    closing_line:
      "Got it — I'll pass this straight to Dave. He'll ring you back shortly.",
    confirmation_sms_template:
      "{{business_name}}: {{job_type}}, {{location}}. Dave will call you shortly.",
    max_call_seconds: 180,
    opening_hours: {},
    out_of_hours_behaviour: "answer_and_notify",
    updated_at: new Date().toISOString(),
  },
  services: [
    { id: "1", business_id: "demo", name: "Burst pipes", emergency_eligible: true, typical_urgency: "high", sort_order: 1, created_at: "" },
    { id: "2", business_id: "demo", name: "Boiler repair", emergency_eligible: true, typical_urgency: "high", sort_order: 2, created_at: "" },
    { id: "3", business_id: "demo", name: "Leaks", emergency_eligible: true, typical_urgency: "high", sort_order: 3, created_at: "" },
    { id: "4", business_id: "demo", name: "Radiators", emergency_eligible: false, typical_urgency: "normal", sort_order: 4, created_at: "" },
    { id: "5", business_id: "demo", name: "Bathroom fitting", emergency_eligible: false, typical_urgency: "low", sort_order: 5, created_at: "" },
    { id: "6", business_id: "demo", name: "Blocked drains", emergency_eligible: false, typical_urgency: "normal", sort_order: 6, created_at: "" },
  ],
  questions: DEMO_QUESTIONS,
};

/** Turns a visitor can take before the demo closes. */
export const MAX_DEMO_TURNS = 8;

/** Requests one visitor may make per hour. */
const HOURLY_LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Hashed, never stored raw. Counting requests does not require keeping a record
 * of who visited the site, and an unsalted IP in a table is personal data with
 * no purpose.
 */
function hashIp(ip: string, scope: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "flowpilot";
  return createHash("sha256")
    .update(`${salt}:${scope}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Requests one visitor may make in an hour, per scope.
 *
 * Scoped so the public demo and the product chat get their own budgets from the
 * same table. Sharing one counter would mean somebody who tried the demo could
 * not then ask a question, which is exactly the visitor we most want to answer.
 * The scope is folded into the hash rather than stored as a column, so no
 * migration is needed and the stored value still identifies nobody.
 */
export async function withinRateLimit(
  ip: string,
  scope = "demo",
): Promise<boolean> {
  const supabase = createAdminClient();
  const key = hashIp(ip, scope);
  const now = new Date();

  const { data: existing, error } = await supabase
    .from("demo_usage")
    .select("*")
    .eq("ip_hash", key)
    .maybeSingle();

  /*
   * Missing table — the migration has not been applied. Allowed through rather
   * than blocked, because a marketing page that silently stops working is worse
   * than one that is briefly uncapped: the demo still has a hard turn limit and
   * a message length cap, so the exposure is bounded either way.
   *
   * Logged loudly, and surfaced on the diagnostics page, because "uncapped
   * spend on a public endpoint" must not be something you discover from a bill.
   */
  if (error?.code === "42P01") {
    console.error(
      "RATE LIMIT DISABLED: demo_usage table is missing. Apply the latest migration.",
      { scope },
    );
    return true;
  }

  // First request, or the previous window has expired.
  if (
    !existing ||
    now.getTime() - new Date(existing.window_started_at).getTime() > WINDOW_MS
  ) {
    await supabase.from("demo_usage").upsert({
      ip_hash: key,
      request_count: 1,
      window_started_at: now.toISOString(),
    });
    return true;
  }

  if (existing.request_count >= HOURLY_LIMIT) return false;

  await supabase
    .from("demo_usage")
    .update({ request_count: existing.request_count + 1 })
    .eq("ip_hash", key);

  return true;
}
