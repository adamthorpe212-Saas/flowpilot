"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Marketing navigation.
 *
 * Deliberately does not read the auth session: doing so would make every
 * marketing page dynamic and give up static prerendering on the pages that most
 * need to be fast. A signed-in user who taps "Sign in" is redirected straight to
 * their dashboard by middleware, so the only cost is a label that is briefly
 * wrong for people who are already customers.
 */
export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center py-2 text-lg font-semibold tracking-tight sm:text-xl"
          onClick={() => setOpen(false)}
        >
          FlowPilot
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 text-sm text-zinc-400 md:flex"
        >
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            Get FlowPilot
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/5 md:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 8h16" />
                <path d="M4 16h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-white/10 bg-black md:hidden">
          <nav aria-label="Primary" className="flex flex-col px-5 py-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/5 py-3 text-sm text-zinc-300 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="border-b border-white/5 py-3 text-sm text-zinc-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full bg-white px-5 py-3 text-center text-sm font-medium text-black"
            >
              Get FlowPilot
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
