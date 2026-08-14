import Link from "next/link";

/**
 * A way to buy that follows them down the page.
 *
 * Measured on the live site at 375px: the signup buttons sat at 394px, 4,474px
 * and 5,529px. Between the hero and the pricing card there were FOUR THOUSAND
 * pixels — five full screens — with no way to sign up. Somebody convinced by
 * "Every lead. Every job. One place." had to scroll through the whole calendar
 * section and most of the pricing section before they could act on it, and
 * every one of those screens is a chance to put the phone down.
 *
 * That matters more now the traffic is paid and all of it is on a phone. A
 * visitor who arrived from an ad has no loyalty and no reason to hunt.
 *
 * It also carries the price. "159" did not appear until 69% of the way through
 * the page text, and "how much" is the first thing a tradesperson wants to
 * know.
 *
 * ---
 *
 * No JavaScript, and that is a decision rather than laziness.
 *
 * The first version faded in once the hero scrolled away, which is tidier and
 * could not be verified: in a browser pane that is not compositing frames,
 * neither IntersectionObserver nor scroll events fire at all — scrollY moved
 * from 0 to 2000 and exactly zero scroll events were dispatched. So the
 * behaviour was untestable before going in front of traffic somebody is paying
 * for.
 *
 * Always visible is simpler, provable, and probably better anyway: the price
 * stays on screen the whole way down instead of appearing a screen late. The
 * argument for hiding it was that two calls to action at once looks like
 * shouting — a fair aesthetic point, and worth less than a button that is
 * always there.
 */
export default function StickyCta({
  price,
  allowance,
}: {
  price: string;
  allowance: number;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-xl sm:hidden"
      /*
       * Padded for the home indicator on an iPhone, which otherwise sits on top
       * of the button — the one control on the page that must never be awkward
       * to press.
       */
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">
            {price}
            <span className="font-normal text-zinc-400">/month</span>
          </p>
          <p className="mt-0.5 text-[12px] leading-tight text-zinc-400">
            {allowance} answered calls · cancel any time
          </p>
        </div>

        <Link
          href="/signup"
          className="inline-flex min-h-12 flex-none items-center rounded-full bg-white px-6 text-[15px] font-semibold text-black"
        >
          Get FlowPilot
        </Link>
      </div>
    </div>
  );
}
