import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * The public pages, and only those.
 *
 * Kept as a literal list rather than derived from the filesystem: the routes
 * that should be indexed are a deliberate choice, and a directory walk would
 * silently start advertising the next page anyone adds — including one added
 * behind a login.
 */
const PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/how-it-works", priority: 0.8 },
  { path: "/pricing", priority: 0.8 },
  /*
   * Worth indexing in its own right. "does an AI receptionist record my calls"
   * and "do I keep my number" are things people type into Google, and the
   * answers only became findable once they stopped being an anchor on a sales
   * page that ranks for something else entirely.
   */
  { path: "/faq", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();
  const lastModified = new Date();

  return PAGES.map((page) => ({
    url: `${origin}${page.path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: page.priority,
  }));
}
