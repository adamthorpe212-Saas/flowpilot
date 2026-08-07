import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email — FlowPilot",
  robots: { index: false },
};

export default function CheckEmailPage() {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-white"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        We&apos;ve sent you a link to confirm your address. Click it and
        you&apos;ll be straight into setting up your receptionist.
      </p>

      <p className="mt-8 text-sm text-zinc-400">
        Wrong address?{" "}
        <Link href="/signup" className="text-white underline-offset-4 hover:underline">
          Start again
        </Link>
      </p>
    </div>
  );
}
