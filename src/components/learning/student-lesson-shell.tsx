"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { LessonPathSidebar } from "@/components/learning/lesson-path-sidebar";
import type { PathLesson } from "@/lib/learning/types";

export const PRACTICE_PASSED_EVENT = "onigiroku:practice-passed";

type Props = {
  categorySlug: string;
  categoryName: string;
  currentSlug: string;
  initialLessons: PathLesson[];
  initialCompletedCount: number;
  lessonCount: number;
  children: ReactNode;
};

/** Applies unlock/complete updates from practice submit into the lesson sidebar. */
export function applyPracticePass(
  lessons: PathLesson[],
  currentSlug: string,
): { lessons: PathLesson[]; completedCount: number } {
  const currentIndex = lessons.findIndex((lesson) => lesson.slug === currentSlug);
  const next = lessons.map((lesson, index) => {
    if (lesson.slug === currentSlug) {
      return {
        ...lesson,
        completed: true,
        locked: false,
        inProgress: false,
        readingPercent: Math.max(lesson.readingPercent, 100),
      };
    }
    if (currentIndex >= 0 && index === currentIndex + 1) {
      return {
        ...lesson,
        locked: false,
      };
    }
    return lesson;
  });
  return {
    lessons: next,
    completedCount: next.filter((lesson) => lesson.completed).length,
  };
}

export function emitPracticePassed(slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PRACTICE_PASSED_EVENT, { detail: { slug } }),
  );
}

export function StudentLessonShell({
  categorySlug,
  categoryName,
  currentSlug,
  initialLessons,
  initialCompletedCount,
  lessonCount,
  children,
}: Props) {
  const [lessons, setLessons] = useState(initialLessons);
  const [completedCount, setCompletedCount] = useState(initialCompletedCount);

  useEffect(() => {
    setLessons(initialLessons);
    setCompletedCount(initialCompletedCount);
  }, [initialLessons, initialCompletedCount, currentSlug]);

  const onPracticePassed = useCallback(() => {
    setLessons((prev) => {
      const applied = applyPracticePass(prev, currentSlug);
      setCompletedCount(applied.completedCount);
      return applied.lessons;
    });
  }, [currentSlug]);

  useEffect(() => {
    function handle() {
      onPracticePassed();
    }
    window.addEventListener(PRACTICE_PASSED_EVENT, handle);
    return () => window.removeEventListener(PRACTICE_PASSED_EVENT, handle);
  }, [onPracticePassed]);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full">
      <LessonPathSidebar
        categorySlug={categorySlug}
        categoryName={categoryName}
        lessons={lessons}
        currentSlug={currentSlug}
        completedCount={completedCount}
        lessonCount={lessonCount}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
