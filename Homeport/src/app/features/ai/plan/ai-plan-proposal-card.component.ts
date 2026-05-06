import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AiPlanProposal, AiPlanStep, AiPlanMissingInfo } from '../ai.service';

interface EditableStep extends AiPlanStep {
  _selected?: boolean;
  _editTitle?: string;
  _editRationale?: string;
}

@Component({
  selector: 'ai-plan-proposal-card',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzButtonModule, NzIconModule, NzTagModule, NzCheckboxModule, NzInputModule, NzToolTipModule,
  ],
  template: `
    <div class="plan-card" [class.disabled]="!!proposal.answer">
      <div class="plan-header">
        <span nz-icon nzType="ordered-list" nzTheme="outline" class="plan-icon"></span>
        <div class="plan-head-text">
          <div class="plan-summary">{{ proposal.summary }}</div>
          <div class="plan-subtitle">{{ proposal.steps?.length || 0 }} étape{{ (proposal.steps?.length || 0) > 1 ? 's' : '' }} proposée{{ (proposal.steps?.length || 0) > 1 ? 's' : '' }}</div>
        </div>
        <nz-tag nzColor="magenta" class="plan-tag">Plan proposé</nz-tag>
      </div>

      <div class="steps-list">
        <div
          *ngFor="let step of steps; let i = index"
          class="step-item"
          [class.step-unchecked]="!step._selected && !proposal.answer"
        >
          <label
            *ngIf="!editing"
            nz-checkbox
            [(ngModel)]="step._selected"
            [nzDisabled]="!!proposal.answer"
            class="step-check"
          ></label>

          <div class="step-body">
            <div class="step-head">
              <span class="step-id">{{ step.id }}</span>
              <span class="step-title" *ngIf="!editing">{{ step.title }}</span>
              <input
                *ngIf="editing"
                nz-input
                [(ngModel)]="step._editTitle"
                nzSize="small"
                placeholder="Titre de l'étape"
              />
              <span class="step-duration" *ngIf="step.duration_estimate && !editing">
                <span nz-icon nzType="clock-circle" nzTheme="outline"></span>
                {{ step.duration_estimate }}
              </span>
            </div>

            <div class="step-rationale" *ngIf="step.rationale && !editing">{{ step.rationale }}</div>
            <textarea
              *ngIf="editing"
              nz-input
              [(ngModel)]="step._editRationale"
              rows="2"
              placeholder="Rationale (pourquoi cette étape)"
              class="edit-rationale"
            ></textarea>

            <div class="step-tools" *ngIf="step.tools?.length && !editing">
              <nz-tag *ngFor="let t of step.tools" nzColor="blue" class="tool-tag">{{ t }}</nz-tag>
            </div>

            <div class="step-deps" *ngIf="step.dependsOn?.length && !editing">
              <span class="deps-label">Dépend de :</span>
              <span class="deps-list">{{ step.dependsOn?.join(', ') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="risks-block" *ngIf="proposal.risks?.length">
        <div class="risks-header">
          <span nz-icon nzType="warning" nzTheme="outline"></span> Risques / incertitudes
        </div>
        <ul class="risks-list">
          <li *ngFor="let r of proposal.risks">{{ r }}</li>
        </ul>
      </div>

      <div class="missing-info-block" *ngIf="missingInfo.length && !proposal.answer">
        <div class="missing-info-header">
          <span nz-icon nzType="info-circle" nzTheme="outline"></span>
          Informations requises
        </div>
        <div class="missing-info-desc">
          L'agent a besoin de ces informations avant d'exécuter le plan :
        </div>
        <div class="missing-info-list">
          <div class="missing-info-item" *ngFor="let mi of missingInfo">
            <label class="mi-label" [attr.for]="'mi-' + mi.key">
              {{ mi.question }}
              <span class="mi-required">*</span>
            </label>
            <input
              nz-input
              nzSize="small"
              [id]="'mi-' + mi.key"
              [(ngModel)]="missingInfoAnswers[mi.key]"
              [placeholder]="mi.why || 'Votre réponse...'"
            />
            <div class="mi-why" *ngIf="mi.why">{{ mi.why }}</div>
          </div>
        </div>
      </div>

      <div class="plan-actions" *ngIf="!proposal.answer && !editing">
        <button
          nz-button
          nzType="primary"
          nzSize="small"
          (click)="approve()"
          [disabled]="!canApprove()"
          [nz-tooltip]="!canApprove() ? 'Remplis toutes les informations requises ci-dessus' : ''">
          <span nz-icon nzType="check-circle" nzTheme="outline"></span>
          Approuver {{ selectedCount() !== steps.length ? '(' + selectedCount() + '/' + steps.length + ')' : '' }}
        </button>
        <button nz-button nzSize="small" (click)="startEditing()">
          <span nz-icon nzType="edit" nzTheme="outline"></span> Modifier
        </button>
        <button nz-button nzSize="small" nzDanger (click)="reject()">
          <span nz-icon nzType="close" nzTheme="outline"></span> Rejeter
        </button>
      </div>

      <div class="plan-actions" *ngIf="!proposal.answer && editing">
        <button nz-button nzType="primary" nzSize="small" (click)="saveEdits()">
          <span nz-icon nzType="check" nzTheme="outline"></span> Valider les modifs
        </button>
        <button nz-button nzSize="small" (click)="cancelEdits()">
          <span nz-icon nzType="rollback" nzTheme="outline"></span> Annuler
        </button>
      </div>

      <div class="answered-badge" *ngIf="proposal.answer">
        <nz-tag [nzColor]="answerColor()">
          <span nz-icon [nzType]="answerIcon()" nzTheme="outline"></span>
          {{ answerLabel() }}
          <span class="answered-at" *ngIf="proposal.answeredAt"> — {{ proposal.answeredAt | date:'short' }}</span>
        </nz-tag>
      </div>
    </div>
  `,
  styles: [`
    .plan-card {
      background: #fff; border: 1px solid #f0f0f0; border-radius: 10px;
      padding: 14px 16px; margin: 6px 0;
      border-left: 3px solid #e61982;
      transition: opacity .2s;
    }
    .plan-card.disabled { opacity: 0.8; }
    .plan-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
    .plan-icon { font-size: 18px; color: #e61982; margin-top: 2px; }
    .plan-head-text { flex: 1; min-width: 0; }
    .plan-summary { font-weight: 600; font-size: 14px; color: #262626; line-height: 1.4; }
    .plan-subtitle { font-size: 11px; color: #999; margin-top: 2px; }
    .plan-tag { margin: 0; flex-shrink: 0; }

    .steps-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .step-item {
      display: flex; gap: 10px; padding: 10px 12px;
      background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px;
      transition: opacity .15s, background .15s;
    }
    .step-item.step-unchecked { opacity: 0.45; background: #f5f5f5; }
    .step-check { margin-top: 2px; flex-shrink: 0; }
    .step-body { flex: 1; min-width: 0; }
    .step-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .step-id {
      font-size: 10px; font-weight: 600; color: #e61982;
      background: #fff0f6; padding: 1px 6px; border-radius: 3px;
      flex-shrink: 0;
    }
    .step-title { font-weight: 600; font-size: 13px; color: #333; flex: 1; min-width: 0; }
    .step-duration { font-size: 11px; color: #999; display: inline-flex; align-items: center; gap: 3px; }
    .step-rationale { font-style: italic; font-size: 12px; color: #666; margin-top: 4px; line-height: 1.4; }
    .step-tools { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .tool-tag { margin: 0; font-size: 10px; }
    .step-deps { font-size: 11px; color: #999; margin-top: 4px; }
    .deps-label { font-weight: 500; margin-right: 4px; }
    .edit-rationale { margin-top: 6px; font-size: 12px; }

    .risks-block {
      background: #fff7e6; border: 1px solid #ffe7ba; border-radius: 6px;
      padding: 8px 12px; margin-bottom: 10px;
    }
    .risks-header {
      font-size: 12px; font-weight: 600; color: #d48806;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .risks-list { margin: 4px 0 0 18px; padding: 0; font-size: 12px; color: #7a5a15; }
    .risks-list li { line-height: 1.4; }

    .missing-info-block {
      background: #e6f4ff; border: 1px solid #91caff; border-radius: 6px;
      padding: 10px 12px; margin-bottom: 10px;
    }
    .missing-info-header {
      font-size: 12px; font-weight: 600; color: #0958d9;
      display: inline-flex; align-items: center; gap: 4px; margin-bottom: 4px;
    }
    .missing-info-desc { font-size: 11px; color: #4a6684; margin-bottom: 8px; }
    .missing-info-list { display: flex; flex-direction: column; gap: 10px; }
    .missing-info-item { display: flex; flex-direction: column; gap: 3px; }
    .mi-label { font-size: 12px; font-weight: 500; color: #333; }
    .mi-required { color: #ff4d4f; margin-left: 2px; }
    .mi-why { font-size: 11px; color: #999; font-style: italic; }

    .plan-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }

    .answered-badge { margin-top: 10px; }
    .answered-at { color: #999; font-weight: 400; }
  `],
})
export class AiPlanProposalCardComponent {
  @Input() proposal!: AiPlanProposal;
  @Output() answered = new EventEmitter<{
    decision: 'approve' | 'reject' | 'modify';
    approvedSteps?: string[];
    modifiedSteps?: AiPlanStep[];
    missingInfoAnswers?: Record<string, string>;
  }>();

