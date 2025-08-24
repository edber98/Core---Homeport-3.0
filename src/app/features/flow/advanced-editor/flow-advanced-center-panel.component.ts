import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { DynamicForm } from '../../../modules/dynamic-form/dynamic-form';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'flow-advanced-center-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTabsModule, NzSwitchModule, DynamicForm],
  template: `
    <div class="card" [class.panel-card]="bare">
      <div class="tabs">
      <nz-tabset [nzTabPosition]="'top'">
        <nz-tab nzTitle="Personnalisation">
          <div class="tab-header">
            <div class="title">Personnaliser le nœud</div>
            <div class="actions">
              <button class="icon" (click)="undoForm()" [disabled]="!canUndoForm" title="Annuler"><i class="fa-solid fa-rotate-left"></i></button>
              <button class="icon" (click)="redoForm()" [disabled]="!canRedoForm" title="Rétablir"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
          </div>
          <div class="body">
            <div class="disabled-overlay" *ngIf="disabled"></div>
            <div class="disabled-banner" *ngIf="disabled">
              <div class="msg">{{ disableReason || 'Mise à jour du format requise' }}</div>
              <button class="update" (click)="updateArgs.emit()">Mettre à jour</button>
            </div>
            <div [class.dimmed]="disabled">
              <ng-container *ngIf="schema as s; else noSchema">
                <app-dynamic-form *ngIf="dfVisible"
                  [schema]="s"
                  [value]="model?.context || {}"
                  (valueChange)="onValue($event)"
                  (valueCommitted)="onValueCommitted($event)"
                  (validChange)="onValid($event)"
                  (submitted)="onSubmitted($event)">
                </app-dynamic-form>
              </ng-container>
              <ng-template #noSchema>
                <div class="placeholder">Aucun schéma d’arguments (template.args absent).</div>
              </ng-template>
            </div>
          </div>
        </nz-tab>
        <nz-tab nzTitle="Paramétrage">
          <div class="settings-pane">
            <div class="setting-row" *ngIf="model?.templateObj?.authorize_catch_error">
              <div class="left">
                <div class="label">Activer la sortie d’erreur</div>
                <div class="hint">Ajoute une sortie "Error" au nœud.</div>
              </div>
              <div class="right">
                <nz-switch [(ngModel)]="model.catch_error" (ngModelChange)="onToggleCatchError($event)"></nz-switch>
              </div>
            </div>
            <div class="setting-row" *ngIf="model?.templateObj?.authorize_skip_error">
              <div class="left">
                <div class="label">Ignorer les erreurs (skip)</div>
                <div class="hint">N’exécute pas la branche erreur; continue si erreur.</div>
              </div>
              <div class="right">
                <nz-switch [(ngModel)]="model.skip_error"
                  [nzDisabled]="!!model?.catch_error"
                  (ngModelChange)="onToggleSkipError($event)"></nz-switch>
              </div>
            </div>
            <div class="placeholder" *ngIf="!model?.templateObj?.authorize_catch_error && !model?.templateObj?.authorize_skip_error">Aucun paramètre disponible.</div>
          </div>
        </nz-tab>
      </nz-tabset>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .card { position:relative; background:#fff; border:1px solid #ececec; border-radius:14px; box-shadow:0 20px 40px rgba(0,0,0,.12); width: var(--dialog-w, 960px); max-width: 100vw; padding: 0 0 16px; height:var(--dialog-h, 68vh); max-height:90vh; display:flex; flex-direction:column; }
    /* Bare variant: no border, radius, or shadow; fills container */
    .card.panel-card { width:100%; height:100%; max-height:none; border:0; border-radius:0; box-shadow:none; background:transparent; padding:0; }
    .tabs { flex:1 1 auto; min-height:0; display:flex; }
    .tab-header { display:flex; align-items:center; justify-content:space-between; padding: 8px 12px 0 12px; }
    .tab-header .title { font-weight:600; font-size:13px; color:#111; }
    .tab-header .actions { display:flex; gap:6px; }
    .tab-header .icon { background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; cursor:pointer; }
    .tab-header .icon[disabled] { color:#bbb; border-color:#eee; background:#fafafa; cursor:not-allowed; }
    .body { padding: 12px 16px; flex:1 1 auto; overflow:auto; padding-top: 0px }
    .body { position: relative; }
    .dimmed { opacity: .6; pointer-events: none; }
    .disabled-overlay { position:absolute; inset:0; background:transparent; z-index: 2; }
    .disabled-banner { position:absolute; right:12px; top:8px; z-index:3; display:flex; align-items:center; gap:8px; background:#fff7ed; color:#b45309; border:1px solid #fdba74; padding:6px 8px; border-radius: 8px; }
    .disabled-banner .update { background:#111; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
    .panel-card .body { padding: 0; }
    .settings-pane { padding: 12px 16px; height: 100%; display:flex; flex-direction:column; gap:12px; }
    .setting-row { display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #ececec; border-radius:10px; padding:10px 12px; }
    .setting-row .label { font-weight:600; font-size:13px; color:#111; }
    .setting-row .hint { color:#8c8c8c; font-size:12px; }
    .placeholder { color:#8c8c8c; font-size:12px; padding:8px; }
    /* Make tabs fill available height and allow inner scrolling */
    :host ::ng-deep .tabs .ant-tabs { display:flex; flex-direction:column; width:100%; height:100%; }
    :host ::ng-deep .tabs .ant-tabs-content-holder { flex:1 1 auto; min-height:0; }
    :host ::ng-deep .tabs .ant-tabs-content { height:100%; }
    :host ::ng-deep .tabs .ant-tabs-tabpane { height:100%; overflow:auto; }
    @media (max-width: 768px) {
      .card.panel-card { overflow:auto; padding: 0 9px 9px; }
    }
  `]
})
export class FlowAdvancedCenterPanelComponent {
  @Input() model: any = {};
  @Input() bare = false;
  @Input() disabled = false;
  @Input() disableReason: string | null = null;
  @Output() updateArgs = new EventEmitter<void>();
  @Output() modelChange = new EventEmitter<any>();
  @Output() submitted = new EventEmitter<any>();
  @Output() committed = new EventEmitter<any>();
  // Derived schema from template
  get schema() { return this.model?.templateObj?.args || null; }
  private formPast: any[] = [];
  private formFuture: any[] = [];
  private applying = false;
  private lastJson = '';
  private commitTimer: any = null;
  private pendingContext: any = null;

