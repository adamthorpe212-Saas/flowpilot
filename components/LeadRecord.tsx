import { EXAMPLE_CAPTURED, EXAMPLE_TURNS } from "@/lib/demo-example";
import { DEMO_CALLER_DISPLAY } from "@/lib/demo-numbers";
import { STATUS_LABELS } from "@/lib/lead-views";
import type { LeadStatus } from "@/types/database";

/**
 * A job opened up: the details, where it's at, and what was said.
 *
 * The site could be read end to end without ever learning that FlowPilot keeps
 * the conversation — which is the feature that separates it from a service that
 * texts you a name and a number. "What was said" is the answer to "how do I
 * know it got it right", and it was nowhere on the public site.
 *
 * Not a phone mockup. The hero already carries the one bezel this page gets,
 * and a second would be the repetition that made the old page tiring. This is
 * the record as it appears on a laptop, which is also where somebody reads a
 * transcript back.
 *
 * The stage rail is generated from STATUS_LABELS — the same map the dashboard
 * renders — so the site cannot advertise a pipeline the product does not have.
 * These labels have been renamed once already ("Contacted" became "Called
 * back") and marketing copy would not have followed.
 */

/** The order the dashboard walks a job through. */
const FLOW: LeadStatus[] = [
  "new",
  "qualified",
  "contacted",
  "booked",
  "completed",
  "lost",
];

/** Where this example sits: rung back, not yet booked. */
const CURRENT: LeadStatus = "contacted";

const DETAILS: [string, string][] = [
  ["Job", EXAMPLE_CAPTURED.job_type],
  ["Address", EXAMPLE_CAPTURED.location],
  ["Wants it", EXAMPLE_CAPTURED.preferred_time],
  ["Number", DEMO_CALLER_DISPLAY],
];

export default function LeadRecord({
  /**
   * Off on the homepage.
   *
   * A nine-turn conversation is the most convincing thing here and the wrong
   * thing to meet first — it was the tallest object on the landing page, and
   * somebody deciding in fifteen seconds does not want to read a plumber's
   * phone call. It belongs where somebody has already chosen to look properly,
   * which is the tour on /how-it-works.
   *
   * A prop rather than two components, because the half that stays has to be
   * the same half in both places.
   */
  transcript = true,
}: {
  transcript?: boolean;
} = {}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
      {/*
        With the transcript, the record is the job beside what was said. Without
        it, the same content splits down the middle instead — details on one
        side, where it's at and what you can do on the other — so the panel
        still fills its width rather than leaving half of it empty.
      */}
      <div className={transcript ? "grid lg:grid-cols-[1.05fr_1fr]" : "grid sm:grid-cols-2"}>
        <div
          className={`p-6 sm:p-8 ${
            transcript
              ? "border-b border-white/10 lg:border-b-0 lg:border-r"
              : "border-b border-white/10 sm:border-b-0 sm:border-r"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            The job
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">
            {EXAMPLE_CAPTURED.contact_name}
          </h3>

          <dl className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {DETAILS.map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-5 py-3.5 text-sm"
              >
                <dt className="flex-none text-zinc-500">{label}</dt>
                <dd className="min-w-0 text-right text-zinc-200">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Alongside the details only when the transcript takes the column. */}
          {transcript && <Progress className="mt-6" />}
        </div>

        <div className="p-6 sm:p-8">
          {!transcript && <Progress />}
          {transcript && (
            <>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            What was said
          </p>

          {/*
            The real exchange, from the same fixture the demo falls back to —
            so the transcript shown here cannot describe a receptionist that
            asks different questions from the one on /how-it-works.
          */}
          <ol className="mt-4 space-y-2.5">
            {EXAMPLE_TURNS.map((turn, index) => (
              <li
                key={index}
                className={
                  turn.role === "assistant" ? "flex" : "flex justify-end"
                }
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.55] ${
                    turn.role === "assistant"
                      ? "rounded-bl-sm bg-white/[0.06] text-zinc-200"
                      : "rounded-br-sm bg-white/[0.12] text-white"
                  }`}
                >
                  {turn.text}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-5 border-t border-white/[0.07] pt-4 text-[13px] leading-5 text-zinc-500">
            Kept with the job, so you can check exactly what was agreed. Calls
            are transcribed, never recorded.
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Where the job is up to, and the two things you can do with it.
 *
 * Its own component because it moves: beside the details when the transcript
 * takes the second column, into the second column when it does not. Rendering
 * it twice and hiding one would put a duplicate stage rail in the page for
 * anything reading the markup rather than the pixels.
 */
function Progress({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        Where it&apos;s at
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {FLOW.map((status) => (
          <li
            key={status}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              status === CURRENT
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 text-zinc-500"
            }`}
          >
            {STATUS_LABELS[status]}
          </li>
        ))}
      </ul>

      {/*
        Styled as buttons but deliberately not buttons, and not links. Nothing
        here can be pressed, so nothing here needs to be reachable by keyboard —
        a tab stop that does nothing is worse than no tab stop. aria-hidden
        keeps them out of the accessibility tree, and the caption underneath
        tells a screen reader user what they do.
      */}
      <div aria-hidden="true" className="mt-6 flex flex-wrap gap-2">
        <span className="inline-flex min-h-10 items-center rounded-xl bg-white/10 px-4 text-sm font-medium text-white">
          Ring back
        </span>
        <span className="inline-flex min-h-10 items-center rounded-xl border border-white/15 px-4 text-sm text-zinc-300">
          Add to calendar
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-5 text-zinc-500">
        Ring them back or put the work in your diary, straight from the job.
      </p>
    </div>
  );
}
