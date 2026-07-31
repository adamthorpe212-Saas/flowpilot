"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useEffect, useState } from "react";
import PhoneFrame from "@/components/PhoneFrame";
import { conversation } from "@/lib/content";
import type { ConversationEvent } from "@/types";

const FIRST_BEAT_MS = 600;
const BEAT_MS = 2400;

function EventCard({ event }: { event: ConversationEvent }) {
  if (event.kind === "missed-call") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-zinc-900 p-2">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-950 text-red-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-2.5 w-2.5"
          >
            <path d="M3 3l18 18" />
            <path d="M5.5 9.5a16 16 0 0 0 9 9l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4h3l1 3.5z" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[9px] font-semibold text-white sm:text-[10px]">
            {event.name}
          </span>
          <span className="block text-[8px] text-zinc-500 sm:text-[9px]">
            Missed call
          </span>
        </span>
      </div>
    );
  }

  if (event.kind === "job") {
    return (
      <div className="rounded-xl bg-white p-2">
        <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-500 sm:text-[8px]">
          New job
        </p>
        <p className="mt-1 text-[10px] font-semibold text-zinc-900">
          {event.job} · {event.location.split(",")[0]}
        </p>
        <dl className="mt-1.5 space-y-1 text-[8px] text-zinc-700 sm:text-[9px]">
          {[
            ["Urgency", event.urgency],
            ["Contact", event.contact],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (event.kind === "confirmation-sms") {
    return (
      <div className="rounded-xl border border-white/15 bg-white/[0.06] p-2">
        <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-500 sm:text-[8px]">
          Text message
        </p>
        <p className="mt-1 text-[9px] leading-relaxed text-zinc-200 sm:text-[10px]">
          {event.text}
        </p>
      </div>
    );
  }

  // A transcript line, not a chat bubble: speaker label above, both sides left
  // aligned. Bubbles would read as texting, which is the wrong product.
  const isFlowPilot = event.speaker === "flowpilot";

  return (
    <div>
      <p
        className={`text-[7px] uppercase tracking-[0.14em] sm:text-[8px] ${
          isFlowPilot ? "text-white/70" : "text-zinc-600"
        }`}
      >
        {isFlowPilot ? "FlowPilot" : "Caller"}
      </p>
      <p
        className={`mt-0.5 text-[9px] leading-relaxed sm:text-[10px] ${
          isFlowPilot ? "text-white" : "text-zinc-400"
        }`}
      >
        {event.text}
      </p>
    </div>
  );
}

function CallHeader({ live }: { live: boolean }) {
  return (
    <div className="flex-none border-b border-white/10 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${
            live ? "bg-emerald-400" : "bg-zinc-600"
          }`}
        />
        <p className="text-[9px] font-semibold text-white sm:text-[10px]">
          O&apos;Brien Plumbing
        </p>
      </div>
      <p className="text-[7px] text-zinc-600 sm:text-[8px]">
        {live ? "Call in progress" : "Call ended"}
      </p>
    </div>
  );
}

function Device({
  label,
  header,
  events,
}: {
  label: string;
  header: React.ReactNode;
  events: ConversationEvent[];
}) {
  return (
    <div>
      <p className="mb-2 text-center text-[9px] uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">
        {label}
      </p>
      <PhoneFrame className="h-[300px] sm:h-[380px] lg:h-[420px]">
        <div className="flex h-full flex-col">
          {header}
          <div className="min-h-0 flex-1 space-y-2.5 overflow-hidden p-2">
            {events.map((event, i) => (
              <div key={`${event.kind}-${i}`} className="fp-rise-in">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

export default function ConversationDemo() {
  const reduceMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    if (shown >= conversation.length) return;
    const id = setTimeout(
      () => setShown((current) => current + 1),
      shown === 0 ? FIRST_BEAT_MS : BEAT_MS,
    );
    return () => clearTimeout(id);
  }, [shown, reduceMotion]);

  // Derived rather than pushed into state: anyone who has asked for less motion
  // gets the finished transcript, without the timer ever running.
  const revealed = reduceMotion ? conversation : conversation.slice(0, shown);
  const latest = revealed[revealed.length - 1];
  const finished = shown >= conversation.length;

  const callEnded =
    reduceMotion ||
    revealed.some((event) => event.kind === "confirmation-sms");

  return (
    <div>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:max-w-xl sm:gap-5">
        <Device
          label="Customer's phone"
          header={<CallHeader live={!callEnded} />}
          events={revealed.filter((event) => event.device === "customer")}
        />
        <Device
          label="Your phone"
          header={
            <div className="flex-none border-b border-white/10 px-2 py-1.5">
              <p className="text-[9px] font-semibold text-white sm:text-[10px]">
                FlowPilot
              </p>
              <p className="text-[7px] text-zinc-600 sm:text-[8px]">Job alerts</p>
            </div>
          }
          events={revealed.filter((event) => event.device === "you")}
        />
      </div>

      <p
        aria-live="polite"
        className="mx-auto mt-6 min-h-[2.5rem] max-w-sm text-center text-sm text-zinc-400"
      >
        {latest?.caption ?? ""}
      </p>

      {finished && !reduceMotion && (
        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => setShown(0)}
            className="rounded-full border border-white/15 px-5 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