  editing = false;
  /** Réponses aux `missing_info` — `{ [key]: value }` — éditables via l'UI */
  missingInfoAnswers: Record<string, string> = {};

  get steps(): EditableStep[] {
    const arr = (this.proposal?.steps || []) as EditableStep[];
    // Default: all selected
    for (const s of arr) {
      if (s._selected === undefined) s._selected = true;
    }
    return arr;
  }

  get missingInfo(): AiPlanMissingInfo[] {
    return this.proposal?.missingInfo || [];
  }

  selectedCount(): number {
    return this.steps.filter(s => s._selected).length;
  }

  /** Empêche l'approbation tant que toutes les `missing_info` ne sont pas remplies. */
  canApprove(): boolean {
    for (const mi of this.missingInfo) {
      const v = this.missingInfoAnswers[mi.key];
      if (!v || !String(v).trim()) return false;
    }
    return true;
  }

  approve() {
    if (this.proposal?.answer) return;
    if (!this.canApprove()) return;
    const approvedSteps = this.steps.filter(s => s._selected).map(s => s.id);
    const hasMissing = this.missingInfo.length > 0;
    this.answered.emit({
      decision: 'approve',
      approvedSteps,
      ...(hasMissing ? { missingInfoAnswers: { ...this.missingInfoAnswers } } : {}),
    });
  }

