"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

/*
 * Three destinations, all of them real pages.
 *
 * "FAQ" pointed at /#faq — an anchor four thousand pixels down the homepage.
 * On a phone that reads as a broken link, because the menu closes and the page
 * jumps somewhere with no heading in view; and it gave the mobile panel a link
 * that behaved differently from the two above it.
 */
const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  /*
   * A way to reach a person, in the navigation rather than only in the footer.
   * A tradesperson deciding on EUR159 a month wants to ask somebody first, and
   * a grey "Contact" under the privacy policy is not an answer to that.
   */
  { href: "/contact", label: "Talk to us" },
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

  /*
   * Nothing behind the panel scrolls while it is open. A full-height overlay
   * over a scrolling page is the single most common way a mobile menu feels
   * cheap — you flick it and the content slides around underneath.
   */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes it, because a panel with no keyboard exit is a trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/*
        Padded for the notch. `viewportFit: cover` makes an installed app fill
        the screen, and the cost is that a fixed header starts behind the clock
        and the battery. Resolves to zero in a browser tab, so it changes
        nothing there — but somebody who installs FlowPilot and then taps
        through to a marketing page would otherwise find this header half
        hidden.
      */}
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-6">
        <Link href="/" className="py-2">
          <Logo size="large" />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 text-sm text-zinc-400 md:flex"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-white"
            >
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
      </header>

      {/*
        A designed panel, not the desktop bar stacked.

        It fills the screen below the header, so the links are large targets in
        the lower half where a thumb actually reaches, and the two actions sit
        at the bottom as the last thing you see rather than as a third small
        line of text. Signing up is the point of the page, so it is a filled
        button here exactly as it is on desktop.

        A sibling of the header, not a child, and that is load-bearing: the
        header carries backdrop-blur, and backdrop-filter makes an element a
        containing block for fixed-position descendants. Nested inside, this
        panel resolved `bottom-0` against the 64px header instead of the
        viewport and rendered exactly zero pixels tall.

        Height in dvh so it still reaches the bottom on iOS Safari, where a
        collapsing address bar makes vh taller than what you can actually see.
      */}
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-black md:hidden"
          style={{
            top: "calc(4rem + env(safe-area-inset-top))",
            height: "calc(100dvh - 4rem - env(safe-area-inset-top))",
          }}
        >
          <nav
            aria-label="Primary"
            className="flex flex-col gap-1 px-5 pb-6 pt-4"
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                /*
                 * The panel is not a route, so it has to dismiss itself. Without
                 * this a tap on "FAQ" leaves it covering the page it just
                 * navigated to, which on a phone reads as a broken link because
                 * nothing visibly happens. The FAQ link makes it unavoidable:
                 * it is an anchor on the current page, so there is no
                 * navigation event to hook.
                 */
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center justify-between border-b border-white/8 text-[19px] font-medium text-white transition active:text-zinc-400"
              >
                {link.label}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-zinc-600"
                >
                  <path d="m8 5 5 5-5 5" />
                </svg>
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3 px-5 pb-10">
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="flex min-h-13 items-center justify-center rounded-full bg-white px-6 py-3.5 text-[16px] font-semibold text-black"
            >
              Get FlowPilot
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex min-h-13 items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-[16px] font-medium text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
