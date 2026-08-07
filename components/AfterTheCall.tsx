import PhoneFrame from "@/components/PhoneFrame";
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

const EXAMPLE = {
  callerName: "John Murphy",
  jobType: "Water coming through kitchen ceiling",
  location: "14 Griffith Avenue, Glasnevin",
  businessName: "O'Brien Plumbing",
};

export default function AfterTheCall() {
  const toTradesperson = jobAlert({
    urgent: true,
    jobType: EXAMPLE.jobType,
    location: EXAMPLE.location,
    callerNumber: CALLER_NUMBER,
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
        caption="Everything you need to ring back already knowing the job. No voicemail to listen to, nothing to write down."
      >
        <Message body={toTradesperson} urgent />
      </Side>

      <Side
        label="Your customer's phone"
        tone="dim"
        caption="They know they have been heard, and a misheard address gets corrected before anyone drives anywhere."
      >
        <Message body={toCustomer} />
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

      <div className="mt-5">
        <PhoneFrame className="h-[300px] w-[172px]">{children}</PhoneFrame>
      </div>

      <p className="mt-5 max-w-[17rem] text-center text-xs leading-5 text-zinc-400">
        {caption}
      </p>
    </div>
  );
}

function Message({ body, urgent = false }: { body: string; urgent?: boolean }) {
  return (
    <div className="flex h-full flex-col justify-center px-3">
      <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
        {urgent ? "FlowPilot" : "O'Brien Plumbing"}
      </p>
      <div
        className={`mt-2 rounded-2xl px-3 py-2.5 ${
          urgent
            ? "border border-white/15 bg-white/[0.07]"
            : "border border-white/10 bg-white/[0.04]"
        }`}
      >
        <p className="text-[11px] leading-[1.45] text-white">{body}</p>
      </div>
      <p className="mt-2 text-[9px] text-zinc-500">Delivered · just now</p>
    </div>
  );
}
