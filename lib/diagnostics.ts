import "server-only";
import { receptionistModel } from "@/lib/receptionist";

import { isEmailConfigured } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { formatPrice, PLANS } from "@/lib/plans";
import { retentionPolicy } from "@/lib/retention";
import { stripe } from "@/lib/stripe";
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

function checkEmail(): Check {
  const configured = isEmailConfigured();

  return {
    name: "Email alerts",
    status: configured ? "ok" : "warn",
    detail: configured
      ? "Configured — jobs can reach you by email"
      : "Not set. Worth having: it needs no regulator, so it works while the ComReg sender ID is still pending",
    fix: configured ? undefined : "RESEND_API_KEY and EMAIL_FROM",
  };
}

/**
 * Actually calls the model rather than checking that a key exists.
 *
 * A present key proves nothing. A key with no credit, a revoked key and a
 * mistyped model name all look identical to `present()`, and all three leave
 * every caller hearing the fallback line while this page cheerfully reports OK.
 * That is the exact failure this page exists to catch, so it is worth one real
 * request to catch it.
 */
async function checkModel(): Promise<Check> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  /*
   * The receptionist's own model, not a second copy of the default. These had
   * already drifted apart — diagnostics would happily report a model healthy
   * while live calls used a different one, which is worse than not checking.
   */
  const model = receptionistModel();

  if (!present(apiKey)) {
    return {
      name: "Qualification model",
      status: "fail",
      detail: "No API key — the receptionist will answer but only take a message",
      fix: "console.anthropic.com → ANTHROPIC_API_KEY",
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey as string,
        "anthropic-version": "2023-06-01",
      },
      // The smallest request that still proves key, credit and model name.
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      return {
        name: "Qualification model",
        status: "ok",
        detail: `Answered a test request (${model})`,
      };
    }

    const body = await response.text();

    /*
     * The three that actually happen, told apart by their message rather than
     * their status — an expired key and an empty balance both arrive as a 4xx,
     * and sending someone to Billing over a dead key wastes the trip.
     */
    const diagnosis = /credit balance is too low/i.test(body)
      ? {
          detail:
            "The Anthropic account is out of credit. Every call falls back to taking a message.",
          fix: "console.anthropic.com → Plans & Billing → add credit",
        }
      : response.status === 401 || /authentication_error|invalid x-api-key|API key is invalid/i.test(body)
        ? {
            detail:
              "Anthropic rejected the API key. Keys that were created as temporary expire, and an expired key looks exactly like a working one from here.",
            fix: "console.anthropic.com → API keys → create a key, then set ANTHROPIC_API_KEY",
          }
        : response.status === 404
          ? {
              detail: `The model "${model}" was not recognised.`,
              fix: "Check ANTHROPIC_MODEL, or unset it to use the default.",
            }
          : {
              detail: `Anthropic returned ${response.status}.`,
              fix: "console.anthropic.com → check the key, the model name and the balance",
            };

    return {
      name: "Qualification model",
      status: "fail",
      ...diagnosis,
    };
  } catch (error) {
    return {
      name: "Qualification model",
      status: "fail",
      detail:
        error instanceof Error
          ? `Could not reach Anthropic: ${error.message}`
          : "Could not reach Anthropic",
      fix: "Check outbound network access from the deployment.",
    };
  }
}

/**
 * The public demo's spend ceiling.
 *
 * withinRateLimit() deliberately fails open when this table is missing, so an
 * unapplied migration turns a public endpoint into an uncapped one — and the
 * first symptom is a bill. Silent by design in the request path, so it has to
 * be loud here.
 */
