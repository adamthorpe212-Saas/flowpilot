import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * What search engines may look at.
 *
 * The marketing pages are the point of being indexed. Everything behind a login
 * is disallowed — not as a security measure, since the real protection is auth
 * and row-level security, but because a crawler following a link to /dashboard
 * only ever produces a login page in someone's search results, which makes the
 * product look broken before anyone has used it.
 *
 * /api is excluded for the same reason: the webhook endpoints return TwiML and
 * a 403 to anything unsigned, and neither belongs in an index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/onboarding",
        "/settings",
        "/billing",
        "/login",
        "/signup",
        "/auth/",
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
