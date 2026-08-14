"use client";

import { useId, useState, type ReactNode } from "react";
import Logo from "@/components/Logo";

/**
 * The app's own chrome, with the navigation wired to local state.
 *
 * A visitor who has not signed up cannot be shown the real /dashboard, and a
 * row of screenshots is what everybody else's site does. This is the middle:
 * the actual components the app renders, against a made-up week, with the
 * header swapping views instead of routing.
 *
 * Only the switching lives on the client. Each view arrives already rendered
 * from the server, because the fixtures are built from `new Date()` — a lead
 * captured "6 min ago" and a week anchored to this Monday would be computed
 * twice, once when the page was built and once when React hydrated it, and the
 * two would disagree. Passing rendered nodes in settles every timestamp once.
 *
 * Deliberately not a fake signed-in session. It says Demo where the real app
 * says Sign out, and the tabs are buttons rather than links, so nobody is left
 * wondering why clicking a job does nothing.
 */

export type TourView = { id: string; label: string; view: ReactNode };

export default function AppTourShell({ views }: { views: TourView[] }) {
  const [active, setActive] = useState(views[0]?.id);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-3xl border border-white/12 bg-black shadow-2xl shadow-black/40">
      {/*
        The app's real header — same logo, same labels, same order.

        One row on a desktop; on a phone the tabs wrap onto their own line,
        which is what `order` and `w-full` are doing rather than a second copy
        of the tablist. Inline, the logo and the Demo badge left 375px six
        pixels short and "Calendar" sat off the edge of a scrolling strip — a
        visitor had no reason to think there was anything past "One job", which
        defeats the one thing this section exists to do. A duplicated tablist
        would have fixed the layout and given screen readers two sets of tabs
        controlling one panel.
      */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/10 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-5 sm:py-0">
        <span className="order-1 flex-none">
          <Logo />
        </span>

        <div
          role="tablist"
          aria-label="Screens in the app"
          className="order-3 flex w-full items-center gap-1.5 sm:order-2 sm:w-auto sm:gap-2"
        >
          {views.map((item) => {
            const selected = item.id === active;

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${panelId}-${item.id}`}
                aria-selected={selected}
                aria-controls={panelId}
                onClick={() => setActive(item.id)}
                className={`min-h-9 flex-1 rounded-full px-2 text-[13px] transition sm:flex-none sm:px-3 sm:text-sm ${
                  selected
                    ? "bg-white/12 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/*
          Where the app says "Sign out". Saying Demo here is what stops this
          reading as somebody else's account left open.
        */}
        <div className="order-2 ml-auto flex flex-none items-center gap-3 sm:order-3">
          <span className="hidden text-sm text-zinc-400 min-[420px]:block">
            O&apos;Brien Plumbing
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-zinc-400">
            Demo
          </span>
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-${active}`}
        className="px-4 py-6 sm:px-6 sm:py-8"
      >
        {/*
          Every view is rendered and only one is shown, rather than mounting on
          demand. Switching a tab then costs nothing and the panel does not jump
          as a taller screen loads in — which on a tour is the difference
          between feeling like an app and feeling like a web page.
        */}
        {views.map((item) => (
          <div key={item.id} hidden={item.id !== active}>
            {item.view}
          </div>
        ))}
      </div>
    </div>
  );
}
