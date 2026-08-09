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
  className = "h-[300px] w-[172px]",
}: {
  sender: string;
  body: string;
  /** The message this page is actually about, versus the one alongside it. */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <PhoneFrame className={className}>
      <div className="flex h-full flex-col justify-center px-3">
        <p className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">
          {sender}
        </p>
        <div
          className={`mt-2 rounded-2xl px-3 py-2.5 ${
            emphasis
              ? "border border-white/15 bg-white/[0.07]"
              : "border border-white/10 bg-white/[0.04]"
          }`}
        >
          <p className="text-[11px] leading-[1.45] text-white">{body}</p>
        </div>
        <p className="mt-2 text-[9px] text-zinc-500">Delivered · just now</p>
      </div>
    </PhoneFrame>
  );
}
