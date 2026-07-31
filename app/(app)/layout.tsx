import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentBusiness } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const business = await getCurrentBusiness();

  // Middleware already gates these routes on a session. Reaching here without a
  // business means creation genuinely failed, and sending the user to a broken
  // dashboard would be worse than sending them back to sign in.
  if (!business) redirect("/login");

  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              FlowPilot
            </Link>
            <nav aria-label="Application" className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">
                Leads
              </Link>
              <Link href="/settings" className="text-zinc-400 transition hover:text-white">
                Settings
              </Link>
              <Link href="/billing" className="text-zinc-400 transition hover:text-white">
                Billing
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden max-w-[16ch] truncate text-sm text-zinc-500 sm:block">
              {business.name}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
