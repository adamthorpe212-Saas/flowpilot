import LeadCard from "@/app/(app)/dashboard/LeadCard";
import AppTourShell, { type TourView } from "@/components/AppTourShell";
import LeadRecord from "@/components/LeadRecord";
import MonthGrid from "@/components/MonthGrid";
import WeekStrip, { weekFrom } from "@/components/WeekStrip";
import { previewAppointments, previewLeads } from "@/lib/app-preview";
import { LEAD_VIEWS } from "@/lib/lead-views";
import { isoDate, monthName } from "@/lib/month-grid";

/**
 * A walk around the app, for somebody who has not paid yet.
 *
 * Three real screens rendered by the components the product renders — LeadCard
 * from the dashboard, WeekStrip and MonthGrid from the calendar — against a
 * made-up week. Not screenshots: a screenshot of this app goes stale silently
 * and nothing catches it, and this site has published a stale imitation four
 * times over. A component imported from the app cannot drift from the app.
 *
 * A server component on purpose. The fixtures are relative to `new Date()`, so
 * a lead captured "6 min ago" would be computed once at build and again at
 * hydration and the two would disagree; rendering here and handing finished
 * nodes to the client shell settles every timestamp once.
 *
 * Settings is not one of the tabs, and that is deliberate. Everything on that
 * screen is a form bound to a server action, so showing it would mean either
 * wiring a stranger's browser to real mutations or hand-drawing a fake — and a
 * hand-drawn settings screen is precisely the kind of imitation that ends up
 * describing a product FlowPilot has stopped being. What the owner controls is
 * said in words on this page instead, where it cannot rot.
 */
export default function AppTour() {
  const now = new Date();
  const leads = previewLeads(now);
  const appointments = previewAppointments(now);
  const week = weekFrom(appointments, now);
  const today = isoDate(now);

  /** ISO date → how many jobs that day. The shape MonthGrid wants. */
  const jobsByDay = new Map<string, number>();
  for (const appointment of appointments) {
    jobsByDay.set(
      appointment.scheduled_for,
      (jobsByDay.get(appointment.scheduled_for) ?? 0) + 1,
    );
  }

  const views: TourView[] = [
    {
      id: "jobs",
      label: "Jobs",
      view: (
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Jobs</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {leads.filter((lead) => lead.status !== "booked").length} waiting on
            you.
          </p>

          {/*
            The dashboard's own filters, from LEAD_VIEWS — the same list that
            drives the real query. Shown as the state a visitor lands in rather
            than as working buttons, because filtering three fixtures teaches
            nobody anything.
          */}
          <div
            aria-hidden="true"
            className="mt-5 flex flex-wrap gap-2 text-sm"
          >
            {LEAD_VIEWS.map((option, index) => (
              <span
                key={option.slug}
                className={`rounded-full border px-4 py-2 ${
                  index === 0
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-zinc-400"
                }`}
              >
                {option.label}
              </span>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} interactive={false} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "job",
      label: "One job",
      view: <LeadRecord />,
    },
    {
      id: "calendar",
      label: "Calendar",
      view: (
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            {monthName(now.getFullYear(), now.getMonth() + 1)}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Jobs you booked from a call, and jobs you added yourself.
          </p>

          <div className="mt-6">
            <WeekStrip days={week} today={today} />
          </div>

          {/*
            No onSelect, no drag handlers. In the app a day can be picked and a
            job dragged onto another date; here the grid is a picture, which is
            what those props are optional for.
          */}
          <div className="mt-4">
            <MonthGrid
              year={now.getFullYear()}
              month={now.getMonth() + 1}
              jobsByDay={jobsByDay}
              today={today}
            />
          </div>
        </div>
      ),
    },
  ];

  return <AppTourShell views={views} />;
}
