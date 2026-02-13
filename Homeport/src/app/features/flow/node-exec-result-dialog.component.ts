import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ExecResultViewerComponent } from './exec-result-viewer.component';

@Component({
  selector: 'node-exec-result-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzTagModule, ExecResultViewerComponent],
  template: `
    <div class="nerd-overlay" (click)="close.emit()"></div>
    <div class="nerd-dialog" (click)="$event.stopPropagation()">
      <!-- Header -->
      <div class="nerd-header">
        <div class="nerd-title">{{ nodeTitle || 'Résultat' }}</div>
        <button class="nerd-close" (click)="close.emit()" aria-label="Fermer">&times;</button>
      </div>

      <!-- Execution selector (if multiple) -->
      <div class="nerd-toolbar" *ngIf="attempts.length > 1">
        <nz-select class="nerd-exec-select" [(ngModel)]="selectedIndex" (ngModelChange)="onSelectChange()" nzSize="small">
          <nz-option *ngFor="let a of attempts; let i = index"
            [nzValue]="i"
            [nzLabel]="'Exécution #' + (i + 1) + (a.status === 'error' ? ' (erreur)' : '')">
          </nz-option>
        </nz-select>
        <span class="nerd-duration" *ngIf="currentAttempt?.durationMs != null">{{ currentAttempt.durationMs }} ms</span>
      </div>

      <!-- Error banner -->
      <div class="nerd-error-banner" *ngIf="currentAttempt?.status === 'error'">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div class="nerd-error-text">{{ errorMessage }}</div>
      </div>

      <!-- Meta bar -->
      <div class="nerd-meta-bar">
        <nz-tag [nzColor]="currentAttempt?.status === 'success' ? 'green' : (currentAttempt?.status === 'error' ? 'red' : (currentAttempt?.status === 'cancelled' ? 'default' : 'blue'))">
          {{ statusLabel }}
        </nz-tag>
        <span class="nerd-dur" *ngIf="currentAttempt?.durationMs != null && attempts.length <= 1">{{ currentAttempt.durationMs }} ms</span>
        <span class="nerd-time" *ngIf="currentAttempt?.startedAt">{{ formatTime(currentAttempt.startedAt) }}</span>
        <span class="nerd-time-sep" *ngIf="currentAttempt?.startedAt && currentAttempt?.finishedAt">&rarr;</span>
        <span class="nerd-time" *ngIf="currentAttempt?.finishedAt">{{ formatTime(currentAttempt.finishedAt) }}</span>
      </div>

      <!-- Result body -->
      <div class="nerd-body">
        <exec-result-viewer
          [data]="resultData"
          [schema]="resolvedSchema">
        </exec-result-viewer>
      </div>
    </div>
  `,
  styles: [`
    .nerd-overlay {
      position: fixed; inset: 0; background: rgba(17,17,17,0.28); z-index: 8000;
    }
    .nerd-dialog {
      position: fixed; z-index: 8001;
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 92vw; max-width: 720px; max-height: 82vh;
      background: #fff; border-radius: 12px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .nerd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .nerd-title {
      font-weight: 600; font-size: 15px; color: #111827;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nerd-close {
      background: none; border: none; font-size: 22px; color: #9ca3af;
      cursor: pointer; padding: 0 4px; line-height: 1;
    }
    .nerd-close:hover { color: #374151; }

    .nerd-toolbar {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .nerd-exec-select { min-width: 180px; }
    .nerd-duration { font-size: 12px; color: #6b7280; }

    .nerd-error-banner {
      display: flex; align-items: flex-start; gap: 8px;
      background: #fef2f2; border-bottom: 1px solid #fecaca;
      padding: 10px 14px; color: #991b1b;
    }
    .nerd-error-banner i { color: #ef4444; margin-top: 2px; flex-shrink: 0; }
    .nerd-error-text {
      font-size: 13px; line-height: 1.45; word-break: break-word;
      white-space: pre-wrap; max-height: 120px; overflow-y: auto;
    }

    .nerd-meta-bar {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 16px; border-bottom: 1px solid #f0f0f0; font-size: 12px;
    }
    .nerd-dur { color: #6b7280; }
    .nerd-time { color: #6b7280; font-variant-numeric: tabular-nums; }
    .nerd-time-sep { color: #d1d5db; }

    .nerd-body {
      overflow-y: auto; flex: 1; padding: 12px 16px;
    }
  `]
})
export class NodeExecResultDialogComponent implements OnChanges {
  @Input() attempts: Array<{
    exec?: number; status?: string; startedAt?: string;
    finishedAt?: string; durationMs?: number; result?: any; input?: any;
    argsPre?: any; argsPost?: any; msgIn?: any; msgOut?: any
  }> = [];
  @Input() template: any = null;
  @Input() model: any = null;
  @Input() nodeTitle: string = '';
  @Output() close = new EventEmitter<void>();

