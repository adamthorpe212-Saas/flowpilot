/**
 * How long a caller's details are kept.
 *
 * GDPR Article 5(1)(e) does not allow personal data to be held indefinitely,
 * and until this existed FlowPilot held every transcript, name and address
 * forever. See docs/DATA-PROCESSING.md.
 *
 * **Off unless configured.** `RETENTION_DAYS` is deliberately unset by default,
 * because the right period is a decision about somebody's business — how long a
 * plumber genuinely needs a finished job on file — and not one an engineer
 * should make on their behalf. Picking a plausible-looking default here would
 * mean the first anyone learned of it was a customer finding their job history
 * had quietly evaporated. Nothing is deleted until a number is chosen.
 */

/** Below this, a purge would delete jobs a business is still actively working. */
export const MINIMUM_RETENTION_DAYS = 30;

export type RetentionPolicy =
  | { enabled: false; reason: string }
  | { enabled: true; days: number; cutoff: Date };

export function retentionPolicy(
  now = new Date(),
  raw = process.env.RETENTION_DAYS,
): RetentionPolicy {
  if (!raw || !raw.trim()) {
    return {
      enabled: false,
      reason:
        "RETENTION_DAYS is not set, so nothing is deleted. Choose a period — see docs/DATA-PROCESSING.md.",
    };
  }

  /*
   * Plain digits only, rather than Number(). JavaScript will happily read
   * "0x1E" as 30 and "1e3" as 1000, so a setting that was meant to be obvious
   * could silently mean something else entirely — and this is the one config
   * value whose misreading destroys data. If it is a number of days it should
   * look like a number of days.
   */
  const trimmed = raw.trim();

  if (!/^\d+$/.test(trimmed)) {
    return {
      enabled: false,
      reason: `RETENTION_DAYS is "${raw}", which is not a plain number of days. Nothing deleted.`,
    };
  }

  const days = Number(trimmed);

  if (days <= 0) {
    return {
      enabled: false,
      reason: `RETENTION_DAYS is ${days}, which is not a usable period. Nothing deleted.`,
    };
  }

  /*
   * A typo here deletes customer data that cannot be recovered. Refusing an
   * implausibly short period is worth more than honouring it — someone meaning
   * to type 365 and typing 3 should get an error, not an empty dashboard.
   */
  if (days < MINIMUM_RETENTION_DAYS) {
    return {
      enabled: false,
      reason: `RETENTION_DAYS is ${days}, below the ${MINIMUM_RETENTION_DAYS}-day minimum. Nothing deleted — raise it deliberately if that is really the intent.`,
    };
  }

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return { enabled: true, days, cutoff };
}
