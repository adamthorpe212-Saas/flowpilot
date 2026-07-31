export type LifecycleStage = {
  number: string;
  title: string;
  text: string;
};

/**
 * One beat of the two-phone demo on /how-it-works. Discriminated on `kind` so
 * each variant only carries the fields its own card renders.
 *
 * `speech` turns are rendered as a call transcript — speaker label above the
 * line, both sides left-aligned — deliberately *not* as chat bubbles. FlowPilot
 * answers the phone; anything that looks like a messaging thread tells the
 * customer the wrong thing about what they are buying.
 */
export type ConversationEvent =
  | {
      kind: "missed-call";
      device: "you";
      time: string;
      caption: string;
      name: string;
    }
  | {
      kind: "speech";
      device: "customer";
      speaker: "flowpilot" | "caller";
      time: string;
      caption: string;
      text: string;
    }
  | {
      kind: "confirmation-sms";
      device: "customer";
      time: string;
      caption: string;
      text: string;
    }
  | {
      kind: "job";
      device: "you";
      time: string;
      caption: string;
      job: string;
      location: string;
      urgency: string;
      contact: string;
    };
