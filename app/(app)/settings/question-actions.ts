"use server";

import { revalidatePath } from "next/cache";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Captures } from "@/types/database";

export type QuestionState = { error: string | null; saved?: boolean };

/**
 * What the receptionist asks a caller, and in what order.
 *
 * These rows drive the live call — lib/receptionist.ts renders them straight
 * into the prompt — and until now there was no way to change them. A business
 * could rewrite the greeting and the sign-off but not the questions in between,
 * which is the part that actually decides what a job record contains.
 *
 * The field each question fills is fixed, not chosen. A tradesperson should be
 * writing "What needs doing?" rather than picking a database column, and
 * `captures` is checked against a constraint that a free-text box would fail.
 */

/** The one thing a caller must always be asked. */
const ALWAYS_REQUIRED: Captures = "job_type";

/** Long enough for a real question, short enough to stay one spoken sentence. */
const MAX_PROMPT = 160;

export async function updateQuestions(
  _previous: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Sign in and try again." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("qualification_question")
    .select("id, captures")
    .eq("business_id", business.id);

  if (!existing?.length) {
    return { error: "Couldn't load your questions. Try again in a moment." };
  }

  const updates: { id: string; prompt: string; required: boolean }[] = [];

  for (const row of existing) {
    const prompt = String(formData.get(`prompt_${row.id}`) ?? "").trim();

    if (!prompt) {
      return { error: "Every question needs some wording." };
    }

    if (prompt.length > MAX_PROMPT) {
      return {
        error: `"${prompt.slice(0, 30)}…" is too long. Keep each question to one sentence.`,
      };
    }

    /*
     * The job itself is not optional, whatever the form says.
     *
     * A checkbox can be unticked, and a lead with no idea what the work is has
     * nothing a tradesperson can act on — it is a phone number and a shrug.
     * Enforced here rather than by disabling the input, because a disabled
     * field is a suggestion and this is a rule.
     */
    const required =
      row.captures === ALWAYS_REQUIRED
        ? true
        : formData.get(`required_${row.id}`) === "on";

    updates.push({ id: row.id, prompt, required });
  }

  /*
   * Written one at a time rather than as an upsert.
   *
   * An upsert would need every column of every row, and getting one wrong would
   * rewrite `captures` — silently pointing a question at the wrong field, so a
   * caller's name would arrive in the address. Narrow updates can only change
   * the two things this form owns.
   */
  for (const update of updates) {
    const { error } = await supabase
      .from("qualification_question")
      .update({ prompt: update.prompt, required: update.required })
      .eq("id", update.id)
      .eq("business_id", business.id);

    if (error) {
      console.error("Failed to update question", { id: update.id, error });
      return { error: "Couldn't save that. Try again in a moment." };
    }
  }

  revalidatePath("/settings");
  return { error: null, saved: true };
}
