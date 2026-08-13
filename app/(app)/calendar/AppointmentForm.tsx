"use client";

import { useActionState } from "react";
import {
  addAppointment,
  type AppointmentState,
} from "@/app/(app)/calendar/actions";
import { controlClass } from "@/components/ui/field-styles";
import FormError from "@/components/ui/FormError";
import Labelled from "@/components/ui/Labelled";
import SubmitButton from "@/components/ui/SubmitButton";
import type { Lead } from "@/types/database";

const INITIAL: AppointmentState = { error: null };

/**
 * Putting a job in the diary.
 *
 * Used from two places with the same shape: the calendar, where a tradesman
 * types a job that never came through a phone call, and a lead, where the
 * details are already known and only the day is missing. Prefilling from the
 * lead is most of the value — nobody retypes an address they are looking at.
 */
export default function AppointmentForm({
  lead,
  onDone,
}: {
  /** When present, everything but the day is already answered. */
  lead?: Pick<
    Lead,
    "id" | "job_type" | "caller_name" | "caller_number" | "location"
  >;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(addAppointment, INITIAL);

  if (state.saved && onDone) onDone();

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      {state.saved && !state.error && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          In the diary.
        </p>
      )}

      {lead && <input type="hidden" name="lead_id" value={lead.id} />}

      <Labelled htmlFor="title" label="The job">
        <input
          id="title"
          name="title"
          required
          maxLength={80}
          defaultValue={lead?.job_type ?? ""}
          placeholder="Rewire kitchen"
          className={controlClass}
        />
      </Labelled>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled htmlFor="scheduled_for" label="Day">
          <input
            id="scheduled_for"
            name="scheduled_for"
            type="date"
            required
            className={`${controlClass} [color-scheme:dark]`}
          />
        </Labelled>

        <Labelled htmlFor="slot" label="When">
          <select id="slot" name="slot" className={controlClass}>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="anytime">Anytime</option>
          </select>
        </Labelled>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled htmlFor="customer_name" label="Customer">
          <input
            id="customer_name"
            name="customer_name"
            defaultValue={lead?.caller_name ?? ""}
            className={controlClass}
          />
        </Labelled>

        <Labelled
          htmlFor="customer_number"
          label="Their number"
          hint="Needed if you want to text them."
        >
          <input
            id="customer_number"
            name="customer_number"
            type="tel"
            inputMode="tel"
            defaultValue={lead?.caller_number ?? ""}
            className={controlClass}
          />
        </Labelled>
      </div>

      <Labelled htmlFor="location" label="Where">
        <input
          id="location"
          name="location"
          defaultValue={lead?.location ?? ""}
          className={controlClass}
        />
      </Labelled>

      <Labelled htmlFor="notes" label="Notes" hint="Only you see these.">
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Park round the back. Quoted €380."
          className={controlClass}
        />
      </Labelled>

      {/*
        No "text them" checkbox here, deliberately. Sending happens from the
        calendar afterwards, as its own tap — a message going out in his name
        to his customer should never be a side effect of saving a form.
      */}
      <SubmitButton>Put it in the diary</SubmitButton>
    </form>
  );
}
