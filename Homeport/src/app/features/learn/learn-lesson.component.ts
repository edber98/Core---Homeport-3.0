import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { trigger, transition, style, animate } from '@angular/animations';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import {
  LearnLesson, LearnBlock, ExerciseBlock, StepperBlock, DemoBlock,
  QuizData, ExpressionData, DragMatchData, FillBlankData, OrderingData, MODULE_TOUR_MAP,
} from './learn-curriculum';
import { LearnProgressService } from './learn-progress.service';
import { LearnTourService } from './learn-tour.service';
import { TourDefinition, getTourById } from './learn-tours';
import { ExerciseQuizComponent } from './exercises/exercise-quiz.component';
import { ExerciseExpressionComponent } from './exercises/exercise-expression.component';
import { ExerciseDragMatchComponent } from './exercises/exercise-drag-match.component';
import { ExerciseFillBlankComponent } from './exercises/exercise-fill-blank.component';
import { ExerciseOrderingComponent } from './exercises/exercise-ordering.component';
import { LearnAnimateOnScrollDirective } from './learn-animate-on-scroll.directive';
import { LearnStepperComponent } from './learn-stepper.component';
import { LearnDemoComponent } from './demos/learn-demo.component';
import { launchConfetti } from './learn-confetti';

@Component({
  selector: 'learn-lesson',
  standalone: true,
  imports: [
    CommonModule, NzIconModule, NzButtonModule, NzDividerModule, NzTagModule,
    ExerciseQuizComponent, ExerciseExpressionComponent, ExerciseDragMatchComponent,
    ExerciseFillBlankComponent, ExerciseOrderingComponent,
    LearnAnimateOnScrollDirective, LearnStepperComponent, LearnDemoComponent,
  ],
  animations: [
    trigger('blockEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
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
        <ng-container *ngFor="let block of visibleBlocks; let i = index; trackBy: trackBlock">
          <div [@blockEnter] learnAnimateOnScroll class="ll-block-wrapper">

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

            <!-- Exercise -->
            <div *ngIf="block.type === 'exercise'" class="ll-exercise"
                 [class.ll-exercise-success]="exerciseFeedback[block.id] === 'success'"
                 [class.ll-exercise-failure]="exerciseFeedback[block.id] === 'failure'"
                 [attr.data-exercise-id]="block.id">
              <div class="ll-exercise-header">
                <span nz-icon nzType="edit" class="ll-exercise-icon"></span>
                <span class="ll-exercise-title">{{ block.title }}</span>
                <nz-tag *ngIf="progress.isExerciseCompleted(block.id)" nzColor="green" style="margin-left:auto">
                  <span nz-icon nzType="check"></span> Fait
                </nz-tag>
              </div>

              <exercise-quiz *ngIf="block.exerciseType === 'quiz'"
                             [data]="asQuiz(block)" (completed)="onExerciseDone(block, $event)"></exercise-quiz>

              <exercise-expression *ngIf="block.exerciseType === 'expression'"
                                   [data]="asExpression(block)" (completed)="onExerciseDone(block, $event)"></exercise-expression>

              <exercise-drag-match *ngIf="block.exerciseType === 'drag-match'"
                                   [data]="asDragMatch(block)" (completed)="onExerciseDone(block, $event)"></exercise-drag-match>

              <exercise-fill-blank *ngIf="block.exerciseType === 'fill-blank'"
                                   [data]="asFillBlank(block)" (completed)="onExerciseDone(block, $event)"></exercise-fill-blank>

              <exercise-ordering *ngIf="block.exerciseType === 'ordering'"
                                 [data]="asOrdering(block)" (completed)="onExerciseDone(block, $event)"></exercise-ordering>
            </div>

            <!-- Stepper -->
            <learn-stepper *ngIf="block.type === 'stepper'"
                           [block]="asStepper(block)"
                           (exerciseDone)="onExerciseDone($event.block, $event.success)">
            </learn-stepper>

            <!-- Demo -->
            <learn-demo *ngIf="block.type === 'demo'" [block]="asDemo(block)"></learn-demo>

          </div>
        </ng-container>
      </div>

      <!-- Lock separator -->
      <div class="ll-lock" *ngIf="isLocked">
        <div class="ll-lock-line"></div>
        <div class="ll-lock-badge">
          <span nz-icon nzType="lock" nzTheme="outline"></span>
          Complétez l'exercice ci-dessus pour débloquer la suite
        </div>
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

    /* Scroll animation */
    .ll-block-wrapper {
      opacity: 0; transform: translateY(16px);
      transition: opacity 500ms ease, transform 500ms ease;
    }
    :host ::ng-deep .ll-block-wrapper.ll-scroll-visible {
      opacity: 1; transform: translateY(0);
    }

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
      background: #f0f7ff; transition: border-color 0.3s, box-shadow 0.3s;
    }
    .ll-exercise-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .ll-exercise-icon { color: #1890ff; font-size: 16px; }
    .ll-exercise-title { font-weight: 600; font-size: 15px; }
    .ll-exercise-success { border-color: #52c41a; box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.15); }
    .ll-exercise-failure { animation: ll-shake 0.4s ease-in-out; }

    @keyframes ll-shake {
      0%, 100% { transform: translateX(0); }
      10%, 50%, 90% { transform: translateX(-4px); }
      30%, 70% { transform: translateX(4px); }
    }

    /* Lock separator */
    .ll-lock {
      display: flex; flex-direction: column; align-items: center;
      padding: 24px 0; gap: 12px;
    }
    .ll-lock-line {
      width: 100%; height: 1px;
      background: linear-gradient(90deg, transparent, #d9d9d9, transparent);
    }
    .ll-lock-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 16px; border-radius: 20px;
      background: #fafafa; border: 1px solid #e8e8e8;
      font-size: 13px; color: #999;
    }

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
  visibleBlocks: LearnBlock[] = [];
  isLocked = false;
  exerciseFeedback: Record<string, 'success' | 'failure' | null> = {};

  private exercisesDone = new Set<string>();

  constructor(
    public progress: LearnProgressService,
    private tourService: LearnTourService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['lesson']) {
      this.exercisesDone.clear();
      this.exerciseFeedback = {};
    }
    if (changes['moduleId'] || changes['lesson']) {
      this.relatedTours = this.moduleId
        ? (MODULE_TOUR_MAP[this.moduleId] || []).map(id => getTourById(id)).filter((t): t is TourDefinition => !!t)
        : [];
    }
    this.computeVisibleBlocks();
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

  onExerciseDone(block: ExerciseBlock, success: boolean) {
    this.exerciseFeedback[block.id] = success ? 'success' : 'failure';
    if (success) {
      this.exercisesDone.add(block.id);
      this.progress.completeExercise(block.id);
      // Confetti on the exercise element
      const el = document.querySelector(`[data-exercise-id="${block.id}"]`) as HTMLElement;
      launchConfetti(el ?? undefined);
      // Recompute visible blocks to unlock next content
      setTimeout(() => this.computeVisibleBlocks(), 100);
    } else {
      // Clear failure animation after it plays
      setTimeout(() => {
        if (this.exerciseFeedback[block.id] === 'failure') {
          this.exerciseFeedback[block.id] = null;
        }
      }, 500);
    }
  }

  markComplete() {
    if (!this.lesson) return;
    this.progress.completeLesson(this.lesson.id);
    this.lessonCompleted.emit(this.lesson.id);
  }

  startTour(tour: TourDefinition) {
    this.tourService.startTour(tour);
  }

  trackBlock(_index: number, block: LearnBlock): string {
    if ('id' in block) return (block as ExerciseBlock).id;
    if (block.type === 'theory') return 'theory-' + _index;
    if (block.type === 'tip') return 'tip-' + _index;
    return block.type + '-' + _index;
  }

  // ── Progressive unlock ─────────────────────────────────────────

  private computeVisibleBlocks(): void {
    if (!this.lesson) {
      this.visibleBlocks = [];
      this.isLocked = false;
      return;
    }
    const blocks: LearnBlock[] = [];
    let locked = false;
    for (const block of this.lesson.blocks) {
      blocks.push(block);
      if (this.isBlockingExercise(block)) {
        locked = true;
        break;
      }
    }
    this.visibleBlocks = blocks;
    this.isLocked = locked;
  }

  private isBlockingExercise(block: LearnBlock): boolean {
    if (block.type !== 'exercise') return false;
    const ex = block as ExerciseBlock;
    const blocking = ex.blocking !== false; // default true
    if (!blocking) return false;
    return !this.exercisesDone.has(ex.id) && !this.progress.isExerciseCompleted(ex.id);
  }

  // ── Type assertions for template ──────────────────────────────

  asQuiz(block: LearnBlock): QuizData { return (block as ExerciseBlock).data as QuizData; }
  asExpression(block: LearnBlock): ExpressionData { return (block as ExerciseBlock).data as ExpressionData; }
  asDragMatch(block: LearnBlock): DragMatchData { return (block as ExerciseBlock).data as DragMatchData; }
  asFillBlank(block: LearnBlock): FillBlankData { return (block as ExerciseBlock).data as FillBlankData; }
  asOrdering(block: LearnBlock): OrderingData { return (block as ExerciseBlock).data as OrderingData; }
  asStepper(block: LearnBlock): StepperBlock { return block as StepperBlock; }
  asDemo(block: LearnBlock): DemoBlock { return block as DemoBlock; }
}
