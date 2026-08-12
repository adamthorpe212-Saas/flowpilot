import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/**
 * Carries the two things a stranger looks for before entering a card: who they
 * would be paying, and where the terms are.
 *
 * The trading name is stated in full rather than as "FlowPilot" alone. Somebody
 * whose statement will read Adam Thorpe should be able to see that before they
 * pay, not after.
 */
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-sm text-zinc-500">
          <p className="text-zinc-400">AI reception for Irish trades.</p>
          <p className="mt-2">{LEGAL.entity}</p>
          <p className="mt-1">{LEGAL.address}</p>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-500"
        >
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            Terms
          </Link>
          <a
            href={`mailto:${LEGAL.email}`}
            className="transition hover:text-white"
          >
            Contact
          </a>
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-sm text-zinc-600">
        © 2026 {LEGAL.tradingName}
      </p>
    </footer>
  );
}
