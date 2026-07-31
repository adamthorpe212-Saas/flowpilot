/**
 * Database types.
 *
 * Hand-written to match supabase/migrations. These SHOULD be generated once the
 * project is reachable:
 *
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 *
 * Until then this file is the one place in the codebase that can silently drift
 * from the schema, so any migration must update it in the same commit.
 */

export type Plan = "starter" | "pro" | "business";

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type BusinessStatus = "onboarding" | "active" | "suspended";

export type MemberRole = "owner" | "dispatcher" | "technician";

export type Urgency = "low" | "normal" | "high";

export type LeadStatus =
  | "new"
  | "qualified"
  | "contacted"
  | "booked"
  | "completed"
  | "lost";

export type CallStatus = "in_progress" | "completed" | "failed" | "no_answer";

export type Captures =
  | "job_type"
  | "location"
  | "urgency"
  | "contact_name"
  | "preferred_time"
  | "other";

export type OutOfHoursBehaviour =
  | "answer_and_notify"
  | "answer_and_hold"
  | "do_not_answer";

/** `{ mon: { open: "08:00", close: "18:00" }, sun: null }` */
export type OpeningHours = Record<
  string,
  { open: string; close: string } | null
>;

export type Business = {
  id: string;
  name: string;
  industry_label: string | null;
  service_area: string[];
  timezone: string;
  phone_number: string | null;
  phone_number_sid: string | null;
  forwarding_verified_at: string | null;
  plan: Plan;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: BusinessStatus;
  /** Last trial reminder sent, so the daily job cannot repeat itself. */
  trial_reminder_stage: "ending_soon" | "expired" | null;
  created_at: string;
  updated_at: string;
};

export type BusinessMember = {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
};

export type BusinessProfile = {
  business_id: string;
  greeting: string | null;
  tone: string;
  must_not: string[];
  fallback: string;
  closing_line: string;
  confirmation_sms_template: string;
  max_call_seconds: number;
  opening_hours: OpeningHours;
  out_of_hours_behaviour: OutOfHoursBehaviour;
  updated_at: string;
};

export type Service = {
  id: string;
  business_id: string;
  name: string;
  emergency_eligible: boolean;
  typical_urgency: Urgency;
  sort_order: number;
  created_at: string;
};

export type QualificationQuestion = {
  id: string;
  business_id: string;
  prompt: string;
  captures: Captures;
  required: boolean;
  sort_order: number;
  created_at: string;
};

export type NotificationRule = {
  id: string;
  business_id: string;
  channel: "sms" | "email";
  destination: string;
  on_new_lead: boolean;
  on_urgent_lead: boolean;
  outside_hours: boolean;
  created_at: string;
};

export type TranscriptTurn = {
  role: "assistant" | "caller";
  text: string;
  at: string;
};

export type Call = {
  id: string;
  business_id: string;
  twilio_call_sid: string | null;
  from_number: string;
  to_number: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: TranscriptTurn[];
  status: CallStatus;
  /** Set once the confirmation SMS and owner alert have been sent. */
  notified_at: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  business_id: string;
  call_id: string | null;
  caller_number: string;
  caller_name: string | null;
  job_type: string | null;
  location: string | null;
  preferred_time: string | null;
  urgency: Urgency;
  captured: Record<string, string>;
  out_of_area: boolean;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};
