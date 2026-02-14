import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiQuestion, AiQuestionOption, AiQuestionItem } from './ai.service';

@Component({
  selector: 'ai-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzCheckboxModule, NzRadioModule, NzIconModule],
  template: `
    <div class="ai-question" *ngIf="question">
      <!-- Batch mode: multiple questions -->
      <ng-container *ngIf="question.questionType === 'batch' && question.questions?.length; else singleMode">
        <div class="q-text">{{ question.text }}</div>
        <div class="batch-questions">
          <div class="batch-item" *ngFor="let q of question.questions">
            <div class="bq-text">{{ q.text }}</div>

            <!-- Single choice -->
            <div class="q-options" *ngIf="q.questionType === 'single' && q.options?.length">
              <button
                *ngFor="let opt of q.options"
                nz-button
                [nzType]="batchAnswers[q.id] === opt.value ? 'primary' : 'default'"
                nzSize="small"
                (click)="setBatchSingle(q.id, opt)">
                {{ opt.label }}
              </button>
            </div>

            <!-- Multi choice -->
            <div class="q-options multi" *ngIf="q.questionType === 'multi' && q.options?.length">
              <label
                *ngFor="let opt of q.options"
                nz-checkbox
                [nzChecked]="isBatchMultiSelected(q.id, opt.value)"
                (nzCheckedChange)="toggleBatchMulti(q.id, opt.value, $event)">
                {{ opt.label }}
              </label>
            </div>

            <!-- Free text -->
            <div class="q-input" *ngIf="q.questionType === 'text' || (!q.options?.length && q.questionType !== 'single' && q.questionType !== 'multi')">
              <input nz-input nzSize="small" [(ngModel)]="batchTexts[q.id]" placeholder="Votre réponse..." />
            </div>
          </div>
        </div>
        <div class="batch-submit">
          <button nz-button nzType="primary" nzSize="small" (click)="submitBatch()" [disabled]="!isBatchComplete()">
            Valider toutes les réponses
          </button>
        </div>
      </ng-container>

      <!-- Single question mode -->
      <ng-template #singleMode>
        <div class="q-text">{{ question.text }}</div>

        <!-- Single choice (radio chips) -->
        <div class="q-options" *ngIf="question.questionType === 'single' && question.options?.length">
          <button
            *ngFor="let opt of question.options"
            nz-button
            [nzType]="selectedValue === opt.value ? 'primary' : 'default'"
            nzSize="small"
            (click)="selectSingle(opt)">
            {{ opt.label }}
          </button>
          <button nz-button [nzType]="showOtherInput ? 'dashed' : 'default'" nzSize="small" (click)="showOtherInput = !showOtherInput">
            Autre (précise)
          </button>
          <div class="q-other-input" *ngIf="showOtherInput">
            <nz-input-group [nzSuffix]="otherSendIcon" nzSize="small">
              <input nz-input [(ngModel)]="otherText" placeholder="Précise ta réponse..." (keydown.enter)="submitOther()" />
            </nz-input-group>
            <ng-template #otherSendIcon>
              <span nz-icon nzType="send" nzTheme="outline" class="send-icon" (click)="submitOther()"></span>
            </ng-template>
          </div>
        </div>

        <!-- Multi choice (checkboxes) -->
        <div class="q-options multi" *ngIf="question.questionType === 'multi' && question.options?.length">
          <label
            *ngFor="let opt of question.options"
            nz-checkbox
            [nzChecked]="isSelected(opt.value)"
            (nzCheckedChange)="toggleMulti(opt.value, $event)">
            {{ opt.label }}
          </label>
          <div class="q-multi-actions">
            <button nz-button nzType="default" nzSize="small" (click)="showOtherInput = !showOtherInput">
              Autre (précise)
            </button>
            <button nz-button nzType="primary" nzSize="small" (click)="submitMulti()" [disabled]="!selectedValues.length && !otherText.trim()">
              Valider
            </button>
          </div>
          <div class="q-other-input" *ngIf="showOtherInput">
            <input nz-input nzSize="small" [(ngModel)]="otherText" placeholder="Précise ta réponse..." />
          </div>
        </div>

        <!-- Free text -->
        <div class="q-input" *ngIf="question.questionType === 'text' || !question.options?.length">
          <nz-input-group [nzSuffix]="sendIcon" nzSize="small">
            <input nz-input [(ngModel)]="freeText" placeholder="Votre réponse..." (keydown.enter)="submitText()" />
          </nz-input-group>
          <ng-template #sendIcon>
            <span nz-icon nzType="send" nzTheme="outline" class="send-icon" (click)="submitText()"></span>
          </ng-template>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .ai-question { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; margin: 4px 0; }
    .q-text { font-weight: 500; margin-bottom: 8px; line-height: 1.4; }
    .q-options { display: flex; flex-wrap: wrap; gap: 6px; }
    .q-options.multi { flex-direction: column; gap: 4px; }
    .q-options.multi button { align-self: flex-start; margin-top: 6px; }
    .q-input { margin-top: 4px; }
    .send-icon { cursor: pointer; color: #1677ff; }
    .q-other-input { margin-top: 6px; width: 100%; }
    .q-multi-actions { display: flex; gap: 6px; align-self: flex-start; margin-top: 6px; }
    .batch-questions { display: flex; flex-direction: column; gap: 12px; }
    .batch-item { padding: 8px 10px; background: #fff; border: 1px solid #f0f0f0; border-radius: 6px; }
    .bq-text { font-weight: 500; font-size: 13px; margin-bottom: 6px; }
    .batch-submit { margin-top: 10px; }
  `]
})
export class AiQuestionComponent {
  @Input() question!: AiQuestion;
  @Output() answered = new EventEmitter<any>();

