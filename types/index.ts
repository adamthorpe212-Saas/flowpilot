export type LifecycleStage = {
  number: string;
  title: string;
  text: string;
};

/**
 * One beat of the two-phone demo on /how-it-works. Discriminated on `kind` so
 * each variant only carries the fields its own card actually renders.
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
      kind: "message-in" | "message-out";
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
