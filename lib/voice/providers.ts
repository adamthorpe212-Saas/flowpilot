import "server-only";

import { isModelConfigured } from "@/lib/receptionist";
import type {
  SyncedReceptionist,
  VoiceOption,
  VoiceProvider,
} from "@/lib/voice/provider";
import { VoiceProviderUnavailable } from "@/lib/voice/provider";

/**
 * The receptionist FlowPilot runs today: Twilio's speech recognition, a model,
 * and Twilio's text-to-speech, stitched together in app/api/voice.
 *
 * It holds no state of its own. A business's services, questions and wording
 * live in the database and are read on every call, so there is nothing to
 * create ahead of time and nothing to keep in step — which is why syncing is a
 * no-op that honestly returns no agent id rather than inventing one.
 *
 * Its weakness is latency. Each turn costs a round trip to the model on top of
 * Twilio deciding the caller has stopped speaking, and there is no barge-in: a
 * caller who interrupts is not heard until the sentence finishes.
 */
const builtIn: VoiceProvider = {
  id: "builtin",

  isConfigured() {
    // The model is the only part that can be missing. Twilio's credentials are
    // checked where numbers are bought, and a call cannot arrive without them.
    return isModelConfigured();
  },

  async syncReceptionist(): Promise<SyncedReceptionist> {
    return { agentId: null };
  },

  async removeReceptionist(): Promise<void> {
    // Nothing was created, so nothing is left behind.
  },

  async connectNumber(): Promise<void> {
    /*
     * Already done elsewhere, and deliberately. purchaseNumber() sets the voice
     * webhook at the moment it buys the number, because a number that exists
     * without a webhook is a number that rings out — the gap between the two
     * calls is exactly when a customer would ring it.
     */
  },

  async listVoices(): Promise<VoiceOption[]> {
    return [
      {
        id: "",
        name: "Standard",
        description:
          "Twilio's built-in voice. Clear and reliable, and obviously a machine.",
      },
    ];
  },
};

/**
 * ElevenLabs conversational agents.
 *
 * Not implemented. There is no API key, and writing a plausible-looking
 * integration against an API nobody has called would be worse than leaving it
 * empty: it would look finished in review, pass a test suite built on the same
 * assumptions, and fail the first time a real call reached it.
 *
 * What is real is the shape. Every method throws the same typed error naming
 * exactly what is missing, so the moment a key exists the work is filling these
 * in rather than deciding where they go.
 */
const elevenLabs: VoiceProvider = {
  id: "elevenlabs",

  isConfigured() {
    return Boolean(process.env.ELEVENLABS_API_KEY);
  },

  async syncReceptionist(): Promise<SyncedReceptionist> {
    throw new VoiceProviderUnavailable("elevenlabs", "ELEVENLABS_API_KEY");
  },

  async removeReceptionist(): Promise<void> {
    throw new VoiceProviderUnavailable("elevenlabs", "ELEVENLABS_API_KEY");
  },

  async connectNumber(): Promise<void> {
    throw new VoiceProviderUnavailable("elevenlabs", "ELEVENLABS_API_KEY");
  },

  async listVoices(): Promise<VoiceOption[]> {
    throw new VoiceProviderUnavailable("elevenlabs", "ELEVENLABS_API_KEY");
  },
};

const PROVIDERS: Record<string, VoiceProvider> = {
  builtin: builtIn,
  elevenlabs: elevenLabs,
};

/**
 * The provider in use.
 *
 * Falls back to the built-in pipeline rather than throwing, and does so even
 * when VOICE_PROVIDER names something unconfigured. A misspelled environment
 * variable must not stop a receptionist answering somebody's customer — the
 * worst acceptable outcome is the older, slower receptionist, not silence.
 */
export function voiceProvider(): VoiceProvider {
  const requested = process.env.VOICE_PROVIDER?.trim();
  if (!requested) return builtIn;

  const provider = PROVIDERS[requested];
  if (!provider) {
    console.error(
      `Unknown VOICE_PROVIDER "${requested}". Falling back to the built-in receptionist.`,
      { known: Object.keys(PROVIDERS) },
    );
    return builtIn;
  }

  if (!provider.isConfigured()) {
    console.error(
      `VOICE_PROVIDER is "${requested}" but it is not configured. Falling back to the built-in receptionist.`,
    );
    return builtIn;
  }

  return provider;
}

/** Exported for tests and for the diagnostics page. */
export const voiceProviders = PROVIDERS;
