"use client";

import { useState } from "react";
import { addTags } from "@/lib/tags";

/**
 * Comma-or-Enter separated list with a live chip preview.
 *
 * The chips are rendered from component state but the value submitted is a
 * single hidden field, so this degrades to an ordinary text input if JavaScript
 * fails — the server parses the same comma-separated string either way.
 */
export default function TagInput({
  name,
  label,
  placeholder,
  hint,
  initial = [],
}: {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  initial?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    setTags((current) => addTags(current, raw));
    setDraft("");
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>

      {/*
        Submits what has been typed as well as what has been committed.

        Someone who types an area and presses "Save and continue" without first
        pressing Enter has plainly told us that area. Submitting only `tags`
        lost it: the blur handler commits, but the form posts before React has
        re-rendered this field, so the value that travelled was the one from
        before the blur. With a single area typed that way, the server saw an
        empty list and answered "Add at least one area you cover" — while the
        area sat there on screen, which makes the product look broken and the
        customer look wrong.

        Folding the draft in here removes the race rather than trying to win it.
      */}
      <input type="hidden" name={name} value={addTags(tags, draft).join(", ")} />

      <input
        id={name}
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-describedby={hint ? `${name}-hint` : undefined}
        onChange={(event) => {
          const value = event.target.value;
          // Typing a comma commits the entry, so the control behaves the same
          // whether someone pastes a list or types one item at a time.
          if (value.includes(",")) commit(value);
          else setDraft(value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
          if (event.key === "Backspace" && draft === "" && tags.length > 0) {
            setTags(tags.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10"
      />

      {hint && (
        <p id={`${name}-hint`} className="mt-2 text-xs text-zinc-400">
          {hint}
        </p>
      )}

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() =>
                  setTags(tags.filter((candidate) => candidate !== tag))
                }
                className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-3 pr-2 text-sm text-zinc-200 transition hover:border-white/30"
              >
                {tag}
                <span
                  aria-hidden="true"
                  className="text-zinc-400 transition group-hover:text-white"
                >
                  ×
                </span>
                <span className="sr-only">Remove {tag}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
