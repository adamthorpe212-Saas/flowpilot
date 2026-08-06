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

      <p className="mt-8 text-center text-sm text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-white underline-offset-4 hover:underline">
          Get started
        </Link>
      </p>
    </div>
  );
}
