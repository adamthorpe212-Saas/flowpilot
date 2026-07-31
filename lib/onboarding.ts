import type { Business } from "@/types/database";

export type OnboardingStep = {
  slug: string;
  href: string;
  title: string;
  description: string;
  done: boolean;
};

/**
 * Onboarding progress is derived from the business record rather than stored as
 * a "current step" column. State that is written separately from the thing it
 * describes drifts: a customer who edits their services later would otherwise
 * still be marked as mid-onboarding, and a failed provisioning attempt would
 * leave the pointer past a step that never actually completed.
 */
export function onboardingSteps(
  business: Business,
  serviceCount: number,
): OnboardingStep[] {
  return [
    {
      slug: "business",
      href: "/onboarding/business",
      title: "Your business",
      description: "Your name and the areas you cover.",
      done: business.service_area.length > 0,
    },
    {
      slug: "services",
      href: "/onboarding/services",
      title: "What you do",
      description: "The jobs you take, so it knows what to ask.",
      done: serviceCount > 0,
    },
    {
      slug: "number",
      href: "/onboarding/number",
      title: "Your FlowPilot number",
      description: "An Irish number for your receptionist.",
      done: Boolean(business.phone_number),
    },
    {
      slug: "forwarding",
      href: "/onboarding/forwarding",
      title: "Forward your calls",
      description: "Send missed calls to FlowPilot, then test it.",
      done: Boolean(business.forwarding_verified_at),
    },
  ];
}

export function nextIncompleteStep(steps: OnboardingStep[]): OnboardingStep | null {
  return steps.find((step) => !step.done) ?? null;
}
