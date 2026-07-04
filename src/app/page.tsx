"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <AppShell />
    </Suspense>
  );
}
