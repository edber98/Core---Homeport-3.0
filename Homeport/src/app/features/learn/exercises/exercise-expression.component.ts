import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { ExpressionData } from '../learn-curriculum';

@Component({
  selector: 'exercise-expression',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzIconModule, NzAlertModule],
  template: `
    <div class="expr">
      <div class="expr-instruction" [innerHTML]="instructionHtml"></div>
      <div class="expr-context" *ngIf="contextJson">
        <div class="expr-context-label">Contexte :</div>
        <pre class="expr-context-pre">{{ contextJson }}</pre>
      </div>
      <div class="expr-input-row">
        <input nz-input class="expr-input"
               [(ngModel)]="userInput"
               [disabled]="submitted"
               placeholder="Écrivez votre expression ici…"
               (keyup.enter)="submit()" />
      </div>
      <div class="expr-hint" *ngIf="data.hint && showHint && !submitted">
        <span nz-icon nzType="bulb" nzTheme="outline"></span> {{ data.hint }}
      </div>
      <div class="expr-actions">
        <button nz-button nzType="primary" [disabled]="!userInput.trim() || submitted" (click)="submit()">Valider</button>
        <button nz-button *ngIf="data.hint && !showHint && !submitted" (click)="showHint = true">Voir l'indice</button>
      </div>
      <nz-alert *ngIf="submitted && isCorrect" nzType="success" nzMessage="Bonne réponse !" nzShowIcon></nz-alert>
      <div *ngIf="submitted && !isCorrect">
        <nz-alert nzType="error" [nzMessage]="'Résultat attendu : ' + data.expectedOutput" nzShowIcon></nz-alert>
      </div>
    </div>
  `,
  styles: [`
    .expr-instruction { font-size: 14px; margin-bottom: 12px; line-height: 1.6; }
    .expr-instruction code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    .expr-context { margin-bottom: 12px; }
    .expr-context-label { font-size: 13px; color: #666; margin-bottom: 4px; }
    .expr-context-pre {
      background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 6px;
      padding: 10px 14px; font-size: 13px; margin: 0; overflow-x: auto;
    }
    .expr-input-row { margin-bottom: 8px; }
    .expr-input { font-family: monospace; font-size: 14px; }
    .expr-hint { font-size: 13px; color: #faad14; margin-bottom: 8px; }
    .expr-actions { display: flex; gap: 8px; margin-bottom: 12px; }
  `]
})
export class ExerciseExpressionComponent {
  @Input() data!: ExpressionData;
  @Output() completed = new EventEmitter<boolean>();

  userInput = '';
  submitted = false;
  isCorrect = false;
  showHint = false;

  get contextJson(): string {
    const ctx = this.data.context;
    if (!ctx || Object.keys(ctx).length === 0) return '';
    return JSON.stringify(ctx, null, 2);
  }

  get instructionHtml(): string {
    // Simple inline code rendering for backtick pairs
    return (this.data.instruction || '')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  submit() {
    const val = this.userInput.trim();
    if (!val) return;
    this.submitted = true;
    // Normalize: strip outer {{ }} if present and compare
    const normalized = val.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').trim();
    const expected = this.data.expectedOutput.trim();
    // Accept either the raw expression or wrapped in {{ }}
    this.isCorrect = val === expected || normalized === expected || val === `{{ ${expected} }}` || val === `{{${expected}}}`;
    this.completed.emit(this.isCorrect);
  }
}
