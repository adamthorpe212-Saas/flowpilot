import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Diagnostics only earn their place if they are right about what is broken.
 * A check that reports "OK" for a missing SMS sender is worse than no check,
 * because it sends someone looking somewhere else.
 */

let queryError: { message: string } | null = null;
let twilioOk = true;
/** Per-table errors, so a missing demo_usage does not fake a dead database. */
let tableErrors: Record<string, { message: string; code?: string }> = {};
/** Anthropic's answer to the diagnostics test request. */
let modelResponse = { ok: true, status: 200, body: "" };

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: async () => ({
        error: tableErrors[table] ?? queryError,
        count: 0,
      }),
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
  tableErrors = {};
  modelResponse = { ok: true, status: 200, body: "" };

  // Twilio and Anthropic are told apart by URL: they are checked in parallel
  // and a single shared answer would make one of them meaningless.
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      if (String(url).includes("anthropic.com")) {
        return {
          ok: modelResponse.ok,
          status: modelResponse.status,
          text: async () => modelResponse.body,
        } as Response;
      }
      return { ok: twilioOk, status: twilioOk ? 200 : 401 } as Response;
    }),
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

  it("catches a model key that exists but has no credit", async () => {
    /*
     * The failure that prompted this check. The key is present and perfectly
     * well-formed, so a presence test reports OK while every single caller
     * hears the fallback line and no job is ever captured.
     */
    modelResponse = {
      ok: false,
      status: 400,
      body: '{"error":{"message":"Your credit balance is too low to access the Anthropic API"}}',
    };

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Qualification model",
    );

    expect(check.status).toBe("fail");
    expect(check.detail).toContain("out of credit");
    expect(check.fix).toContain("Billing");
  });

  it("tells an expired key apart from an empty balance", async () => {
    /*
     * Both arrive as a 4xx, and the fix is completely different. This is the
     * real state of the project's own key, so getting it wrong would have sent
     * someone to the billing page to solve a problem billing cannot solve.
     */
    modelResponse = {
      ok: false,
      status: 401,
      body: '{"type":"error","error":{"type":"authentication_error","message":"API key is invalid."}}',
    };

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Qualification model",
    );

    expect(check.status).toBe("fail");
    expect(check.detail).toContain("rejected the API key");
    expect(check.fix).toContain("API keys");
    expect(check.fix).not.toContain("Billing");
  });

  it("catches a model name that does not exist", async () => {
    modelResponse = {
      ok: false,
      status: 404,
      body: '{"error":{"type":"not_found_error","message":"model: nope"}}',
    };
    process.env.ANTHROPIC_MODEL = "claude-imaginary-9";

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Qualification model",
    );

    expect(check.status).toBe("fail");
    expect(check.detail).toContain("claude-imaginary-9");
  });

  it("catches an unapplied demo rate limit before it becomes a bill", async () => {
    /*
     * withinRateLimit fails open when this table is missing, on purpose — a
     * marketing page that silently stops working is worse than a briefly
     * uncapped one. That tradeoff is only safe if the gap is visible somewhere,
     * and this is the somewhere.
     */
    tableErrors = {
      demo_usage: { message: 'relation "demo_usage" does not exist', code: "42P01" },
    };

    const { checks } = await runDiagnostics("https://flowpilot.ie");

    expect(find(checks, "Demo rate limit").status).toBe("fail");
    expect(find(checks, "Demo rate limit").detail).toContain("no per-visitor cap");
    // The database itself is fine — only that one table is absent.
    expect(find(checks, "Database reachable").status).toBe("ok");
  });

  it("says out loud that caller data is never deleted", async () => {
    /*
     * The purge is off until a period is chosen, which is the right default and
     * the easiest thing here to forget. "We keep every transcript forever" is
     * not a position to end up holding by accident.
     */
    delete process.env.RETENTION_DAYS;

    const { checks, failures } = await runDiagnostics("https://flowpilot.ie");
    const check = find(checks, "Caller data retention");

    expect(check.status).toBe("warn");
    expect(check.detail).toContain("nothing is deleted");
    // A warning, not a failure — calls still work, so it must not look broken.
    expect(failures).toBe(0);
  });

  it("confirms the retention period once one is set", async () => {
    process.env.RETENTION_DAYS = "180";

    const check = find(
      (await runDiagnostics("https://flowpilot.ie")).checks,
      "Caller data retention",
    );

    expect(check.status).toBe("ok");
    expect(check.detail).toContain("180 days");
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
