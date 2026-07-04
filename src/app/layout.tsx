import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReplyPilot — Instagram Automation, on autopilot",
  description:
    "ReplyPilot automates Instagram DMs, comments, and story replies with smart rules and an optional AI assistant trained on your business.",
  keywords: ["Instagram automation", "DM automation", "AI chatbot", "SaaS", "ReplyPilot"],
  authors: [{ name: "ReplyPilot" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ReplyPilot — Instagram Automation, on autopilot",
    description: "Automate Instagram DMs, comments & story replies with rules + AI.",
    siteName: "ReplyPilot",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
