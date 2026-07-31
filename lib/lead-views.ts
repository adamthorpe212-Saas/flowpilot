import type { LeadStatus } from "@/types/database";

/**
 * The dashboard's views, defined once.
 *
 * The tab labels and the database filter are generated from the same source
 * deliberately. Two lists of statuses that had to agree — one driving the query
 * and one driving the UI — is exactly the shape of defect that has bitten this
 * codebase repeatedly: correct alone, silently disagreeing together.
 */

export type LeadView = {
  slug: string;
  label: string;
  statuses: LeadStatus[] | null;
  empty: string;
};

export const LEAD_VIEWS: LeadView[] = [
  {
    slug: "todo",
    label: "To do",
    statuses: ["new", "qualified", "contacted"],
    empty: "Nothing waiting on you. Every job has been dealt with.",
  },
  {
    slug: "booked",
    label: "Booked",
    statuses: ["booked"],
    empty: "Nothing booked in yet.",
  },
  {
    slug: "all",
    label: "All",
    statuses: null,
    empty: "No calls yet.",
  },
];

/** Defaults to the work-to-do view: the reason someone opens this each morning. */
export function resolveView(slug: string | undefined): LeadView {
  return LEAD_VIEWS.find((view) => view.slug === slug) ?? LEAD_VIEWS[0];
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Called back",
  booked: "Booked",
  completed: "Done",
  lost: "Lost",
};

export const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "border-white/25 bg-white/10 text-white",
  qualified: "border-white/15 bg-white/5 text-zinc-300",
  contacted: "border-white/15 bg-white/5 text-zinc-400",
  booked: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  completed: "border-white/10 bg-white/[0.03] text-zinc-500",
  lost: "border-white/10 bg-white/[0.03] text-zinc-600",
};
