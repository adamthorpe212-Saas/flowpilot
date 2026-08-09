import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      <header className="px-5 py-6 sm:px-8">
        {/* Inline-flex with a minimum height so the wordmark is a real target
            and not a 21px sliver of text. */}
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Logo size="large" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
