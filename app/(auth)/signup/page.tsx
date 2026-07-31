import type { Metadata } from "next";
import Link from "next/link";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Get started — FlowPilot",
  robots: { index: false },
};

export default function SignupPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Set up your receptionist
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Takes a few minutes. No card needed to get set up.
      </p>

      <SignupForm />

      <p className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-white underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
