import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LearnModule, LearnLesson } from './learn-curriculum';
import { LearnProgressService } from './learn-progress.service';

@Component({
  selector: 'learn-sidebar',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzProgressModule, NzToolTipModule],
  template: `
    <!-- Collapsed mode -->
    <ng-container *ngIf="collapsed">
      <div class="ls-collapsed-toggle">
        <button class="ls-toggle-btn" (click)="toggleClick.emit()" nz-tooltip nzTooltipTitle="Ouvrir" nzTooltipPlacement="right">
          <span nz-icon nzType="menu-unfold" nzTheme="outline"></span>
        </button>
      </div>
      <div class="ls-collapsed-icons">
        <div *ngFor="let mod of modules" class="ls-icon-btn"
             [class.active]="activeModuleId === mod.id"
             [nz-tooltip]="mod.title" nzTooltipPlacement="right"
             (click)="selectModule.emit(mod.id)">
          <span nz-icon [nzType]="mod.icon"></span>
          <div class="ls-icon-dot" *ngIf="getModuleProgress(mod) === 100"></div>
        </div>
      </div>
    </ng-container>

    <!-- Expanded mode -->
    <ng-container *ngIf="!collapsed">
      <div class="ls-header">
        <span class="ls-title">Formation</span>
        <button class="ls-toggle-btn" (click)="toggleClick.emit()" nz-tooltip nzTooltipTitle="Réduire">
          <span nz-icon nzType="menu-fold" nzTheme="outline"></span>
        </button>
      </div>
      <div class="ls-modules">
        <div *ngFor="let mod of modules" class="ls-module" [class.expanded]="expandedModuleId() === mod.id">
          <div class="ls-module-header" (click)="toggleModule(mod.id)">
            <span nz-icon [nzType]="mod.icon" class="ls-module-icon"></span>
            <span class="ls-module-title">{{ mod.title }}</span>
            <span class="ls-module-badge" *ngIf="getModuleProgress(mod) === 100">
              <span nz-icon nzType="check-circle" nzTheme="fill" style="color:#52c41a"></span>
            </span>
            <span class="ls-module-progress" *ngIf="getModuleProgress(mod) > 0 && getModuleProgress(mod) < 100">
              {{ getModuleDone(mod) }}/{{ mod.lessons.length }}
            </span>
            <span nz-icon [nzType]="expandedModuleId() === mod.id ? 'up' : 'down'" class="ls-chevron"></span>
          </div>
          <div class="ls-lessons" *ngIf="expandedModuleId() === mod.id">
            <div *ngFor="let lesson of mod.lessons" class="ls-lesson"
                 [class.active]="activeLessonId === lesson.id"
                 [class.completed]="progress.isLessonCompleted(lesson.id)"
                 (click)="selectLesson.emit({ moduleId: mod.id, lessonId: lesson.id })">
              <span class="ls-lesson-icon">
                <span *ngIf="progress.isLessonCompleted(lesson.id)" nz-icon nzType="check-circle" nzTheme="fill" style="color:#52c41a"></span>
                <span *ngIf="!progress.isLessonCompleted(lesson.id)" class="ls-lesson-bullet"></span>
              </span>
              <span class="ls-lesson-title">{{ lesson.title }}</span>
              <span class="ls-lesson-time">{{ lesson.estimatedMinutes }} min</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Global progress -->
      <div class="ls-footer">
        <div class="ls-global-label">Progression globale</div>
        <nz-progress [nzPercent]="globalPercent" nzSize="small" nzStrokeColor="#52c41a"></nz-progress>
      </div>
    </ng-container>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }

    /* ── Collapsed ── */
    .ls-collapsed-toggle { display: flex; align-items: center; justify-content: center; padding: 12px 0 6px; width: 100%; }
    .ls-collapsed-toggle .ls-toggle-btn { margin-left: 0; }
    .ls-collapsed-icons { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 4px 0; }
    .ls-icon-btn {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px; color: #8b8b8b;
      transition: all 0.12s;
    }
    .ls-icon-btn:hover { background: #fdf2f8; color: #e61982; }
    .ls-icon-btn.active { background: #e61982; color: #fff; box-shadow: 0 2px 8px rgba(230,25,130,0.25); }
    .ls-icon-dot {
      position: absolute; bottom: 2px; right: 2px; width: 7px; height: 7px;
      border-radius: 50%; background: #16a34a;
    }

    /* ── Header (like AI conversations) ── */
    .ls-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; flex-shrink: 0;
    }
    .ls-title { font-size: 15px; font-weight: 700; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ls-toggle-btn {
      margin-left: auto;
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border: none; border-radius: 8px; background: transparent;
      color: #8b8b8b; cursor: pointer; font-size: 14px;
      transition: all 0.12s;
    }
    .ls-toggle-btn:hover { background: #fdf2f8; color: #e61982; }

    /* ── Modules ── */
    .ls-modules { flex: 1; overflow-y: auto; padding: 4px 8px; scrollbar-width: none; }
    .ls-modules::-webkit-scrollbar { display: none; }
    .ls-module { margin-bottom: 2px; }
    .ls-module-header {
      display: flex; align-items: center; gap: 8px; padding: 9px 12px;
      cursor: pointer; font-size: 13px; border-radius: 10px; transition: background 0.1s;
    }
    .ls-module-header:hover { background: #e8e8e8; }
    .ls-module.expanded .ls-module-header { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .ls-module-icon { font-size: 16px; color: #e61982; flex-shrink: 0; }
    .ls-module-title { flex: 1; font-weight: 500; color: #1a1a1a; }
    .ls-module-badge { flex-shrink: 0; }
    .ls-module-progress { font-size: 11px; color: #b0b0b0; flex-shrink: 0; }
    .ls-chevron { font-size: 11px; color: #b0b0b0; flex-shrink: 0; }

    /* ── Lessons ── */
    .ls-lessons { padding: 2px 0 4px 12px; }
    .ls-lesson {
      display: flex; align-items: center; gap: 8px; padding: 7px 12px 7px 20px;
      cursor: pointer; font-size: 13px; border-radius: 8px; transition: all 0.1s;
      border-left: none;
    }
    .ls-lesson:hover { background: #e8e8e8; }
    .ls-lesson.active { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .ls-lesson.completed .ls-lesson-title { color: #b0b0b0; }
    .ls-lesson-icon { flex-shrink: 0; width: 16px; display: flex; align-items: center; justify-content: center; }
    .ls-lesson-bullet { width: 6px; height: 6px; border-radius: 50%; background: #d4d4d4; }
    .ls-lesson.active .ls-lesson-bullet { background: #e61982; }
    .ls-lesson-title { flex: 1; color: #1a1a1a; }
    .ls-lesson-time { color: #c0c0c0; font-size: 11px; flex-shrink: 0; }

    /* ── Footer ── */
    .ls-footer { padding: 12px 16px; margin-top: auto; }
    .ls-global-label { font-size: 11px; color: #b0b0b0; margin-bottom: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
  `]
})
export class LearnSidebarComponent {
  @Input() modules: LearnModule[] = [];
  @Input() activeModuleId: string | null = null;
  @Input() activeLessonId: string | null = null;
  @Input() collapsed = false;

  @Output() selectModule = new EventEmitter<string>();
  @Output() selectLesson = new EventEmitter<{ moduleId: string; lessonId: string }>();
  @Output() toggleClick = new EventEmitter<void>();

  expandedModuleId = signal<string | null>(null);

  constructor(public progress: LearnProgressService) {}

  ngOnChanges() {
    // Auto-expand the active module
    if (this.activeModuleId && this.expandedModuleId() !== this.activeModuleId) {
      this.expandedModuleId.set(this.activeModuleId);
    }
  }

  toggleModule(id: string) {
    this.expandedModuleId.set(this.expandedModuleId() === id ? null : id);
  }

  getModuleDone(mod: LearnModule): number {
    return this.progress.moduleLessonsDone(mod.lessons.map(l => l.id));
  }

  getModuleProgress(mod: LearnModule): number {
    if (!mod.lessons.length) return 0;
    return Math.round((this.getModuleDone(mod) / mod.lessons.length) * 100);
  }

  get totalLessons(): number {
    return this.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  }

  get globalPercent(): number {
    const total = this.totalLessons;
    if (!total) return 0;
    return Math.round((this.progress.completedLessonCount() / total) * 100);
  }
}