  private lastModelId: string | null = null;
  private lastTemplateSig: string | null = null;
  dfVisible = true;
  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnChanges() {
    // Reset local form history only when switching node/template (not on each context patch)
    const id = this.model?.id || null;
    // Include checksum/featureSig to properly reset after template update
    const t = this.model?.templateObj;
    const checksum = (this.model as any)?.templateChecksum || '';
    const feat = (this.model as any)?.templateFeatureSig || '';
    const tmplSig = t ? `${String(t.id || t.type || '')}:${checksum}:${feat}` : null;
    const needReset = (this.lastModelId == null) || (id !== this.lastModelId) || (tmplSig !== this.lastTemplateSig);
    this.lastModelId = id;
    this.lastTemplateSig = tmplSig;
    if (!needReset) return;
    try {
      const init = this.model?.context || {};
      this.formPast = [JSON.parse(JSON.stringify(init))];
      this.formFuture = [];
      this.lastJson = JSON.stringify(init);
    } catch { this.formPast = [{}]; this.formFuture = []; this.lastJson = '{}'; }
    // Force destroy/recreate of DynamicForm to reset validators + status
    try {
      this.dfVisible = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.zone.run(() => {
          this.dfVisible = true;
          try { this.cdr.detectChanges(); } catch {}
        });
      }, 0);
    } catch {}
  }

  onValue(v: Record<string, any>) {
    // Live preview without recording history; commit happens on valueCommitted/pointerup/submit
    this.pendingContext = v;
    if (this.applying) return;
    try {
      const m = { ...this.model, context: JSON.parse(JSON.stringify(v || {})) };
      this.model = m;
      this.modelChange.emit(m);
    } catch {}
  }
  onValid(valid: boolean) {
    // Mettre à jour l'état local d'invalidité sans notifier le parent (évite des reconciliations inutiles)
    const m = { ...this.model, invalid: !valid };
    this.model = m;
    // Ne pas émettre modelChange ici pour éviter des effets de bord (edges supprimés) à l'ouverture
  }
  get canUndoForm() { return this.formPast.length > 1; }
  get canRedoForm() { return this.formFuture.length > 0; }
  undoForm() {
    if (!this.canUndoForm) return;
    const current = this.formPast.pop();
    if (!current) return;
    const prev = this.formPast[this.formPast.length - 1];
    this.formFuture.push(current);
    this.applyForm(prev);
  }
  redoForm() {
    if (!this.canRedoForm) return;
    const next = this.formFuture.pop();
    if (!next) return;
    this.formPast.push(JSON.parse(JSON.stringify(next)));
    this.applyForm(next);
  }
  private applyForm(v: any) {
    this.applying = true;
    try {
      const m = { ...this.model, context: JSON.parse(JSON.stringify(v || {})) };
      this.model = m;
      this.lastJson = JSON.stringify(m.context || {});
      this.modelChange.emit(m);
    } finally {
      setTimeout(() => (this.applying = false));
    }
  }

  // No debounced auto-commit; commit only on valueCommitted/pointerup/submit
  private commitNow() {
    if (this.commitTimer) { clearTimeout(this.commitTimer); this.commitTimer = null; }
    const v = this.pendingContext != null ? this.pendingContext : (this.model?.context || {});
    this.pendingContext = null;
    try {
      const json = JSON.stringify(v || {});
      if (json === this.lastJson) return;
      if (!this.applying) {
        this.formPast.push(JSON.parse(json));
        this.formFuture = [];
      }
      this.lastJson = json;
      const m = { ...this.model, context: v };
      this.model = m;
      this.modelChange.emit(m);
    } catch {}
  }

  onValueCommitted(v: any) {
    // Flush immediately when dynamic-form signals a commit (blur/submit)
    this.pendingContext = v;
    this.commitNow();
    try { this.committed.emit(this.model); } catch {}
  }

  onSubmitted(v: any) {
    // Flush pending changes and commit immediately on submit
    this.pendingContext = v;
    this.commitNow();
    this.submitted.emit(this.model);
  }

  // Optional: flush on pointer release to approximate "when user releases input"
  // Fallback flush: still flush on pointer up if a debounce is pending
  @HostListener('document:pointerup')
  onPointerUp() { if (this.commitTimer) this.commitNow(); }

  // Paramétrage actions
  onToggleCatchError(val: boolean) {
    try {
      // Enabling catch disables skip to respect mutual exclusivity
      const m = { ...this.model, catch_error: !!val, skip_error: !!val ? false : (this.model?.skip_error || false) };
      this.model = m;
      this.modelChange.emit(m);
    } catch {}
  }

  onToggleSkipError(val: boolean) {
    try {
      // Skip can only be enabled if catch is off; ensure it stays off
      const canEnable = !this.model?.catch_error;
      const m = { ...this.model, skip_error: canEnable ? !!val : false };
      this.model = m;
      this.modelChange.emit(m);
    } catch {}
  }
}
