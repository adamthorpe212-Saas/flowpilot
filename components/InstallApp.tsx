"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * "Put this on your phone."
 *
 * Two platforms, two completely different truths, and pretending otherwise is
 * how this feature usually ships broken.
 *
 * On Android, Chrome fires `beforeinstallprompt` and we can install it for them
 * with one tap. On iOS, Safari fires nothing and exposes no API at all — Apple
 * requires the user to go through the Share sheet themselves. So an iPhone gets
 * instructions, not a button, and a button that silently does nothing on the
 * majority platform for Irish trades would be worse than no feature.
 *
 * Deliberately quiet. It hides itself once installed, and a dismissal is
 * remembered — a banner that reappears every morning on a tool somebody opens
 * between jobs is an irritation, and this is worth exactly one ask.
 */

/** Remembered across sessions so this asks once, not daily. */
const DISMISSED_KEY = "flowpilot:install-dismissed";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * What the browser is, read once.
 *
 * `useSyncExternalStore` rather than a state-setting effect, which is both what
 * the lint rule wants and genuinely the right shape: none of this is React
 * state, it is a fact about the device that cannot change while the page is
 * open. The server snapshot returns "hidden", so the markup React renders on
 * the server and the markup it hydrates agree, and nothing flashes.
 */
type Platform = "hidden" | "ios" | "installable";

const noop = () => () => {};

function readPlatform(): Platform {
  /*
   * Already installed: `display-mode: standalone` is true inside the installed
   * app on both platforms, and `navigator.standalone` covers older iOS.
   * Offering to install the app you are already inside is the most obvious way
   * to look unfinished.
   */
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;

  if (installed) return "hidden";
  if (window.localStorage.getItem(DISMISSED_KEY)) return "hidden";

  /*
   * iPhone and iPad. Modern iPads report as Macs, so a touch-capable "Mac"
   * counts too — otherwise an iPad user gets an install button that does
   * nothing, which is the exact failure this component exists to avoid.
   */
  const ua = window.navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  return ios ? "ios" : "installable";
}

export default function InstallApp() {
  const platform = useSyncExternalStore(noop, readPlatform, () => "hidden");
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Chrome shows its own mini-infobar unless this is prevented, and two
      // prompts for one action reads as a bug.
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const isIos = platform === "ios";

  /*
   * Android only shows this once Chrome has offered — before that event fires
   * there is nothing a button could do. iOS never fires it, so instructions
   * show immediately.
   */
  const show =
    !dismissed && (isIos || (platform === "installable" && prompt !== null));

  if (!show) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // Either way this ask is spent. Accepted means it is installed; dismissed
    // means they said no, and asking again tomorrow is nagging.
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    if (outcome === "accepted") setPrompt(null);
  };

  return (
    <div className="mb-6 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">Put FlowPilot on your phone</p>
          <p className="mt-1.5 max-w-md text-[13px] leading-5 text-zinc-400">
            Your jobs on the home screen, one tap away — no browser, no typing
            an address. It stays signed in.
          </p>

          {isIos ? (
            /*
             * Apple gives websites no way to do this for the user, so the only
             * honest thing is to show them where the buttons are. Named exactly
             * as they appear in Safari, because "share" and "the box with the
             * arrow" are not the same instruction to somebody in a van.
             */
            <ol className="mt-4 space-y-2 text-[13px] leading-5 text-zinc-300">
              <li className="flex gap-2.5">
                <span className="text-zinc-500">1.</span>
                <span>
                  Tap <span className="font-medium text-white">Share</span> at
                  the bottom of Safari — the square with an arrow out of it.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-zinc-500">2.</span>
                <span>
                  Scroll down and tap{" "}
                  <span className="font-medium text-white">
                    Add to Home Screen
                  </span>
                  .
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-zinc-500">3.</span>
                <span>
                  Tap <span className="font-medium text-white">Add</span>. The
                  icon appears with your other apps.
                </span>
              </li>
            </ol>
          ) : (
            <button
              type="button"
              onClick={install}
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Add to home screen
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
