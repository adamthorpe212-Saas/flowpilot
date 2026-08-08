/**
 * The rule for adding entries to a tag list.
 *
 * Pulled out of TagInput and made pure for the same reason the services state
 * transition was: these forms sit behind a login and cannot be driven in a
 * browser during development, so logic left inside the component is logic
 * nothing checks. The areas a business covers decide which jobs get flagged as
 * out of patch, and it is the one field on that page with real behaviour.
 */

/**
 * Merges raw input into an existing list.
 *
 * Splits on commas so pasting "Raheny, Clontarf, Dublin 5" behaves the same as
 * typing them one at a time. Comparison is case-insensitive, and applies within
 * the addition as well as against what is already there — pasting a list that
 * repeats itself should not produce two chips reading "Dublin" and "dublin".
 *
 * The first spelling wins. Someone who typed "Raheny" and then pastes "raheny"
 * meant to add nothing, not to restyle what they already had.
 */
export function addTags(existing: readonly string[], raw: string): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((tag) => tag.toLowerCase()));

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}
