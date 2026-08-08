"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { soldPlan } from "@/lib/plans";
import { safeInternalPath } from "@/lib/safe-redirect";

export type AuthState = { error: string | null };

/**
 * Supabase returns deliberately vague messages for some failures and raw
 * internal wording for others. Neither is what a customer should read, so the
 * cases worth distinguishing are translated and everything else falls back to
 * something honest that doesn't leak internals.
 */
function friendlyError(message: string): string {
  const normalised = message.toLowerCase();

  if (normalised.includes("invalid login credentials")) {
    return "That email and password don't match. Try again.";
  }
  if (normalised.includes("email not confirmed")) {
    return "Check your inbox and confirm your email address first.";
  }
  if (normalised.includes("already registered") || normalised.includes("already exists")) {
    return "There's already an account with that email. Try signing in.";
  }
  if (normalised.includes("password")) {
    return "Your password needs to be at least 8 characters.";
  }
  if (normalised.includes("rate limit") || normalised.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return "Something went wrong. Try again in a moment.";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/", "layout");
  redirect(safeInternalPath(next, "/dashboard"));
}

export async function signUp(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const businessName = String(formData.get("business_name") ?? "").trim();
  // The form carries a plan, but the server decides. One plan is sold, so a
  // crafted request cannot subscribe anyone to a withdrawn tier.
  const selectedPlan = soldPlan().id;

  if (!businessName) return { error: "What's your business called?" };
  if (!email) return { error: "Enter your email address." };
  if (password.length < 8) {
    return { error: "Your password needs to be at least 8 characters." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Read back by getCurrentBusiness() on first authenticated load. Auth
      // metadata is user-editable, so this carries intent only — never
      // entitlement, which comes from subscription_status via Stripe.
      data: { business_name: businessName, selected_plan: selectedPlan },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) return { error: friendlyError(error.message) };

  // No session means the project requires email confirmation.
  if (!data.session) {
    redirect("/signup/check-email");
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
