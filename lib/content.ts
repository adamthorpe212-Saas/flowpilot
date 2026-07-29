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
  {
    title: "24/7 call handling",
    description: "Every call answered instantly, even outside working hours.",
  },
  {
    title: "Lead qualification",
    description: "Job type, urgency and location captured automatically.",
  },
  {
    title: "Automatic booking",
    description: "Appointments added straight to your calendar.",
  },
  {
    title: "Instant team alerts",
    description: "Your team knows the moment a new job comes in.",
  },
];
