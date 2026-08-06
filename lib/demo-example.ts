/**
 * A worked example of the call the live demo would have had.
 *
 * Shown only when the live demo is unavailable, and only behind a label saying
 * so. The live demo exists because the scepticism it answers is "does this
 * actually work", and a script cannot answer that — but a visitor who typed a
 * message and got an error box has been given nothing at all, which is worse
 * than an honestly-labelled example.
 *
 * Deliberately kept in its own module rather than lib/demo.ts: that one is
 * server-only, and this is rendered on the client.
 *
 * The exchange is a real one, captured from the receptionist running against
 * the O'Brien Plumbing configuration. It is not idealised — the caller is vague
 * to begin with, exactly as callers are.
 */

export type ExampleTurn = { role: "assistant" | "caller"; text: string };

export const EXAMPLE_TURNS: ExampleTurn[] = [
  {
    role: "assistant",
    text: "This is an automated assistant, and I'll take notes. Hello, O'Brien Plumbing — sorry we missed you. What's the problem?",
  },
  { role: "caller", text: "There's water pouring through my kitchen ceiling" },
  {
    role: "assistant",
    text: "That sounds urgent. Have you been able to turn the water off at the mains?",
  },
  { role: "caller", text: "No, I can't find the valve" },
  {
    role: "assistant",
    text: "No bother — whereabouts are you, and can I take your name?",
  },
  { role: "caller", text: "John Murphy, 14 Griffith Avenue in Glasnevin" },
  {
    role: "assistant",
    text: "Thanks John. Is anyone there now, and when would suit you best?",
  },
  { role: "caller", text: "I'm here all afternoon, the sooner the better" },
  {
    role: "assistant",
    text: "Got it — I'll pass this straight to Dave. He'll ring you back shortly.",
  },
];

export const EXAMPLE_CAPTURED: Record<string, string> = {
  contact_name: "John Murphy",
  job_type: "Water coming through kitchen ceiling",
  urgency: "Emergency",
  location: "14 Griffith Avenue, Glasnevin",
  preferred_time: "This afternoon",
};