async function checkDemoRateLimit(): Promise<Check> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("demo_usage")
      .select("ip_hash", { count: "exact", head: true });

    if (error?.code === "42P01") {
      return {
        name: "Demo rate limit",
        status: "fail",
        detail:
          "The demo_usage table is missing, so the public demo has no per-visitor cap. Anyone can run it as often as they like, at your cost.",
        fix: "Apply supabase/migrations/20260731120800_demo_usage.sql — do this before adding Anthropic credit.",
      };
    }

    if (error) {
      return {
        name: "Demo rate limit",
        status: "warn",
        detail: error.message,
        fix: "Check the demo_usage table and its policies.",
      };
    }

    return {
      name: "Demo rate limit",
      status: "ok",
      detail: "The public demo is capped per visitor",
    };
  } catch (error) {
    return {
      name: "Demo rate limit",
      status: "warn",
      detail: error instanceof Error ? error.message : "Could not check",
    };
  }
}

/**
 * Whether callers' details are ever aged out.
 *
 * A privacy job that is off by default is the right default and the easiest
 * thing in the product to forget, so it reports as a warning rather than
 * staying quiet. Not a failure: nothing is broken, and calls keep working —
 * but "we keep every transcript forever" is not a position to hold by
 * accident.
 */
function checkRetention(): Check {
  const policy = retentionPolicy();

  if (!policy.enabled) {
    return {
      name: "Caller data retention",
      status: "warn",
      detail: policy.reason,
      fix: "Pick a period, set RETENTION_DAYS — see docs/DATA-PROCESSING.md",
    };
  }

  return {
    name: "Caller data retention",
    status: "ok",
    detail: `Names, addresses and transcripts are erased after ${policy.days} days`,
  };
}

/**
 * Does Stripe actually charge what the website advertises?
 *
 * The price lives in two places that cannot see each other: lib/plans.ts, which
 * every page renders from, and a Price object inside Stripe, which is what a
 * card is debited for. Nothing in the codebase can detect a disagreement — the
 * site would advertise one figure and quietly take another, and the first person
 * to notice would be a customer reading their statement.
 *
 * Live because it has to be. The value is in Stripe, so any check that does not
 * ask Stripe is only checking that we typed the same number twice.
 */
async function checkPriceMatchesStripe(): Promise<Check> {
  const name = "Advertised price";
  const plan = PLANS.find((candidate) => candidate.sold);

  if (!plan) {
    return { name, status: "warn", detail: "No plan is marked as sold" };
  }

  const priceId = process.env[`STRIPE_PRICE_${plan.id.toUpperCase()}`];
  const advertised = formatPrice(plan);

  if (!present(process.env.STRIPE_SECRET_KEY) || !present(priceId)) {
    return {
      name,
      status: "warn",
      detail: `Site says ${advertised}; cannot confirm what Stripe charges`,
      fix: "Set STRIPE_SECRET_KEY and the price ID for the plan being sold.",
    };
  }

  try {
    const price = await stripe().prices.retrieve(priceId as string);
    const stripeAmount = (price.unit_amount ?? 0) / 100;
    const matches = stripeAmount === plan.price;

    return {
      name,
      status: matches ? "ok" : "fail",
      detail: matches
        ? `Stripe charges ${advertised}, same as the site`
        : `Site says ${advertised} but Stripe charges ${stripeAmount} ${price.currency?.toUpperCase()}`,
      fix: matches
        ? undefined
        : "Create a new Price in Stripe at the advertised amount and point STRIPE_PRICE_* at it. Existing subscribers stay on the price they signed up to.",
    };
  } catch (error) {
    return {
      name,
      status: "warn",
      detail: `Site says ${advertised}; Stripe would not confirm its price`,
      fix: error instanceof Error ? error.message : undefined,
    };
  }
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
  const [supabase, twilio, model, demoLimit, priceMatch] = await Promise.all([
    checkSupabase(),
    checkTwilio(),
    checkModel(),
    checkDemoRateLimit(),
    checkPriceMatchesStripe(),
  ]);

  const checks: Check[] = [
    checkSiteUrl(requestOrigin),
    ...supabase,
    ...twilio,
    checkEmail(),
    checkRetention(),
    model,
    demoLimit,
    ...checkStripe(),
    priceMatch,
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
