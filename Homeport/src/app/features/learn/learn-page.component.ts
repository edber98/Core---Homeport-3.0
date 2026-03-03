import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CURRICULUM, LearnModule, LearnLesson, MODULE_TOUR_MAP } from './learn-curriculum';
import { LearnProgressService } from './learn-progress.service';
import { LearnTourService } from './learn-tour.service';
import { TOURS, TourDefinition, getTourById } from './learn-tours';
import { LearnSidebarComponent } from './learn-sidebar.component';
import { LearnLessonComponent } from './learn-lesson.component';

@Component({
  selector: 'learn-page',
  standalone: true,
  imports: [
    CommonModule, NzIconModule, NzButtonModule, NzEmptyModule, NzProgressModule,
    NzToolTipModule, NzPopconfirmModule, NzTagModule,
    LearnSidebarComponent, LearnLessonComponent,
  ],
  template: `
    <div class="lp-layout">
      <!-- Sidebar -->
      <div class="lp-sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="lp-sidebar-toggle">
          <button nz-button nzType="text" nzSize="small" (click)="sidebarCollapsed = !sidebarCollapsed"
                  [nz-tooltip]="sidebarCollapsed ? 'Ouvrir la sidebar' : 'Réduire la sidebar'" nzTooltipPlacement="right">
            <span nz-icon [nzType]="sidebarCollapsed ? 'menu-unfold' : 'menu-fold'"></span>
          </button>
        </div>
        <learn-sidebar
          [modules]="modules"
          [activeModuleId]="activeModuleId"
          [activeLessonId]="activeLessonId"
          [collapsed]="sidebarCollapsed"
          (selectModule)="onSelectModule($event)"
          (selectLesson)="onSelectLesson($event)">
        </learn-sidebar>
      </div>

      <!-- Main content -->
      <div class="lp-main">
        <!-- Welcome / Module grid when no lesson selected -->
        <div *ngIf="!activeLesson" class="lp-welcome">
          <div class="lp-welcome-header">
            <h1>Apprendre Kinn</h1>
            <p>Maîtrisez toutes les fonctionnalités de la plateforme avec des leçons interactives et des exercices pratiques.</p>
          </div>

          <div class="lp-module-grid">
            <div *ngFor="let mod of modules" class="lp-module-card-wrap">
              <div class="lp-module-card" (click)="onSelectModule(mod.id)">
                <div class="lp-card-icon">
                  <span nz-icon [nzType]="mod.icon" style="font-size:28px"></span>
                </div>
                <div class="lp-card-body">
                  <div class="lp-card-title">{{ mod.title }}</div>
                  <div class="lp-card-desc">{{ mod.description }}</div>
                  <div class="lp-card-meta">
                    {{ mod.lessons.length }} leçons · ~{{ getModuleMinutes(mod) }} min
                  </div>
                  <nz-progress [nzPercent]="getModulePercent(mod)" nzSize="small"
                               [nzStrokeColor]="getModulePercent(mod) === 100 ? '#52c41a' : '#1890ff'"
                               [nzShowInfo]="false"></nz-progress>
                </div>
              </div>
              <div class="lp-tour-row" *ngIf="getModuleTours(mod.id).length">
                <button *ngFor="let tour of getModuleTours(mod.id)" class="lp-tour-btn"
                        [class.completed]="progress.isTourCompleted(tour.id)"
                        nz-button nzType="dashed" nzSize="small"
                        (click)="onStartTour(tour); $event.stopPropagation()">
                  <span nz-icon [nzType]="progress.isTourCompleted(tour.id) ? 'check-circle' : 'compass'" nzTheme="outline"></span>
                  {{ tour.title }}
                </button>
              </div>
            </div>
          </div>

          <div class="lp-welcome-footer">
            <div class="lp-global-stats">
              <span>{{ progress.completedLessonCount() }}/{{ totalLessons }} leçons terminées</span>
              <nz-progress [nzPercent]="globalPercent" nzSize="small" nzStrokeColor="#52c41a" style="width:200px"></nz-progress>
            </div>
            <button nz-button nzType="default" nzSize="small" nz-popconfirm
                    nzPopconfirmTitle="Réinitialiser toute votre progression ?"
                    nzOkText="Réinitialiser" nzCancelText="Annuler"
                    (nzOnConfirm)="resetProgress()">
              <span nz-icon nzType="undo"></span> Réinitialiser la progression
            </button>
          </div>
        </div>

        <!-- Lesson viewer -->
        <div *ngIf="activeLesson" class="lp-lesson-wrap">
          <learn-lesson [lesson]="activeLesson" [moduleId]="activeModuleId" [hasNext]="!!nextLesson"
                        (next)="goToNextLesson()" (lessonCompleted)="onLessonCompleted($event)">
          </learn-lesson>
        </div>
      </div>
    </div>
  `,
  styleUrl: './learn-page.component.scss'
})
export class LearnPageComponent implements OnInit {
  modules = CURRICULUM;
  activeModuleId: string | null = null;
  activeLessonId: string | null = null;
  activeLesson: LearnLesson | null = null;
  nextLesson: LearnLesson | null = null;
  sidebarCollapsed = false;

