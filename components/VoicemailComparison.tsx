"use client";

import { useEffect, useState } from "react";
import PhoneFrame from "@/components/PhoneFrame";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * The objection every tradesperson has: "I already have voicemail."
 *
 * Answered by running one missed call down both paths at the same time rather
 * than by asserting a difference in a table. The comparison only persuades if
 * it is visibly the same call — the point is not that FlowPilot is better in
 * the abstract, it is that this caller, on this job, ends up as a booking on
 * one side and a shrug on the other.
 *
 * Deliberately fair to voicemail: it does leave a message here. Stacking the
 * deck by showing silence would be the easier demo and the less convincing one,
 * because every plumber has heard a voicemail like this and knows exactly how
 * little it gives them.
 */

const STEPS = 4;
const STEP_MS = 1500;

type Field = { label: string; value: string };

const CAPTURED: Field[] = [
  { label: "Name", value: "John Murphy" },
  { label: "Job", value: "Burst pipe under the sink" },
  { label: "Urgency", value: "Emergency — water still running" },
  { label: "Address", value: "14 Griffith Avenue, Glasnevin" },
  { label: "Wants", value: "This afternoon" },
];

export default function VoicemailComparison() {
  const reduceMotion = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || step >= STEPS) return;

    const id = setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, step]);

  const play = () => {
    // Reduced motion still gets the answer, just without the theatre.
    if (reduceMotion) {
      setStep(STEPS);
      setPlaying(false);
      return;
    }
    setStep(0);
    setPlaying(true);
  };

  const finished = step >= STEPS;
  const started = playing || finished;

  return (
    <div>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={play}
          className="flex min-h-11 items-center rounded-full border border-white/20 px-6 text-sm text-white transition hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {finished ? "Play it again" : "Someone rings while you're under a sink"}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {finished
          ? "Voicemail left a vague message. FlowPilot captured the full job."
          : started
            ? "Playing the same missed call down both paths."
            : ""}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
        <Panel
          title="With voicemail"
          tone="dim"
          caption="You ring back blind, whenever you're next free. He rang two other plumbers while he waited."
        >
          <VoicemailScreen step={step} />
        </Panel>

        <Panel
          title="With FlowPilot"
          tone="bright"
          caption="You ring back knowing the job, the address and that it's urgent — or you don't ring at all, because it's already booked."
        >
          <CapturedScreen step={step} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  tone,
  caption,
  children,
}: {
  title: string;
  tone: "dim" | "bright";
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <p
        className={`text-[11px] uppercase tracking-[0.2em] ${
          tone === "bright" ? "text-white" : "text-zinc-500"
        }`}
      >
        {title}
      </p>

      <div className="mt-5">
        <PhoneFrame className="h-[330px] w-[172px]">{children}</PhoneFrame>
      </div>

      <p className="mt-5 max-w-[15rem] text-center text-xs leading-5 text-zinc-400">
        {caption}
      </p>
    </div>
  );
}

function Ringing() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Incoming
      </p>
      <p className="mt-2 text-sm text-white">087 xxx xxxx</p>
      <p className="mt-1 text-[10px] text-zinc-500">Unknown number</p>
    </div>
  );
}

function VoicemailScreen({ step }: { step: number }) {
  if (step === 0) return <Ringing />;

  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-2">
      <div className="fp-rise-in">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Missed call
        </p>
        <p className="mt-1 text-sm text-white">087 xxx xxxx</p>
      </div>

      {step >= 2 && (
        <div className="fp-rise-in mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Voicemail · 0:14
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            &ldquo;Ehh, yeah, howya — it&apos;s about the… there&apos;s water
            coming in under the thing. Can you give us a shout back when
            you&apos;re free. Thanks.&rdquo;
          </p>
        </div>
      )}

      {step >= 4 && (
        <div className="fp-rise-in mt-auto">
          <p className="text-[10px] leading-4 text-zinc-400">
            No name. No address. No idea if it&apos;s an emergency.
          </p>
        </div>
      )}
    </div>
  );
}

function CapturedScreen({ step }: { step: number }) {
  if (step === 0) return <Ringing />;

  if (step === 1) {
    return (
      <div className="fp-fade-in flex h-full flex-col items-center justify-center px-3 text-center">
        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <p className="mt-3 text-xs text-white">FlowPilot answered</p>
        <p className="mt-1 text-[10px] text-zinc-500">Talking to him now</p>
      </div>
    );
  }

  // One field at a time from step 2, so the record is visibly built from the
  // conversation rather than appearing whole.
  const shown = step >= 4 ? CAPTURED.length : Math.min(CAPTURED.length, (step - 1) * 2);

  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        New job
      </p>

      <ul className="mt-3 space-y-2.5">
        {CAPTURED.slice(0, shown).map((field) => (
          <li key={field.label} className="fp-rise-in">
            <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500">
              {field.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-white">
              {field.value}
            </p>
          </li>
        ))}
      </ul>

      {step >= 4 && (
        <p className="fp-rise-in mt-auto text-[10px] leading-4 text-emerald-300">
          Sent to your phone
        </p>
      )}
    </div>
  );
}
