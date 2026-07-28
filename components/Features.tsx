import { features } from "@/lib/content";

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 bg-black px-5 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
          Built to keep business moving
        </p>

        <div className="mt-5 grid gap-10 lg:grid-cols-2 lg:items-end">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Every enquiry handled. Every opportunity captured.
          </h2>
          <p className="max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
            FlowPilot works in the background so your team can stay focused
            while every customer receives a fast and professional response.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-7"
            >
              <div className="mb-12 h-2 w-2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.7)]" />
              <h3 className="text-lg font-semibold">{feature.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
