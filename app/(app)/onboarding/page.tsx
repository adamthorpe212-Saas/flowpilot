import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Setup — FlowPilot",
  robots: { index: false },
};

type Step = {
  title: string;
  description: string;
  done: boolean;
};

export default async function OnboardingPage() {
  const business = await getCurrentBusiness();

  const steps: Step[] = [
    {
      title: "Create your account",
      description: "Done — you're signed in.",
      done: true,
    },
    {
      title: "Tell us about your business",
      description: "The services you offer and the areas you cover.",
      done: (business?.service_area?.length ?? 0) > 0,
    },
    {
      title: "Get your FlowPilot number",
      description: "We provision an Irish number for your receptionist.",
      done: Boolean(business?.phone_number),
    },
    {
      title: "Forward your calls",
      description:
        "Set your phone to forward to FlowPilot when you can't answer.",
      done: Boolean(business?.forwarding_verified_at),
    },
    {
      title: "Test it",
      description: "Ring your own number and hear it answer.",
      done: Boolean(business?.forwarding_verified_at),
    },
  ];

  const remaining = steps.filter((step) => !step.done).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your receptionist
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {remaining === 0
          ? "Everything's done. Your receptionist is answering calls."
          : `${remaining} ${remaining === 1 ? "step" : "steps"} left.`}
      </p>

      <ol className="mt-8 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs ${
                step.done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : "border-white/15 text-zinc-500"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <div>
              <p className={step.done ? "text-zinc-400" : "font-medium"}>
                {step.title}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
