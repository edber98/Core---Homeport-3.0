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

    /* Collapsed */
    .ls-collapsed-icons { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0; }
    .ls-icon-btn {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 18px; color: #595959;
      transition: all 0.2s;
    }
    .ls-icon-btn:hover { background: #f0f0f0; color: #1890ff; }
    .ls-icon-btn.active { background: #e6f7ff; color: #1890ff; }
    .ls-icon-dot {
      position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px;
      border-radius: 50%; background: #52c41a;
    }

    /* Expanded */
    .ls-header {
      padding: 16px 16px 12px; border-bottom: 1px solid #f0f0f0;
    }
    .ls-title { font-size: 16px; font-weight: 600; }

    .ls-modules { flex: 1; overflow-y: auto; padding: 8px 0; }
    .ls-module { border-bottom: 1px solid #f5f5f5; }
    .ls-module-header {
      display: flex; align-items: center; gap: 8px; padding: 10px 16px;
      cursor: pointer; font-size: 14px; transition: background 0.15s;
    }
    .ls-module-header:hover { background: #fafafa; }
    .ls-module-icon { font-size: 16px; color: #1890ff; flex-shrink: 0; }
    .ls-module-title { flex: 1; font-weight: 500; }
    .ls-module-badge { flex-shrink: 0; }
    .ls-module-progress { font-size: 12px; color: #999; flex-shrink: 0; }
    .ls-chevron { font-size: 12px; color: #999; flex-shrink: 0; }

    .ls-lessons { padding: 0 0 4px; }
    .ls-lesson {
      display: flex; align-items: center; gap: 8px; padding: 7px 16px 7px 40px;
      cursor: pointer; font-size: 13px; transition: all 0.15s; border-left: 2px solid transparent;
    }
    .ls-lesson:hover { background: #fafafa; }
    .ls-lesson.active { background: #e6f7ff; border-left-color: #1890ff; }
    .ls-lesson.completed .ls-lesson-title { color: #8c8c8c; }
    .ls-lesson-icon { flex-shrink: 0; width: 16px; display: flex; align-items: center; justify-content: center; }
    .ls-lesson-bullet { width: 6px; height: 6px; border-radius: 50%; background: #d9d9d9; }
    .ls-lesson.active .ls-lesson-bullet { background: #1890ff; }
    .ls-lesson-title { flex: 1; }
    .ls-lesson-time { color: #bbb; font-size: 12px; flex-shrink: 0; }

    .ls-footer { padding: 12px 16px; border-top: 1px solid #f0f0f0; }
    .ls-global-label { font-size: 12px; color: #999; margin-bottom: 4px; }
  `]
})
export class LearnSidebarComponent {
  @Input() modules: LearnModule[] = [];
  @Input() activeModuleId: string | null = null;
  @Input() activeLessonId: string | null = null;
  @Input() collapsed = false;

  @Output() selectModule = new EventEmitter<string>();
  @Output() selectLesson = new EventEmitter<{ moduleId: string; lessonId: string }>();

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
