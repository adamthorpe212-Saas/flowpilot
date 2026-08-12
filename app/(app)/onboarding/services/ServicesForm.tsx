"use client";

import { useActionState, useState } from "react";
import { saveServices, type SaveState } from "@/app/(app)/onboarding/actions";
import FormError from "@/components/ui/FormError";
import SubmitButton from "@/components/ui/SubmitButton";
import { tradeFor, withSuggestions, type TradeService } from "@/lib/trades";

const INITIAL: SaveState = { error: null };

/**
 * Services and their emergency flag are edited together rather than through the
 * shared TagInput, because the emergency checkboxes have to stay in step with
 * the list as it changes. Two components each owning half of that state would
 * let them disagree.
 */
export default function ServicesForm({
  services: initialServices,
  emergency: initialEmergency,
  industryLabel = null,
  next,
  submitLabel = "Save and continue",
}: {
  services: string[];
  emergency: string[];
  industryLabel?: string | null;
  next?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(saveServices, INITIAL);
  const [services, setServices] = useState<string[]>(initialServices);
  const [emergency, setEmergency] = useState<string[]>(initialEmergency);
  const [draft, setDraft] = useState("");

  const trade = tradeFor(industryLabel);

  const unusedSuggestions = (trade?.services ?? []).filter(
    (suggestion) =>
      !services.some(
        (service) => service.toLowerCase() === suggestion.name.toLowerCase(),
      ),
  );

  /*
   * Both paths go through withSuggestions() so the emergency flags cannot
   * disagree depending on whether somebody tapped one chip or "add all". The
   * transition is tested in tests/trades.test.ts — this page is behind login
   * and cannot be exercised in a browser during development.
   */
  function apply(additions: readonly TradeService[]) {
    const next = withSuggestions({ services, emergency }, additions);
    setServices(next.services);
    setEmergency(next.emergency);
  }

  function add(raw: string) {
    const additions = raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter(
        (entry) =>
          !services.some((service) => service.toLowerCase() === entry.toLowerCase()),
      );

    if (additions.length > 0) setServices([...services, ...additions]);
    setDraft("");
  }

  function remove(name: string) {
    setServices(services.filter((service) => service !== name));
    setEmergency(emergency.filter((service) => service !== name));
  }

  function toggleEmergency(name: string) {
    setEmergency(
      emergency.includes(name)
        ? emergency.filter((service) => service !== name)
        : [...emergency, name],
    );
  }

  return (
    <form action={formAction} className="space-y-5">
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

      <input type="hidden" name="services" value={services.join(", ")} />
      {emergency.map((name) => (
        <input key={name} type="hidden" name="emergency" value={name} />
      ))}

      <div>
        <label htmlFor="service-draft" className="block text-sm font-medium text-zinc-300">
          Services you offer
        </label>
        <input
          id="service-draft"
          type="text"
          value={draft}
          placeholder="Burst pipes, boiler repair, bathroom fitting"
          aria-describedby="service-draft-hint"
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) add(value);
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
            if (event.key === "Backspace" && draft === "" && services.length > 0) {
              remove(services[services.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10"
        />
        <p id="service-draft-hint" className="mt-2 text-xs text-zinc-400">
          Type a service and press Enter. Use the words your customers would.
        </p>
      </div>

      {/*
        Suggestions, from what they told us they do on the previous step.
        Offered rather than applied: a plumber who does not touch oil boilers
        should not find one on their list because we assumed it. Each one still
        has to be tapped, and anything already added disappears from the row so
        the remaining chips are always things worth pressing.
      */}
      {trade && unusedSuggestions.length > 0 && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs text-zinc-400">
              Common for a {trade.noun} — tap to add
            </p>
            <button
              type="button"
              onClick={() => apply(unusedSuggestions)}
              className="text-xs text-zinc-300 underline underline-offset-4 transition hover:text-white"
            >
              Add all {unusedSuggestions.length}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {unusedSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => apply([suggestion])}
                className="min-h-11 rounded-full border border-white/15 px-3.5 text-xs text-zinc-300 transition hover:border-white/35 hover:text-white"
              >
                + {suggestion.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <fieldset className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <legend className="px-1 text-sm font-medium text-zinc-200">
            Which can be emergencies?
          </legend>
          <ul className="mt-2 divide-y divide-white/5">
            {services.map((service) => (
              <li
                key={service}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={emergency.includes(service)}
                    onChange={() => toggleEmergency(service)}
                    className="h-4 w-4 flex-none rounded border-white/25 bg-white/10 accent-white"
                  />
                  <span className="truncate text-zinc-200">{service}</span>
                </label>

                <button
                  type="button"
                  onClick={() => remove(service)}
                  className="flex-none text-xs text-zinc-500 transition hover:text-white"
                >
                  Remove
                  <span className="sr-only"> {service}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-400">
            Emergencies get flagged as urgent and alert you straight away, even
            out of hours.
          </p>
        </fieldset>
      )}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
