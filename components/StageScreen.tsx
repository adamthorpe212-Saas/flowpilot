import { DEFAULT_GREETING } from "@/lib/disclosure";

/**
 * The four screens that play inside the phone at the centre of the lifecycle
 * ring, indexed to match `lifecycleStages`.
 */
export default function StageScreen({ stage }: { stage: number }) {
  if (stage === 0) {
    return (
      <div className="px-3 pt-7 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-red-950 text-red-200">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M3 3l18 18" />
            <path d="M5.5 9.5a16 16 0 0 0 9 9l2-2.5 3.5 1v3a1.5 1.5 0 0 1-1.7 1.5A19 19 0 0 1 3.5 5.7 1.5 1.5 0 0 1 5 4h3l1 3.5z" />
          </svg>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-white">John Murphy</p>
        <p className="mt-0.5 text-[9px] text-zinc-400">Missed · now</p>
      </div>
    );
  }

  if (stage === 1) {
    return (
      <div className="px-2.5 pt-5 text-center">
        <p className="text-[8px] uppercase tracking-[0.16em] text-emerald-300">
          In call
        </p>

        <div
          aria-hidden="true"
          className="mt-3 flex h-6 items-center justify-center gap-[3px]"
        >
          {[0, 120, 240, 80, 200].map((delay, index) => (
            <span
              key={index}
              style={{ animationDelay: `${delay}ms` }}
              className="fp-wave-bar block h-full w-[3px] rounded-full bg-white/80"
            />
          ))}
        </div>

        {/* Quoted from the real default rather than typed out. This showed
            "Sorry we missed you" long after that wording was removed from the
            product for opening on an apology — the same drift that had the
            settings page promising a greeting no caller has ever heard. */}
        <p className="mt-3 text-[9px] leading-relaxed text-zinc-300">
          &ldquo;{DEFAULT_GREETING}&rdquo;
        </p>
      </div>
    );
  }

  if (stage === 2) {
    return (
      <div className="px-2.5 pt-6">
        <dl className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.07] p-2.5 text-[9px] text-white">
          {[
            ["Job", "Burst pipe"],
            ["Where", "Raheny"],
            ["Urgent", "Yes"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-zinc-400">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="px-2.5 pt-8">
      <div className="rounded-xl bg-white p-2.5">
        <p className="text-[8px] uppercase tracking-[0.12em] text-zinc-400">
          New job
        </p>
        <p className="mt-1 text-[10px] font-semibold text-zinc-900">
          Burst pipe · Raheny
        </p>
        <p className="mt-0.5 text-[9px] text-zinc-400">John Murphy</p>
      </div>
    </div>
  );
}
