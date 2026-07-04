import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "آریا — خودکارسازی اینستاگرام، خودکار",
  description:
    "آریا پاسخ به دایرکت‌ها، کامنت‌ها و ریپلای استوری‌های اینستاگرام را با قوانین هوشمند و یک دستیار هوش مصنوعی آموزش‌دیده روی کسب‌وکار شما خودکار می‌کند.",
  keywords: ["خودکارسازی اینستاگرام", "ربات دایرکت", "هوش مصنوعی", "آریا"],
  authors: [{ name: "هوش مصنوعی آریا" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "آریا — خودکارسازی اینستاگرام",
    description: "خودکارسازی دایرکت، کامنت و ریپلای استوری با قوانین + هوش مصنوعی",
    siteName: "هوش مصنوعی آریا",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-vazirmatn), system-ui, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
