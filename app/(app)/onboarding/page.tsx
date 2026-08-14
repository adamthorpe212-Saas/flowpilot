import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentBusiness } from "@/lib/auth";
import { nextIncompleteStep, onboardingSteps } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Setup — FlowPilot",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("service")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  const steps = onboardingSteps(business, count ?? 0);
  const next = nextIncompleteStep(steps);
  const remaining = steps.filter((step) => !step.done).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your receptionist
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        {remaining === 0
          ? "All done. Your receptionist is answering calls."
          : `${remaining} ${remaining === 1 ? "step" : "steps"} to go.`}
      </p>

      {/*
        Progress as a bar rather than only a count. "3 steps to go" is a number
        somebody has to hold in their head against a total they were never told;
        a filled bar answers "am I nearly there" without being read.
      */}
      <div className="mt-5">
        <div
          role="progressbar"
          aria-valuenow={steps.length - remaining}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label="Setup progress"
          className="h-1.5 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{
              width: `${((steps.length - remaining) / steps.length) * 100}%`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {steps.length - remaining} of {steps.length} done
        </p>
      </div>

      <ol className="mt-8 space-y-3">
        {steps.map((step, index) => {
          const isNext = next?.slug === step.slug;

          /*
           * Later steps are shown but not openable until the ones before them
           * are done.
           *
           * Every step used to be a live link, so a customer could pay and go
           * straight to buying a number without ever saying what work they
           * take. The provisioning action refuses that on the server, but a
           * button that leads to a refusal is a worse experience than one that
           * plainly is not ready yet — and the order here is not arbitrary:
           * the receptionist is built out of the answers given before it.
           */
          const locked = !step.done && !isNext;

          if (locked) {
            return (
              <li key={step.slug}>
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.01] p-5 opacity-55">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/10 text-xs text-zinc-500"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-zinc-400">{step.title}</span>
                    <span className="mt-1 block text-sm text-zinc-500">
                      {step.description}
                    </span>
                  </span>
                  <span className="flex-none text-xs text-zinc-500">
                    After the step above
                  </span>
                </div>
              </li>
            );
          }

          return (
            <li key={step.slug}>
              <Link
                href={step.href}
                className={`flex items-center gap-4 rounded-2xl border p-5 transition ${
                  isNext
                    ? "border-white/30 bg-white/[0.05]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-xs ${
                    step.done
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                      : "border-white/15 text-zinc-400"
                  }`}
                >
                  {step.done ? "✓" : index + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block ${step.done ? "text-zinc-400" : "font-medium"}`}
                  >
                    {step.title}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-400">
                    {step.description}
                  </span>
                </span>

                {isNext && (
                  <span className="flex-none rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">
                    Start
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
