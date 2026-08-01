import type { LifecycleStage } from "@/types";

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
