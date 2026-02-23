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
    <div class="aq" *ngIf="question">
      <!-- Batch mode: multiple questions -->
      <ng-container *ngIf="question.questionType === 'batch' && question.questions?.length; else singleMode">
        <div class="aq-text">{{ question.text }}</div>
        <div class="aq-batch" *ngFor="let q of question.questions">
          <div class="aq-sub-text">{{ q.text }}</div>

          <!-- Single choice chips -->
          <div class="aq-options" *ngIf="q.questionType === 'single' && q.options?.length">
            <span class="aq-chip clickable"
              *ngFor="let opt of q.options"
              [class.selected]="batchAnswers[q.id] === opt.value"
              (click)="setBatchSingle(q.id, opt)">
              <span nz-icon *ngIf="batchAnswers[q.id] === opt.value" nzType="check" nzTheme="outline" class="aq-check"></span>
              {{ opt.label }}
            </span>
          </div>

          <!-- Multi choice chips -->
          <div class="aq-options" *ngIf="q.questionType === 'multi' && q.options?.length">
            <span class="aq-chip clickable"
              *ngFor="let opt of q.options"
              [class.selected]="isBatchMultiSelected(q.id, opt.value)"
              (click)="toggleBatchMulti(q.id, opt.value, !isBatchMultiSelected(q.id, opt.value))">
              <span nz-icon *ngIf="isBatchMultiSelected(q.id, opt.value)" nzType="check" nzTheme="outline" class="aq-check"></span>
              {{ opt.label }}
            </span>
          </div>

          <!-- Free text -->
          <div class="aq-input" *ngIf="q.questionType === 'text' || (!q.options?.length && q.questionType !== 'single' && q.questionType !== 'multi')">
            <input nz-input nzSize="small" [(ngModel)]="batchTexts[q.id]" placeholder="Votre réponse..." />
          </div>
        </div>
        <div class="aq-actions">
          <button nz-button nzType="primary" nzSize="small" (click)="submitBatch()" [disabled]="!isBatchComplete()">
            <span nz-icon nzType="check" nzTheme="outline"></span> Valider
          </button>
        </div>
      </ng-container>

      <!-- Single question mode -->
      <ng-template #singleMode>
        <div class="aq-text">{{ question.text }}</div>

        <!-- Single choice chips -->
        <div class="aq-options" *ngIf="question.questionType === 'single' && question.options?.length">
          <span class="aq-chip clickable"
            *ngFor="let opt of question.options"
            [class.selected]="selectedValue === opt.value"
            (click)="selectSingle(opt)">
            <span nz-icon *ngIf="selectedValue === opt.value" nzType="check" nzTheme="outline" class="aq-check"></span>
            {{ opt.label }}
          </span>
          <span class="aq-chip clickable" [class.selected]="showOtherInput" (click)="showOtherInput = !showOtherInput">
            Autre...
          </span>
          <div class="aq-other" *ngIf="showOtherInput">
            <nz-input-group [nzSuffix]="otherSendIcon" nzSize="small">
              <input nz-input [(ngModel)]="otherText" placeholder="Précise ta réponse..." (keydown.enter)="submitOther()" />
            </nz-input-group>
            <ng-template #otherSendIcon>
              <span nz-icon nzType="send" nzTheme="outline" class="send-icon" (click)="submitOther()"></span>
            </ng-template>
          </div>
        </div>

        <!-- Multi choice chips -->
        <div class="aq-options" *ngIf="question.questionType === 'multi' && question.options?.length">
          <span class="aq-chip clickable"
            *ngFor="let opt of question.options"
            [class.selected]="isSelected(opt.value)"
            (click)="toggleMulti(opt.value, !isSelected(opt.value))">
            <span nz-icon *ngIf="isSelected(opt.value)" nzType="check" nzTheme="outline" class="aq-check"></span>
            {{ opt.label }}
          </span>
          <div class="aq-actions">
            <span class="aq-chip clickable" [class.selected]="showOtherInput" (click)="showOtherInput = !showOtherInput">
              Autre...
            </span>
            <button nz-button nzType="primary" nzSize="small" (click)="submitMulti()" [disabled]="!selectedValues.length && !otherText.trim()">
              <span nz-icon nzType="check" nzTheme="outline"></span> Valider
            </button>
          </div>
          <div class="aq-other" *ngIf="showOtherInput">
            <input nz-input nzSize="small" [(ngModel)]="otherText" placeholder="Précise ta réponse..." />
          </div>
        </div>

        <!-- Free text -->
        <div class="aq-input" *ngIf="question.questionType === 'text' || !question.options?.length">
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
    .aq { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; }
    .aq-text { font-size: 12px; color: #666; margin-bottom: 6px; }
    .aq-options { display: flex; flex-wrap: wrap; gap: 4px; }
    .aq-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; padding: 2px 10px; border-radius: 12px; background: #f0f0f0; color: #999; transition: all 0.15s ease; }
    .aq-chip.clickable { cursor: pointer; }
    .aq-chip.clickable:hover { background: #e6f4ff; color: #1677ff; }
    .aq-chip.selected { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; font-weight: 500; }
    .aq-check { font-size: 10px; }
    .aq-batch { margin: 6px 0; padding: 8px 10px; background: #fff; border: 1px solid #f0f0f0; border-radius: 6px; }
    .aq-sub-text { font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500; }
    .aq-input { margin-top: 4px; }
    .aq-other { margin-top: 6px; width: 100%; }
    .aq-actions { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
    .send-icon { cursor: pointer; color: #1677ff; }

    :host ::ng-deep .aq .ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
      border-color: #1677ff !important;
      border-right-width: 1px !important;
      z-index: 1;
    }

    :host ::ng-deep .aq .ant-input-affix-wrapper-focused,
    :host ::ng-deep .aq .ant-input-affix-wrapper:focus-within {
      border-color: #1677ff !important;
      border-right-width: 1px !important;
      z-index: 1;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15) !important;
    }
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
