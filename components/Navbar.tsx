import Link from "next/link";

/**
 * The site has exactly one conversion point, and it sits at the end of
 * /how-it-works. The home page therefore points people into the demo rather
 * than asking for a booking on arrival.
 */
export default function Navbar({
  action = "how-it-works",
}: {
  action?: "how-it-works" | "demo";
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight sm:text-xl">
          FlowPilot
        </Link>

        {action === "how-it-works" ? (
          <Link
            href="/how-it-works"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium transition hover:bg-white hover:text-black sm:px-5 sm:text-sm"
          >
            See how it works
          </Link>
        ) : (
          <a
            href="mailto:hello@flowpilot.ie"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium transition hover:bg-white hover:text-black sm:px-5 sm:text-sm"
          >
            Book a demo
          </a>
        )}
      </div>
    </header>
  );
}
