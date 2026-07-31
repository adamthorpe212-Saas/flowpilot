"use client";

import { useActionState } from "react";
import { saveBusinessDetails, type SaveState } from "@/app/(app)/onboarding/actions";
import Field from "@/components/ui/Field";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import TagInput from "@/components/ui/TagInput";

const INITIAL: SaveState = { error: null };

export default function BusinessForm({
  name,
  industryLabel,
  serviceArea,
  next,
  submitLabel = "Save and continue",
}: {
  name: string;
  industryLabel: string;
  serviceArea: string[];
  next?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(saveBusinessDetails, INITIAL);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {next && <input type="hidden" name="next" value={next} />}

      <FormError message={state.error} />

      {state.saved && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Saved.
        </p>
      )}

      <Field
        label="Business name"
        name="name"
        defaultValue={name}
        required
        hint="Said out loud when your receptionist answers."
      />

      <Field
        label="What do you do?"
        name="industry_label"
        defaultValue={industryLabel}
        placeholder="Plumbing"
        hint="Optional. Helps us talk about your business, nothing more."
      />

      <TagInput
        name="service_area"
        label="Areas you cover"
        initial={serviceArea}
        placeholder="Raheny, Clontarf, Dublin 5"
        hint="Type an area and press Enter. Jobs outside these are flagged, never turned away."
      />

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
