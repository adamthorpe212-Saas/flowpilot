import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppNav from "@/components/AppNav";
import InstallApp from "@/components/InstallApp";
import { getCurrentBusiness } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const business = await getCurrentBusiness();

  // Middleware already gates these routes on a session. Reaching here without a
  // business means creation genuinely failed, and sending the user to a broken
  // dashboard would be worse than sending them back to sign in.
  if (!business) redirect("/login");

  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      <AppNav businessName={business.name} />

      {/*
        Padded for the notch and the home indicator, which only exist once this
        is installed. In a browser tab these resolve to zero, so it costs
        nothing there and stops the first job card sitting under the clock on a
        phone running it full-screen.
      */}
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-6 sm:py-12"
        style={{
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {/*
          Above the page rather than inside one screen: whichever part of the
          app they happen to open, this is the same single ask, and it hides
          itself once installed or dismissed.
        */}
        <InstallApp />
        {children}
      </main>
    </div>
  );
}
