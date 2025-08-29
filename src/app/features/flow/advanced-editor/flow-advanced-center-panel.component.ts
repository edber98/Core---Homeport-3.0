import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { DynamicForm } from '../../../modules/dynamic-form/dynamic-form';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { CatalogService, AppProvider, CredentialSummary, CredentialDoc } from '../../../services/catalog.service';
import { AccessControlService } from '../../../services/access-control.service';
import { CredentialEditDialogComponent } from '../../credentials/credential-edit-dialog.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'flow-advanced-center-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTabsModule, NzSwitchModule, NzSelectModule, NzButtonModule, NzIconModule, NzBadgeModule, DynamicForm, CredentialEditDialogComponent],
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
              <div class="test-row">
                <button nz-button class="apple-btn" (click)="test.emit()" title="Tester ce nœud" [disabled]="testDisabled || disabled"><i class="fa-solid fa-play"></i> Tester</button>
                <nz-badge class="test-badge" [nzStatus]="testStatus === 'success' ? 'success' : (testStatus === 'error' ? 'error' : (testStatus === 'running' ? 'processing' : 'default'))"></nz-badge>
                <div class="test-meta" *ngIf="testStartedAt as t">
                  <span>{{ t | date:'shortTime' }}</span>
                  <span *ngIf="testDurationMs != null"> · {{ testDurationMs }} ms</span>
                </div>
              </div>
              <!-- Credentials selection (above form) -->
              <div class="cred-box" *ngIf="credVisible">
                <div class="title-row">
                  <div class="title">Identifiants</div>
                </div>
                <div class="subtitle-row" *ngIf="!allowWithout">Requis pour ce nœud</div>
                <div class="subtitle-row" *ngIf="allowWithout">Optionnel (peut s'exécuter sans)</div>
                <div class="control-row">
                  <nz-select class="cred-select" [ngClass]="{ error: credRequired && !selectedCredId }"
                    [(ngModel)]="selectedCredId" [nzAllowClear]="allowWithout"
                    [nzPlaceHolder]="allowWithout ? 'Aucun (optionnel)' : 'Sélectionner'" (ngModelChange)="onCredChange($event)">
                    <nz-option *ngFor="let c of credentials" [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
                  </nz-select>
                  <button nz-button class="apple-btn icon-only cred-add-btn" (click)="openCreateCred()" [disabled]="!currentProvider" nz-tooltip nzTooltipTitle="Nouveau">
                    <i nz-icon nzType="plus"></i>
                  </button>
                </div>
              </div>
              <credential-edit-dialog *ngIf="createVisible" [visible]="createVisible" [provider]="currentProvider" [workspaceId]="workspaceId" (closed)="createVisible=false" (saved)="onCredCreated($event)"></credential-edit-dialog>
              <ng-container *ngIf="schema as s; else noSchema">
                <app-dynamic-form *ngIf="dfVisible"
                  [schema]="s"
                  [value]="model?.context || {}"
                  [ctx]="ctx"
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
        <nz-tab *ngIf="(attemptEvents && attemptEvents.length)" nzTitle="Logs">
          <div class="settings-pane" style="gap: 6px;">
            <div *ngFor="let ev of attemptEventsSorted()" style="border:1px solid #ececec; border-radius:8px; padding:8px;">
              <div style="display:flex; align-items:baseline; gap:8px;">
                <div style="font-weight:600; font-size:12px; color:#111;">{{ ev.type }}</div>
                <div style="color:#6b7280; font-size:12px;">{{ ev.createdAt | date:'shortTime' }}</div>
              </div>
              <div style="margin-top:6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; color:#111;">
                {{ ev.status ? ('status: ' + ev.status) : '' }}
              </div>
              <div *ngIf="ev.data != null" style="margin-top:6px; font-size:12px; color:#374151; max-height: 160px; overflow:auto; background:#fafafa; border:1px dashed #eee; border-radius:6px; padding:6px;">
                {{ ev.data | json }}
              </div>
            </div>
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
    .test-row { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin: 0 0 8px; }
    .test-badge { margin-left: 8px; }
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
    .cred-box { border:0; border-radius:0; padding:6px 0 10px; margin: 4px 0 8px; background:transparent; }
    .cred-box .title-row { display:flex; align-items:baseline; gap:8px; margin-bottom:0; }
    .cred-box .title-row .title { font-weight:600; font-size:13px; color:#111; }
    .cred-box .subtitle-row { color:#8c8c8c; font-size:12px; margin: 2px 0 6px; }
    .cred-box .control-row { display:flex; align-items:center; gap:8px; }
    .cred-box .control-row .cred-select { flex: 1 1 auto; min-width: 0; }
    .cred-add-btn { display:inline-flex; align-items:center; justify-content:center; height: 32px; padding: 0 12px; border-radius: 6px; }
    .apple-btn.icon-only .label { display: none; }
    /* Error style when credentials required but missing */
    :host ::ng-deep .cred-select.error .ant-select-selector { border-color: #ff4d4f !important; box-shadow: 0 0 0 2px rgba(255,77,79,0.12) !important; }
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
  @Input() ctx: any = {};
  @Input() bare = false;
  @Input() disabled = false;
  @Input() disableReason: string | null = null;
  @Input() testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  @Input() testStartedAt: number | null = null;
  @Input() testDurationMs: number | null = null;
  @Input() testDisabled: boolean = false;
  @Input() attemptEvents: any[] = [];
  @Output() updateArgs = new EventEmitter<void>();
  @Output() test = new EventEmitter<void>();
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
  constructor(private cdr: ChangeDetectorRef, private zone: NgZone, private catalog: CatalogService, private acl: AccessControlService) {}

  // Credentials state
  credVisible = false;
  allowWithout = false;
  credRequired = false;
  currentProvider: AppProvider | null = null;
  credentials: CredentialSummary[] = [];
  selectedCredId: string | null = null;
  createVisible = false;
  workspaceId: string | null = null;

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
    // Refresh credentials UI based on provider
    this.refreshCredentialsState();
  }

  attemptEventsSorted(): any[] {
    try {
      const list = Array.isArray(this.attemptEvents) ? this.attemptEvents.slice() : [];
      list.sort((a: any, b: any) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime());
      return list;
    } catch { return Array.isArray(this.attemptEvents) ? this.attemptEvents : []; }
  }

  private refreshCredentialsState() {
    try {
      const tpl: any = this.model?.templateObj || {};
      const appId = String(tpl?.appId || tpl?.app?._id || '').trim();
      if (!appId) { this.credVisible = false; this.currentProvider = null; this.credentials = []; this.selectedCredId = null; return; }
      this.catalog.getApp(appId).subscribe(p => {
        this.currentProvider = p || null;
        const has = !!p?.hasCredentials;
        const provAllow = !!p?.allowWithoutCredentials;
        const tplAllow = !!tpl?.allowWithoutCredentials;
        this.allowWithout = provAllow || tplAllow;
        this.credRequired = has && !this.allowWithout;
        this.credVisible = has;
        if (!has) { this.credentials = []; this.selectedCredId = null; this.onCredChange(null); this.cdr.detectChanges(); return; }
        const ws = this.acl.currentWorkspaceId();
        this.workspaceId = ws || null;
        this.catalog.listCredentials(ws || undefined, appId).subscribe(list => {
          this.credentials = list || [];
          // Initialize from model if present
          const curr = String(this.model?.credentialId || '') || null;
          this.selectedCredId = curr && this.credentials.some(c => c.id === curr) ? curr : null;
          // Commit selection into model immediately (to reflect required state in validation)
          this.onCredChange(this.selectedCredId);
          try { this.cdr.detectChanges(); } catch {}
        });
      });
    } catch { this.credVisible = false; this.currentProvider = null; this.credentials = []; this.selectedCredId = null; }
  }

  onCredChange(id: string | null) {
    try {
      const m = { ...this.model, credentialId: id || null };
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
    } catch {}
  }

  openCreateCred() { if (this.currentProvider && this.workspaceId) this.createVisible = true; }
  onCredCreated(doc: CredentialDoc) {
    this.createVisible = false;
    // Refresh list and select the new one
    try {
      const appId = this.currentProvider?.id || '';
      if (!appId) return;
      const ws = this.workspaceId || undefined;
      this.catalog.listCredentials(ws, appId).subscribe(list => {
        this.credentials = list || [];
        this.selectedCredId = doc.id;
        this.onCredChange(doc.id);
        try { this.cdr.detectChanges(); } catch {}
      });
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
