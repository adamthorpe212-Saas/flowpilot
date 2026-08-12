"use client";

import { useActionState } from "react";
import {
  updateQuestions,
  type QuestionState,
} from "@/app/(app)/settings/question-actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Captures, QualificationQuestion } from "@/types/database";

const INITIAL: QuestionState = { error: null };

/**
 * What each question is for, in the customer's language.
 *
 * The database calls them job_type and preferred_time. A tradesperson should
 * see "The job" and "When they want it" — the column name is our concern, not
 * theirs, and showing it would invite somebody to think they can change it.
 */
const FIELD_LABELS: Record<Captures, string> = {
  job_type: "The job",
  location: "Where they are",
  preferred_time: "When they want it",
  contact_name: "Their name",
  urgency: "How urgent",
  other: "Extra question",
};

/** Asked of every caller and not negotiable — see question-actions.ts. */
const ALWAYS_REQUIRED: Captures = "job_type";

export default function QuestionsForm({
  questions,
}: {
  questions: QualificationQuestion[];
}) {
  const [state, formAction] = useActionState(updateQuestions, INITIAL);

  const ordered = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <form action={formAction}>
      <FormError message={state.error} />

      {state.saved && !state.error && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Saved. Your receptionist will ask these on the next call.
        </p>
      )}

      <ol className="space-y-3">
        {ordered.map((question, index) => {
          const locked = question.captures === ALWAYS_REQUIRED;

          return (
            <li
              key={question.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-200">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-zinc-400"
                  >
                    {index + 1}
                  </span>
                  {FIELD_LABELS[question.captures]}
                </span>

                {/*
                  A locked toggle rather than a hidden one. Somebody looking for
                  the switch should find it and understand why it will not move,
                  rather than wonder whether this question is optional too.
                */}
                {locked ? (
                  <span className="text-[11px] text-zinc-500">
                    Always asked
                  </span>
                ) : (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-zinc-400">
                    <input
                      type="checkbox"
                      name={`required_${question.id}`}
                      defaultChecked={question.required}
                      className="h-4 w-4 rounded border-white/25 bg-white/5 accent-white"
                    />
                    Must ask
                  </label>
                )}
              </div>

              <label htmlFor={`prompt_${question.id}`} className="sr-only">
                What the receptionist says for {FIELD_LABELS[question.captures]}
              </label>
              <input
                id={`prompt_${question.id}`}
                name={`prompt_${question.id}`}
                defaultValue={question.prompt}
                maxLength={160}
                className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] text-white transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
              />
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[13px] leading-6 text-zinc-500">
        These are asked one at a time, in this order, in your own words. Untick
        &ldquo;must ask&rdquo; and the receptionist will only ask if it fits the
        conversation.
      </p>

      <div className="mt-5">
        <SubmitButton>Save questions</SubmitButton>
      </div>
    </form>
  );
}
