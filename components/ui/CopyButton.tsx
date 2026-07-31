"use client";

import { useEffect, useState } from "react";

/**
 * Copy-to-clipboard with confirmation.
 *
 * The confirmation matters more than it looks: copying produces no visible
 * change anywhere on screen, so without it the user cannot tell whether the
 * press registered and will often press again.
 */
export default function CopyButton({
  value,
  label = "Copy",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be denied or unavailable over plain HTTP. The code
      // is displayed in full next to this button, so the user can still read
      // and type it — failing silently is better than an alarming error.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
