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
  /**
   * When the owner paused the receptionist, or null while it is answering.
   *
   * Distinct from `status: "suspended"`, which is our decision and one they
   * cannot undo. This one is theirs.
   */
  receptionist_paused_at: string | null;
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

/**
 * A caller the receptionist must not answer.
 *
 * `blocked_count` and `last_blocked_at` are how an owner can tell it is
 * working — a blocklist with no evidence is a promise nobody can check.
 */
export type BlockedCaller = {
  id: string;
  business_id: string;
  /** E.164, normalised when it was saved. */
  number: string;
  label: string | null;
  blocked_count: number;
  last_blocked_at: string | null;
  created_at: string;
};

/** Part of a day, because a tradesman says "Thursday morning", not "09:15". */
export type AppointmentSlot = "morning" | "afternoon" | "anytime";

/**
 * A job in the tradesman's own diary.
 *
 * Written only by the business. The receptionist reads a density summary of
 * these — see lib/availability.ts — and has no path to create one.
 */
export type Appointment = {
  id: string;
  business_id: string;
  /** Null when he added the job by hand, or when the lead was later erased. */
  lead_id: string | null;
  /** `2026-08-21`. A date, deliberately not a timestamp. */
  scheduled_for: string;
  slot: AppointmentSlot;
  title: string;
  customer_name: string | null;
  customer_number: string | null;
  location: string | null;
  notes: string | null;
  /** Set only when the owner taps send, never by the system. */
  customer_notified_at: string | null;
  created_at: string;
  updated_at: string;
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
  /**
   * Transcribed, never recorded. Twilio's speech recognition hands back text;
   * no audio is captured or stored anywhere. See docs/DATA-PROCESSING.md.
   */
  transcript: TranscriptTurn[];
  status: CallStatus;
  /** Set once the confirmation SMS and owner alert have been sent. */
  /** Delivery was attempted. Claimed before sending, so not proof of arrival. */
  notified_at: string | null;
  /** At least one channel accepted a message. Null with notified_at set means
   * the job was captured and reached nobody. */
  delivered_at: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  business_id: string;
  call_id: string | null;
  /** Short public-facing id used in the alert link (/j/<code>). */
  code: string;
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
