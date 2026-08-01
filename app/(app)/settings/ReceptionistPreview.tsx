"use client";

import { useActionState } from "react";
import { previewReply } from "@/app/(app)/settings/preview-actions";
import {
  EMPTY_PREVIEW,
  type PreviewState,
} from "@/app/(app)/settings/preview-state";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";

const FIELD_LABELS: Record<string, string> = {
  job_type: "Job",
  location: "Where",
  urgency: "Urgency",
  contact_name: "Name",
  preferred_time: "When",
};

const SUGGESTIONS = [
  "There's water coming through my kitchen ceiling",
  "How much would a boiler service be?",
  "Do you cover Swords?",
];

export default function ReceptionistPreview() {
  const [state, formAction] = useActionState<PreviewState, FormData>(
    previewReply,
    EMPTY_PREVIEW,
  );

  const captured = Object.entries(state.captured).filter(
    ([, value]) => Boolean(value),
  );

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {state.turns.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-500">
            Type what a caller might say. Your receptionist will answer using
            your real settings — same wording, same questions, same rules as a
            live call.
          </p>
        ) : (
          <ol className="space-y-4">
            {state.turns.map((turn, index) => (
              <li key={index}>
                <p
                  className={`text-[10px] uppercase tracking-[0.14em] ${
                    turn.role === "assistant" ? "text-white/60" : "text-zinc-600"
                  }`}
                >
                  {turn.role === "assistant" ? "Your receptionist" : "Caller"}
                </p>
                <p
                  className={`mt-1 text-sm leading-6 ${
                    turn.role === "assistant" ? "text-zinc-200" : "text-zinc-400"
                  }`}
                >
                  {turn.text}
                </p>
              </li>
            ))}
          </ol>
        )}

        {captured.length > 0 && (
          <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Captured so far
            </p>
            {captured.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-zinc-500">{FIELD_LABELS[key] ?? key}</dt>
                <dd className="text-right text-zinc-200">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {state.complete && (
          <p className="mt-5 border-t border-white/10 pt-4 text-sm text-emerald-200">
            That&apos;s where it would hang up and send you the job.
          </p>
        )}
      </div>

      <form action={formAction} className="mt-4 space-y-3">
        <FormError message={state.error} />

        <input
          type="text"
          name="said"
          required
          placeholder={
            state.turns.length === 0
              ? "There's water coming through my kitchen ceiling"
              : "Say something else…"
          }
          aria-label="What a caller might say"
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-zinc-600 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10"
        />

        {state.turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="submit"
                name="said"
                value={suggestion}
                className="rounded-full border border-white/15 px-3 py-1.5 text-left text-xs text-zinc-400 transition hover:border-white/30 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <SubmitButton>Send</SubmitButton>
      </form>
    </div>
  );
}
