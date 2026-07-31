import { describe, expect, it } from "vitest";
import {
  LEAD_VIEWS,
  resolveView,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/lead-views";
import type { LeadStatus } from "@/types/database";

const ALL_STATUSES: LeadStatus[] = [
  "new",
  "qualified",
  "contacted",
  "booked",
  "completed",
  "lost",
];

describe("lead views", () => {
  it("defaults to the work-to-do view", () => {
    // The reason someone opens this screen each morning.
    expect(resolveView(undefined).slug).toBe("todo");
    expect(resolveView("nonsense").slug).toBe("todo");
  });

  it("resolves each known view", () => {
    for (const view of LEAD_VIEWS) {
      expect(resolveView(view.slug).slug).toBe(view.slug);
    }
  });

  it("treats only unfinished work as to-do", () => {
    const todo = LEAD_VIEWS[0].statuses ?? [];

    expect(todo).toContain("new");
    expect(todo).toContain("qualified");
    expect(todo).toContain("contacted");

    // A booked job needs nothing further; a done or lost one is history.
    // Including them would make the count meaningless.
    expect(todo).not.toContain("booked");
    expect(todo).not.toContain("completed");
    expect(todo).not.toContain("lost");
  });

  it("has an unfiltered view", () => {
    const all = LEAD_VIEWS.find((view) => view.slug === "all");
    expect(all?.statuses).toBeNull();
  });

  it("covers every status between the filtered views", () => {
    /*
     * A status in no view is a lead that vanishes from the dashboard entirely.
     * That would be silent — the row exists, the customer just never sees it —
     * so adding a status without a home has to fail here rather than in front
     * of someone wondering where a job went.
     */
    const covered = new Set(
      LEAD_VIEWS.flatMap((view) => view.statuses ?? []),
    );

    for (const status of ALL_STATUSES) {
      if (status === "completed" || status === "lost") continue;
      expect(covered.has(status)).toBe(true);
    }
  });

  it("gives every status a label and a style", () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(STATUS_STYLES[status]).toBeTruthy();
    }
  });

  it("gives every view something to say when empty", () => {
    // An empty list with no explanation reads as broken rather than done.
    for (const view of LEAD_VIEWS) {
      expect(view.empty).toBeTruthy();
    }
  });
});
