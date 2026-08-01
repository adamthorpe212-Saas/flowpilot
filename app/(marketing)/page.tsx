import Link from "next/link";
import LifecycleRing from "@/components/LifecycleRing";
import LiveDemo from "@/components/LiveDemo";

export default function Home() {
  return (
    <>
      <section className="px-5 pb-14 pt-24 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="mx-auto w-full max-w-3xl text-center">
          <h1 className="mx-auto max-w-xl text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            Never feel guilty about a missed call again.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
            On holidays, over the weekend, or busy on another site — your AI
            receptionist has you covered.
          </p>

          <div className="mt-10">
            <LifecycleRing />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              See it in action
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-4xl">
              Say something a customer would say.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              This is the real receptionist, not a recording. Watch the job build
              itself as you talk.
            </p>
          </div>

          <div className="mt-10">
            <LiveDemo />
          </div>

          <p className="mx-auto mt-8 max-w-lg text-center text-xs leading-5 text-zinc-600">
            Every question it asks is yours to change — services, wording, what
            it must never say.
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            See it answer your calls.
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
            Set up in minutes, around your services and the way you already
            work.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 sm:text-base"
          >
            Get started
          </Link>
        </div>
      </section>
    </>
  );
}
