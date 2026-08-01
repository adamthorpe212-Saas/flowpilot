"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "assistant" | "caller"; text: string };

const GREETING =
  "Hello, O'Brien Plumbing — sorry we missed you. What's the problem?";

const OPENERS = [
  "My boiler has burst",
  "There's water pouring through my ceiling",
  "My radiator won't heat up",
];

/**
 * Plausible next answers, offered once the receptionist has asked something.
 *
 * Suggestions rather than auto-play: the visitor still chooses every reply, so
 * the conversation stays genuinely theirs, but answering costs one click
 * instead of a sentence of typing. A demo that requires four paragraphs of
 * input from a browsing stranger is a demo most people abandon halfway.
 */
function suggestFor(question: string): string[] {
  const asked = question.toLowerCase();

  if (asked.includes("where") || asked.includes("address")) {
    return ["14 Griffith Avenue, Glasnevin", "Raheny, Dublin 5"];
  }
  if (asked.includes("name")) return ["Adam", "Adam Thorpe"];
  if (asked.includes("when") || asked.includes("suit")) {
    return ["This afternoon if possible", "Tomorrow morning"];
  }
  if (asked.includes("emergency") || asked.includes("urgent") || asked.includes("wait")) {
    return ["It's an emergency", "It can wait a day or two"];
  }
  if (asked.includes("water") || asked.includes("mains") || asked.includes("off")) {
    return ["Yes, I've turned it off", "No, I can't find the valve"];
  }
  return ["Yes", "No, that's everything"];
}

const FIELD_LABELS: Record<string, string> = {
  job_type: "Job",
  location: "Address",
  urgency: "Urgency",
  contact_name: "Name",
  preferred_time: "Wants",
};

const FIELD_ORDER = [
  "contact_name",
  "job_type",
  "urgency",
  "location",
  "preferred_time",
];

export default function LiveDemo() {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", text: GREETING },
  ]);
  const [captured, setCaptured] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep the newest turn in view without yanking the whole page around.
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, thinking]);

  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
  const started = turns.some((turn) => turn.role === "caller");
  const suggestions = started
    ? suggestFor(lastAssistant?.text ?? "")
    : OPENERS;

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking || complete) return;

    const withCaller: Turn[] = [...turns, { role: "caller", text: message }];
    setTurns(withCaller);
    setDraft("");
    setThinking(true);
    setError(null);

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, transcript: turns }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      setTurns([...withCaller, { role: "assistant", text: data.speech }]);
      setCaptured((current) => ({ ...current, ...(data.captured ?? {}) }));
      if (data.complete) setComplete(true);
    } catch {
      setError("Couldn't reach the receptionist. Try again in a moment.");
    } finally {
      setThinking(false);
    }
  }

  const rows = FIELD_ORDER.filter((key) => captured[key]).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    value: captured[key],
  }));

  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex min-h-[340px] flex-col rounded-2xl border border-white/12 bg-white/[0.02] p-5">
        <div className="flex flex-none items-center gap-2 border-b border-white/8 pb-3">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${complete ? "bg-zinc-600" : "bg-emerald-400"}`}
          />
          <span className="text-xs text-zinc-500">
            O&apos;Brien Plumbing ·{" "}
            {complete ? "call ended" : "call in progress"}
          </span>
        </div>

        <div
          ref={threadRef}
          className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1"
          style={{ maxHeight: "18rem" }}
        >
          {turns.map((turn, index) => (
            <div key={index} className="fp-rise-in">
              <p
                className={`text-[10px] uppercase tracking-[0.14em] ${
                  turn.role === "assistant" ? "text-white/55" : "text-zinc-600"
                }`}
              >
                {turn.role === "assistant" ? "FlowPilot" : "Caller"}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${
                  turn.role === "assistant" ? "text-white" : "text-zinc-400"
                }`}
              >
                {turn.text}
              </p>
            </div>
          ))}

          {thinking && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">
                FlowPilot
              </p>
              <p className="mt-1 text-sm text-zinc-600">thinking…</p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/12 bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          Job record
        </p>

        {rows.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-zinc-600">
            Nothing captured yet. It fills in as the caller talks.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {rows.map((row) => (
              <li key={row.key} className="fp-rise-in flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-emerald-400/15 text-[9px] text-emerald-300"
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                    {row.label}
                  </span>
                  <span className="block text-xs text-white">{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {complete && (
          <div className="mt-4 border-t border-white/8 pt-3">
            <p className="text-xs text-emerald-300">Sent to Dave&apos;s phone</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              He rings back knowing the job before he dials.
            </p>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            {error}
          </p>
        )}

        {!complete ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(draft);
              }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={started ? "Say something else…" : "My boiler has burst"}
                aria-label="What a caller might say"
                maxLength={300}
                className="flex-1 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
              />
              <button
                type="submit"
                disabled={thinking || !draft.trim()}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-40"
              >
                Send
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={thinking}
                  className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-zinc-400 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-5 text-center">
            <p className="text-sm text-zinc-300">
              That&apos;s a job captured, start to finish — without you touching
              your phone.
            </p>
            <a
              href="/signup"
              className="mt-4 inline-block rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Set this up for my business
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
