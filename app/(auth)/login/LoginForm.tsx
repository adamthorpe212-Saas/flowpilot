"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/(auth)/actions";
import Field from "@/components/ui/Field";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";

const INITIAL: AuthState = { error: null };

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, INITIAL);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      <FormError message={state.error} />

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
        autoComplete="current-password"
        required
      />

      <SubmitButton className="!mt-6">Sign in</SubmitButton>
    </form>
  );
}
