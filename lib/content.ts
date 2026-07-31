import type { ConversationEvent, LifecycleStage } from "@/types";

export const lifecycleStages: LifecycleStage[] = [
  {
    number: "01",
    title: "Missed call",
    text: "You're on a job. It rings out.",
  },
  {
    number: "02",
    title: "FlowPilot answers",
    text: "Picks up and talks to them.",
  },
  {
    number: "03",
    title: "Details captured",
    text: "Job, urgency and location.",
  },
  {
    number: "04",
    title: "Sent to you",
    text: "Lands on your phone.",
  },
];

/**
 * FlowPilot hands the job over rather than booking it — the closing line here
 * and the "sent to you" stage above have to keep saying the same thing, or the
 * site promises a calendar integration the product does not have.
 *
 * The closing beat is a one-way confirmation text. Ireland has no inbound-SMS
 * numbers available (docs/DECISIONS.md D6), so the caller cannot reply to it —
 * but outbound A2P is well supported, and it is what gives both sides a written
 * record of an address that was only ever spoken aloud.
 */
export const conversation: ConversationEvent[] = [
  {
    kind: "missed-call",
    device: "you",
    time: "4:02",
    caption: "John Murphy rang. You're up a ladder.",
    name: "John Murphy",
  },
  {
    kind: "speech",
    device: "customer",
    speaker: "flowpilot",
    time: "4:02",
    caption: "It answers on the second ring.",
    text: "Hello, O'Brien Plumbing — sorry we missed you. What's the problem?",
  },
  {
    kind: "speech",
    device: "customer",
    speaker: "caller",
    time: "4:03",
    caption: "John explains. No menus, no hold music.",
    text: "There's a pipe burst under my kitchen sink, water everywhere.",
  },
  {
    kind: "speech",
    device: "customer",
    speaker: "flowpilot",
    time: "4:03",
    caption: "It hears the urgency and asks what matters.",
    text: "That sounds urgent. Whereabouts are you?",
  },
  {
    kind: "speech",
    device: "customer",
    speaker: "caller",
    time: "4:03",
    caption: "One question, one answer.",
    text: "Raheny, Dublin 5.",
  },
  {
    kind: "speech",
    device: "customer",
    speaker: "flowpilot",
    time: "4:04",
    caption: "It sets expectations without promising a time.",
    text: "Got it. I'll pass this straight to Dave — he'll ring you back shortly.",
  },
  {
    kind: "job",
    device: "you",
    time: "4:04",
    caption: "You come down the ladder to this.",
    job: "Burst pipe",
    location: "Raheny, Dublin",
    urgency: "High",
    contact: "087 xxx xxxx",
  },
  {
    kind: "confirmation-sms",
    device: "customer",
    time: "4:04",
    caption: "And John gets it in writing, so nothing's misheard.",
    text: "O'Brien Plumbing: burst pipe, Raheny. Dave will call you shortly.",
  },
];
