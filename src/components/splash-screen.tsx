"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  /** Duration in ms before fade-out */
  duration?: number;
  /** Message shown under the logo */
  message?: string;
}

/**
 * Animated splash screen with the آریا brand.
 * Shows on initial app load, then fades out.
 */
export function SplashScreen({
  duration = 1800,
  message = "در حال بارگذاری…",
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration - 400);
    const hideTimer = setTimeout(() => setVisible(false), duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(135deg, #f58529 0%, #dd2a7b 45%, #8134af 80%, #515bd4 100%)",
      }}
    >
      {/* Decorative blurred circles */}
      <div className="absolute top-20 right-20 h-40 w-40 rounded-full bg-white/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-32 left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-1/3 left-1/4 h-32 w-32 rounded-full bg-white/5 blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Logo + Brand */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated logo circle */}
        <div className="relative">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-3xl bg-white/30 animate-ping" style={{ animationDuration: "2s" }} />
          {/* Logo */}
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl"
            style={{
              animation: "splash-bounce 1s ease-out",
            }}
          >
            <span className="text-5xl font-bold text-white" style={{ fontFamily: "var(--font-vazirmatn), system-ui" }}>
              آ
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center space-y-1" style={{ animation: "splash-fade-up 0.8s ease-out 0.3s both" }}>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            هوش مصنوعی آریا
          </h1>
          <p className="text-sm text-white/80">
            خودکارسازی اینستاگرام
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-2" style={{ animation: "splash-fade-up 0.8s ease-out 0.6s both" }}>
          <span className="h-2 w-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>

        {/* Message */}
        <p
          className="text-xs text-white/70"
          style={{ animation: "splash-fade-up 0.8s ease-out 0.9s both" }}
        >
          {message}
        </p>
      </div>

      {/* Bottom tagline */}
      <div
        className="absolute bottom-8 text-center"
        style={{ animation: "splash-fade-up 0.8s ease-out 1.2s both" }}
      >
        <p className="text-xs text-white/60">
          پاسخ خودکار به دایرکت، کامنت و استوری — ۲۴ ساعته
        </p>
      </div>

      <style>{`
        @keyframes splash-bounce {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splash-fade-up {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
