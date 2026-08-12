"use client";

import { useActionState, useState } from "react";
import {
  saveOpeningHours,
  type HoursState,
} from "@/app/(app)/settings/hours-actions";
import { DAYS } from "@/app/(app)/settings/hours-config";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import type { OpeningHours, OutOfHoursBehaviour } from "@/types/database";

const INITIAL: HoursState = { error: null };

const BEHAVIOUR_OPTIONS: {
  value: OutOfHoursBehaviour;
  label: string;
  detail: string;
}[] = [
  {
    value: "answer_and_notify",
    label: "Answer and tell me straight away",
    detail: "Out-of-hours jobs reach you the same as any other.",
  },
  {
    value: "answer_and_hold",
    label: "Answer, but hold it until morning",
    detail: "The job is captured; you're not woken up for it.",
  },
  {
    value: "do_not_answer",
    label: "Don't answer at all",
    detail: "Callers hear your normal engaged tone. Nothing is captured.",
  },
];

const DEFAULT_WINDOW = { open: "08:00", close: "18:00" };

export default function OpeningHoursForm({
  openingHours,
  behaviour,
}: {
  openingHours: OpeningHours;
  behaviour: OutOfHoursBehaviour;
}) {
  const [state, formAction] = useActionState(saveOpeningHours, INITIAL);

  const hasHours = Object.keys(openingHours ?? {}).length > 0;
  const [alwaysOpen, setAlwaysOpen] = useState(!hasHours);

  return (
    <form action={formAction} className="space-y-5">
      <FormError message={state.error} />

      {state.saved && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Saved.
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <input
          type="checkbox"
          name="always_open"
          checked={alwaysOpen}
          onChange={(event) => setAlwaysOpen(event.target.checked)}
          className="mt-0.5 h-4 w-4 flex-none rounded border-white/25 bg-white/10 accent-white"
        />
        <span>
          <span className="block font-medium">Answer any time</span>
          <span className="mt-1 block text-sm leading-6 text-zinc-400">
            Evenings, weekends, holidays — every call gets picked up. This is
            what most trades want, and it&apos;s what people are ringing you for.
          </span>
        </span>
      </label>

      {!alwaysOpen && (
        <>
          <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <legend className="px-1 text-sm font-medium text-zinc-200">
              When you&apos;re open
            </legend>

            <ul className="mt-2 divide-y divide-white/5">
              {DAYS.map((day) => {
                const existing = openingHours?.[day.key];
                const isOpen = existing !== null && existing !== undefined;

                return (
                  <li
                    key={day.key}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <label className="flex min-w-[8.5rem] items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        name={`${day.key}_open`}
                        defaultChecked={isOpen}
                        className="h-4 w-4 flex-none rounded border-white/25 bg-white/10 accent-white"
                      />
                      <span className="text-zinc-200">{day.label}</span>
                    </label>

                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        name={`${day.key}_from`}
                        defaultValue={existing?.open ?? DEFAULT_WINDOW.open}
                        aria-label={`${day.label} opens`}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-white [color-scheme:dark]"
                      />
                      <span className="text-zinc-500">to</span>
                      <input
                        type="time"
                        name={`${day.key}_to`}
                        defaultValue={existing?.close ?? DEFAULT_WINDOW.close}
                        aria-label={`${day.label} closes`}
                        className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-white [color-scheme:dark]"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <legend className="px-1 text-sm font-medium text-zinc-200">
              Outside those hours
            </legend>

            <div className="mt-3 space-y-3">
              {BEHAVIOUR_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3"
                >
                  <input
                    type="radio"
                    name="out_of_hours_behaviour"
                    value={option.value}
                    defaultChecked={behaviour === option.value}
                    className="mt-1 h-4 w-4 flex-none border-white/25 bg-white/10 accent-white"
                  />
                  <span>
                    <span className="block text-sm text-zinc-200">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-400">
                      {option.detail}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
