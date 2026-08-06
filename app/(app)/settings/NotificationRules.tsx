"use client";

import { useActionState, useState } from "react";
import {
  addNotificationRule,
  removeNotificationRule,
  type NotificationState,
} from "@/app/(app)/settings/notification-actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import { formatIrishNumber } from "@/lib/phone";
import type { NotificationRule } from "@/types/database";

const INITIAL: NotificationState = { error: null };

export default function NotificationRules({
  rules,
  emailAvailable,
}: {
  rules: NotificationRule[];
  emailAvailable: boolean;
}) {
  const [state, formAction] = useActionState(addNotificationRule, INITIAL);
  const [channel, setChannel] = useState<"sms" | "email">(
    emailAvailable ? "email" : "sms",
  );

  const onlyOne = rules.length <= 1;

  return (
    <div className="mt-4 space-y-5">
      <ul className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.02] px-5">
        {rules.length === 0 && (
          <li className="py-5 text-sm text-zinc-400">
            Nobody is being told about new jobs. Add somewhere below.
          </li>
        )}

        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-zinc-200">
                {rule.channel === "sms"
                  ? formatIrishNumber(rule.destination)
                  : rule.destination}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {rule.channel === "sms" ? "Text message" : "Email"}
              </p>
            </div>

            <form action={removeNotificationRule}>
              <input type="hidden" name="rule_id" value={rule.id} />
              <button
                type="submit"
                disabled={onlyOne}
                title={
                  onlyOne
                    ? "Add somewhere else first — jobs have to reach someone."
                    : undefined
                }
                className="text-xs text-zinc-500 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-500"
              >
                Remove
                <span className="sr-only"> {rule.destination}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />

        {state.saved && (
          <p
            role="status"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            Added.
          </p>
        )}

        <div className="flex gap-2">
          {(["email", "sms"] as const).map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                channel === option
                  ? "border-white bg-white text-black"
                  : "border-white/15 text-zinc-400 hover:border-white/30"
              }`}
            >
              <input
                type="radio"
                name="channel"
                value={option}
                checked={channel === option}
                onChange={() => setChannel(option)}
                className="sr-only"
              />
              {option === "email" ? "Email" : "Text"}
            </label>
          ))}
        </div>

        <input
          type={channel === "email" ? "email" : "tel"}
          name="destination"
          key={channel}
          placeholder={
            channel === "email" ? "dave@yourbusiness.ie" : "087 123 4567"
          }
          aria-label={
            channel === "email" ? "Email address" : "Mobile number"
          }
          required
          className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10"
        />

        {channel === "email" && !emailAvailable && (
          <p className="text-xs leading-5 text-amber-200/80">
            Email isn&apos;t connected yet, so alerts here won&apos;t send until
            it is. Worth adding anyway — it needs no approval, unlike texts.
          </p>
        )}

        <SubmitButton>Add</SubmitButton>
      </form>
    </div>
  );
}
