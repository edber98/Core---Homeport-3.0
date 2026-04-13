import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { trigger, transition, style, animate, group, query } from '@angular/animations';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import {
  StepperBlock, LearnBlock, ExerciseBlock,
  QuizData, ExpressionData, DragMatchData, FillBlankData, OrderingData,
} from './learn-curriculum';
import { LearnProgressService } from './learn-progress.service';
import { ExerciseQuizComponent } from './exercises/exercise-quiz.component';
import { ExerciseExpressionComponent } from './exercises/exercise-expression.component';
import { ExerciseDragMatchComponent } from './exercises/exercise-drag-match.component';
import { ExerciseFillBlankComponent } from './exercises/exercise-fill-blank.component';
import { ExerciseOrderingComponent } from './exercises/exercise-ordering.component';

@Component({
  selector: 'learn-stepper',
  standalone: true,
  imports: [
    CommonModule, NzIconModule, NzButtonModule, NzTagModule,
    ExerciseQuizComponent, ExerciseExpressionComponent, ExerciseDragMatchComponent,
    ExerciseFillBlankComponent, ExerciseOrderingComponent,
  ],
  animations: [
    trigger('slideContent', [
      transition(':increment', [
        style({ position: 'relative', overflow: 'hidden' }),
        query(':enter', [style({ position: 'absolute', width: '100%', opacity: 0, transform: 'translateX(60px)' })], { optional: true }),
        query(':leave', [animate('250ms ease-out', style({ opacity: 0, transform: 'translateX(-60px)' }))], { optional: true }),
        query(':enter', [animate('250ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))], { optional: true }),
      ]),
      transition(':decrement', [
        style({ position: 'relative', overflow: 'hidden' }),
        query(':enter', [style({ position: 'absolute', width: '100%', opacity: 0, transform: 'translateX(-60px)' })], { optional: true }),
        query(':leave', [animate('250ms ease-out', style({ opacity: 0, transform: 'translateX(60px)' }))], { optional: true }),
        query(':enter', [animate('250ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="ls" *ngIf="block">
      <!-- Step bar -->
      <div class="ls-bar">
        <div class="ls-bar-inner">
          <button *ngFor="let step of block.steps; let i = index"
                  class="ls-dot-btn"
                  [class.active]="i === currentStep"
                  [class.completed]="i < currentStep"
                  [class.locked]="i > currentStep && !canGoTo(i)"
                  (click)="goTo(i)">
            <span class="ls-dot">
              <span *ngIf="i < currentStep" nz-icon nzType="check" nzTheme="outline"></span>
              <span *ngIf="i >= currentStep">{{ i + 1 }}</span>
            </span>
            <span class="ls-dot-label">{{ step.label }}</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="ls-content" [@slideContent]="currentStep">
        <ng-container *ngFor="let sub of block.steps[currentStep]?.blocks; let j = index">

          <!-- Theory -->
          <div *ngIf="sub.type === 'theory'" class="ll-theory" [innerHTML]="renderMarkdown(sub.markdown)"></div>

          <!-- Tip -->
          <div *ngIf="sub.type === 'tip'" class="ll-tip">
            <span nz-icon nzType="bulb" nzTheme="fill" style="color:#faad14;font-size:18px;flex-shrink:0;margin-top:2px"></span>
            <div style="flex:1;font-size:14px;line-height:1.6" [innerHTML]="renderMarkdown(sub.markdown)"></div>
          </div>

          <!-- Image -->
          <div *ngIf="sub.type === 'image'" class="ll-image">
            <img [src]="sub.src" [alt]="sub.alt" style="max-width:100%;border-radius:8px;border:1px solid #e8e8e8" />
            <div *ngIf="sub.caption" style="font-size:13px;color:#999;margin-top:6px;text-align:center">{{ sub.caption }}</div>
          </div>

          <!-- Exercise -->
          <div *ngIf="sub.type === 'exercise'" class="ls-exercise">
            <div class="ls-exercise-header">
              <span nz-icon nzType="edit" style="color:#e61982;font-size:16px"></span>
              <span style="font-weight:600;font-size:15px">{{ sub.title }}</span>
              <nz-tag *ngIf="progress.isExerciseCompleted(sub.id)" nzColor="green" style="margin-left:auto">
                <span nz-icon nzType="check"></span> Fait
              </nz-tag>
            </div>
            <exercise-quiz *ngIf="sub.exerciseType === 'quiz'"
                           [data]="asQuiz(sub)" (completed)="onStepExerciseDone(sub, $event)"></exercise-quiz>
            <exercise-expression *ngIf="sub.exerciseType === 'expression'"
                                 [data]="asExpression(sub)" (completed)="onStepExerciseDone(sub, $event)"></exercise-expression>
            <exercise-drag-match *ngIf="sub.exerciseType === 'drag-match'"
                                 [data]="asDragMatch(sub)" (completed)="onStepExerciseDone(sub, $event)"></exercise-drag-match>
            <exercise-fill-blank *ngIf="sub.exerciseType === 'fill-blank'"
                                 [data]="asFillBlank(sub)" (completed)="onStepExerciseDone(sub, $event)"></exercise-fill-blank>
            <exercise-ordering *ngIf="sub.exerciseType === 'ordering'"
                               [data]="asOrdering(sub)" (completed)="onStepExerciseDone(sub, $event)"></exercise-ordering>
          </div>

        </ng-container>
      </div>

      <!-- Navigation -->
      <div class="ls-nav">
        <button nz-button [disabled]="currentStep === 0" (click)="prev()">
          <span nz-icon nzType="arrow-left"></span> Précédent
        </button>
        <span class="ls-nav-count">{{ currentStep + 1 }} / {{ block.steps.length }}</span>
        <button nz-button nzType="primary"
                [disabled]="currentStep >= block.steps.length - 1 || !canAdvance()"
                (click)="nextStep()">
          Suivant <span nz-icon nzType="arrow-right"></span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ls {
      border: 1px solid #e8e8e8; border-radius: 12px;
      background: #fafafa; padding: 20px; overflow: hidden;
    }

    /* Step bar */
    .ls-bar { overflow-x: auto; margin-bottom: 20px; -webkit-overflow-scrolling: touch; }
    .ls-bar-inner { display: flex; align-items: center; gap: 4px; min-width: max-content; }
    .ls-dot-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: none; border: none; cursor: pointer; padding: 4px 12px;
      transition: opacity 0.2s;
    }
    .ls-dot-btn.locked { opacity: 0.4; cursor: default; }
    .ls-dot {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: #e8e8e8; font-size: 13px; font-weight: 600; color: #666;
      transition: all 0.2s;
    }
    .ls-dot-btn.active .ls-dot { background: #e61982; color: #fff; }
    .ls-dot-btn.completed .ls-dot { background: #52c41a; color: #fff; }
    .ls-dot-label { font-size: 12px; color: #666; white-space: nowrap; }
    .ls-dot-btn.active .ls-dot-label { color: #e61982; font-weight: 600; }

    /* Content */
    .ls-content {
      display: flex; flex-direction: column; gap: 16px;
      min-height: 120px; position: relative;
    }

    /* Exercise in stepper */
    .ls-exercise {
      padding: 14px 18px; border: 1px solid #d9e8ff; border-radius: 10px; background: #f0f7ff;
    }
    .ls-exercise-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }

    /* Inherited theory/tip styles - use :host ::ng-deep or rely on parent */
    :host ::ng-deep .ll-theory { line-height: 1.7; font-size: 15px; }
    :host ::ng-deep .ll-theory h1 { font-size: 20px; font-weight: 600; margin: 0 0 10px; }
    :host ::ng-deep .ll-theory h2 { font-size: 17px; font-weight: 600; margin: 16px 0 8px; }
    :host ::ng-deep .ll-theory p { margin: 0 0 8px; }
    :host ::ng-deep .ll-theory code {
      background: #f5f5f5; padding: 2px 6px; border-radius: 4px;
      font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;
    }

    /* Navigation */
    .ls-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 20px; padding-top: 16px; border-top: 1px solid #e8e8e8;
    }
    .ls-nav-count { font-size: 13px; color: #999; }

    @media (max-width: 768px) {
      .ls { padding: 14px; }
      .ls-dot-label { display: none; }
      .ls-dot-btn { padding: 4px 8px; }
    }
  `]
})
export class LearnStepperComponent {
  @Input() block!: StepperBlock;
  @Output() exerciseDone = new EventEmitter<{ block: ExerciseBlock; success: boolean }>();

  currentStep = 0;
  private stepExercisesDone = new Set<string>();

  constructor(public progress: LearnProgressService) {}

  goTo(i: number): void {
    if (this.canGoTo(i)) this.currentStep = i;
  }

  prev(): void {
    if (this.currentStep > 0) this.currentStep--;
  }

  nextStep(): void {
    if (this.canAdvance() && this.currentStep < this.block.steps.length - 1) {
      this.currentStep++;
    }
  }

  canGoTo(i: number): boolean {
    // Can go back freely, or forward if all blocking exercises in prior steps are done
    if (i <= this.currentStep) return true;
    for (let s = this.currentStep; s < i; s++) {
      if (!this.stepCompleted(s)) return false;
    }
    return true;
  }

  canAdvance(): boolean {
    return this.stepCompleted(this.currentStep);
  }

  private stepCompleted(stepIndex: number): boolean {
    const step = this.block.steps[stepIndex];
    if (!step) return false;
    for (const b of step.blocks) {
      if (b.type === 'exercise') {
        const ex = b as ExerciseBlock;
        if (ex.blocking !== false) {
          if (!this.stepExercisesDone.has(ex.id) && !this.progress.isExerciseCompleted(ex.id)) return false;
        }
      }
    }
    return true;
  }

  onStepExerciseDone(block: ExerciseBlock, success: boolean): void {
    if (success) {
      this.stepExercisesDone.add(block.id);
      this.progress.completeExercise(block.id);
    }
    this.exerciseDone.emit({ block, success });
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

  // Type assertions
  asQuiz(block: LearnBlock): QuizData { return (block as ExerciseBlock).data as QuizData; }
  asExpression(block: LearnBlock): ExpressionData { return (block as ExerciseBlock).data as ExpressionData; }
  asDragMatch(block: LearnBlock): DragMatchData { return (block as ExerciseBlock).data as DragMatchData; }
  asFillBlank(block: LearnBlock): FillBlankData { return (block as ExerciseBlock).data as FillBlankData; }
  asOrdering(block: LearnBlock): OrderingData { return (block as ExerciseBlock).data as OrderingData; }
}
