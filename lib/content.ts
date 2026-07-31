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
    text: "Responds in seconds.",
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
 * FlowPilot hands the job over rather than booking it — the closing message
 * and the "sent to you" stage above have to keep saying the same thing, or the
 * site promises a calendar integration the product doesn't have.
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
    kind: "message-in",
    device: "customer",
    time: "4:02",
    caption: "FlowPilot answers in 14 seconds.",
    text: "Sorry we missed your call — what's the problem and where are you?",
  },
  {
    kind: "message-out",
    device: "customer",
    time: "4:03",
    caption: "John explains. No form, no hold music.",
    text: "Burst pipe under the kitchen sink in Raheny. Water everywhere",
  },
  {
    kind: "message-in",
    device: "customer",
    time: "4:03",
    caption: "It reads the urgency and sets expectations.",
    text: "That sounds urgent. I've passed this straight to Dave — he'll ring you back shortly.",
  },
  {
    kind: "message-out",
    device: "customer",
    time: "4:04",
    caption: "Customer's happy. Still hasn't spoken to you.",
    text: "Perfect, thanks",
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
];
