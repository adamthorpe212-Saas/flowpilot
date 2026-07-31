"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/(auth)/actions";
import Field from "@/components/ui/Field";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";

const INITIAL: AuthState = { error: null };

export default function SignupForm({ plan }: { plan: string }) {
  const [state, formAction] = useActionState(signUp, INITIAL);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="plan" value={plan} />

      <FormError message={state.error} />

      <Field
        label="Business name"
        name="business_name"
        type="text"
        autoComplete="organization"
        placeholder="O'Brien Plumbing"
        required
        hint="This is what your receptionist says when it answers."
      />

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@yourbusiness.ie"
        required
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="At least 8 characters."
      />

      <SubmitButton className="!mt-6">Create account</SubmitButton>
    </form>
  );
}
