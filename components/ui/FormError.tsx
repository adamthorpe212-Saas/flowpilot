/**
 * Form-level error. role="alert" so it is announced the moment it appears —
 * a silently rendered message is invisible to anyone not looking at that part
 * of the screen.
 */
export default function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      {message}
    </p>
  );
}
