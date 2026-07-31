import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Reads the matcher out of proxy.ts rather than importing it.
 *
 * Next.js requires the matcher to be a static string literal — it parses the
 * config at build time and rejects a reference to a constant — so it cannot be
 * exported and shared. Parsing the source is what stops the test and the
 * shipped pattern drifting apart, which would be silent: the app behaves
 * correctly either way, it just does unnecessary work on the paths that can
 * least afford it.
 */
function shippedMatcher(): string {
  const source = readFileSync("proxy.ts", "utf8");
  // No `s` flag: the literal is on one line, and the flag needs es2018+.
  const match = source.match(/"(\/\(\(\?![^"]*)"/);
  if (!match) throw new Error("Could not find the matcher literal in proxy.ts");
  return match[1].replace(/\\\\/g, "\\");
}

const matcher = new RegExp(`^${shippedMatcher()}$`);

function runsMiddleware(path: string) {
  return matcher.test(path);
}

describe("proxy matcher", () => {
  it("runs on page requests, where sessions need refreshing", () => {
    expect(runsMiddleware("/")).toBe(true);
    expect(runsMiddleware("/dashboard")).toBe(true);
    expect(runsMiddleware("/onboarding/forwarding")).toBe(true);
    expect(runsMiddleware("/login")).toBe(true);
  });

  it("never runs on webhook routes", () => {
    /*
     * Session refresh is a network round-trip to Supabase. Twilio and Stripe
     * send no cookies, so on these routes it is pure waste — and on a live call
     * it sits in front of every conversational turn while the caller hears
     * silence.
     *
     * It is also a reliability risk: a failure there would 500 the request and
     * drop a real customer's call, despite these handlers using the service
     * role and never needing a user session.
     */
    expect(runsMiddleware("/api/voice/incoming")).toBe(false);
    expect(runsMiddleware("/api/voice/turn")).toBe(false);
    expect(runsMiddleware("/api/voice/status")).toBe(false);
    expect(runsMiddleware("/api/voice/test")).toBe(false);
    expect(runsMiddleware("/api/stripe/webhook")).toBe(false);
  });

  it("skips static assets and images", () => {
    expect(runsMiddleware("/_next/static/chunk.js")).toBe(false);
    expect(runsMiddleware("/favicon.ico")).toBe(false);
    expect(runsMiddleware("/icon.svg")).toBe(false);
    expect(runsMiddleware("/og.png")).toBe(false);
  });

  it("still runs on the auth callback, which does need a session", () => {
    // Not under /api, and it exchanges a code for a session — so it must not be
    // caught by the webhook exclusion.
    expect(runsMiddleware("/auth/callback")).toBe(true);
  });
});
