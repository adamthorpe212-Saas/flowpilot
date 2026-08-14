import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col overflow-x-hidden bg-black text-white">
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
      {/*
        Room under the footer for the sticky call to action, which is fixed and
        would otherwise sit on top of the privacy and terms links — the two
        things somebody checks precisely when they are deciding whether to
        trust us with their phone line. Mobile only, because the bar is.
      */}
      <Footer />
      <div aria-hidden="true" className="h-20 sm:hidden" />
    </div>
  );
}
