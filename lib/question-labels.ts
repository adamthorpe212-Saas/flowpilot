import type { Captures } from "@/types/database";

/**
 * What each question is for, in the customer's language.
 *
 * The database calls them job_type and preferred_time. A tradesperson should
 * see "The job" and "When they want it" — the column name is our concern, not
 * theirs, and showing it would invite somebody to think they can change it.
 *
 * Shared rather than local to the settings form, because the marketing site now
 * shows this same list as proof that the owner writes the script. Two copies of
 * a vocabulary is one copy that goes stale, and the entire argument of that
 * section is that it is the real screen.
 */
export const FIELD_LABELS: Record<Captures, string> = {
  job_type: "The job",
  location: "Where they are",
  preferred_time: "When they want it",
  contact_name: "Their name",
  urgency: "How urgent",
  other: "Extra question",
};
