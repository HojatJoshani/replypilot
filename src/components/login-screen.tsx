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
        toast.error("Invalid credentials. Try the demo button.");
      } else {
        toast.success("Welcome to ReplyPilot! 💛");
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
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
    if (res?.error) toast.error("Demo login failed");
    else {
      toast.success("Logged in as demo tenant — Glow Skin Studio 💛");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 ig-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold">ReplyPilot</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Turn Instagram chaos into <span className="italic">happy customers</span>.
            </h1>
            <p className="text-lg text-white/90 max-w-md">
              Automate DMs, comments, and story replies with smart rules — and let an
              AI assistant trained on your business handle the rest, 24/7.
            </p>
            <div className="space-y-3 pt-4">
              {[
                { icon: Zap, text: "Reply in seconds, not hours" },
                { icon: MessageCircle, text: "DMs, comments & story replies" },
                { icon: ShieldCheck, text: "Encrypted tokens, multi-tenant isolation" },
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
          <div className="text-sm text-white/70">Built for shops, creators, educators & service providers.</div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ig-gradient text-white">
              <Instagram className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your ReplyPilot dashboard"
                : "Start automating your Instagram in minutes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Instagram connection failed. You can still explore the dashboard.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sara Lee" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="biz">Business name</Label>
                    <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="Glow Skin Studio" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full ig-gradient text-white hover:opacity-95" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemo} disabled={loading}>
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              Explore the live demo
            </Button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
