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

/**
 * The demo business's public face, in the one module both sides can import.
 *
 * lib/demo.ts is server-only and holds the receptionist's configuration; the
 * demo component runs in the browser and needs the same name and greeting to
 * open with. Keeping them here means the two cannot say different things.
 */
export const DEMO_BUSINESS_NAME = "O'Brien Plumbing";
export const DEMO_GREETING = "What can we do for you?";

export type ExampleTurn = { role: "assistant" | "caller"; text: string };

export const EXAMPLE_TURNS: ExampleTurn[] = [
  {
    role: "assistant",
    text: "This is an automated assistant, and I'll take notes. Hello, O'Brien Plumbing — sorry we missed you. What can we do for you?",
  },
  { role: "caller", text: "We're doing up the kitchen and need the plumbing moved" },
  {
    role: "assistant",
    text: "No bother. Is that the sink and appliances, or the heating as well?",
  },
  { role: "caller", text: "Sink and the dishwasher, and a new rad on the back wall" },
  {
    role: "assistant",
    text: "Grand — whereabouts are you, and can I take your name?",
  },
  { role: "caller", text: "John Murphy, 14 Griffith Avenue in Glasnevin" },
  {
    role: "assistant",
    text: "Thanks John. When are you hoping to get it done?",
  },
  {
    role: "caller",
    text: "Week of the 22nd if he can, the floors are going down after",
  },
  {
    role: "assistant",
    text: "Got it — I'll pass this straight to Dave. He'll come back to you about the 22nd.",
  },
];

export const EXAMPLE_CAPTURED: Record<string, string> = {
  contact_name: "John Murphy",
  job_type: "Move sink and dishwasher plumbing, new radiator",
  location: "14 Griffith Avenue, Glasnevin",
  preferred_time: "Week of the 22nd, before the floors go down",
};
