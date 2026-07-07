"use client";

import { useAppStore } from "@/lib/store";
import { t, faDate } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, FileText, Lock, Bot, Eye, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

export function TermsView() {
  const { setView } = useAppStore();

  const sections = [
    { icon: FileText, title: t.terms.section1Title, body: t.terms.section1Body, color: "text-sky-500 bg-sky-500/10" },
    { icon: ShieldCheck, title: t.terms.section2Title, body: t.terms.section2Body, color: "text-emerald-500 bg-emerald-500/10" },
    { icon: Bot, title: t.terms.section3Title, body: t.terms.section3Body, color: "text-violet-500 bg-violet-500/10" },
    { icon: Bot, title: t.terms.section4Title, body: t.terms.section4Body, color: "text-fuchsia-500 bg-fuchsia-500/10" },
    { icon: Lock, title: t.terms.section5Title, body: t.terms.section5Body, color: "text-amber-500 bg-amber-500/10" },
    { icon: AlertTriangle, title: t.terms.section6Title, body: t.terms.section6Body, color: "text-rose-500 bg-rose-500/10" },
    { icon: XCircle, title: t.terms.section7Title, body: t.terms.section7Body, color: "text-orange-500 bg-orange-500/10" },
    { icon: RefreshCw, title: t.terms.section8Title, body: t.terms.section8Body, color: "text-indigo-500 bg-indigo-500/10" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-none shadow-lg">
        <div className="ig-gradient p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{t.terms.title}</h1>
              <p className="text-sm text-white/80 mt-1">{t.terms.subtitle}</p>
            </div>
          </div>
          <p className="text-xs text-white/60 mt-3">
            {t.terms.lastUpdated}: {faDate(new Date().toISOString())}
          </p>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${section.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base leading-snug pt-1">
                    {section.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
                  {section.body}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Privacy section */}
      <Card className="overflow-hidden border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">{t.terms.privacyTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
            {t.terms.privacyBody}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-4">
        <button
          onClick={() => setView("settings")}
          className="text-sm text-primary hover:underline text-center"
        >
          {t.terms.contactUs}
        </button>
      </div>
    </div>
  );
}
