"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { t, toFa } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Instagram,
  Bot,
  Workflow,
  LayoutTemplate,
  FlaskConical,
  MessageSquare,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  num: number;
  title: string;
  short: string;
  body: string;
  tip: string;
  icon: typeof Instagram;
  color: string;
}

const LESSONS: Lesson[] = [
  {
    num: 1,
    title: t.tutorial.step1Title,
    short: t.tutorial.step1Short,
    body: t.tutorial.step1Body,
    tip: t.tutorial.step1Tip,
    icon: Instagram,
    color: "from-rose-400 to-pink-500",
  },
  {
    num: 2,
    title: t.tutorial.step2Title,
    short: t.tutorial.step2Short,
    body: t.tutorial.step2Body,
    tip: t.tutorial.step2Tip,
    icon: Bot,
    color: "from-fuchsia-400 to-purple-500",
  },
  {
    num: 3,
    title: t.tutorial.step3Title,
    short: t.tutorial.step3Short,
    body: t.tutorial.step3Body,
    tip: t.tutorial.step3Tip,
    icon: Workflow,
    color: "from-violet-400 to-indigo-500",
  },
  {
    num: 4,
    title: t.tutorial.step4Title,
    short: t.tutorial.step4Short,
    body: t.tutorial.step4Body,
    tip: t.tutorial.step4Tip,
    icon: LayoutTemplate,
    color: "from-sky-400 to-blue-500",
  },
  {
    num: 5,
    title: t.tutorial.step5Title,
    short: t.tutorial.step5Short,
    body: t.tutorial.step5Body,
    tip: t.tutorial.step5Tip,
    icon: FlaskConical,
    color: "from-emerald-400 to-teal-500",
  },
  {
    num: 6,
    title: t.tutorial.step6Title,
    short: t.tutorial.step6Short,
    body: t.tutorial.step6Body,
    tip: t.tutorial.step6Tip,
    icon: MessageSquare,
    color: "from-amber-400 to-orange-500",
  },
];

const STORAGE_KEY = "aria-tutorial-progress";

export function TutorialView() {
  const { setView } = useAppStore();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completed, setCompleted] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save progress
  function markComplete(num: number) {
    if (!completed.includes(num)) {
      const next = [...completed, num];
      setCompleted(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }

  const progress = (completed.length / LESSONS.length) * 100;
  const allDone = completed.length === LESSONS.length;

  // Lesson detail view
  if (activeLesson !== null) {
    const lesson = LESSONS[activeLesson];
    const isLast = activeLesson === LESSONS.length - 1;
    const isComplete = completed.includes(lesson.num);

    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)}>
            <ChevronRight className="h-4 w-4 me-1" />
            {t.tutorial.backToLessons}
          </Button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t.tutorial.lesson} {toFa(activeLesson + 1)} {t.tutorial.of} {toFa(LESSONS.length)}
          </span>
          <Progress value={((activeLesson + 1) / LESSONS.length) * 100} className="flex-1" />
        </div>

        {/* Lesson card */}
        <Card className="overflow-hidden border-none shadow-lg">
          <div className={cn("bg-gradient-to-br p-6 text-white", lesson.color)}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur shrink-0">
                <lesson.icon className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{lesson.title}</h2>
                <p className="text-white/80 text-sm mt-1">{lesson.short}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Body — render newlines as paragraphs */}
            <div className="prose prose-sm max-w-none text-foreground/90 leading-7">
              {lesson.body.split("\n").map((line, i) => {
                if (line.trim() === "") return <div key={i} className="h-2" />;
                // Bold "مراحل:" / "چرا؟" style headers
                if (line.endsWith(":") && !line.startsWith(" ")) {
                  return <p key={i} className="font-semibold mt-3 mb-1">{line}</p>;
                }
                return <p key={i} className="mb-1">{line}</p>;
              })}
            </div>

            {/* Tip */}
            <div className="flex gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
              <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80 leading-6">{lesson.tip}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveLesson(Math.max(0, activeLesson - 1))}
                disabled={activeLesson === 0}
              >
                <ChevronRight className="h-4 w-4 me-1" />
                {t.tutorial.prevLesson}
              </Button>

              <div className="flex items-center gap-2">
                {isComplete && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-0">
                    <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                    {t.tutorial.completed}
                  </Badge>
                )}
                {!isComplete && (
                  <Button variant="outline" size="sm" onClick={() => markComplete(lesson.num)}>
                    {t.tutorial.markComplete}
                  </Button>
                )}
                {isLast ? (
                  <Button
                    size="sm"
                    className="ig-gradient text-white"
                    onClick={() => { markComplete(lesson.num); setActiveLesson(null); }}
                  >
                    {t.tutorial.backToLessons}
                    <ChevronLeft className="h-4 w-4 ms-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="ig-gradient text-white"
                    onClick={() => { markComplete(lesson.num); setActiveLesson(activeLesson + 1); }}
                  >
                    {t.tutorial.nextLesson}
                    <ChevronLeft className="h-4 w-4 ms-1" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lessons list view
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Hero header */}
      <Card className="overflow-hidden border-none shadow-lg">
        <div className="ig-gradient p-8 text-white text-center relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)]" />
          <div className="relative z-10 space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{t.tutorial.title}</h1>
            <p className="text-white/90 max-w-xl mx-auto leading-relaxed">{t.tutorial.subtitle}</p>
            {completed.length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur">
                <span>{t.tutorial.progress}:</span>
                <span className="font-bold">{toFa(completed.length)} / {toFa(LESSONS.length)}</span>
                <span>•</span>
                <span className="font-bold">{toFa(Math.round(progress))}٪</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Progress bar */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {toFa(completed.length)} از {toFa(LESSONS.length)} درس تکمیل شده
          </p>
        </div>
      )}

      {/* Lessons grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {LESSONS.map((lesson, i) => {
          const isComplete = completed.includes(lesson.num);
          return (
            <Card
              key={lesson.num}
              className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveLesson(i)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shrink-0", lesson.color)}>
                    <lesson.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">
                        {toFa(lesson.num)}
                      </span>
                      {isComplete && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                    <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors">
                      {lesson.short}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {lesson.title.replace(/^[\d.]+\s*/, "")}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                  {t.tutorial.startLearning}
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Final completion card */}
      {allDone && (
        <Card className="border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h3 className="text-lg font-bold">{t.tutorial.finalTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed whitespace-pre-line">
              {t.tutorial.finalBody}
            </p>
            <Button className="ig-gradient text-white mt-2" onClick={() => setView("dashboard")}>
              {t.tutorial.finalGoDashboard}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
