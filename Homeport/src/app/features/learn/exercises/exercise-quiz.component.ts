import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { QuizData } from '../learn-curriculum';

@Component({
  selector: 'exercise-quiz',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzAlertModule],
  template: `
    <div class="quiz">
      <p class="quiz-question">{{ data.question }}</p>
      <div class="quiz-options">
        <button *ngFor="let opt of data.options; let i = index"
                class="quiz-option"
                [class.selected]="selectedIndex === i"
                [class.correct]="submitted && i === data.correctIndex"
                [class.incorrect]="submitted && selectedIndex === i && i !== data.correctIndex"
                [disabled]="submitted"
                (click)="select(i)">
          <span class="opt-letter">{{ letters[i] }}</span>
          <span class="opt-text">{{ opt }}</span>
          <span class="opt-icon" *ngIf="submitted && i === data.correctIndex">
            <span nz-icon nzType="check-circle" nzTheme="fill"></span>
          </span>
          <span class="opt-icon" *ngIf="submitted && selectedIndex === i && i !== data.correctIndex">
            <span nz-icon nzType="close-circle" nzTheme="fill"></span>
          </span>
        </button>
      </div>
      <div class="quiz-actions" *ngIf="!submitted">
        <button nz-button nzType="primary" [disabled]="selectedIndex === null" (click)="submit()">Valider</button>
      </div>
      <nz-alert *ngIf="submitted && isCorrect" nzType="success" [nzMessage]="data.explanation || 'Bonne réponse !'" nzShowIcon></nz-alert>
      <nz-alert *ngIf="submitted && !isCorrect" nzType="error" [nzMessage]="'Mauvaise réponse. ' + (data.explanation || '')" nzShowIcon></nz-alert>
      <div class="quiz-actions" *ngIf="submitted && !isCorrect">
        <button nz-button nzType="primary" (click)="retry()">Réessayer</button>
      </div>
    </div>
  `,
  styles: [`
    .quiz-question { font-size: 15px; font-weight: 500; margin-bottom: 12px; }
    .quiz-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .quiz-option {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border: 1px solid #d9d9d9; border-radius: 8px;
      background: #fff; cursor: pointer; text-align: left; font-size: 14px;
      transition: all 0.2s;
    }
    .quiz-option:hover:not([disabled]) { border-color: #1890ff; background: #e6f7ff; }
    .quiz-option.selected { border-color: #1890ff; background: #e6f7ff; }
    .quiz-option.correct { border-color: #52c41a; background: #f6ffed; }
    .quiz-option.incorrect { border-color: #ff4d4f; background: #fff2f0; }
    .quiz-option[disabled] { cursor: default; opacity: 0.85; }
    .opt-letter {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%; background: #f0f0f0;
      font-weight: 600; font-size: 13px; flex-shrink: 0;
    }
    .selected .opt-letter { background: #1890ff; color: #fff; }
    .correct .opt-letter { background: #52c41a; color: #fff; }
    .incorrect .opt-letter { background: #ff4d4f; color: #fff; }
    .opt-text { flex: 1; }
    .opt-icon { flex-shrink: 0; font-size: 18px; }
    .correct .opt-icon { color: #52c41a; }
    .incorrect .opt-icon { color: #ff4d4f; }
    .quiz-actions { margin-bottom: 12px; }
  `]
})
export class ExerciseQuizComponent {
  @Input() data!: QuizData;
  @Output() completed = new EventEmitter<boolean>();

  letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  selectedIndex: number | null = null;
  submitted = false;
  isCorrect = false;

  select(i: number) { if (!this.submitted) this.selectedIndex = i; }

  submit() {
    if (this.selectedIndex === null) return;
    this.submitted = true;
    this.isCorrect = this.selectedIndex === this.data.correctIndex;
    this.completed.emit(this.isCorrect);
  }

  retry() {
    this.submitted = false;
    this.isCorrect = false;
    this.selectedIndex = null;
  }
}
