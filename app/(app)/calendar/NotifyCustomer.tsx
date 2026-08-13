"use client";

import { useActionState } from "react";
import {
  notifyCustomer,
  type AppointmentState,
} from "@/app/(app)/calendar/actions";
import { appointmentText } from "@/lib/appointment-text";
import type { Appointment } from "@/types/database";

const INITIAL: AppointmentState = { error: null };

/**
 * Telling the customer when he's coming.
 *
 * Shows the exact words before sending them. This is a message going out in the
 * tradesman's name to his own customer — he should read it once, not discover
 * afterwards what software said on his behalf.
 */
export default function NotifyCustomer({
  appointment,
  businessName,
}: {
  appointment: Appointment;
  businessName: string;
}) {
  const [state, formAction] = useActionState(notifyCustomer, INITIAL);

  if (appointment.customer_notified_at) {
    return (
      <p className="text-xs text-zinc-500">
        Customer told
      </p>
    );
  }

  if (!appointment.customer_number) {
    return (
      <p className="text-xs text-zinc-600">No number saved</p>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={appointment.id} />

      {state.error && (
        <p role="alert" className="mb-2 text-xs text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        title={appointmentText(appointment, businessName)}
        className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-3.5 text-xs font-medium text-white transition hover:bg-white/20"
      >
        Text them the day
      </button>
    </form>
  );
}