  constructor(
    public progress: LearnProgressService,
    private tourService: LearnTourService,
  ) {}

  ngOnInit() {
    // Restore last position
    const p = this.progress.progress();
    if (p.currentModuleId && p.currentLessonId) {
      this.navigateTo(p.currentModuleId, p.currentLessonId);
    }
  }

  get totalLessons(): number {
    return this.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  }

  get globalPercent(): number {
    const total = this.totalLessons;
    if (!total) return 0;
    return Math.round((this.progress.completedLessonCount() / total) * 100);
  }

  getModuleMinutes(mod: LearnModule): number {
    return mod.lessons.reduce((sum, l) => sum + l.estimatedMinutes, 0);
  }

  getModulePercent(mod: LearnModule): number {
    if (!mod.lessons.length) return 0;
    const done = this.progress.moduleLessonsDone(mod.lessons.map(l => l.id));
    return Math.round((done / mod.lessons.length) * 100);
  }

  onSelectModule(moduleId: string) {
    // Open first lesson of the module
    const mod = this.modules.find(m => m.id === moduleId);
    if (mod && mod.lessons.length) {
      this.navigateTo(moduleId, mod.lessons[0].id);
    }
  }

  onSelectLesson(ev: { moduleId: string; lessonId: string }) {
    this.navigateTo(ev.moduleId, ev.lessonId);
  }

  goToNextLesson() {
    if (this.nextLesson && this.activeModuleId) {
      // Find which module the next lesson belongs to
      for (const mod of this.modules) {
        if (mod.lessons.find(l => l.id === this.nextLesson!.id)) {
          this.navigateTo(mod.id, this.nextLesson!.id);
          return;
        }
      }
    }
  }

  onLessonCompleted(_lessonId: string) {
    // UI already reflects via progress service signals
  }

  resetProgress() {
    this.progress.resetAll();
    this.activeLesson = null;
    this.activeLessonId = null;
    this.activeModuleId = null;
  }

  // ─── Tours ──────────────────────────────────────────────────

  getModuleTours(moduleId: string): TourDefinition[] {
    const ids = MODULE_TOUR_MAP[moduleId];
    if (!ids) return [];
    return ids.map(id => getTourById(id)).filter((t): t is TourDefinition => !!t);
  }

  onStartTour(tour: TourDefinition): void {
    this.tourService.startTour(tour);
  }

  private navigateTo(moduleId: string, lessonId: string) {
    this.activeModuleId = moduleId;
    this.activeLessonId = lessonId;
    this.progress.setCurrentPosition(moduleId, lessonId);

    // Find lesson
    const mod = this.modules.find(m => m.id === moduleId);
    this.activeLesson = mod?.lessons.find(l => l.id === lessonId) || null;

    // Find next lesson (across modules)
    this.nextLesson = null;
    const allLessons = this.modules.flatMap(m => m.lessons);
    const idx = allLessons.findIndex(l => l.id === lessonId);
    if (idx >= 0 && idx < allLessons.length - 1) {
      this.nextLesson = allLessons[idx + 1];
    }
  }
}
