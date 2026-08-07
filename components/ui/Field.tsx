import type { InputHTMLAttributes, ReactNode } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
};

/**
 * Labelled text input. The label is a real <label> tied by id — placeholder-only
 * fields lose their meaning the moment someone starts typing, which is exactly
 * when they need it.
 */
export default function Field({ label, hint, id, className = "", ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-zinc-300"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-describedby={hintId}
        className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder:text-zinc-500 transition focus:border-white/40 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-zinc-400">
          {hint}
        </p>
      )}
    </div>
  );
}
