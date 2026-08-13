import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/**
 * Where the terms are, and how to reach the business.
 *
 * This used to carry the owner's full name and home address, on the argument
 * that somebody whose card statement will read a person's name should see it
 * before paying rather than after. That argument was sound about the statement
 * and wrong about the footer: it put a private residence on every page of a
 * marketing site to solve a problem that belongs on the checkout.
 *
 * The name still appears where it has to — Stripe shows the real trading name
 * at the moment of payment, which is the only place it genuinely protects
 * anyone.
 */
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-sm text-zinc-500">
          <p className="text-zinc-400">AI reception for Irish trades.</p>
          <p className="mt-2">{LEGAL.country}</p>
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
