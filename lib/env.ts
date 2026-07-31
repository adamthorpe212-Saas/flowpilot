/**
 * Environment access.
 *
 * Every value is read through a function rather than a module-level constant so
 * that a missing variable fails when something actually needs it, with a message
 * naming the variable — not at import time, which would break `next build` on a
 * machine that has no secrets (CI, a fresh clone) and produce an error pointing
 * at a bundler internal rather than at the real cause.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Publishable — safe in browser bundles. */
export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/** Publishable — safe in browser bundles. RLS is what protects the data. */
export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Secret. Bypasses row-level security, so it must never reach a browser bundle.
 * The guard below is a real safety net, not decoration: importing this into a
 * client component is an easy mistake and the consequence is every tenant's data
 * readable by anyone.
 */
export function supabaseServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "supabaseServiceRoleKey() was called in the browser. This key bypasses row-level security and must stay server-side.",
    );
  }
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Absolute origin, used for auth redirects and webhook callbacks. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  // Vercel sets this on preview deployments, where the URL is not known ahead
  // of time and cannot be hardcoded.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}
