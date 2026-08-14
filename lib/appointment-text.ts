import { startOfDayIn } from "@/lib/today";
import type { Appointment } from "@/types/database";

/**
 * The text a customer gets when the job goes in the diary.
 *
 * This is the message most likely to stop somebody ringing three other
 * tradesmen. A caller currently hears "he'll be in touch" and then nothing —
 * a named day closes that gap, and it is the whole reason the calendar earns
 * its place rather than being a nicer way to look at leads.
 *
 * Written to fit one SMS segment. Irish networks bill per 160 GSM-7 characters,
 * and a stray curly apostrophe or en dash silently drops the limit to 70 by
 * switching the whole message to UCS-2 — doubling the cost of every appointment
 * text for the sake of typography nobody sees. Everything here is plain ASCII
 * for that reason, and a test pins it.
 *
 * No link, deliberately. Irish carriers filter messages containing URLs from
 * unrecognised senders as scams, and this one has to arrive.
 */

const SLOT_WORDS: Record<Appointment["slot"], string> = {
  morning: "in the morning",
  afternoon: "in the afternoon",
  // Said as nothing at all: "will call out on Thursday" reads better than
  // "will call out on Thursday anytime", which sounds like a hedge.
  anytime: "",
};

export function appointmentText(
  appointment: Pick<Appointment, "scheduled_for" | "slot" | "customer_name">,
  businessName: string,
  contactNumber?: string | null,
  /*
   * Injectable so this can be tested at all. A function that reads the clock
   * internally can only be verified on the day it is run — these tests would
   * have passed today and failed tomorrow, which is worse than no tests.
   */
  today: Date = startOfDayIn(),
): string {
  const day = spokenDay(appointment.scheduled_for, today);
  const slot = SLOT_WORDS[appointment.slot];

  /*
   * Their first name only. "Hi Mary" is how a tradesman texts; "Hi Mary
   * Cullen" is how a system does, and the difference decides whether this
   * reads as him or as software pretending to be him.
   */
  const firstName = appointment.customer_name?.trim().split(/\s+/)[0] ?? "";

  return [
    firstName ? `Hi ${firstName},` : "Hi,",
    `${businessName} will call out ${day}${slot ? ` ${slot}` : ""}.`,
    contactNumber ? `Any problems, ring ${contactNumber}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * "on Thursday" for this week, "on Thursday 21 August" beyond it.
 *
 * A bare weekday is ambiguous once it is more than a few days out — somebody
 * reading "Thursday" on a Friday cannot tell which Thursday, and turning up on
 * the wrong one is the exact failure this message exists to prevent.
 */
function spokenDay(iso: string, today: Date): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const daysAway = Math.round(
    (startOfDay(date) - startOfDay(today)) / (24 * 60 * 60 * 1000),
  );

  if (daysAway === 0) return "today";
  if (daysAway === 1) return "tomorrow";

  const weekday = new Intl.DateTimeFormat("en-IE", { weekday: "long" }).format(
    date,
  );

  if (daysAway > 1 && daysAway < 7) return `on ${weekday}`;

  const full = new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
  }).format(date);

  return `on ${weekday} ${full}`;
}
