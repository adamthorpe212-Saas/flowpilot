/**
 * When a call came in, written the way somebody would say it.
 *
 * The dashboard formatted every lead as "12 Aug, 09:42", including one that
 * landed twenty minutes ago. That is a timestamp, not an answer — the question
 * being asked while scrolling a list is "is this from this morning or last
 * week", and a date on every row makes every row look equally old.
 *
 * So: today is a clock time, the last few days are a weekday, anything older is
 * a date. Each format only appears when it is the one carrying the information.
 *
 * `now` is a parameter rather than read from the clock, because a function that
 * reads Date.now() internally can only be tested at the moment it is run.
 */
export function formatLeadTime(iso: string, now: Date = new Date()): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const daysAgo = Math.round(
    (startOfDay(now) - startOfDay(when)) / (24 * 60 * 60 * 1000),
  );

  /*
   * A future timestamp is not something the product should ever produce, but a
   * clock skew between the database and the browser can make one appear. Falling
   * through to the date is the harmless answer; "in 2 days" would be alarming
   * and wrong.
   */
  if (daysAgo === 0) {
    return new Intl.DateTimeFormat("en-IE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(when);
  }

  if (daysAgo === 1) return "Yesterday";

  /*
   * Six days rather than seven. At seven, "Tuesday" could mean either of two
   * Tuesdays, and the one thing this must never be is ambiguous about which
   * week a job came from.
   */
  if (daysAgo > 1 && daysAgo < 7) {
    return new Intl.DateTimeFormat("en-IE", { weekday: "short" }).format(when);
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
  }).format(when);
}
