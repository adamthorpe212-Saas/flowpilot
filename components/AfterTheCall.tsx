import PhoneMessage from "@/components/PhoneMessage";
import { DEMO_BUSINESS_NAME } from "@/lib/demo-example";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  jobAlert,
  render,
} from "@/lib/messages";

/**
 * The two texts that go out once the caller hangs up.
 *
 * Both are generated here by the same functions the live pipeline uses, from
 * the default template a new business actually gets. Retyping the wording into
 * marketing copy would let the site keep promising an old format after the
 * product changed, and this is a promise about something the customer's own
 * customers will read.
 *
 * This replaced three cards describing what arrives. Describing a text message
 * is a strange thing to do when you can simply show it.
 */

const CALLER_NUMBER = "087 412 9008";

/*
 * A planned job, not an emergency.
 *
 * This used to be a burst pipe with water coming through a ceiling, which made
 * the whole product look like an out-of-hours call-out service. Most of the work
 * these businesses actually take is booked in advance — a bathroom, a rewire, a
 * job somebody wants done before Christmas — and for that the date is the field
 * the tradesperson reads first.
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
    callerNumber: CALLER_NUMBER,
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
    <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
      <Side
        label="Your phone"
        tone="bright"
        caption="The job, the address and the date they want it — enough to know whether you can take it before you ring anyone back."
      >
        <PhoneMessage sender="FlowPilot" body={toTradesperson} emphasis />
      </Side>

      <Side
        label="Your customer's phone"
        tone="dim"
        caption="They know they have been heard, and a misheard address gets corrected before anyone drives anywhere."
      >
        <PhoneMessage sender={EXAMPLE.businessName} body={toCustomer} />
      </Side>
    </div>
  );
}

function Side({
  label,
  tone,
  caption,
  children,
}: {
  label: string;
  tone: "dim" | "bright";
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <p
        className={`text-[11px] uppercase tracking-[0.2em] ${
          tone === "bright" ? "text-white" : "text-zinc-400"
        }`}
      >
        {label}
      </p>

      <div className="mt-5">{children}</div>

      <p className="mt-5 max-w-[17rem] text-center text-xs leading-5 text-zinc-400">
        {caption}
      </p>
    </div>
  );
}
