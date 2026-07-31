import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Diagnostics only earn their place if they are right about what is broken.
 * A check that reports "OK" for a missing SMS sender is worse than no check,
 * because it sends someone looking somewhere else.
 */

let queryError: { message: string } | null = null;
let twilioOk = true;

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: async () => ({ error: queryError, count: 0 }),
    }),
  }),
}));

const { runDiagnostics } = await import("@/lib/diagnostics");

const ORIGINAL_ENV = { ...process.env };

function find(checks: { name: string }[], name: string) {
  const check = checks.find((candidate) => candidate.name === name);
  if (!check) throw new Error(`No check named ${name}`);
  return check as { name: string; status: string; detail: string; fix?: string };
}

beforeEach(() => {
  queryError = null;
  twilioOk = true;

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: twilioOk, status: twilioOk ? 200 : 401 }) as Response),
  );

  /*
   * Deliberately distinctive values. An earlier version used "service" as the
   * service-role key, which collides with the ordinary phrase "service role key
   * set" and failed the leak check for the wrong reason — a test that cannot
   * tell a leak from prose is worse than none.
   */
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anonkey-zzqq11";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "svcrole-zzqq22";
  process.env.TWILIO_ACCOUNT_SID = "ACzzqq33";
  process.env.TWILIO_AUTH_TOKEN = "authtok-zzqq44";
  process.env.TWILIO_MESSAGING_SERVICE_SID = "MGzzqq55";
  process.env.ANTHROPIC_API_KEY = "sk-ant-zzqq66";
  process.env.NEXT_PUBLIC_SITE_URL = "https://flowpilot.ie";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("runDiagnostics", () => {
  it("reports a healthy setup as healthy", async () => {
    const { checks, failures } = await runDiagnostics("https://flowpilot.ie");

    expect(failures).toBe(0);
    expect(find(checks, "Database reachable").status).toBe("ok");
    expect(find(checks, "SMS sender").status).toBe("ok");
  });

  it("catches a site URL mismatch", async () => {
    /*
     * The most common cause of a setup that looks correct and still fails.
     * Twilio signs against the configured URL, so a mismatch rejects every
     * webhook as forged and calls simply never connect.
     */
    const { checks } = await runDiagnostics("https://staging.flowpilot.ie");

    const check = find(checks, "Site URL");
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("staging.flowpilot.ie");
    expect(check.fix).toContain("forged");
  });

  it("catches a missing SMS sender", async () => {
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
    delete process.env.TWILIO_SMS_SENDER_ID;

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "SMS sender",
    );

    expect(check.status).toBe("fail");
    // Names the actual consequence, not just the missing variable.
    expect(check.detail).toContain("no confirmation texts or job alerts");
  });

  it("catches an unreachable database", async () => {
    queryError = { message: 'relation "business" does not exist' };

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Database reachable",
    );

    expect(check.status).toBe("fail");
    expect(check.fix).toContain("migrations");
  });

  it("catches rejected Twilio credentials", async () => {
    twilioOk = false;

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Twilio credentials",
    );

    expect(check.status).toBe("fail");
  });

  it("treats a missing model key as fatal, not cosmetic", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Qualification model",
    );

    // The receptionist still answers without it, which is exactly why this
    // must not be reported as merely a warning — it looks like it works.
    expect(check.status).toBe("fail");
    expect(check.detail).toContain("only take a message");
  });

  it("warns rather than fails on billing, which does not stop calls", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { checks, failures } = await runDiagnostics("https://flowpilot.ie");

    expect(find(checks, "Stripe keys").status).toBe("warn");
    expect(failures).toBe(0);
  });

  it("builds webhook URLs from the configured site URL", async () => {
    const { webhookUrls } = await runDiagnostics("https://flowpilot.ie");

    expect(webhookUrls.map((webhook) => webhook.url)).toEqual([
      "https://flowpilot.ie/api/voice/incoming",
      "https://flowpilot.ie/api/voice/status",
      "https://flowpilot.ie/api/stripe/webhook",
    ]);
  });

  it("never reports a secret value", async () => {
    const { checks } = await runDiagnostics("https://flowpilot.ie");
    const text = JSON.stringify(checks);

    for (const secret of [
      "anonkey-zzqq11",
      "svcrole-zzqq22",
      "ACzzqq33",
      "authtok-zzqq44",
      "MGzzqq55",
      "sk-ant-zzqq66",
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});
