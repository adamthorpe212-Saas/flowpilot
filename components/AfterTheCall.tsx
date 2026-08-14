import { DEMO_BUSINESS_NAME } from "@/lib/demo-example";
import { DEMO_CALLER_DISPLAY } from "@/lib/demo-numbers";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  jobAlert,
  render,
} from "@/lib/messages";

/**
 * The two texts that go out once the caller hangs up.
 *
 * Both generated here by the same functions the live pipeline uses, from the
 * default template a new business actually gets. Retyping the wording into
 * marketing copy would let the site keep promising an old format after the
 * product changed — and this is a promise about something the customer's own
 * customers will read.
 *
 * Two bubbles, not two phones. This was a pair of 400px handsets side by side,
 * seven hundred pixels of the page spent saying "you get a text", above a
 * section where the app itself can be clicked through. The mockups were the
 * loudest thing on the page and the least of what somebody is buying, so they
 * are a footnote under the tour now. The messages themselves are unchanged —
 * they are the part that was ever worth showing.
 */

const EXAMPLE = {
  callerName: "John Murphy",
  jobType: "Move the sink and dishwasher, new radiator",
  location: "14 Griffith Avenue, Glasnevin",
  neededBy: "Week of the 22nd, before the floors go down",
  // The same business the live demo answers as. These sat on one page saying
  // different names, which reads as two different products.
  businessName: DEMO_BUSINESS_NAME,
};

export default function AfterTheCall() {
  const toTradesperson = jobAlert({
    urgent: false,
    callerName: EXAMPLE.callerName,
    jobType: EXAMPLE.jobType,
    location: EXAMPLE.location,
    neededBy: EXAMPLE.neededBy,
    callerNumber: DEMO_CALLER_DISPLAY,
    // A stand-in code, but a real link shape — this is the tap that opens the
    // job, and showing the text without it would sell a different product from
    // the one that ships.
    link: "flowpilot.ie/j/K4x9M2p7",
  });

  const toCustomer = render(DEFAULT_CONFIRMATION_TEMPLATE, {
    caller_name: EXAMPLE.callerName,
    job_type: EXAMPLE.jobType,
    location: EXAMPLE.location,
    business_name: EXAMPLE.businessName,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Message
        label="Texted to you"
        body={toTradesperson}
        caption="Enough to know whether you can take it before you ring anyone back."
        emphasis
      />
      <Message
        label="Texted to your customer"
        body={toCustomer}
        caption="They know they've been heard, and a misheard address gets corrected before anyone drives anywhere."
      />
    </div>
  );
}

function Message({
  label,
  body,
  caption,
  emphasis = false,
}: {
  label: string;
  body: string;
  caption: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </p>

      {/*
        `whitespace-pre-line` because jobAlert() is a real SMS and its line
        breaks are part of the message. Collapsed to spaces it reads as a
        paragraph, which is not what lands on anybody's phone.
      */}
      <p
        className={`mt-2.5 whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[12px] leading-[1.55] ${
          emphasis ? "bg-[#2c2c31] text-zinc-50" : "bg-white/[0.06] text-zinc-300"
        }`}
      >
        {body}
      </p>

      <p className="mt-2.5 text-[12px] leading-5 text-zinc-500">{caption}</p>
    </div>
  );
}
