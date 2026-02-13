import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
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
    <div class="nerd-dialog" [class.nerd-wide]="wideMode" (click)="$event.stopPropagation()">
      <!-- Header -->
      <div class="nerd-header">
        <div class="nerd-title-row">
          <div class="nerd-title">{{ nodeTitle || 'Résultat' }}</div>
          <div class="nerd-handle-name" *ngIf="outputHandleName">{{ outputHandleName }}</div>
        </div>
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
          [schema]="resolvedSchema"
          (hasTableContent)="onTableContentChange($event)">
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
      width: 94vw; max-width: 920px; max-height: 85vh;
      background: #fff; border-radius: 12px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden;
      transition: max-width 0.2s ease;
    }
    /* Wide mode for tables — use almost full viewport */
    .nerd-dialog.nerd-wide {
      max-width: 95vw;
    }
    @media (max-width: 600px) {
      .nerd-dialog, .nerd-dialog.nerd-wide {
        width: 100vw; max-width: 100vw; max-height: 100vh;
        border-radius: 0; top: 0; left: 0; transform: none;
        height: 100vh;
      }
    }
    @media (min-width: 601px) and (max-width: 1024px) {
      .nerd-dialog { width: 96vw; max-width: 880px; }
      .nerd-dialog.nerd-wide { max-width: 96vw; }
    }
    .nerd-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .nerd-title-row {
      display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;
    }
    .nerd-title {
      font-weight: 600; font-size: 15px; color: #111827;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nerd-handle-name {
      font-size: 12px; color: #6b7280; background: #f3f4f6; border-radius: 4px;
      padding: 1px 8px; white-space: nowrap; flex-shrink: 0;
    }
    .nerd-close {
      background: none; border: none; font-size: 22px; color: #9ca3af;
      cursor: pointer; padding: 0 4px; line-height: 1; flex-shrink: 0;
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
      -webkit-overflow-scrolling: touch;
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

  @HostListener('document:keydown.escape')
  onEscapeKey() { this.close.emit(); }

  selectedIndex = 0;
  currentAttempt: any = null;
  errorMessage = '';
  statusLabel = '';
  resultData: any = null;
  resolvedSchema: any = null;
  outputHandleName = '';
  wideMode = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['attempts']) {
      this.selectedIndex = Math.max(0, this.attempts.length - 1);
    }
    this.refresh();
  }

  onSelectChange() {
    this.refresh();
  }

  onTableContentChange(hasTables: boolean) {
    this.wideMode = hasTables;
  }

  private refresh() {
    this.currentAttempt = this.attempts[this.selectedIndex] || null;
    this.resultData = this.extractResultData();
    this.resolvedSchema = this.resolveSchema();
    this.statusLabel = this.getStatusLabel();
    this.errorMessage = this.currentAttempt?.status === 'error'
      ? this.extractErrorMessage(this.currentAttempt?.result)
      : '';
    try {
      console.log('[exec-result-dialog] refresh', {
        nodeTitle: this.nodeTitle,
        rawResult: this.currentAttempt?.result,
        resultData: this.resultData,
        resolvedSchema: this.resolvedSchema,
        template: this.template ? {
          outputSchemas: this.template.outputSchemas,
          outputHandles: this.template.outputHandles,
          outputSchema: this.template.outputSchema,
          output_schema_field: this.template.output_schema_field,
        } : null,
        modelContext: this.model?.context ? Object.keys(this.model.context) : null,
      });
    } catch {}
  }

  private extractResultData(): any {
    const r = this.currentAttempt?.result;
    if (r == null) return null;
    if (typeof r === 'object' && !Array.isArray(r)) {
      const { ok, error, _output, ...rest } = r;
      if (Object.keys(rest).length > 0) return rest;
      return r;
    }
    return r;
  }

  /**
   * Full schema resolution waterfall (matches node-settings-v2-dialog L760-827)
   * Uses result._output to pick the right handle-specific schema.
   */
  private resolveSchema(): any {
    const tpl = this.template;
    if (!tpl) { console.log('[exec-result-dialog] resolveSchema: no template'); return null; }

    // Determine which output handle was taken
    const rawResult = this.currentAttempt?.result;
    const outputHandle = (rawResult && typeof rawResult === 'object' && rawResult._output)
      ? String(rawResult._output) : null;

    // Build the full outputSchemas map (same waterfall as node-settings-v2-dialog)
    let outSchemas: Record<string, any> = {};
    let source = 'none';

    // 1. Direct outputSchemas on template
    if (tpl.outputSchemas && typeof tpl.outputSchemas === 'object' && Object.keys(tpl.outputSchemas).length) {
      outSchemas = tpl.outputSchemas;
      source = 'outputSchemas';
    }

    // 2. Fallback: build from outputHandles[].schema
    if (!Object.keys(outSchemas).length && Array.isArray(tpl.outputHandles)) {
      try {
        for (const h of tpl.outputHandles) {
          const hid = String(h?.id || 'out');
          if (h?.schema && typeof h.schema === 'object') outSchemas[hid] = h.schema;
        }
        if (Object.keys(outSchemas).length) source = 'outputHandles';
      } catch {}
    }

    // 3. Fallback: outputSchema flat array (multi-output functions)
    if (!Object.keys(outSchemas).length && Array.isArray(tpl.outputSchema) && tpl.outputSchema.length) {
      try {
        const fields = tpl.outputSchema.map((f: any) => ({
          key: f.key || f.name || '', type: f.type || 'text',
          label: f.label || f.title || f.key || ''
        }));
        outSchemas = { ok: { title: 'Sortie', fields } };
        source = 'outputSchema[]';
      } catch {}
    }

    // 4. Fallback: output_schema_field (dynamic schema from context, e.g. schema_builder)
    if (!Object.keys(outSchemas).length && tpl.output_schema_field) {
      if (this.model?.context) {
        try {
          const dynSchema = this.model.context[tpl.output_schema_field];
          let fields: any[] = [];
          if (dynSchema && typeof dynSchema === 'object' && Array.isArray(dynSchema.fields)) {
            fields = dynSchema.fields
              .filter((f: any) => f.key && f.type !== 'textblock')
              .map((f: any) => {
                // Preserve section_array / section(mode=array) with sub-fields
                if (f.type === 'section_array' || (f.type === 'section' && f.mode === 'array')) {
                  return { ...f, label: f.label || f.title || f.key };
                }
                if (f.type === 'section') return null;
                // Pass type as-is — the viewer handles all types natively
                return { key: f.key, type: f.type || 'text', label: f.label || f.title || f.key, options: f.options };
              })
              .filter(Boolean);
          } else if (Array.isArray(dynSchema)) {
            fields = dynSchema.map((f: any) => ({ key: f.key || '', type: f.type || 'text', label: f.label || f.title || f.key || '' }));
          }
          if (fields.length) {
            outSchemas = { ok: { title: 'Sortie', fields, ui: dynSchema?.ui } };
            source = 'output_schema_field';
          }
        } catch {}
      }
    }

    if (!Object.keys(outSchemas).length) {
      this.outputHandleName = '';
      return null;
    }

    // Pick the right schema based on _output handle
    let chosenKey: string;
    if (outputHandle && outSchemas[outputHandle]) {
      chosenKey = outputHandle;
    } else {
      const keys = Object.keys(outSchemas);
      chosenKey = keys.find(k => k !== 'err' && k !== 'error') || keys[0];
    }

    const schema = outSchemas[chosenKey];
    this.outputHandleName = this.resolveHandleName(chosenKey);

    console.log('[exec-result-dialog] resolveSchema: FINAL', {
      source, chosenKey,
      handleName: this.outputHandleName,
      schemaFields: schema?.fields?.map((f: any) => ({ key: f.key, label: f.label || f.title, type: f.type })),
    });

    return schema || null;
  }

  private resolveHandleName(handleId: string): string {
    if (!handleId || handleId === 'ok' || handleId === 'out') return '';
    if (Array.isArray(this.template?.outputHandles)) {
      const h = this.template.outputHandles.find((h: any) => String(h?.id) === handleId);
      if (h?.name) return h.name;
    }
    if (Array.isArray(this.template?.outputSchema)) {
      const item = this.template.outputSchema.find((f: any) => String(f?.key) === handleId || String(f?.id) === handleId);
      if (item?.label || item?.title) return item.label || item.title;
    }
    return handleId;
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
