/**
 * One call, from missed to booked, in four steps.
 *
 * Replaces a five-step strip that spent two of its five on the same beat —
 * "Customer rings" then "You can't answer" — and stopped at "Sent to you". That
 * ending was the whole problem with how the site described FlowPilot: it read
 * as a service that texts you, when the text is the least of what a customer is
 * paying for after the first week.
 *
 * So the last step is the one that was missing. The job does not end when the
 * SMS lands; it ends when the work is in the diary.
 *
 * A rail, not boxes. One hairline turns from vertical on a phone to horizontal
 * on a desktop with a single border swap, so the same markup reads as a list
 * one-handed and as a sequence on a laptop — no second layout to keep in step.
 */

const STEPS = [
  {
    label: "You miss the call",
    detail: "Your own number, as always. You're on a job, or driving.",
  },
  {
    label: "FlowPilot answers",
    detail: "In your business's name, and finds out what the job is.",
  },
  {
    label: "The lead lands in your app",
    detail: "Who rang, what they need, where, and when they want it.",
  },
  {
    label: "You ring back or book it",
    detail: "Straight from the job, into your calendar.",
  },
];

export default function CustomerJourney() {
  return (
    <ol className="mx-auto grid max-w-5xl gap-0 sm:grid-cols-4">
      {STEPS.map((step, index) => {
        const last = index === STEPS.length - 1;

        return (
          <li
            key={step.label}
            className={`relative border-l py-2.5 pl-5 sm:border-l-0 sm:border-t sm:py-0 sm:pl-0 sm:pr-6 sm:pt-5 ${
              // The outcome is the only step that earns colour. Marking every
              // one would mark none of them.
              last ? "border-emerald-400/40" : "border-white/12"
            }`}
          >
            {/*
              The dot sits on the rail itself — centred on the left border on a
              phone, on the top border on a desktop.
            */}
            <span
              aria-hidden="true"
              className={`absolute -left-[3.5px] top-[1.15rem] h-1.5 w-1.5 rounded-full sm:left-0 sm:-top-[3.5px] ${
                last ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />

            <p className="text-[15px] font-medium leading-6 text-white sm:text-sm">
              {step.label}
            </p>

            {/*
              Desktop only. The labels alone carry the sequence — these are
              texture, and on a phone they turn a compact strip into a wall of
              text directly under the call to action.
            */}
            <p className="mt-1 hidden text-[13px] leading-5 text-zinc-500 sm:block">
              {step.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
