/**
 * Days of the week for the opening-hours form.
 *
 * Deliberately NOT in hours-actions.ts. A "use server" module may only export
 * async functions, so a constant exported from one arrives in the browser as
 * undefined — failing at runtime rather than at build or typecheck time.
 */
export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;
