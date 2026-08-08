/**
 * What a tradesperson actually receives.
 *
 * The single most important thing the marketing site has to show. Everything
 * else — the call being answered, the questions asked — is machinery a customer
 * does not care about. This is the artefact they get, and it is what they are
 * really buying, so it is drawn as a piece of the product rather than as an
 * illustration of one.
 *
 * Deliberately not a screenshot. A picture goes stale the first time the app
 * changes; this is the same markup the product would render, so it cannot drift
 * into showing something FlowPilot does not do.
 */

export type JobCardField = { label: string; value: string };

export default function JobCard({
  name,
  number,
  urgency,
  fields,
  actions = true,
  className = "",
}: {
  name: string;
  number: string;
  urgency?: string;
  fields: JobCardField[];
  actions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/12 bg-[#0c0c0c] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          New job
        </p>
        {urgency && (
          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-300">
            {urgency}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="text-[15px] font-semibold text-white">{name}</p>
        <p className="mt-0.5 text-sm text-zinc-400">{number}</p>

        <dl className="mt-4 space-y-3">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {field.label}
              </dt>
              <dd className="mt-0.5 text-sm leading-5 text-zinc-200">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {actions && (
        <div className="flex gap-2 border-t border-white/8 px-5 py-3.5">
          {/*
            Presentational. These are what the dashboard offers, drawn here so a
            visitor can see the decision is theirs — FlowPilot takes the call, it
            does not commit them to the work.
          */}
          <span className="flex-1 rounded-full bg-white px-4 py-2 text-center text-xs font-semibold text-black">
            Accept
          </span>
          <span className="flex-1 rounded-full border border-white/15 px-4 py-2 text-center text-xs font-medium text-zinc-200">
            Call back
          </span>
        </div>
      )}
    </div>
  );
}
