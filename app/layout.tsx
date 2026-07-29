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

export const metadata: Metadata = {
  title: "FlowPilot — The AI Receptionist for Service Businesses",
  description:
    "FlowPilot answers missed calls, qualifies leads and books appointments automatically, day or night — so tradespeople never lose a customer to a call they couldn't take.",
  openGraph: {
    title: "FlowPilot — The AI Receptionist for Service Businesses",
    description:
      "Answer missed calls, qualify leads and book appointments automatically, day or night.",
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
