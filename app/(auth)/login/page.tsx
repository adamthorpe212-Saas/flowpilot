import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — FlowPilot",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Sign in to see your leads and manage your receptionist.
      </p>

      <LoginForm next={next} />

      {/* Padded to a 44px target — an 18px link is a coin flip with a thumb. */}
      <p className="mt-8 text-center text-sm text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="ml-1 inline-flex min-h-11 items-center rounded-lg px-2 text-white transition hover:bg-white/5"
        >
          Get FlowPilot
        </Link>
      </p>
    </div>
  );
}
