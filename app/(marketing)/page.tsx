import LifecycleRing from "@/components/LifecycleRing";

export default function Home() {
  return (
    <section className="flex flex-1 items-center px-5 pb-10 pt-20 sm:px-6 sm:pt-24">
      <div className="mx-auto w-full max-w-3xl text-center">
        <h1 className="mx-auto max-w-xl text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
          Never feel guilty about a missed call again.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-zinc-400 sm:mt-5 sm:text-base sm:leading-7">
          On holidays, over the weekend, or busy on another site — your AI
          receptionist has you covered.
        </p>

        <div className="mt-8 lg:mt-10">
          <LifecycleRing />
        </div>
      </div>
    </section>
  );
}
