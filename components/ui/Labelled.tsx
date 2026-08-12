import type { ReactNode } from "react";
import { hintClass, labelClass } from "@/components/ui/field-styles";

/**
 * A label and hint above something that is not a plain text input — a textarea,
 * a group of checkboxes, a set of time pickers.
 *
 * Field handles the input case and owns its own <input>. This handles
 * everything else, so both look identical without either one growing a mode.
 *
 * The hint sits above the control rather than below it. Somebody reads it while
 * deciding what to type, not after they have typed — underneath, it is an
 * explanation arriving too late to be an explanation.
 */
export default function Labelled({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  /** Omit for a group of controls, where there is no single input to point at. */
  htmlFor?: string;
  children: ReactNode;
}) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;

  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        // A group has no single control to be the label FOR, and a <label>
        // pointing at nothing is worse for a screen reader than a heading.
        <span className={labelClass}>{label}</span>
      )}

      {hint && (
        <p id={hintId} className={`mt-1.5 ${hintClass}`}>
          {hint}
        </p>
      )}

      <div className="mt-2.5">{children}</div>
    </div>
  );
}