  selectedValue: string | null = null;
  selectedValues: string[] = [];
  freeText = '';
  showOtherInput = false;
  otherText = '';

  // Batch mode state
  batchAnswers: Record<string, any> = {};
  batchMultiSelections: Record<string, string[]> = {};
  batchTexts: Record<string, string> = {};

  selectSingle(opt: AiQuestionOption) {
    this.selectedValue = opt.value;
    this.answered.emit({ value: opt.value, label: opt.label });
  }

  isSelected(value: string) { return this.selectedValues.includes(value); }

  toggleMulti(value: string, checked: boolean) {
    if (checked) {
      this.selectedValues = [...this.selectedValues, value];
    } else {
      this.selectedValues = this.selectedValues.filter(v => v !== value);
    }
  }

  submitMulti() {
    const vals = [...this.selectedValues];
    const other = this.otherText.trim();
    if (!vals.length && !other) return;
    if (other) vals.push(other);
    this.answered.emit({ values: vals });
  }

  submitOther() {
    const t = this.otherText.trim();
    if (!t) return;
    this.answered.emit({ text: t });
    this.otherText = '';
  }

  submitText() {
    const t = (this.freeText || '').trim();
    if (!t) return;
    this.answered.emit({ text: t });
    this.freeText = '';
  }

  // Batch mode methods
  setBatchSingle(qId: string, opt: AiQuestionOption) {
    this.batchAnswers = { ...this.batchAnswers, [qId]: opt.value };
  }

  isBatchMultiSelected(qId: string, value: string): boolean {
    return (this.batchMultiSelections[qId] || []).includes(value);
  }

  toggleBatchMulti(qId: string, value: string, checked: boolean) {
    const current = this.batchMultiSelections[qId] || [];
    this.batchMultiSelections = {
      ...this.batchMultiSelections,
      [qId]: checked ? [...current, value] : current.filter(v => v !== value),
    };
  }

  isBatchComplete(): boolean {
    if (!this.question.questions?.length) return false;
    for (const q of this.question.questions) {
      if (q.questionType === 'text' || (!q.options?.length && q.questionType !== 'single' && q.questionType !== 'multi')) {
        if (!(this.batchTexts[q.id] || '').trim()) return false;
      } else if (q.questionType === 'single') {
        if (!this.batchAnswers[q.id]) return false;
      } else if (q.questionType === 'multi') {
        if (!(this.batchMultiSelections[q.id]?.length)) return false;
      }
    }
    return true;
  }

  submitBatch() {
    if (!this.isBatchComplete()) return;
    const answers: Record<string, any> = {};
    for (const q of this.question.questions!) {
      if (q.questionType === 'text' || (!q.options?.length && q.questionType !== 'single' && q.questionType !== 'multi')) {
        answers[q.id] = this.batchTexts[q.id]?.trim() || '';
      } else if (q.questionType === 'single') {
        answers[q.id] = this.batchAnswers[q.id];
      } else if (q.questionType === 'multi') {
        answers[q.id] = this.batchMultiSelections[q.id] || [];
      }
    }
    this.answered.emit({ batchAnswers: answers });
  }
}
