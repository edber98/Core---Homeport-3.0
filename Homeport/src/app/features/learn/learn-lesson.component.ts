import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import { LearnLesson, LearnBlock, ExerciseBlock, QuizData, ExpressionData, DragMatchData, FillBlankData, OrderingData, MODULE_TOUR_MAP } from './learn-curriculum';
import { LearnProgressService } from './learn-progress.service';
import { LearnTourService } from './learn-tour.service';
import { TourDefinition, getTourById } from './learn-tours';
import { ExerciseQuizComponent } from './exercises/exercise-quiz.component';
import { ExerciseExpressionComponent } from './exercises/exercise-expression.component';
import { ExerciseDragMatchComponent } from './exercises/exercise-drag-match.component';
import { ExerciseFillBlankComponent } from './exercises/exercise-fill-blank.component';
import { ExerciseOrderingComponent } from './exercises/exercise-ordering.component';

@Component({
  selector: 'learn-lesson',
  standalone: true,
  imports: [
    CommonModule, NzIconModule, NzButtonModule, NzDividerModule, NzTagModule,
    ExerciseQuizComponent, ExerciseExpressionComponent, ExerciseDragMatchComponent,
    ExerciseFillBlankComponent, ExerciseOrderingComponent,
  ],
  template: `
    <div class="ll" *ngIf="lesson">
      <!-- Header -->
      <div class="ll-header">
        <h1 class="ll-title">{{ lesson.title }}</h1>
        <nz-tag nzColor="blue"><span nz-icon nzType="clock-circle"></span> {{ lesson.estimatedMinutes }} min</nz-tag>
        <nz-tag *ngIf="progress.isLessonCompleted(lesson.id)" nzColor="green">
          <span nz-icon nzType="check"></span> Terminée
        </nz-tag>
      </div>

      <!-- Blocks -->
      <div class="ll-blocks">
        <ng-container *ngFor="let block of lesson.blocks; let i = index">

          <!-- Theory -->
          <div *ngIf="block.type === 'theory'" class="ll-theory" [innerHTML]="renderMarkdown(block.markdown)"></div>

          <!-- Tip -->
          <div *ngIf="block.type === 'tip'" class="ll-tip">
            <span nz-icon nzType="bulb" nzTheme="fill" class="ll-tip-icon"></span>
            <div class="ll-tip-content" [innerHTML]="renderMarkdown(block.markdown)"></div>
          </div>

          <!-- Image -->
          <div *ngIf="block.type === 'image'" class="ll-image">
            <img [src]="block.src" [alt]="block.alt" />
            <div class="ll-image-caption" *ngIf="block.caption">{{ block.caption }}</div>
          </div>

          <!-- Exercises -->
          <div *ngIf="block.type === 'exercise'" class="ll-exercise">
            <div class="ll-exercise-header">
              <span nz-icon nzType="edit" class="ll-exercise-icon"></span>
              <span class="ll-exercise-title">{{ block.title }}</span>
              <nz-tag *ngIf="progress.isExerciseCompleted(block.id)" nzColor="green" style="margin-left:auto">
                <span nz-icon nzType="check"></span> Fait
              </nz-tag>
            </div>

            <exercise-quiz *ngIf="block.exerciseType === 'quiz'"
                           [data]="asQuiz(block)" (completed)="onExerciseDone(block.id)"></exercise-quiz>

            <exercise-expression *ngIf="block.exerciseType === 'expression'"
                                 [data]="asExpression(block)" (completed)="onExerciseDone(block.id)"></exercise-expression>

            <exercise-drag-match *ngIf="block.exerciseType === 'drag-match'"
                                 [data]="asDragMatch(block)" (completed)="onExerciseDone(block.id)"></exercise-drag-match>

            <exercise-fill-blank *ngIf="block.exerciseType === 'fill-blank'"
                                 [data]="asFillBlank(block)" (completed)="onExerciseDone(block.id)"></exercise-fill-blank>

            <exercise-ordering *ngIf="block.exerciseType === 'ordering'"
                               [data]="asOrdering(block)" (completed)="onExerciseDone(block.id)"></exercise-ordering>
          </div>

        </ng-container>
      </div>

      <!-- Guided tours -->
      <div class="ll-tours" *ngIf="relatedTours.length">
        <nz-divider></nz-divider>
        <div class="ll-tours-header">
          <span nz-icon nzType="compass" nzTheme="outline" style="font-size:16px; color:#1890ff"></span>
          <span class="ll-tours-title">Visites guidées</span>
        </div>
        <div class="ll-tours-list">
          <button *ngFor="let tour of relatedTours" nz-button nzType="dashed"
                  [class.ll-tour-done]="progress.isTourCompleted(tour.id)"
                  (click)="startTour(tour)">
            <span nz-icon [nzType]="progress.isTourCompleted(tour.id) ? 'check-circle' : 'compass'" nzTheme="outline"></span>
            {{ tour.title }}
          </button>
        </div>
      </div>

      <!-- Footer -->
      <nz-divider></nz-divider>
      <div class="ll-footer">
        <button nz-button *ngIf="!progress.isLessonCompleted(lesson.id)" nzType="primary" nzSize="large" (click)="markComplete()">
          <span nz-icon nzType="check"></span> Marquer comme terminée
        </button>
        <button nz-button *ngIf="progress.isLessonCompleted(lesson.id)" nzType="default" nzSize="large" disabled>
          <span nz-icon nzType="check-circle"></span> Leçon terminée
        </button>
        <button nz-button *ngIf="hasNext" nzType="primary" nzSize="large" (click)="next.emit()" style="margin-left:8px">
          Leçon suivante <span nz-icon nzType="arrow-right"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ll { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .ll-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .ll-title { font-size: 24px; font-weight: 600; margin: 0; }

    .ll-blocks { display: flex; flex-direction: column; gap: 20px; }

    /* Theory markdown */
    .ll-theory { line-height: 1.7; font-size: 15px; }
    .ll-theory :first-child { margin-top: 0; }
    .ll-theory h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; }
    .ll-theory h2 { font-size: 18px; font-weight: 600; margin: 20px 0 8px; }
    .ll-theory h3 { font-size: 16px; font-weight: 600; margin: 16px 0 6px; }
    .ll-theory p { margin: 0 0 8px; }
    .ll-theory ul, .ll-theory ol { padding-left: 24px; margin: 0 0 8px; }
    .ll-theory li { margin-bottom: 4px; }
    .ll-theory code {
      background: #f5f5f5; padding: 2px 6px; border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;
    }
    .ll-theory pre {
      background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 8px;
      padding: 14px 18px; overflow-x: auto; margin: 8px 0;
    }
    .ll-theory pre code { background: none; padding: 0; }
    .ll-theory table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    .ll-theory th, .ll-theory td {
      border: 1px solid #e8e8e8; padding: 8px 12px; text-align: left; font-size: 14px;
    }
    .ll-theory th { background: #fafafa; font-weight: 600; }
    .ll-theory strong { font-weight: 600; }
    .ll-theory a { color: #1890ff; }

    /* Tip */
    .ll-tip {
      display: flex; gap: 10px; padding: 12px 16px;
      background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px;
    }
    .ll-tip-icon { color: #faad14; font-size: 18px; flex-shrink: 0; margin-top: 2px; }
    .ll-tip-content { flex: 1; font-size: 14px; line-height: 1.6; }
    .ll-tip-content p { margin: 0; }

    /* Image */
    .ll-image { text-align: center; margin: 8px 0; }
    .ll-image img { max-width: 100%; border-radius: 8px; border: 1px solid #e8e8e8; }
    .ll-image-caption { font-size: 13px; color: #999; margin-top: 6px; }

    /* Exercise */
    .ll-exercise {
      padding: 16px 20px; border: 1px solid #d9e8ff; border-radius: 10px;
      background: #f0f7ff;
    }
    .ll-exercise-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .ll-exercise-icon { color: #1890ff; font-size: 16px; }
    .ll-exercise-title { font-weight: 600; font-size: 15px; }

    /* Guided tours */
    .ll-tours-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ll-tours-title { font-weight: 600; font-size: 15px; }
    .ll-tours-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .ll-tour-done { color: #52c41a; border-color: #b7eb8f; background: #f6ffed; }

    /* Footer */
    .ll-footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    @media (max-width: 768px) {
      .ll { padding: 20px 16px; }
      .ll-title { font-size: 20px; }
    }
  `]
})
export class LearnLessonComponent implements OnChanges {
  @Input() lesson: LearnLesson | null = null;
  @Input() moduleId: string | null = null;
  @Input() hasNext = false;
  @Output() next = new EventEmitter<void>();
  @Output() lessonCompleted = new EventEmitter<string>();

