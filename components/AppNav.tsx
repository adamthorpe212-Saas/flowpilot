"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import Logo from "@/components/Logo";

/**
 * The app's own navigation, built for the phone it is installed on.
 *
 * Two things were wrong once this became a home-screen app.
 *
 * The header sat under the notch. `viewportFit: cover` and a translucent
 * status bar are what make an installed app fill the screen properly, and the
 * cost of both is that the page now starts at the very top of the display —
 * behind the clock and the battery. The bottom was padded for the home
 * indicator and the top was not, so the logo and the menu were partly hidden
 * behind the status bar.
 *
 * And the row could not fit. A logo, four links and a Sign out button in one
 * 375px line is roughly twice the available width, so they overlapped.
 *
 * A panel rather than a squeeze. The same shape the marketing navbar already
 * uses, so there is one mental model across the site and the app rather than
 * two — and every target inside it is a full row, which is what somebody
 * checking their jobs one-handed in a van actually needs.
 */

const LINKS = [
  { href: "/dashboard", label: "Jobs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
];

export default function AppNav({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Nothing behind the panel scrolls while it is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A panel with no keyboard exit is a trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className="border-b border-white/10"
        /*
         * The notch. Resolves to zero in a browser tab, so this costs nothing
         * there and stops the header hiding behind the clock once installed.
         */
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex-none">
              <Logo />
            </Link>

            {/* Inline from sm up, where there is genuinely room for four. */}
            <nav
              aria-label="Application"
              className="hidden items-center gap-5 text-sm sm:flex"
            >
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`transition ${
                    isCurrent(link.href)
                      ? "text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden flex-none items-center gap-4 sm:flex">
            <span className="max-w-[16ch] truncate text-sm text-zinc-400">
              {businessName}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="app-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/5 sm:hidden"
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
        A sibling of the header, not a child, and that is load-bearing: an
        ancestor with a backdrop-filter or a transform becomes the containing
        block for fixed descendants, and the marketing panel rendered exactly
        zero pixels tall when it was nested that way.

        Height in dvh so it still reaches the bottom on iOS Safari, where a
        collapsing address bar makes vh taller than what you can actually see.
      */}
      {open && (
        <div
          id="app-nav"
          className="fixed inset-x-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-black sm:hidden"
          style={{
            top: "calc(4rem + env(safe-area-inset-top))",
            height: "calc(100dvh - 4rem - env(safe-area-inset-top))",
          }}
        >
          <nav aria-label="Application" className="flex flex-col px-5 pt-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                /*
                 * The panel is not a route, so it has to dismiss itself —
                 * otherwise a tap on "Calendar" leaves it covering the page it
                 * just opened, which reads as a broken link because nothing
                 * visibly happens. Closed here rather than by watching the
                 * pathname, because setting state from an effect on every
                 * navigation is a cascading render for something a click
                 * handler already knows.
                 */
                onClick={() => setOpen(false)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={`flex min-h-14 items-center justify-between border-b border-white/[0.08] text-[19px] font-medium transition active:text-zinc-400 ${
                  isCurrent(link.href) ? "text-white" : "text-zinc-300"
                }`}
              >
                {link.label}
                {isCurrent(link.href) && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  />
                )}
              </Link>
            ))}
          </nav>

          <div
            className="mt-auto px-5 pt-6"
            style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
          >
            <p className="truncate text-sm text-zinc-500">{businessName}</p>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 px-6 text-[16px] font-medium text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
