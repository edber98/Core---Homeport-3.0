import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AiQuestion, AiQuestionOption } from './ai.service';

@Component({
  selector: 'ai-question',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzCheckboxModule, NzRadioModule, NzIconModule],
  template: `
    <div class="ai-question" *ngIf="question">
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
        <button nz-button nzType="primary" nzSize="small" (click)="submitMulti()" [disabled]="!selectedValues.length">
          Valider
        </button>
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
  `]
})
export class AiQuestionComponent {
  @Input() question!: AiQuestion;
  @Output() answered = new EventEmitter<any>();

  selectedValue: string | null = null;
  selectedValues: string[] = [];
  freeText = '';

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
    if (!this.selectedValues.length) return;
    this.answered.emit({ values: this.selectedValues });
  }

  submitText() {
    const t = (this.freeText || '').trim();
    if (!t) return;
    this.answered.emit({ text: t });
    this.freeText = '';
  }
}
