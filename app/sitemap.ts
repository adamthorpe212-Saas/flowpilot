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
