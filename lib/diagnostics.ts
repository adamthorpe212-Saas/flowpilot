import "server-only";

import { siteUrl } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Configuration checks for the moment something does not work.
 *
 * FlowPilot depends on four external services, and almost every way they fail
 * looks identical from the outside: a phone that rings out, a text that never
 * arrives. Without this, diagnosing that means guessing across Supabase,
 * Twilio, Stripe and the model — and several of the failures are silent by
 * design, because a webhook that swallows an error is the right behaviour for a
 * live call and the wrong behaviour for a person trying to set it up.
 *
 * Never reports the value of a secret, only whether it is present and whether
 * it works.
 */

export type CheckStatus = "ok" | "warn" | "fail";

export type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
  /** What to do about it, when there is something to do. */
  fix?: string;
};

function present(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

async function checkSupabase(): Promise<Check[]> {
  const checks: Check[] = [];

  const hasUrl = present(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasService = present(process.env.SUPABASE_SERVICE_ROLE_KEY);

  checks.push({
    name: "Supabase keys",
    status: hasUrl && hasAnon && hasService ? "ok" : "fail",
    detail: [
      hasUrl ? "URL set" : "URL missing",
      hasAnon ? "anon key set" : "anon key missing",
      hasService ? "service role key set" : "service role key missing",
    ].join(" · "),
    fix: hasUrl && hasAnon && hasService ? undefined : "Project Settings → API",
  });

  if (!hasUrl || !hasService) return checks;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("business")
      .select("id", { count: "exact", head: true });

    checks.push({
      name: "Database reachable",
      status: error ? "fail" : "ok",
      detail: error ? error.message : "Queried the business table successfully",
      fix: error
        ? "Have the migrations been applied? See docs/SETUP.md section A."
        : undefined,
    });
  } catch (error) {
    checks.push({
      name: "Database reachable",
      status: "fail",
      detail: error instanceof Error ? error.message : "Unknown error",
      fix: "Check the Supabase project is running and not paused.",
    });
  }

  return checks;
}

async function checkTwilio(): Promise<Check[]> {
  const checks: Check[] = [];

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!present(sid) || !present(token)) {
    checks.push({
      name: "Twilio credentials",
      status: "fail",
      detail: "Account SID or auth token missing",
      fix: "Twilio Console dashboard → docs/SETUP.md section C3",
    });
    return checks;
  }

  try {
    // Cheapest authenticated call that proves the credentials work.
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
      {
        headers: {
          authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
      },
    );

    checks.push({
      name: "Twilio credentials",
      status: response.ok ? "ok" : "fail",
      detail: response.ok
        ? "Authenticated successfully"
        : `Twilio rejected the credentials (${response.status})`,
      fix: response.ok ? undefined : "Check the account SID and auth token.",
    });
  } catch (error) {
    checks.push({
      name: "Twilio credentials",
      status: "fail",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const hasMessagingService = present(process.env.TWILIO_MESSAGING_SERVICE_SID);
  const hasSenderId = present(process.env.TWILIO_SMS_SENDER_ID);

  checks.push({
    name: "SMS sender",
    status: hasMessagingService || hasSenderId ? "ok" : "fail",
    detail:
      hasMessagingService || hasSenderId
        ? hasMessagingService
          ? "Messaging Service configured"
          : "Alphanumeric sender ID configured"
        : "No sender configured — no confirmation texts or job alerts will be sent",
    fix:
      hasMessagingService || hasSenderId
        ? undefined
        : "Irish numbers cannot send SMS. Register a sender ID with ComReg — docs/SETUP.md section C2.",
  });

  const hasBundle = present(process.env.TWILIO_BUNDLE_SID);
  checks.push({
    name: "Irish regulatory bundle",
    status: hasBundle ? "ok" : "warn",
    detail: hasBundle
      ? "Bundle configured"
      : "Not set — number provisioning may be rejected",
    fix: hasBundle ? undefined : "docs/SETUP.md section C1. Takes days to approve.",
  });

  return checks;
}

function checkModel(): Check {
  const hasKey = present(process.env.ANTHROPIC_API_KEY);

  return {
    name: "Qualification model",
    status: hasKey ? "ok" : "fail",
    detail: hasKey
      ? `Configured (${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5"})`
      : "No API key — the receptionist will answer but only take a message",
    fix: hasKey ? undefined : "console.anthropic.com → ANTHROPIC_API_KEY",
  };
}

function checkStripe(): Check[] {
  const hasSecret = present(process.env.STRIPE_SECRET_KEY);
  const hasWebhook = present(process.env.STRIPE_WEBHOOK_SECRET);

  const missingPrices = PLANS.filter(
    (plan) =>
      !present(process.env[`STRIPE_PRICE_${plan.id.toUpperCase()}`]),
  ).map((plan) => plan.name);

  return [
    {
      name: "Stripe keys",
      status: hasSecret ? "ok" : "warn",
      detail: hasSecret ? "Secret key set" : "Not set — nobody can subscribe",
      fix: hasSecret ? undefined : "docs/SETUP.md section D",
    },
    {
      name: "Stripe webhook secret",
      status: hasWebhook ? "ok" : "warn",
      detail: hasWebhook
        ? "Set"
        : "Not set — every delivery is rejected, so no payment ever grants access",
      fix: hasWebhook ? undefined : "Developers → Webhooks → signing secret",
    },
    {
      name: "Stripe prices",
      status: missingPrices.length === 0 ? "ok" : "warn",
      detail:
        missingPrices.length === 0
          ? "All plans have a price ID"
          : `Missing: ${missingPrices.join(", ")}`,
      fix:
        missingPrices.length === 0
          ? undefined
          : "Price IDs differ between test and live mode.",
    },
  ];
}

/**
 * The single most common cause of a working setup that still fails: Twilio
 * signs webhooks against the URL it was configured with, and signature
 * verification rebuilds that URL from NEXT_PUBLIC_SITE_URL. If the two differ,
 * every webhook is rejected as forged and calls simply do not connect.
 */
function checkSiteUrl(requestOrigin: string | null): Check {
  const configured = siteUrl();

  if (!requestOrigin) {
    return {
      name: "Site URL",
      status: "warn",
      detail: `Configured as ${configured}, but the request origin is unknown`,
    };
  }

  const matches = configured.replace(/\/$/, "") === requestOrigin.replace(/\/$/, "");

  return {
    name: "Site URL",
    status: matches ? "ok" : "fail",
    detail: matches
      ? `Matches this request (${configured})`
      : `Configured as ${configured} but you are on ${requestOrigin}`,
    fix: matches
      ? undefined
      : "Twilio signatures are checked against the configured URL. A mismatch rejects every webhook as forged.",
  };
}

export type Diagnostics = {
  checks: Check[];
  webhookUrls: { label: string; url: string }[];
  failures: number;
  warnings: number;
};

export async function runDiagnostics(
  requestOrigin: string | null,
): Promise<Diagnostics> {
  const [supabase, twilio] = await Promise.all([checkSupabase(), checkTwilio()]);

  const checks: Check[] = [
    checkSiteUrl(requestOrigin),
    ...supabase,
    ...twilio,
    checkModel(),
    ...checkStripe(),
  ];

  const base = siteUrl();

  return {
    checks,
    webhookUrls: [
      { label: "Twilio — a call comes in", url: `${base}/api/voice/incoming` },
      { label: "Twilio — call status changes", url: `${base}/api/voice/status` },
      { label: "Stripe — webhook endpoint", url: `${base}/api/stripe/webhook` },
    ],
    failures: checks.filter((check) => check.status === "fail").length,
    warnings: checks.filter((check) => check.status === "warn").length,
  };
}
