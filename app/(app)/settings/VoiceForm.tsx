"use client";

import { useActionState } from "react";
import {
  saveVoiceSettings,
  type VoiceState,
} from "@/app/(app)/settings/voice-actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import type { BusinessProfile } from "@/types/database";

const INITIAL: VoiceState = { error: null };

const textareaClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] leading-6 text-white placeholder:text-zinc-600 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10";

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300">
        {label}
        {children}
      </label>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{hint}</p>
    </div>
  );
}

export default function VoiceForm({
  profile,
  businessName,
}: {
  profile: BusinessProfile;
  businessName: string;
}) {
  const [state, formAction] = useActionState(saveVoiceSettings, INITIAL);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <FormError message={state.error} />

      {state.saved && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Saved. Your next call will use this.
        </p>
      )}

      <Labelled
        label="How it answers"
        hint={`Leave blank and it says: "Hello, ${businessName}. Sorry we missed your call. What can I help you with?"`}
      >
        <textarea
          name="greeting"
          rows={2}
          defaultValue={profile.greeting ?? ""}
          placeholder="Optional — write your own opening line"
          className={textareaClass}
        />
      </Labelled>

      <Labelled
        label="How it should sound"
        hint="Plain instructions work best. This is guidance, not a script — it still answers whatever the caller actually asks."
      >
        <textarea
          name="tone"
          rows={2}
          defaultValue={profile.tone}
          required
          className={textareaClass}
        />
      </Labelled>

      <Labelled
        label="Things it must never do"
        hint="One per line. The two defaults are here because quoting a price or promising a time is how a receptionist costs you money."
      >
        <textarea
          name="must_not"
          rows={4}
          defaultValue={profile.must_not.join("\n")}
          className={`${textareaClass} font-mono text-sm`}
        />
      </Labelled>

      <Labelled
        label="How it signs off"
        hint="Said once it has everything it needs, just before hanging up."
      >
        <textarea
          name="closing_line"
          rows={2}
          defaultValue={profile.closing_line}
          required
          className={textareaClass}
        />
      </Labelled>

      <Labelled
        label="When it doesn't know"
        hint="It never guesses. This is what it says instead, before taking the details anyway."
      >
        <textarea
          name="fallback"
          rows={2}
          defaultValue={profile.fallback}
          required
          className={textareaClass}
        />
      </Labelled>

      <Labelled
        label="The text your customer gets afterwards"
        hint="Use {{caller_name}}, {{job_type}}, {{location}} and {{business_name}}. No links — Irish networks flag messages containing them as scams."
      >
        <textarea
          name="confirmation_sms_template"
          rows={3}
          defaultValue={profile.confirmation_sms_template}
          required
          maxLength={320}
          className={textareaClass}
        />
      </Labelled>

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
