"use client";

import { useActionState } from "react";
import {
  saveVoiceSettings,
  type VoiceState,
} from "@/app/(app)/settings/voice-actions";
import { controlClass } from "@/components/ui/field-styles";
import FormError from "@/components/ui/FormError";
import Labelled from "@/components/ui/Labelled";
import SubmitButton from "@/components/ui/SubmitButton";
import { AI_DISCLOSURE_EXAMPLE } from "@/lib/disclosure";
import type { BusinessProfile } from "@/types/database";

const INITIAL: VoiceState = { error: null };

/**
 * The words the receptionist uses.
 *
 * Every field here is something a caller hears, which is why they are together
 * and why nothing else is in with them. The local Labelled this used to carry
 * is gone in favour of the shared one — it was one of six label treatments on
 * the settings page, all nearly the same and none of them identical.
 */
export default function VoiceForm({
  profile,
  businessName,
}: {
  profile: BusinessProfile;
  businessName: string;
}) {
  const [state, formAction] = useActionState(saveVoiceSettings, INITIAL);

  return (
    <form action={formAction} className="space-y-6">
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
        htmlFor="greeting"
        label="The first thing a caller hears"
        hint={`Leave blank and it says: "Hello, ${businessName}. Sorry we missed your call. What can I help you with?"`}
      >
        <textarea
          id="greeting"
          name="greeting"
          rows={2}
          defaultValue={profile.greeting ?? ""}
          placeholder="Optional — write your own opening line"
          className={controlClass}
        />

        {/*
          Shown here rather than buried in terms, because a business owner who
          finds an unfamiliar sentence on their own recording assumes something
          is broken. Naming it as deliberate, and saying why, is the difference
          between a support ticket and a nod.
        */}
        <p
          className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[13px] leading-5 text-zinc-400"
          data-testid="ai-disclosure-note"
        >
          Every call opens with{" "}
          <span className="text-white">
            &ldquo;{AI_DISCLOSURE_EXAMPLE}&rdquo;
          </span>{" "}
          before your greeting. That stays on: callers have to be told
          they&apos;re speaking to a machine and that the call is written down.
          It protects you as much as them — it&apos;s your customer who would
          otherwise find out afterwards.
        </p>
      </Labelled>

      <Labelled
        htmlFor="tone"
        label="How it should sound"
        hint="Plain instructions work best. This is guidance, not a script — it still answers whatever the caller actually asks."
      >
        <textarea
          id="tone"
          name="tone"
          rows={2}
          defaultValue={profile.tone}
          required
          className={controlClass}
        />
      </Labelled>

      <Labelled
        htmlFor="must_not"
        label="Things it must never say"
        hint="One per line. The two defaults are here because quoting a price or promising a time is how a receptionist costs you money."
      >
        <textarea
          id="must_not"
          name="must_not"
          rows={4}
          defaultValue={profile.must_not.join("\n")}
          className={`${controlClass} font-mono text-sm`}
        />
      </Labelled>

      <Labelled
        htmlFor="closing_line"
        label="How it signs off"
        hint="Said once it has everything it needs, just before hanging up."
      >
        <textarea
          id="closing_line"
          name="closing_line"
          rows={2}
          defaultValue={profile.closing_line}
          required
          className={controlClass}
        />
      </Labelled>

      <Labelled
        htmlFor="fallback"
        label="What it says when it doesn't know"
        hint="It never guesses. This is what it says instead, before taking the details anyway."
      >
        <textarea
          id="fallback"
          name="fallback"
          rows={2}
          defaultValue={profile.fallback}
          required
          className={controlClass}
        />
      </Labelled>

      <Labelled
        htmlFor="confirmation_sms_template"
        label="The text your customer gets afterwards"
        hint="Use {{caller_name}}, {{job_type}}, {{location}} and {{business_name}}. No links — Irish networks flag messages containing them as scams."
      >
        <textarea
          id="confirmation_sms_template"
          name="confirmation_sms_template"
          rows={3}
          defaultValue={profile.confirmation_sms_template}
          required
          maxLength={320}
          className={controlClass}
        />
      </Labelled>

      <SubmitButton>Save changes</SubmitButton>
    </form>
  );
}
