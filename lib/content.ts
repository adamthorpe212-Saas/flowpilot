import type { Feature, StoryStep } from "@/types";

export const storySteps: StoryStep[] = [
  {
    number: "01",
    title: "Call received",
    text: "A customer calls while your team is busy.",
  },
  {
    number: "02",
    title: "FlowPilot answers",
    text: "The AI receptionist responds instantly and professionally.",
  },
  {
    number: "03",
    title: "Lead qualified",
    text: "Customer details, urgency and job type are captured automatically.",
  },
  {
    number: "04",
    title: "Appointment booked",
    text: "The enquiry is organised and added to your schedule.",
  },
];

export const features: Feature[] = [
  { title: "24/7 call handling" },
  { title: "Lead qualification" },
  { title: "Automatic booking" },
  { title: "Instant team alerts" },
];
