import type { OpeningHours } from "@/types/database";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Whether a business is currently open, evaluated in its own timezone.
 *
 * Uses Intl rather than raw Date arithmetic so Irish summer time is handled by
 * the platform's tz database instead of a hardcoded offset that would be an
 * hour wrong for half the year — and would be wrong precisely during the long
 * evenings when trades are still working.
 */
export function isWithinOpeningHours(
  openingHours: OpeningHours,
  timezone: string,
  now: Date = new Date(),
): boolean {
  // No configured hours means always on. A business that has not told us its
  // hours would rather have calls answered than silently dropped.
  if (!openingHours || Object.keys(openingHours).length === 0) return true;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  const key = DAY_KEYS.find(
    (day) => day.toLowerCase() === weekday.slice(0, 3).toLowerCase(),
  );
  if (!key) return true;

  const window = openingHours[key];
  if (!window) return false;

  const current = `${hour}:${minute}`;
  return current >= window.open && current <= window.close;
}
