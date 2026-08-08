import type { ReceptionistContext } from "@/lib/receptionist";

/**
 * The boundary between FlowPilot and whatever is actually speaking to a caller.
 *
 * FlowPilot answers calls today with Twilio's speech recognition, a model, and
 * Twilio's text-to-speech. It is turn-based, and the pause between a caller
 * finishing and the reply starting is the weakest thing about it. A hosted
 * conversational voice service would fix that, and ElevenLabs is the obvious
 * first candidate — which is exactly why this interface exists before one is
 * wired in. An integration that is reached for directly from route handlers is
 * an integration that cannot be replaced once it disappoints.
 *
 * Two implementations, deliberately. An interface with one implementation is a
 * guess about what the second will need; an interface that already spans the
 * built-in pipeline and a hosted agent has been tested against the only two
 * shapes that matter. Where they disagree — the built-in pipeline has no
 * persistent agent, because the receptionist is composed per call from the
 * database — the interface says so rather than inventing a concept to make them
 * look alike.
 */

export type VoiceOption = {
  id: string;
  name: string;
  /** Short description an owner can choose from without hearing it first. */
  description: string;
};

/**
 * What a provider hands back when a business's receptionist is synced.
 *
 * `agentId` is null for providers that hold no state of their own. That is not
 * a failure — it is the honest answer for the built-in pipeline, which reads a
 * business's services, questions and wording out of the database on every call
 * and therefore has nothing to create ahead of time.
 */
export type SyncedReceptionist = {
  agentId: string | null;
};

export type VoiceProvider = {
  /** Stored against a business, so a later change of provider is detectable. */
  readonly id: string;

  /** Whether this provider has what it needs to be used at all. */
  isConfigured(): boolean;

  /**
   * Push a business's receptionist configuration to the provider.
   *
   * Called after onboarding and whenever the receptionist is edited. Must be
   * idempotent: an owner who saves the same settings twice should not end up
   * with two agents.
   */
  syncReceptionist(
    businessId: string,
    context: ReceptionistContext,
  ): Promise<SyncedReceptionist>;

  /** Undo the above. Called when a business is deleted or suspended. */
  removeReceptionist(agentId: string): Promise<void>;

  /**
   * Point a phone number at this business's receptionist.
   *
   * Separate from provisioning the number itself, which stays in lib/twilio.ts
   * — who owns the number and who answers it are different questions, and
   * conflating them is what makes a telephony provider hard to change later.
   */
  connectNumber(agentId: string | null, phoneNumber: string): Promise<void>;

  /** Voices an owner may choose between. */
  listVoices(): Promise<VoiceOption[]>;
};

/**
 * Raised when a provider is asked to do something it has no credentials for.
 *
 * A distinct type so callers can tell "not set up yet" from "tried and failed".
 * The first is a configuration gap with a clear owner and a clear fix; the
 * second is an incident. Collapsing them into a generic Error is how a missing
 * API key ends up being investigated as an outage.
 */
export class VoiceProviderUnavailable extends Error {
  constructor(
    readonly providerId: string,
    readonly missing: string,
  ) {
    super(
      `Voice provider "${providerId}" is not configured. Missing: ${missing}.`,
    );
    this.name = "VoiceProviderUnavailable";
  }
}
