import { setReceptionistPaused } from "@/app/(app)/settings/pause-actions";

/**
 * On or off, and what that actually means for a caller.
 *
 * States the consequence rather than the state. "Paused" tells somebody what a
 * database column says; "callers hear it ring out, the same as before FlowPilot"
 * tells them what their customer will experience, which is the thing they are
 * actually deciding about.
 *
 * A form and a server action rather than a toggle switch. This is the one
 * setting where an accidental brush against a control means a week of missed
 * calls, and a button that says what it will do is harder to hit by mistake
 * than a switch that flips under a thumb.
 */
export default function PauseReceptionist({
  pausedAt,
}: {
  pausedAt: string | null;
}) {
  const paused = Boolean(pausedAt);

  return (
    <div
      className={`rounded-2xl border p-5 ${
        paused
          ? "border-amber-500/25 bg-amber-500/[0.07]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 text-[15px] font-medium">
            <span
              aria-hidden="true"
              className={`h-2 w-2 flex-none rounded-full ${
                paused ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            {paused ? "Switched off" : "Answering your missed calls"}
          </p>
          <p className="mt-1.5 max-w-md text-[13px] leading-5 text-zinc-400">
            {paused ? (
              <>
                Callers hear it ring out, the same as before FlowPilot. Nothing
                is being answered and no jobs are being taken.{" "}
                {pausedAt && (
                  <span className="text-zinc-500">
                    Off since {formatWhen(pausedAt)}.
                  </span>
                )}
              </>
            ) : (
              "Any call you don't pick up goes to your receptionist. Your own phone still rings first, every time."
            )}
          </p>
        </div>

        <form action={setReceptionistPaused} className="flex-none">
          <input type="hidden" name="paused" value={paused ? "false" : "true"} />
          <button
            type="submit"
            className={`inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition ${
              paused
                ? "bg-white text-black hover:bg-zinc-200"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {paused ? "Switch it back on" : "Switch it off"}
          </button>
        </form>
      </div>

      {/*
        The forwarding point, said before somebody goes looking for the dial
        codes. Turning it off here leaves the carrier setup alone, so coming
        back is one tap — whereas ##002# would clear the voicemail they were
        told to disable during setup and take two codes to undo.
      */}
      <p className="mt-4 border-t border-white/[0.07] pt-3.5 text-[13px] leading-5 text-zinc-500">
        Your forwarding stays set up either way, so switching back on takes one
        tap. You keep your number and nothing on your phone changes.
      </p>
    </div>
  );
}

/** "14 August" — a date, because a pause is measured in days not minutes. */
function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
