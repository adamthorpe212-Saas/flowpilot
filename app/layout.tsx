import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Keep this in step with the pages: FlowPilot answers, qualifies and hands the
 * job over. It does not book — that's Phase 4 in docs/ROADMAP.md, and claiming
 * it here would promise a calendar integration the product doesn't have.
 */
/*
 * Standalone-app metadata, so an installed FlowPilot behaves like an app
 * rather than a bookmark.
 *
 * `themeColor` paints the status bar to match the UI — without it iOS leaves a
 * white strip above a black app, which is the single most obvious tell that
 * something is a website in a costume.
 */
export const viewport: Viewport = {
  themeColor: "#09090b",
  // Content reaches under the notch and the home indicator; the app layout
  // pads for them with env(safe-area-inset-*).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  /*
   * iOS reads none of the web app manifest for its home-screen behaviour — it
   * has its own meta tags and ignores `display: standalone` entirely. Both have
   * to be declared or an iPhone install opens in Safari with the address bar
   * still there, which is the whole thing the customer was promised.
   */
  appleWebApp: {
    capable: true,
    title: "FlowPilot",
    statusBarStyle: "black-translucent",
  },
  /*
   * Without this, Next cannot turn the Open Graph image into the absolute URL
   * that social platforms require, and the card silently renders blank — the
   * one failure mode nobody notices, because it looks fine to whoever posted
   * the link.
   */
  metadataBase: new URL(siteUrl()),
  title: "FlowPilot — The AI Receptionist for Service Businesses",
  description:
    "FlowPilot answers the calls you miss, finds out what the job is, and sends it straight to your phone — on holidays, over the weekend, or when you're busy on another site.",
  openGraph: {
    title: "FlowPilot — The AI Receptionist for Service Businesses",
    description:
      "Answer every missed call, qualify the job, and get the details sent straight to your phone.",
    siteName: "FlowPilot",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/*
          Page views, so decisions about this site stop being guesses.

          Chosen over Google Analytics deliberately: this sets no cookie,
          builds no cross-site profile, and keeps no identifier that outlives
          the day. That is what lets the privacy policy stay honest — it
          promises no advertising and nothing "following you around", and both
          remain true. Google Analytics would have made that page a lie, which
          is a strange trade for knowing your bounce rate.

          It reports nothing in development, so local browsing cannot pollute
          the numbers.
        */}
        <Analytics />
      </body>
    </html>
  );
}
