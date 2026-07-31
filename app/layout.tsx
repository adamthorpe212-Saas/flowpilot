import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
export const metadata: Metadata = {
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
