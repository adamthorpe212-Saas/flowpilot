export default function CTA() {
  return (
    <section
      id="contact"
      className="scroll-mt-20 border-t border-white/10 bg-zinc-950 px-5 py-24 sm:px-6 sm:py-32"
    >
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
          Never send another customer to voicemail
        </p>
        <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-7xl">
          Meet the receptionist that never clocks off.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
          Give every caller an instant response, even when your team is busy,
          offline or already on another job.
        </p>
        <a
          href="mailto:hello@flowpilot.ie"
          className="mt-10 inline-block rounded-full bg-white px-8 py-4 font-semibold text-black transition hover:scale-[1.02]"
        >
          Book your demo
        </a>
      </div>
    </section>
  );
}
