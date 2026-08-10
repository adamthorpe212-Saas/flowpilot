/**
 * The whole product as one line: what happens between a missed call and a job.
 *
 * Replaces an animated card that mocked up the app itself. That version drew
 * fake Accept and Call back buttons, which is the trap of showing product UI on
 * a marketing page — it either looks like a screenshot of something that does
 * not exist, or it competes with the headline for the five seconds a
 * tradesperson gives the page.
 *
 * So this asserts nothing about what the software looks like. It says what
 * happens, in five short steps, and gets out of the way.
 *
 * A rail, not boxes. One hairline turns from vertical on a phone to horizontal
 * on a desktop with a single border swap, so the same markup reads as a list
 * one-handed and as a sequence on a laptop — no second layout to keep in step.
 */

const STEPS = [
  { label: "Customer rings", detail: "Your own number, as always." },
  { label: "You can't answer", detail: "You're under a sink, or driving." },
  { label: "FlowPilot answers", detail: "In your business's name." },
  { label: "Job written up", detail: "What, where, and when they want it." },
  { label: "Sent to you", detail: "With a link to the job." },
];

export default function WorkflowStrip() {
  return (
    <ol className="mx-auto grid max-w-5xl gap-0 sm:grid-cols-5">
      {STEPS.map((step, index) => {
        const last = index === STEPS.length - 1;

        return (
          <li
            key={step.label}
            className={`relative border-l py-2 pl-5 sm:border-l-0 sm:border-t sm:py-0 sm:pl-0 sm:pr-5 sm:pt-5 ${
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
              className={`absolute -left-[3.5px] top-[1.05rem] h-1.5 w-1.5 rounded-full sm:left-0 sm:-top-[3.5px] ${
                last ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />

            <p className="text-[15px] font-medium leading-6 text-white sm:text-sm">
              {step.label}
            </p>

            {/*
              Desktop only. The labels alone carry the sequence — these are
              texture, and on a phone they were turning a 180px strip into a
              350px one directly under the call to action. There is room for
              them beside a 205px column and nowhere near enough on a handset.
            */}
            <p className="mt-0.5 hidden text-[13px] leading-5 text-zinc-500 sm:block">
              {step.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