  selectedIndex = 0;
  currentAttempt: any = null;
  errorMessage = '';
  statusLabel = '';
  resultData: any = null;
  resolvedSchema: any = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attempts']) {
      this.selectedIndex = Math.max(0, this.attempts.length - 1);
    }
    this.refresh();
  }

  onSelectChange() {
    this.refresh();
  }

  private refresh() {
    this.currentAttempt = this.attempts[this.selectedIndex] || null;
    this.resolvedSchema = this.resolveSchema();
    this.resultData = this.extractResultData();
    this.statusLabel = this.getStatusLabel();
    this.errorMessage = this.currentAttempt?.status === 'error'
      ? this.extractErrorMessage(this.currentAttempt?.result)
      : '';
  }

  private extractResultData(): any {
    const r = this.currentAttempt?.result;
    if (r == null) return null;
    // If result has an `ok` wrapper, extract useful data
    if (typeof r === 'object' && !Array.isArray(r)) {
      const { ok, error, _output, ...rest } = r;
      // If there's meaningful data beyond ok/error/_output, show it
      if (Object.keys(rest).length > 0) return rest;
      // If only ok/error, show the full result
      return r;
    }
    return r;
  }

  private resolveSchema(): any {
    const tpl = this.template;
    if (!tpl) return null;

    // 1. outputSchemas (map handle -> FormSchema)
    if (tpl.outputSchemas && typeof tpl.outputSchemas === 'object') {
      const keys = Object.keys(tpl.outputSchemas);
      if (keys.length) {
        const key = keys.find(k => k !== 'err' && k !== 'error') || keys[0];
        return tpl.outputSchemas[key];
      }
    }
    // 2. outputHandles[].schema
    if (Array.isArray(tpl.outputHandles)) {
      const h = tpl.outputHandles.find((h: any) => h?.schema && h.id !== 'err' && h.id !== 'error');
      if (h?.schema) return h.schema;
    }
    // 3. outputSchema (multi-output flat array)
    if (Array.isArray(tpl.outputSchema) && tpl.outputSchema.length) {
      return { fields: tpl.outputSchema.map((f: any) => ({ key: f.key, type: f.type || 'text', label: f.label || f.key })) };
    }
    // 4. output_schema_field (schema_builder dynamique)
    if (tpl.output_schema_field && this.model?.context) {
      const dyn = this.model.context[tpl.output_schema_field];
      if (dyn?.fields) return dyn;
      if (Array.isArray(dyn)) return { fields: dyn };
    }
    // 5. Fallback
    return null;
  }

  private extractErrorMessage(result: any): string {
    if (!result) return 'Erreur inconnue';
    if (typeof result === 'string') return result;
    if (result.error && typeof result.error === 'string') return result.error;
    if (result.message) return result.message;
    if (result.error?.message) return result.error.message;
    try { return JSON.stringify(result.error || result, null, 2); } catch { return String(result); }
  }

  private getStatusLabel(): string {
    switch (this.currentAttempt?.status) {
      case 'success': return 'Succès';
      case 'error': return 'Erreur';
      case 'cancelled': return 'Annulé';
      case 'running': return 'En cours';
      default: return this.currentAttempt?.status || 'Inconnu';
    }
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return iso || ''; }
  }
}