  reject() {
    if (this.proposal?.answer) return;
    this.answered.emit({ decision: 'reject' });
  }

  startEditing() {
    for (const s of this.steps) {
      s._editTitle = s.title;
      s._editRationale = s.rationale || '';
    }
    this.editing = true;
  }

  cancelEdits() {
    this.editing = false;
  }

  saveEdits() {
    const modified: AiPlanStep[] = this.steps.map(s => ({
      id: s.id,
      title: s._editTitle || s.title,
      rationale: s._editRationale || s.rationale,
      tools: s.tools,
      duration_estimate: s.duration_estimate,
      dependsOn: s.dependsOn,
    }));
    this.editing = false;
    this.answered.emit({ decision: 'modify', modifiedSteps: modified });
  }

  answerLabel(): string {
    if (this.proposal.answer === 'approve') {
      const n = this.proposal.approvedSteps?.length || 0;
      const total = this.proposal.steps?.length || 0;
      if (n > 0 && n < total) return `Approuvé partiellement (${n}/${total})`;
      return 'Approuvé';
    }
    if (this.proposal.answer === 'modify') return 'Modifié';
    if (this.proposal.answer === 'reject') return 'Rejeté';
    return 'Répondu';
  }

  answerColor(): string {
    if (this.proposal.answer === 'approve') return 'green';
    if (this.proposal.answer === 'modify') return 'blue';
    return 'red';
  }

  answerIcon(): string {
    if (this.proposal.answer === 'approve') return 'check-circle';
    if (this.proposal.answer === 'modify') return 'edit';
    return 'close-circle';
  }
}
