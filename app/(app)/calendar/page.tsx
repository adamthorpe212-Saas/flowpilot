import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppointmentForm from "./AppointmentForm";
import CalendarGrid from "./CalendarGrid";
import type { Appointment } from "@/types/database";

export const metadata: Metadata = {
  title: "Calendar — FlowPilot",
  robots: { index: false },
};

export default async function CalendarPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const supabase = await createClient();

  /*
   * A window, not just the future.
   *
   * The list this replaced showed upcoming jobs only, which was right for a
   * list and wrong for a grid: a month view that blanks the days already gone
   * looks broken on the 28th, and "what did I do on Tuesday" is a fair question
   * to ask a diary.
   *
   * A year back and a year forward, fetched once. It is a few hundred rows at
   * the very most for a sole trader, and holding them in the client is what
   * makes paging between months instant on a phone with no signal in a van.
   */
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const to = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0);

  const { data } = await supabase
    .from("appointment")
    .select("*")
    .gte("scheduled_for", isoDate(from))
    .lte("scheduled_for", isoDate(to))
    .order("scheduled_for")
    .order("slot");

  const appointments = (data ?? []) as Appointment[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
      <p className="mt-1 text-sm leading-6 text-zinc-400">
        Jobs you&apos;ve booked in. Your receptionist can see which days are
        busy, so it can tell callers you&apos;re booked up — it never arranges
        anything itself.
      </p>

      <div className="mt-6">
        <CalendarGrid
          appointments={appointments}
          businessName={business.name}
        />
      </div>

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold tracking-tight">Add a job</h2>
        <p className="mt-1.5 text-[13px] leading-5 text-zinc-400">
          For work that never came through a phone call — a regular, a foreman,
          a favour. Your receptionist counts these too when it works out how busy
          you are.
        </p>
        <div className="mt-5">
          <AppointmentForm />
        </div>
      </section>
    </div>
  );
}

/** Local ISO date. `toISOString()` would convert to UTC and shift the day. */
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
