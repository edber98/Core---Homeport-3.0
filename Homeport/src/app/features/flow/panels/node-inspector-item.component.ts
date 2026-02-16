import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MonacoJsonEditorComponent } from '../../dynamic-form/components/monaco-json-editor.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'node-inspector-item',
  standalone: true,
  imports: [CommonModule, MonacoJsonEditorComponent, NzButtonModule, NzToolTipModule],
  template: `
    <div class="meta">
      <div class="kv-list">
        <div class="kv"><span class="label">ID</span><span class="value mono">{{ model?.id }}</span></div>
        <div class="kv"><span class="label">Nom</span><span class="value mono">{{ model?.name }}</span></div>
        <div class="kv"><span class="label">Type</span><span class="value mono">{{ model?.templateObj?.type }}</span></div>
        <div class="kv"><span class="label">Template</span><span class="value mono">{{ model?.template }}</span></div>
        <div class="kv" *ngIf="nodeHasError"><span class="label">Erreurs</span><span class="value err">{{ nodeErrorText || 'Erreur sur ce nœud' }}</span></div>
      </div>
    </div>

    <div class="args" *ngIf="filledArgs && filledArgs.length > 0">
      <div class="args-title-row">
        <div class="args-title">Arguments renseignés</div>
        <div class="title-actions">
          <button nz-button nzSize="small" class="apple-btn icon-btn" nz-tooltip nzTooltipTitle="Voir en grand" type="button" (click)="openFilledModal.emit()" aria-label="Voir en grand">
            <i class="fa-solid fa-circle-info"></i>
          </button>
          <button nz-button nzSize="small" class="apple-btn icon-btn" nz-tooltip nzTooltipTitle="Voir en JSON" type="button" (click)="openFilledJson.emit()" aria-label="Voir en JSON">
            <i class="fa-solid fa-code"></i>
          </button>
        </div>
      </div>
      <div class="args-list">
        <div class="arg" *ngFor="let a of filledArgs">
          <span class="label">{{ a.label || a.key }}</span>
          <span class="value mono">{{ displayValue(a.value) }}</span>
        </div>
      </div>
    </div>

    <div class="args" *ngIf="usedArgs && usedArgs.length > 0">
      <div class="args-title-row">
        <div class="args-title">Arguments utilisés</div>
        <div class="title-actions">
          <button nz-button nzSize="small" class="apple-btn icon-btn" nz-tooltip nzTooltipTitle="Voir en grand" type="button" (click)="openUsedModal.emit()" aria-label="Voir en grand">
            <i class="fa-solid fa-circle-info"></i>
          </button>
          <button nz-button nzSize="small" class="apple-btn icon-btn" nz-tooltip nzTooltipTitle="Voir en JSON" type="button" (click)="openUsedJson.emit()" aria-label="Voir en JSON">
            <i class="fa-solid fa-code"></i>
          </button>
        </div>
      </div>
      <div class="args-list">
        <div class="arg" *ngFor="let a of usedArgs">
          <span class="label">{{ a.label || a.key }}</span>
          <span class="value mono">{{ displayValue(a.value) }}</span>
        </div>
      </div>
    </div>

    <div class="json-box slim" *ngIf="showJsonViewer">
      <monaco-json-editor [value]="editJson" [height]="220" [readonly]="true"></monaco-json-editor>
    </div>
  `,
  styles: [`
    .kv-list { display:flex; flex-direction:column; gap:6px; margin-top: 6px; padding:0; border-radius:10px; background:#ffffff; }
    .kv { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
    .label { color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
    .value { color:#111; font-size:12px; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align:right; }
    .value.err { color:#b42318; white-space:normal; }
    .args { margin-top: 14px; padding:8px; border-radius:10px; background:#f3f7ff; border:1px solid #e2e8f0; }
    .args-title-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:4px 6px 0; border-bottom:0; margin-bottom:6px; background:#f3f7ff; }
    .args-title { font-weight:700; font-size:12px; color:#111; }
    .args-list { display:flex; flex-direction:column; gap:0; padding:0 6px; }
    .arg { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; padding:6px 8px; border-bottom:1px dashed #f1f5f9; background:#ffffff; border-radius:0; }
    .arg:first-child { border-top-left-radius:6px; border-top-right-radius:6px; }
    .arg:last-child { border-bottom-left-radius:6px; border-bottom-right-radius:6px; border-bottom:0; }
    .arg:last-child { border-bottom:0; }
    .title-actions .icon-btn { width:26px; height:26px; padding:0; display:inline-flex; align-items:center; justify-content:center; }
    .title-actions { display:inline-flex; gap:6px; }
    .json-box.slim { border:1px solid #eef2f7; border-radius:10px; background:#ffffff; padding:8px; }
  `]
})
export class NodeInspectorItemComponent {
  @Input() model: any;
  @Input() filledArgs: Array<{ key: string; label: string; value: any }> = [];
  @Input() usedArgs: Array<{ key: string; label: string; value: any }> = [];
  @Input() showJsonViewer = false;
  @Input() editJson = '';
  @Input() nodeHasError = false;
  @Input() nodeErrorText: string | null = null;

  @Output() openFilledModal = new EventEmitter<void>();
  @Output() openFilledJson = new EventEmitter<void>();
  @Output() openUsedModal = new EventEmitter<void>();
  @Output() openUsedJson = new EventEmitter<void>();

  displayValue(v: any): string {
    try {
      if (v == null) return '—';
      if (typeof v === 'string') return v.trim().length ? v : '—';
      return JSON.stringify(v);
    } catch { return '—'; }
  }
}
