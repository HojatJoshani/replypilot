"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Instagram, Loader2, MessageCircle, Zap, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@replypilot.app");
  const [password, setPassword] = useState("demo1234");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const authError = params.get("auth") === "error";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/api/auth/register", { name, email, password, businessName });
      }
      const res = await signIn("credentials", {
        email,
        password,
        demo: "1",
        redirect: false,
      });
      if (res?.error) {
        toast.error(t.login.invalid);
      } else {
        toast.success(t.login.welcomeToast);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    const res = await signIn("credentials", {
      email: "demo@replypilot.app",
      password: "demo1234",
      demo: "1",
      redirect: false,
    });
    if (res?.error) toast.error("ورود دمو ناموفق بود");
    else {
      toast.success(t.login.demoToast);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* راست: پنل برند */}
      <div className="hidden lg:flex lg:w-1/2 ig-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">{t.brand}</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              {t.login.heroTitle} <span className="italic">{t.login.heroTitleAccent}</span> {t.login.heroTitleEnd}
            </h1>
            <p className="text-lg text-white/90 max-w-md leading-relaxed">
              {t.login.heroDesc}
            </p>
            <div className="space-y-3 pt-4">
              {[
                { icon: Zap, text: t.login.feat1 },
                { icon: MessageCircle, text: t.login.feat2 },
                { icon: ShieldCheck, text: t.login.feat3 },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <span className="text-white/95">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-white/70">{t.login.heroFoot}</div>
        </div>
      </div>

      {/* چپ: فرم ورود */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ig-gradient text-white">
              <Instagram className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">
              {mode === "login" ? t.login.welcome : t.login.createTitle}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? t.login.welcomeSub : t.login.createSub}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                اتصال اینستاگرام ناموفق بود. همچنان می‌توانید داشبورد را بررسی کنید.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">{t.login.name}</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="سارا احمدی" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz">{t.login.businessName}</Label>
                    <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="استودیو پوست گلو" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.login.email}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.login.password}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
              </div>
              <Button type="submit" className="w-full ig-gradient text-white hover:opacity-95" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                {mode === "login" ? t.login.signIn : t.login.signUp}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t.login.or}</span></div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemo} disabled={loading}>
              <Sparkles className="h-4 w-4 ml-2 text-primary" />
              {t.login.demo}
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? t.login.noAccount : t.login.haveAccount}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? t.login.signUp : t.login.signIn}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
