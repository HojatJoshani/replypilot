"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  duration?: number;
}

/**
 * Stunning animated splash screen with:
 * - Animated mesh gradient background
 * - Floating particles
 * - 3D rotating logo with glow
 * - Progress bar
 * - Glassmorphism
 */
export function SplashScreen({ duration = 2800 }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Phase transitions
    const p1 = setTimeout(() => setPhase(1), 300);
    const p2 = setTimeout(() => setPhase(2), 800);
    const p3 = setTimeout(() => setPhase(3), 1400);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 40);

    // Exit
    const exitTimer = setTimeout(() => setExiting(true), duration - 500);
    const unmountTimer = setTimeout(() => setPhase(4), duration);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
      clearInterval(interval);
    };
  }, [duration]);

  if (phase >= 4) return null;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-all duration-500 ${
        exiting ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{
        zIndex: 9999,
        background:
          "linear-gradient(135deg, #f58529 0%, #dd2a7b 35%, #8134af 70%, #515bd4 100%)",
        backgroundSize: "400% 400%",
        animation: "splash-gradient-shift 6s ease infinite",
      }}
    >
      {/* Animated mesh overlay */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0%, transparent 45%), radial-gradient(circle at 50% 50%, rgba(245,133,41,0.3) 0%, transparent 50%)",
          animation: "splash-mesh-move 8s ease-in-out infinite",
        }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/20"
          style={{
            width: `${4 + Math.random() * 12}px`,
            height: `${4 + Math.random() * 12}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `splash-float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            filter: "blur(1px)",
          }}
        />
      ))}

      {/* Large glow behind logo */}
      <div
        className="absolute h-64 w-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
          animation: "splash-glow-pulse 2s ease-in-out infinite",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo with 3D effect */}
        <div
          className="relative"
          style={{
            transform: `scale(${phase >= 1 ? 1 : 0}) rotate(${phase >= 2 ? 0 : 180}deg)`,
            opacity: phase >= 1 ? 1 : 0,
            transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-[2rem] bg-white/40 blur-2xl animate-pulse" />

          {/* Logo card */}
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/40 backdrop-blur-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <span
              className="text-6xl font-black text-white"
              style={{
                fontFamily: "var(--font-vazirmatn), system-ui",
                textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                transform: phase >= 2 ? "scale(1)" : "scale(0.5)",
                transition: "transform 0.6s ease 0.2s",
              }}
            >
              آ
            </span>
          </div>

          {/* Sparkle effects */}
          {phase >= 2 &&
            [
              { top: "-8px", right: "-8px", size: "12px", delay: "0s" },
              { bottom: "-6px", left: "20%", size: "8px", delay: "0.3s" },
              { top: "30%", left: "-10px", size: "10px", delay: "0.6s" },
            ].map((s, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  top: s.top,
                  right: s.right,
                  bottom: s.bottom,
                  left: s.left,
                  width: s.size,
                  height: s.size,
                  boxShadow: "0 0 12px rgba(255,255,255,0.9)",
                  animation: `splash-sparkle 1.5s ease-in-out infinite`,
                  animationDelay: s.delay,
                }}
              />
            ))}
        </div>

        {/* Brand name with letter animation */}
        <div
          className="text-center"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 20}px)`,
            transition: "all 0.6s ease 0.3s",
          }}
        >
          <h1
            className="text-3xl font-black text-white tracking-tight"
            style={{ textShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
          >
            هوش مصنوعی آریا
          </h1>
          <p className="mt-1 text-sm font-medium text-white/80">
            توسعه‌یافته توسط گروه توسعه آریاس
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-48 space-y-2"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width: `${progress}%`,
                transition: "width 0.1s linear",
                boxShadow: "0 0 10px rgba(255,255,255,0.8)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span>در حال بارگذاری</span>
            <span dir="ltr">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Feature badges */}
        <div
          className="flex flex-wrap items-center justify-center gap-2 px-4"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: `translateY(${phase >= 3 ? 0 : 10}px)`,
            transition: "all 0.5s ease 0.4s",
          }}
        >
          {[
            "پاسخ خودکار",
            "هوش مصنوعی",
            "۲۴/۷",
          ].map((feat) => (
            <span
              key={feat}
              className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom tagline */}
      <div
        className="absolute bottom-8 text-center"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.5s ease 0.6s",
        }}
      >
        <p className="text-xs text-white/60">
          پاسخ خودکار به دایرکت، کامنت و استوری
        </p>
      </div>

      <style>{`
        @keyframes splash-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes splash-mesh-move {
          0%, 100% { transform: scale(1) rotate(0deg); }
          33% { transform: scale(1.1) rotate(120deg); }
          66% { transform: scale(0.95) rotate(240deg); }
        }
        @keyframes splash-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(15px); opacity: 0.7; }
        }
        @keyframes splash-glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        @keyframes splash-sparkle {
          0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1) rotate(180deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
