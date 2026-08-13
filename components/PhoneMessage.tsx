import PhoneFrame from "@/components/PhoneFrame";

/**
 * A text message, on a phone.
 *
 * The message body is rendered from the live templates, so what the site shows
 * is literally what the product sends. That is the reason this exists as one
 * component rather than two hand-built versions — the copy must not drift.
 *
 * What changed here is presentation, and the two that matter are not styling
 * preferences. The message now sits at the BOTTOM of the screen, where a
 * message sits in a real thread, rather than floating in the middle of it. And
 * the bubble is a solid fill with a tail rather than a translucent bordered
 * box — that single corner is most of what makes something read as a text
 * instead of a card.
 */
export default function PhoneMessage({
  sender,
  body,
  emphasis = false,
  className = "h-[400px] w-[236px]",
}: {
  sender: string;
  body: string;
  /** The message this page is actually about, versus the one alongside it. */
  emphasis?: boolean;
  className?: string;
}) {
  /*
   * The link is pulled out and tinted, because that is what a phone does to a
   * URL — and because it is the tappable thing. It is a real route: the alert
   * carries /j/<code> and lib/voice/notify.ts generates it against a lead that
   * exists, so showing it prominently is not a promise the product cannot keep.
   */
  const lines = body.split("\n");
  const linkIndex = lines.findIndex((line) => /^\S+\.\S+\/j\//.test(line.trim()));
  const messageLines = linkIndex === -1 ? lines : lines.slice(0, linkIndex);
  const link = linkIndex === -1 ? null : lines[linkIndex].trim();

  /*
   * The first line is the headline — "New job" or "URGENT - new job" — and the
   * second is who rang. Joining them onto one bold line is how the alert reads
   * on a real handset, where a two-word first line looks like a mistake.
   */
  const [headline, caller, ...rest] = messageLines;

  return (
    <PhoneFrame className={className}>
      <p className="flex-none border-b border-white/[0.07] pb-2.5 pt-1 text-center text-[11px] font-medium text-zinc-200">
        <span
          aria-hidden="true"
          className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300"
        >
          {sender.charAt(0)}
        </span>
        {sender}
      </p>

      {/* justify-end, not justify-center: a thread fills from the bottom. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end px-2.5 pb-1">
        <p className="mb-2 text-center text-[9px] text-zinc-600">Today 9:41</p>

        {/*
          rounded-bl-sm is the tail. A received bubble squares off at the corner
          nearest the sender, and without it this reads as a rounded card.
        */}
        <div
          className={`max-w-[96%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 ${
            emphasis ? "bg-[#2e2e34]" : "bg-[#26262b]"
          }`}
        >
          <p className="text-[12px] font-semibold leading-[1.55] text-zinc-50">
            {[headline, caller].filter(Boolean).join(" — ")}
          </p>
          {rest.length > 0 && (
            <p className="whitespace-pre-line text-[12px] leading-[1.55] text-zinc-50">
              {rest.join("\n")}
            </p>
          )}
          {link && (
            <p className="mt-1.5 text-[11px] leading-[1.4] text-sky-300">
              {link}
            </p>
          )}
        </div>

        <p className="mt-1.5 pl-1 text-[9px] text-zinc-600">Delivered</p>
      </div>
    </PhoneFrame>
  );
}
