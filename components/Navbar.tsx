import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight sm:text-xl">
          FlowPilot
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 text-sm text-zinc-400 md:flex"
        >
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
        </nav>

        <a
          href="mailto:hello@flowpilot.ie"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-medium transition hover:bg-white hover:text-black sm:px-5 sm:text-sm"
        >
          Book a demo
        </a>
      </div>
    </header>
  );
}
