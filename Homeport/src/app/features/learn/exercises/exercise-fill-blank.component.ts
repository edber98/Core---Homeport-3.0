import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { FillBlankData } from '../learn-curriculum';

interface BlankState {
  value: string;
  correct?: boolean;
}

@Component({
  selector: 'exercise-fill-blank',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule, NzAlertModule],
  template: `
    <div class="fb">
      <p class="fb-instruction">{{ data.instruction }}</p>
      <div class="fb-template">
        <ng-container *ngFor="let part of parts; let i = index">
          <span class="fb-text" *ngIf="part.type === 'text'">{{ part.value }}</span>
          <span class="fb-blank-wrap" *ngIf="part.type === 'blank'">
            <input nz-input class="fb-input"
                   [class.correct]="submitted && blanks[part.index!].correct"
                   [class.incorrect]="submitted && blanks[part.index!].correct === false"
                   [(ngModel)]="blanks[part.index!].value"
                   [disabled]="submitted"
                   [placeholder]="'Réponse ' + (part.index! + 1)"
                   (keyup.enter)="submit()" />
            <span *ngIf="submitted && blanks[part.index!].correct" nz-icon nzType="check-circle" nzTheme="fill" style="color:#52c41a"></span>
            <span *ngIf="submitted && blanks[part.index!].correct === false" nz-icon nzType="close-circle" nzTheme="fill" style="color:#ff4d4f"></span>
            <span *ngIf="submitted && blanks[part.index!].correct === false" class="fb-answer">{{ data.blanks[part.index!].answer }}</span>
          </span>
        </ng-container>
      </div>
      <div class="fb-actions" *ngIf="!submitted">
        <button nz-button nzType="primary" [disabled]="!allFilled" (click)="submit()">Valider</button>
      </div>
      <nz-alert *ngIf="submitted && allCorrect" nzType="success" nzMessage="Toutes les réponses sont correctes !" nzShowIcon></nz-alert>
      <nz-alert *ngIf="submitted && !allCorrect" nzType="error" nzMessage="Certaines réponses sont incorrectes. Les bonnes réponses sont affichées." nzShowIcon></nz-alert>
      <div class="fb-actions" *ngIf="submitted && !allCorrect">
        <button nz-button nzType="primary" (click)="retry()">Réessayer</button>
      </div>
    </div>
  `,
  styles: [`
    .fb-instruction { font-size: 14px; margin-bottom: 12px; }
    .fb-template { font-size: 15px; line-height: 2.2; margin-bottom: 16px; }
    .fb-text { white-space: pre-wrap; }
    .fb-blank-wrap { display: inline-flex; align-items: center; gap: 4px; vertical-align: middle; }
    .fb-input {
      width: 160px; display: inline-block; text-align: center; font-weight: 500;
      border-radius: 6px;
    }
    .fb-input.correct { border-color: #52c41a; background: #f6ffed; }
    .fb-input.incorrect { border-color: #ff4d4f; background: #fff2f0; }
    .fb-answer { color: #52c41a; font-weight: 500; font-size: 13px; }
    .fb-actions { margin-top: 4px; }
  `]
})
export class ExerciseFillBlankComponent implements OnInit {
  @Input() data!: FillBlankData;
  @Output() completed = new EventEmitter<boolean>();

  parts: { type: 'text' | 'blank'; value?: string; index?: number }[] = [];
  blanks: BlankState[] = [];
  submitted = false;
  allCorrect = false;

  get allFilled(): boolean { return this.blanks.every(b => b.value.trim().length > 0); }

  ngOnInit() {
    // Parse template: split by {{BLANK}} marker
    const segments = this.data.template.split('{{BLANK}}');
    this.parts = [];
    let blankIdx = 0;
    segments.forEach((seg, i) => {
      if (seg) this.parts.push({ type: 'text', value: seg });
      if (i < segments.length - 1) {
        this.parts.push({ type: 'blank', index: blankIdx });
        blankIdx++;
      }
    });
    this.blanks = this.data.blanks.map(() => ({ value: '', correct: undefined }));
  }

  submit() {
    this.submitted = true;
    this.blanks.forEach((b, i) => {
      const def = this.data.blanks[i];
      const val = b.value.trim().toLowerCase();
      const acceptable = [def.answer, ...(def.alternatives || [])].map(a => a.toLowerCase());
      b.correct = acceptable.includes(val);
    });
    this.allCorrect = this.blanks.every(b => b.correct);
    this.completed.emit(this.allCorrect);
  }

  retry() {
    this.submitted = false;
    this.allCorrect = false;
    this.blanks = this.data.blanks.map(() => ({ value: '', correct: undefined }));
  }
}
