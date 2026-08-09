import PhoneFrame from "@/components/PhoneFrame";

/**
 * A text message, on a phone.
 *
 * Extracted from AfterTheCall once the homepage needed the same thing. Two
 * hand-built versions of "an SMS in a bezel" would have drifted the first time
 * either page was touched, and the message body is the part that must not drift
 * — it is rendered from the live templates, so what the site shows is literally
 * what the product sends.
 */
export default function PhoneMessage({
  sender,
  body,
  emphasis = false,
  className = "h-[330px] w-[202px]",
}: {
  sender: string;
  body: string;
  /** The message this page is actually about, versus the one alongside it. */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <PhoneFrame className={className}>
      {/*
        The message is the point; the bezel is packaging.

        The sender and timestamp were set at 9px and the body at 11px, which on
        a phone is decoration shaped like a text message rather than a text
        message. Everything moved up a step and the frame widened to hold it —
        if a visitor has to lean in to read the thing we are selling, the frame
        around it is costing more than it earns.
      */}
      <div className="flex h-full flex-col justify-center px-3.5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          {sender}
        </p>
        <div
          className={`mt-2.5 rounded-2xl px-3.5 py-3 ${
            emphasis
              ? "border border-white/15 bg-white/[0.07]"
              : "border border-white/10 bg-white/[0.04]"
          }`}
        >
          {/*
            whitespace-pre-line because the alert is one field per line now.
            Without it the browser collapses every newline and the site shows a
            wall of text that is not what arrives on anybody's phone.
          */}
          <p className="whitespace-pre-line text-[13px] leading-[1.5] text-white">
            {body}
          </p>
        </div>
        <p className="mt-2.5 text-[11px] text-zinc-500">Delivered · just now</p>
      </div>
    </PhoneFrame>
  );
}