  relatedTours: TourDefinition[] = [];
  private exercisesDone = new Set<string>();

  constructor(
    public progress: LearnProgressService,
    private tourService: LearnTourService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lesson']) this.exercisesDone.clear();
    if (changes['moduleId'] || changes['lesson']) {
      this.relatedTours = this.moduleId
        ? (MODULE_TOUR_MAP[this.moduleId] || []).map(id => getTourById(id)).filter((t): t is TourDefinition => !!t)
        : [];
    }
  }

  renderMarkdown(src: string): string {
    try {
      const html = marked.parse(String(src || ''), { breaks: true, gfm: true }) as string;
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p','strong','em','code','pre','a','ul','ol','li','br','span','b','i','h1','h2','h3','h4','table','thead','tbody','tr','th','td','blockquote','hr','img','div'],
        ALLOWED_ATTR: ['href','target','rel','class','src','alt','width','height'],
      });
    } catch { return src; }
  }

  onExerciseDone(exerciseId: string) {
    this.exercisesDone.add(exerciseId);
    this.progress.completeExercise(exerciseId);
  }

  markComplete() {
    if (!this.lesson) return;
    this.progress.completeLesson(this.lesson.id);
    this.lessonCompleted.emit(this.lesson.id);
  }

  startTour(tour: TourDefinition) {
    this.tourService.startTour(tour);
  }

  // Type assertions for template
  asQuiz(block: LearnBlock): QuizData { return (block as ExerciseBlock).data as QuizData; }
  asExpression(block: LearnBlock): ExpressionData { return (block as ExerciseBlock).data as ExpressionData; }
  asDragMatch(block: LearnBlock): DragMatchData { return (block as ExerciseBlock).data as DragMatchData; }
  asFillBlank(block: LearnBlock): FillBlankData { return (block as ExerciseBlock).data as FillBlankData; }
  asOrdering(block: LearnBlock): OrderingData { return (block as ExerciseBlock).data as OrderingData; }
}
