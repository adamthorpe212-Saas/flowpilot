import LeadCard from "@/app/(app)/dashboard/LeadCard";
import MonthGrid, { FULL_DAY_JOBS } from "@/components/MonthGrid";
import PhoneFrame from "@/components/PhoneFrame";
import { previewAppointments, previewLeads } from "@/lib/app-preview";
import { monthName } from "@/lib/month-grid";

/**
 * The app itself, on the marketing page.
 *
 * Renders the REAL components — LeadCard straight out of the dashboard,
 * MonthGrid straight out of the calendar — against fixtures. Not screenshots,
 * and not a hand-built imitation. Both of those go stale silently, and this
 * site has published a stale imitation three times already: the disclosure
 * line, the default greeting and the animated phone all showed a product
 * FlowPilot had stopped being.
 *
 * The jobs list sits in a handset because that is where a tradesman reads it —
 * on a phone, in a van, one-handed. The calendar gets a wider panel because a
 * month at 236px is a month nobody can read, and pretending otherwise would be
 * choosing consistency over the thing being demonstrated.
 */
export default function InsideTheApp() {
  const now = new Date();
  const leads = previewLeads(now);
  const appointments = previewAppointments(now);

  /*
   * Counts, not appointments. MonthGrid is never handed a customer's details,
   * which is the same discipline the receptionist's availability summary
   * follows — a component that cannot receive a name cannot leak one.
   */
  const jobsByDay = new Map<string, number>();
  for (const appointment of appointments) {
    jobsByDay.set(
      appointment.scheduled_for,
      (jobsByDay.get(appointment.scheduled_for) ?? 0) + 1,
    );
  }

  const busiest = [...jobsByDay.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
      <div className="mx-auto w-full max-w-[248px]">
        <PhoneFrame className="h-[430px] w-[236px]">
          <div className="flex min-h-0 flex-1 flex-col px-2.5 pt-1">
            <p className="text-lg font-semibold tracking-tight">Jobs</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {leads.filter((lead) => lead.status !== "booked").length} waiting
              on you.
            </p>

            {/*
              Scaled down rather than restyled. LeadCard is built for a real
              phone at full width; inside a 236px mock-up its own type would be
              oversized, and editing it for this page would mean the marketing
              site dictating the app's design.
            */}
            {/*
              `inert`, and not decoration.

              LeadCard is the real component, so it carries real links: a
              stretched link to /dashboard/<id> and a tel: on the caller's
              number. On a public page the first bounces a visitor to a login
              screen, and the second would dial +353 87 123 4567 — a plausible
              Irish mobile belonging to somebody who never asked to be in a
              demo. inert takes the whole subtree out of the focus order and the
              accessibility tree, which is what "this is a picture" means.

              pointer-events-none would stop a mouse and nothing else: a
              keyboard user could still tab into it and a screen reader would
              read it out as available.
            */}
            <div
              inert
              className="mt-3 origin-top scale-[0.82] space-y-2.5"
            >
              {leads.slice(0, 2).map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </div>
        </PhoneFrame>
        <p className="mt-4 text-center text-sm leading-6 text-zinc-400">
          Every call becomes a job, with the date they asked for. Tap the number
          to ring them back.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-medium text-zinc-200">
            {monthName(now.getFullYear(), now.getMonth() + 1)}
          </p>
          {busiest && busiest[1] >= FULL_DAY_JOBS && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
              Full day
            </span>
          )}
        </div>

        <div className="mt-3">
          <MonthGrid
            year={now.getFullYear()}
            month={now.getMonth() + 1}
            jobsByDay={jobsByDay}
            today={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`}
          />
        </div>

        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
          Book a job straight from the call and your customer gets a text saying
          when you&apos;ll be there. Your receptionist can see which days are
          heavy, so it tells the next caller you&apos;re booked up — it never
          arranges anything itself.
        </p>
      </div>
    </div>
  );
}
