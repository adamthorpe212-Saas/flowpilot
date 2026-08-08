"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The question the FAQ didn't cover.
 *
 * Sits in the page below the FAQ rather than floating in a corner. A bubble
 * that follows somebody down a page is an interruption; this is offered at the
 * point they have just finished reading answers and either have what they need
 * or do not.
 */

const SUGGESTIONS = [
  "Do I keep my own number?",
  "Does this work with Vodafone?",
  "What happens when I'm on holiday?",
  "What if it can't answer the question?",
];

const MAX_LENGTH = 400;

type Turn = { role: "visitor" | "assistant"; text: string };

export default function AskFlowPilot() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, thinking]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || thinking || done) return;

    const withVisitor: Turn[] = [...turns, { role: "visitor", text: question }];
    setTurns(withVisitor);
    setDraft("");
    setThinking(true);
    setError(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, transcript: turns }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Couldn't get an answer just now.");
        // Put the question back so a retry is one tap, not retyping.
        setTurns(turns);
        setDraft(question);
        return;
      }

      setTurns([...withVisitor, { role: "assistant", text: data.reply }]);
      if (data.done) setDone(true);
    } catch {
      setError("Couldn't reach us just now. Try again in a moment.");
      setTurns(turns);
      setDraft(question);
    } finally {
      setThinking(false);
    }
  }

  const started = turns.length > 0;

  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.02] p-6 sm:p-8">
      <h3 className="text-lg font-semibold tracking-tight">
        Still have a question?
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Ask about setup, pricing or how the receptionist works. It only knows
        about FlowPilot, and it will say so when it doesn&apos;t know.
      </p>

      {started && (
        <div
          ref={threadRef}
          className="mt-6 max-h-72 space-y-5 overflow-y-auto pr-1"
        >
          {turns.map((turn, index) => (
            <div key={index} className="fp-rise-in">
              <p
                className={`text-[10px] uppercase tracking-[0.14em] ${
                  turn.role === "assistant" ? "text-white/55" : "text-zinc-500"
                }`}
              >
                {turn.role === "assistant" ? "FlowPilot" : "You"}
              </p>
              <p
                className={`mt-1 text-sm leading-6 ${
                  turn.role === "assistant" ? "text-zinc-200" : "text-zinc-400"
                }`}
              >
                {turn.text}
              </p>
            </div>
          ))}

          {thinking && (
            <p className="text-sm text-zinc-500" aria-live="polite">
              Thinking…
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          {error}
        </p>
      )}

      {!done && (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              ask(draft);
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="ask-flowpilot" className="sr-only">
              Ask a question about FlowPilot
            </label>
            <input
              id="ask-flowpilot"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Does it work with my network?"
              maxLength={MAX_LENGTH}
              className="min-h-12 flex-1 rounded-full border border-white/15 bg-white/[0.04] px-5 text-[15px] text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
            />
            <button
              type="submit"
              disabled={thinking || !draft.trim()}
              className="min-h-12 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-40"
            >
              Ask
            </button>
          </form>

          {!started && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  disabled={thinking}
                  className="min-h-11 rounded-full border border-white/15 px-4 text-[13px] text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
