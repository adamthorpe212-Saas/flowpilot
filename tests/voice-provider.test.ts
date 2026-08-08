import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceProviderUnavailable } from "@/lib/voice/provider";
import { voiceProvider, voiceProviders } from "@/lib/voice/providers";

/**
 * The point of the abstraction is that a receptionist keeps answering whatever
 * is misconfigured above it. These tests are mostly about that.
 */

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.restoreAllMocks();
});

describe("voiceProvider", () => {
  it("uses the built-in receptionist by default", () => {
    delete process.env.VOICE_PROVIDER;
    expect(voiceProvider().id).toBe("builtin");
  });

  it("falls back rather than throwing on an unknown provider", () => {
    /*
     * A misspelled environment variable must not stop somebody's customer being
     * answered. The worst acceptable outcome is the older receptionist, not
     * silence on the line.
     */
    process.env.VOICE_PROVIDER = "elevnlabs";
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(voiceProvider().id).toBe("builtin");
    expect(errors).toHaveBeenCalled();
  });

  it("falls back when the named provider has no credentials", () => {
    // Selecting a provider is not the same as having configured it, and the
    // gap between those two is a deploy somebody will get wrong.
    process.env.VOICE_PROVIDER = "elevenlabs";
    delete process.env.ELEVENLABS_API_KEY;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(voiceProvider().id).toBe("builtin");
    expect(errors).toHaveBeenCalled();
  });

  it("selects a provider once it is both named and configured", () => {
    process.env.VOICE_PROVIDER = "elevenlabs";
    process.env.ELEVENLABS_API_KEY = "test-key";

    expect(voiceProvider().id).toBe("elevenlabs");
  });
});

describe("the built-in receptionist", () => {
  it("reports no agent, because it holds no state", async () => {
    /*
     * Services, questions and wording are read from the database on every call,
     * so there is nothing to create ahead of time. Returning a made-up id to
     * look consistent with a hosted provider would be a lie the database would
     * then store.
     */
    const built = voiceProviders.builtin;
    const synced = await built.syncReceptionist("biz-1", {} as never);

    expect(synced.agentId).toBeNull();
  });

  it("does not attach numbers, because provisioning already did", async () => {
    // purchaseNumber() sets the webhook as it buys the number. The gap between
    // the two would be exactly when a customer rang it.
    await expect(
      voiceProviders.builtin.connectNumber(null, "+35319128718"),
    ).resolves.toBeUndefined();
  });
});

describe("ElevenLabs", () => {
  it("refuses every operation with a typed error naming what is missing", async () => {
    /*
     * Not implemented, and saying so loudly. A plausible-looking integration
     * against an API nobody has called would look finished in review, pass
     * tests built on the same assumptions, and fail on the first real call.
     */
    delete process.env.ELEVENLABS_API_KEY;
    const provider = voiceProviders.elevenlabs;

    for (const call of [
      () => provider.syncReceptionist("biz-1", {} as never),
      () => provider.removeReceptionist("agent-1"),
      () => provider.connectNumber("agent-1", "+35319128718"),
      () => provider.listVoices(),
    ]) {
      await expect(call()).rejects.toBeInstanceOf(VoiceProviderUnavailable);
      await expect(call()).rejects.toThrow(/ELEVENLABS_API_KEY/);
    }
  });

  it("tells a missing key apart from a failure", async () => {
    // One is a configuration gap with an owner and a fix; the other is an
    // incident. Collapsing them is how a missing key gets investigated as an
    // outage.
    delete process.env.ELEVENLABS_API_KEY;

    await expect(
      voiceProviders.elevenlabs.listVoices(),
    ).rejects.toMatchObject({ providerId: "elevenlabs", missing: "ELEVENLABS_API_KEY" });
  });
});
