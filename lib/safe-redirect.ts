/**
 * Validates a caller-supplied redirect target.
 *
 * `value.startsWith("/")` is not sufficient, and was the bug this replaces.
 * Browsers treat `//host` as protocol-relative, so "//evil.example" passes that
 * check and navigates off-site — turning the login form into a phishing tool.
 * The attack works precisely because the sign-in is genuine: a victim
 * authenticates against the real FlowPilot and then lands on a page that isn't.
 *
 * Backslashes are rejected too. Several browsers normalise `/\` to `//` when
 * parsing a URL, so allowing it reopens the same hole by a different spelling.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) return fallback;

  // "//host" and "/\host" both leave the site.
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;

  // Control characters can smuggle a line break or a null past a naive check.
  // Compared by code point rather than a regex literal, which is easy to write
  // ambiguously and hard to read correctly.
  for (let index = 0; index < trimmed.length; index++) {
    const code = trimmed.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return fallback;
  }

  return trimmed;
}
