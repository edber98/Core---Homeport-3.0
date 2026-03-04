import { Injectable, signal, computed } from '@angular/core';

export interface LearnProgress {
  completedLessons: Record<string, boolean>;
  completedExercises: Record<string, boolean>;
  completedTours: Record<string, boolean>;
  currentModuleId: string | null;
  currentLessonId: string | null;
}

const STORAGE_KEY = 'learn.progress';

function loadProgress(): LearnProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (!p.completedTours) p.completedTours = {};
      return p;
    }
  } catch {}
  return { completedLessons: {}, completedExercises: {}, completedTours: {}, currentModuleId: null, currentLessonId: null };
}

@Injectable({ providedIn: 'root' })
export class LearnProgressService {

  private _progress = signal<LearnProgress>(loadProgress());

  readonly progress = this._progress.asReadonly();

  readonly completedLessonCount = computed(() => Object.keys(this._progress().completedLessons).length);

  isLessonCompleted(lessonId: string): boolean {
    return !!this._progress().completedLessons[lessonId];
  }

  isExerciseCompleted(exerciseId: string): boolean {
    return !!this._progress().completedExercises[exerciseId];
  }

  completeExercise(exerciseId: string): void {
    const p = { ...this._progress() };
    p.completedExercises = { ...p.completedExercises, [exerciseId]: true };
    this._progress.set(p);
    this.persist();
  }

  completeLesson(lessonId: string): void {
    const p = { ...this._progress() };
    p.completedLessons = { ...p.completedLessons, [lessonId]: true };
    this._progress.set(p);
    this.persist();
  }

  setCurrentPosition(moduleId: string | null, lessonId: string | null): void {
    const p = { ...this._progress(), currentModuleId: moduleId, currentLessonId: lessonId };
    this._progress.set(p);
    this.persist();
  }

  /** Count completed lessons for a specific module */
  moduleLessonsDone(lessonIds: string[]): number {
    const completed = this._progress().completedLessons;
    return lessonIds.filter(id => completed[id]).length;
  }

  // ─── Tours ──────────────────────────────────────────────────

  readonly completedTourCount = computed(() => Object.keys(this._progress().completedTours).length);

  isTourCompleted(tourId: string): boolean {
    return !!this._progress().completedTours[tourId];
  }

  completeTour(tourId: string): void {
    const p = { ...this._progress() };
    p.completedTours = { ...p.completedTours, [tourId]: true };
    this._progress.set(p);
    this.persist();
  }

  resetAll(): void {
    this._progress.set({ completedLessons: {}, completedExercises: {}, completedTours: {}, currentModuleId: null, currentLessonId: null });
    this.persist();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._progress())); } catch {}
  }
}
