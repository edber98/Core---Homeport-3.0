import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, ChangeDetectorRef, NgZone, SimpleChanges, OnDestroy } from '@angular/core';
import { DynamicForm } from '../../../modules/dynamic-form/dynamic-form';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CatalogService, AppProvider, CredentialSummary, CredentialDoc, FormSummary, FormDoc } from '../../../services/catalog.service';
import { Router } from '@angular/router';
import { AccessControlService } from '../../../services/access-control.service';
import { CredentialEditDialogComponent } from '../../credentials/credential-edit-dialog.component';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'flow-advanced-center-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTabsModule, NzSwitchModule, NzSelectModule, NzButtonModule, NzInputModule, NzIconModule, NzBadgeModule, DynamicForm, CredentialEditDialogComponent],
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
              <!-- Start Form configuration (only for Start Form template) -->
              <div class="start-form-box" *ngIf="isStartForm(model)" style="padding:6px 0 10px; margin: 8px 0 12px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap: wrap;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-weight:600; font-size:13px;">Formulaire de démarrage</div>
                    <nz-switch [(ngModel)]="model.startFormEnabled" (ngModelChange)="startFormEnabled = $event"></nz-switch>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <button nz-button nzSize="small" class="apple-btn" (click)="openFormBuilder()" [disabled]="!startFormEnabled"><i class="fa-regular fa-pen-to-square"></i> Éditer le formulaire</button>
                    <label style="display:flex; align-items:center; gap:6px;">
                      <span class="muted">Public</span>
                      <nz-switch [(ngModel)]="model.startFormPublic" (ngModelChange)="startFormPublic = $event" [nzDisabled]="!startFormEnabled"></nz-switch>
                    </label>
                  </div>
                </div>
                <div class="start-form-import" *ngIf="startFormEnabled">
                  <div class="row">
                    <div class="label">Ou choisir un formulaire existant</div>
                    <button nz-button nzSize="small" class="apple-btn icon-only" (click)="loadForms()" [disabled]="formsLoading" nz-tooltip nzTooltipTitle="Actualiser">
                      <i nz-icon nzType="reload"></i>
                    </button>
                  </div>
                  <div class="row">
                    <nz-select
                      class="form-select start-form-select-trigger"
                      [(ngModel)]="selectedFormId"
                      [nzShowSearch]="!useNativeSelect"
                      nzAllowClear
                      nzPlaceHolder="Sélectionner un formulaire"
                      [nzServerSearch]="!useNativeSelect"
                      [nzPlacement]="formSelectPlacement"
                      [nzDropdownClassName]="'in-advanced-editor start-form-select-dropdown'"
                      [nzDropdownStyle]="{ zIndex: '200010' }"
                      [nzOpen]="formSelectOpen"
                      [nzLoading]="formsLoading || formsLoadingMore"
                      (nzOpenChange)="onFormSelectOpenChange($event)"
                      (nzOnSearch)="onFormSearch($event)"
                      (nzScrollToBottom)="onFormsSelectScrollToBottom()">
                      <nz-option *ngFor="let f of forms; trackBy: trackForm" [nzValue]="f.id" [nzLabel]="f.name"></nz-option>
                    </nz-select>
                    <button nz-button nzSize="small" class="apple-btn" (click)="applySelectedForm()" [disabled]="!selectedFormId || formsLoading">
                      Importer
                    </button>
                  </div>
                  <div class="hint">Importer remplace le formulaire actuel.</div>
                </div>
                <div *ngIf="startFormEnabled && flowId" style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                  <input nz-input [readonly]="true" [value]="formUrl || ''" placeholder="URL publique" style="flex:1 1 auto; min-width: 260px;" />
                  <button nz-button nzSize="small" class="apple-btn" (click)="copyFormUrl()" [disabled]="!formUrl">Copier</button>
                </div>
              </div>
              <div class="test-row">
                <button nz-button class="apple-btn" (click)="test.emit()" title="Tester ce nœud" [disabled]="testDisabled || disabled"><i class="fa-solid fa-play"></i> Tester</button>
                <div class="right-controls">
                  <span class="attempt-name" *ngIf="attemptName() as an">{{ an }}</span>
                  <nz-badge class="test-badge" [nzStatus]="testStatus === 'success' ? 'success' : (testStatus === 'error' ? 'error' : (testStatus === 'running' ? 'processing' : 'default'))"></nz-badge>
                  <div class="test-meta" *ngIf="(testStartedAt != null) || (testDurationMs != null)">
                    <span *ngIf="testStartedAt as t">{{ t | date:'shortTime' }}</span>
                    <span *ngIf="testDurationMs != null"> <ng-container *ngIf="testStartedAt != null">· </ng-container>{{ testDurationMs }} ms</span>
                  </div>
                  <div class="attempt-selects" *ngIf="attemptOptions?.length">
                    <ng-container *ngIf="useNativeSelect; else attemptDesktop">
                      <select class="wf-native-select attempt"
                        [ngModel]="selectedAttemptIdx"
                        (ngModelChange)="onAttemptChange($event)">
                        <option [ngValue]="null">Tentative</option>
                        <option *ngFor="let op of attemptOptions; trackBy: trackAttempt" [ngValue]="op.idx">{{ op.label }}</option>
                      </select>
                    </ng-container>
                    <ng-template #attemptDesktop>
                      <nz-select class="attempt" [ngModel]="selectedAttemptIdx" (ngModelChange)="selectedAttemptIdxChange.emit($event)" nzPlaceHolder="Tentative">
                        <nz-option *ngFor="let op of attemptOptions; trackBy: trackAttempt" [nzValue]="op.idx" [nzLabel]="op.label"></nz-option>
                      </nz-select>
                    </ng-template>
                  </div>
                </div>
              </div>
              <!-- Description (node-level, above credentials) -->
              <div class="desc-box">
                <div class="title-row">
                  <div class="title">Description</div>
                </div>
                <textarea nz-input class="desc-text"
                          [ngModel]="model?.description || ''"
                          (ngModelChange)="onDescChange($event)"
                          rows="3"
                          placeholder="Décrire ce nœud (but, détails)…"></textarea>
              </div>

              <!-- Credentials selection (above form) -->
              <div class="cred-box" *ngIf="credVisible">
                <div class="title-row">
                  <div class="title">Identifiants</div>
                </div>
                <div class="subtitle-row" *ngIf="!allowWithout">Requis pour ce nœud</div>
                <div class="subtitle-row" *ngIf="allowWithout">Optionnel (peut s'exécuter sans)</div>
                <div class="control-row">
                  <ng-container *ngIf="useNativeSelect; else credSelectDesktop">
                    <select class="wf-native-select cred-select" [ngClass]="{ error: credRequired && !selectedCredId }"
                      [ngModel]="selectedCredId"
                      (ngModelChange)="onCredChange($event)">
                      <option *ngIf="allowWithout" [ngValue]="null">Aucun (optionnel)</option>
                      <option *ngIf="!allowWithout" [ngValue]="null" disabled>Sélectionner</option>
                      <option *ngFor="let c of credentials" [ngValue]="c.id">{{ c.name }}</option>
                    </select>
                  </ng-container>
                  <ng-template #credSelectDesktop>
                    <nz-select class="cred-select" [ngClass]="{ error: credRequired && !selectedCredId }"
                      [(ngModel)]="selectedCredId" [nzAllowClear]="allowWithout"
                      [nzPlaceHolder]="allowWithout ? 'Aucun (optionnel)' : 'Sélectionner'" (ngModelChange)="onCredChange($event)"
                      [nzDropdownStyle]="{ zIndex: '200010' }" [nzDropdownClassName]="'in-advanced-editor'" nzShowSearch>
                      <nz-option *ngFor="let c of credentials" [nzValue]="c.id" [nzLabel]="c.name"></nz-option>
                    </nz-select>
                  </ng-template>
                  <button nz-button class="apple-btn icon-only cred-add-btn" (click)="openCreateCred()" [disabled]="!currentProvider" nz-tooltip nzTooltipTitle="Nouveau">
                    <i nz-icon nzType="plus"></i>
                  </button>
                </div>
              </div>
              <credential-edit-dialog *ngIf="createVisible" [visible]="createVisible" [provider]="currentProvider" [workspaceId]="workspaceId" (closed)="createVisible=false" (saved)="onCredCreated($event)"></credential-edit-dialog>
              <ng-container  *ngIf="schema as s; else noSchema">
              <div style="overflow-x:hidden">
              <app-dynamic-form  *ngIf="dfVisible"
                  [schema]="s"
                  [value]="model?.context || {}"
                  [ctx]="resolverCtx"
                  [nativeSelectOnMobile]="false"
                  [hideActions]="true"
                  (valueChange)="onValue($event)"
                  (valueCommitted)="onValueCommitted($event)"
                  (validChange)="onValid($event)"
                  (submitted)="onSubmitted($event)">
                </app-dynamic-form>
                </div> 
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
            <!-- Afficher plus de 3 lignes pour la description -->
            <div class="setting-row">
              <div class="left">
                <div class="label">Afficher toute la description</div>
                <div class="hint">Par défaut, 3 lignes maximum avec ellipses.</div>
              </div>
              <div class="right">
                <nz-switch [(ngModel)]="model.expand_description" (ngModelChange)="onToggleExpandDescription($event)"></nz-switch>
              </div>
            </div>
            <!-- Masquer la description sur la carte -->
            <div class="setting-row">
              <div class="left">
                <div class="label">Masquer la description</div>
                <div class="hint">N’affiche pas la description sur la carte du nœud.</div>
              </div>
              <div class="right">
                <nz-switch [(ngModel)]="model.hide_description" (ngModelChange)="onToggleHideDescription($event)"></nz-switch>
              </div>
            </div>
            <div class="placeholder" *ngIf="!model?.templateObj?.authorize_catch_error && !model?.templateObj?.authorize_skip_error">Aucun paramètre disponible.</div>
          </div>
        </nz-tab>
        <!-- Assistant AI tab removed — use the unified AI panel (drawer) instead -->
        <nz-tab *ngIf="(attemptEvents && attemptEvents.length)" nzTitle="Logs">
          <div class="settings-pane" style="gap: 6px;">
            <div *ngFor="let ev of attemptEventsView; trackBy: trackEvent" style="border:1px solid #ececec; border-radius:8px; padding:8px;">
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
    .tab-header { display:flex; align-items:center; justify-content:space-between; padding: 8px 0 0; }
    .tab-header .title { font-weight:600; font-size:13px; color:#111; }
    .tab-header .actions { display:flex; gap:6px; }
    .tab-header .icon { background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; cursor:pointer; }
    .tab-header .icon[disabled] { color:#bbb; border-color:#eee; background:#fafafa; cursor:not-allowed; }
    .body { padding: 12px 16px; flex:1 1 auto; overflow:auto; padding-top: 0px }
    .test-row { display:flex; align-items:center; justify-content:flex-start; gap:8px; margin: 0 0 8px; padding-top: 8px; }
    .test-row .right-controls { display:flex; align-items:center; gap:8px; margin-left:auto; }
    .test-row .attempt-selects { display:flex; align-items:center; gap:6px; }
    .test-row .attempt-selects .attempt { min-width: 156px; }
    .test-row .attempt-name { color:#6b7280; font-size:12px; }
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
    /* Description section (node-level) */
    .desc-box { border:0; border-radius:0; padding:6px 0 10px; margin: 4px 0 8px; background:transparent; }
    .desc-box .title-row { display:flex; align-items:baseline; gap:8px; margin-bottom:4px; }
    .desc-box .title-row .title { font-weight:600; font-size:13px; color:#111; }
    .desc-box .desc-text { width:100%; min-height: 64px; resize: vertical; }
    .start-form-import { margin-top: 10px; padding: 8px 10px; border: 1px dashed #e5e7eb; border-radius: 10px; background: #fafafa; display:flex; flex-direction:column; gap:6px; }
    .start-form-import .row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .start-form-import .label { font-weight:600; font-size:12px; color:#111; }
    .start-form-import .hint { font-size:12px; color:#6b7280; }
    .start-form-import .form-select { flex: 1 1 auto; min-width: 0; }
    .wf-native-select {
      width: 100%;
      height: 32px;
      border: 1px solid #cfd8e6;
      border-radius: 10px;
      padding: 0 30px 0 10px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.2;
      color: #0f172a;
      background: #fff;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(15, 23, 42, 0.05);
      background-image:
        linear-gradient(45deg, transparent 50%, #64748b 50%),
        linear-gradient(135deg, #64748b 50%, transparent 50%);
      background-position:
        calc(100% - 13px) calc(50% - 2px),
        calc(100% - 8px) calc(50% - 2px);
      background-size: 5px 5px, 5px 5px;
      background-repeat: no-repeat;
      transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease, transform .1s ease, color .18s ease;
    }
    .wf-native-select:hover {
      border-color: #e61982;
      background: #fff;
      box-shadow: 0 2px 6px rgba(230, 25, 130, 0.15);
    }
    .wf-native-select:focus {
      border-color: #e61982;
      box-shadow: 0 0 0 2px rgba(230, 25, 130, 0.15);
      background: #fff;
      color: #0958d9;
    }
    .wf-native-select:active { transform: translateY(1px); }
    .wf-native-select option {
      font-size: 12px;
      font-weight: 500;
      color: #0f172a;
      background: #fff;
    }
    .wf-native-select option:checked {
      color: #0958d9;
      background: #e6f4ff;
    }
    .wf-native-select option[disabled] { color: #94a3b8; }
    .wf-native-select.error {
      border-color: #ff4d4f;
      box-shadow: 0 0 0 2px rgba(255,77,79,0.12);
    }
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
export class FlowAdvancedCenterPanelComponent implements OnDestroy {
  @Input() model: any = {};
  @Input() ctx: any = {};
  @Input() flowId: string | null = null;

  /** ctx enrichi avec flowId/nodeId pour les fields type 'resolver' qui appellent le backend. */
  get resolverCtx(): any {
    return { ...(this.ctx || {}), flowId: this.flowId, nodeId: this.model?.id };
  }
  @Input() bare = false;
  @Input() simScenarios: Array<{ id: string; index: number; label: string; msgIn: any; match?: { exec?: boolean; handleId?: string; handleLabel?: string } }>|null = null;
  @Input() simSelectedIndex: number = 0;
  @Input() disabled = false;
  @Input() disableReason: string | null = null;
  @Input() testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  @Input() testStartedAt: number | null = null;
  @Input() testDurationMs: number | null = null;
  @Input() testDisabled: boolean = false;
  @Input() attemptEvents: any[] = [];
  // Attempt selection controls (from parent)
  @Input() attemptOptions: Array<{ idx: number; exec: number; occur: number; label: string }> = [];
  @Input() selectedAttemptIdx: number | null = null;
  @Output() selectedAttemptIdxChange = new EventEmitter<number>();
  @Input() attemptExecs: Array<{ exec: number; count: number }> = [];
  @Input() selectedExec: number | null = null;
  @Input() selectedExecCount: number | null = null;
  @Input() selectedOccurIndex: number | null = null;
  @Output() selectedExecChange = new EventEmitter<number>();
  @Output() selectedOccurIndexChange = new EventEmitter<number>();
  // View models to avoid per-CD array re-creation
  attemptEventsView: any[] = [];
  @Output() updateArgs = new EventEmitter<void>();
  @Output() test = new EventEmitter<void>();
  @Output() modelChange = new EventEmitter<any>();
  @Output() submitted = new EventEmitter<any>();
  @Output() committed = new EventEmitter<any>();
  // Derived schema from template (unchanged)
  get schema() { return this.model?.templateObj?.args || null; }
  private formPast: any[] = [];
  private formFuture: any[] = [];
  private applying = false;
  private lastJson = '';
  private commitTimer: any = null;
  private pendingContext: any = null;
  forms: FormSummary[] = [];
  formsLoading = false;
  formsLoadingMore = false;
  formsHasMore = false;
  selectedFormId: string | null = null;
  useNativeSelect = false;
  formSelectPlacement: 'topLeft' | 'bottomLeft' | null = null;
  formSelectOpen = false;
  private readonly formsPageSize = 15;
  private readonly formsSearchDebounceMs = 350;
  private formsPage = 0;
  private formsQuery = '';
  private formsLoadTicket = 0;
  private formsSearchInput$ = new Subject<string>();
  private formsSearchSub?: Subscription;

  private lastModelId: string | null = null;
  private lastTemplateSig: string | null = null;
  dfVisible = true;
  constructor(private cdr: ChangeDetectorRef, private zone: NgZone, private catalog: CatalogService, private acl: AccessControlService, private router: Router, private msg: NzMessageService) {
    this.updateSelectMode();
    this.formsSearchSub = this.formsSearchInput$
      .pipe(debounceTime(this.formsSearchDebounceMs), distinctUntilChanged())
      .subscribe((value) => {
        this.formsQuery = String(value || '').trim();
        this.loadForms(false);
      });
  }

  ngOnDestroy(): void {
    try { this.formsSearchSub?.unsubscribe(); } catch {}
  }

  @HostListener('window:resize')
  onWindowResize() { this.updateSelectMode(); }

  private updateSelectMode() {
    try {
      const width = window.innerWidth || 0;
      this.useNativeSelect = false;
      if (width <= 768) this.formSelectPlacement = 'topLeft';
      else if (width <= 1023) this.formSelectPlacement = 'bottomLeft';
      else this.formSelectPlacement = null;
    } catch {
      this.useNativeSelect = false;
      this.formSelectPlacement = null;
    }
  }

  // Credentials state
  credVisible = false;
  allowWithout = false;
  credRequired = false;
  currentProvider: AppProvider | null = null;
  credentials: CredentialSummary[] = [];
  selectedCredId: string | null = null;
  createVisible = false;
  workspaceId: string | null = null;
  // Expose global Object for template usages like Object.keys
  Object = Object;

  ngOnChanges(changes: SimpleChanges) {
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
    if (needReset) {
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
    if (needReset && this.isStartForm(this.model)) {
      this.formsQuery = '';
      this.loadForms(false);
    }
    // Always refresh logs view when attemptEvents changes (even without node/template reset)
    try {
      if (changes && (changes as any)['ctx']) {
        const keys = Object.keys(this.ctx || {});
        console.log('[center-panel] ctx changed', { keys });
      }
    } catch {}
    if ('attemptEvents' in changes) {
      try {
        if (Array.isArray(this.attemptEvents)) {
          const copy = this.attemptEvents.slice();
          copy.sort((a: any, b: any) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime());
          this.attemptEventsView = copy;
        } else {
          this.attemptEventsView = [];
        }
      } catch { this.attemptEventsView = []; }
    }
    // Refresh computed URL for Start-Form settings and sync schema text
    try { this._computedFormUrl = this.computeFormUrl(); } catch {}
    try { this.syncSchemaTextFromModel(); } catch {}
  }
  isStart(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start'; } catch { return false; } }
  isStartForm(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start_form'; } catch { return false; } }
  private _computedFormUrl: string | null = null;
  computeFormUrl(): string | null {
    try {
      // Allow public URL for both 'start' and 'start_form'
      if (!(this.isStart(this.model) || this.isStartForm(this.model))) return null;
      const fid = this.flowId || '';
      const nid = String(this.model?.id || '');
      if (!fid || !nid) return null;
      const origin = window.location.origin.replace(/\/$/, '');
      return `${origin}/public/form/${encodeURIComponent(fid)}/${encodeURIComponent(nid)}`;
    } catch { return null; }
  }
  get formUrl(): string | null { return this._computedFormUrl; }
  get startFormEnabled(): boolean { try { return !!this.model?.startFormEnabled; } catch { return false; } }
  set startFormEnabled(v: boolean) { this.patchModel({ startFormEnabled: !!v }); }
  get startFormPublic(): boolean { try { return !!this.model?.startFormPublic; } catch { return false; } }
  set startFormPublic(v: boolean) { this.patchModel({ startFormPublic: !!v }); }
  startFormSchemaText = '';
  private syncSchemaTextFromModel() {
    try {
      const s = (this.model && (this.model.startFormSchema != null)) ? this.model.startFormSchema : (this.model?.context?.startFormSchema);
      this.startFormSchemaText = s ? JSON.stringify(s, null, 2) : '{\n  "title": "Formulaire",\n  "fields": []\n}';
    } catch { this.startFormSchemaText = '{\n  "title": "Formulaire",\n  "fields": []\n}'; }
  }
  onSchemaTextChange(v: string) { this.startFormSchemaText = v || ''; }
  applySchemaText() {
    try {
      const parsed = JSON.parse(this.startFormSchemaText || '{}');
      this.patchModel({ startFormSchema: parsed });
    } catch { /* ignore parse errors; user sees raw text */ }
  }
  private patchModel(patch: any) {
    try {
      const m = { ...this.model, ...patch };
      this.model = m;
      this.modelChange.emit(m);
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }
  lastAppliedArgs?: { prev: any; next: any };
  lastAppliedDesc?: { prev: string|null; next: string };

  onAssistantApplyArgs(args: any) {
    try {
      const v = args && typeof args === 'object' ? JSON.parse(JSON.stringify(args)) : {};
      const prev = (this.model?.context && typeof this.model.context === 'object') ? JSON.parse(JSON.stringify(this.model.context)) : {};
      this.lastAppliedArgs = { prev, next: v };
      const hist = Array.isArray((this.model as any).aiArgsHistory) ? ((this.model as any).aiArgsHistory as any[]).slice() : [];
      hist.push({ id: 'h' + Date.now().toString(36), ts: Date.now(), by: 'ai-args', prev, next: v, threadId: this.model?.aiChatThreadId || null });
      while (hist.length > 20) hist.shift();
      const m = { ...this.model, context: v, aiArgsHistory: hist } as any;
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
      try { this.msg.success('Arguments appliqués'); } catch {}
      try { this.cdr.detectChanges(); } catch {}
      // chat message is appended by the chat component
    } catch {}
  }

  undoApplyArgs() {
    try {
      const last = this.lastAppliedArgs; if (!last) return;
      const m = { ...this.model, context: JSON.parse(JSON.stringify(last.prev || {})) } as any;
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
      this.lastAppliedArgs = undefined;
      try { this.msg.info('Chargement annulé (arguments)'); } catch {}
      try { this.cdr.detectChanges(); } catch {}
      // chat message is appended by the chat component
    } catch {}
  }

  restoreArgsSnapshot(item: any) {
    try {
      if (!item || !item.next) return;
      const ok = window.confirm('Restaurer ces arguments depuis l\'historique ?');
      if (!ok) return;
      const v = JSON.parse(JSON.stringify(item.next || {}));
      const m = { ...this.model, context: v } as any;
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
      try { this.msg.success('Arguments restaurés'); } catch {}
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  onAssistantApplyDesc(text: string) {
    try {
      const prev = String(this.model?.description || '') || '';
      this.lastAppliedDesc = { prev, next: text };
      const m = { ...this.model, description: text } as any;
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
      try { this.msg.success('Description appliquée'); } catch {}
      try { this.cdr.detectChanges(); } catch {}
      // chat message is appended by the chat component
    } catch {}
  }

  undoApplyDesc() {
    try {
      const last = this.lastAppliedDesc; if (!last) return;
      const m = { ...this.model, description: last.prev || '' } as any;
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
      this.lastAppliedDesc = undefined;
      try { this.msg.info('Chargement annulé (description)'); } catch {}
      try { this.cdr.detectChanges(); } catch {}
      // chat message is appended by the chat component
    } catch {}
  }
  copyFormUrl() { try { const url = this.formUrl || ''; if (!url) return; (window.navigator as any)?.clipboard?.writeText?.(url); } catch {} }
  openFormBuilder() {
    try {
      const sess = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const init = (this.model && this.model.context && (this.model.context.fields || this.model.context.steps))
        ? this.model.context
        : ((this.model && (this.model.startFormSchema != null))
          ? this.model.startFormSchema
          : (this.model?.templateObj?.args || { title: 'Formulaire', ui: { layout: 'vertical', labelsOnTop: true }, fields: [] }));
      try { console.log('[center-panel] openFormBuilder', { session: sess, flowId: this.flowId, nodeId: this.model?.id, initSource: (this.model?.context && (this.model.context.fields || this.model.context.steps)) ? 'context' : (this.model?.startFormSchema ? 'startFormSchema' : 'templateArgs') }); } catch {}
      try { localStorage.setItem('formbuilder.session.' + sess, JSON.stringify(init)); } catch {}
      const flow = this.flowId || '';
      const node = String(this.model?.id || '');
      // Remember last session for this node as a resilience fallback if URL param is lost on return
      try { if (node) localStorage.setItem('formbuilder.lastSessionForNode.' + node, sess); } catch {}
      const returnTo = this.router.createUrlTree(['/flow-builder/editor'], { queryParams: { flow, node, fbSession: sess } }).toString();
      const query: any = { session: sess, return: returnTo, tplPreset: '1' };
      try { query.schema = JSON.stringify(init); } catch {}
      this.router.navigate(['/dynamic-form'], { queryParams: query });
    } catch {}
  }
  onFormSearch(value: string) {
    this.formsSearchInput$.next(value || '');
  }

  onFormSelectOpenChange(open: boolean) {
    this.formSelectOpen = !!open;
  }

  onFormsSelectScrollToBottom() {
    this.loadForms(true);
  }

  loadForms(append = false) {
    if (append && (this.formsLoading || this.formsLoadingMore || !this.formsHasMore)) return;

    const wsId = this.acl.currentWorkspaceId();
    if (!wsId) {
      if (!append) {
        this.forms = [];
        this.formsPage = 0;
        this.formsHasMore = false;
      }
      this.formsLoading = false;
      this.formsLoadingMore = false;
      return;
    }

    const ticket = ++this.formsLoadTicket;
    const page = append ? (this.formsPage + 1) : 1;

    if (append) {
      this.formsLoadingMore = true;
    } else {
      this.formsLoading = true;
      this.formsLoadingMore = false;
      this.formsPage = 0;
      this.formsHasMore = false;
      this.forms = [];
    }

    if (environment.useBackend) {
      this.catalog.listFormsPage(wsId, {
        page,
        limit: this.formsPageSize,
        q: this.formsQuery || undefined,
      }).subscribe({
        next: (list) => {
          if (ticket !== this.formsLoadTicket) return;
          const items = Array.isArray(list) ? list : [];
          this.forms = append ? this.mergeFormPage(this.forms, items) : items;
          this.formsPage = page;
          this.formsHasMore = items.length === this.formsPageSize;
        },
        error: () => {
          if (ticket !== this.formsLoadTicket) return;
          if (!append) this.forms = [];
          this.formsHasMore = false;
        },
        complete: () => {
          if (ticket !== this.formsLoadTicket) return;
          this.formsLoading = false;
          this.formsLoadingMore = false;
          try { this.cdr.detectChanges(); } catch {}
        }
      });
      return;
    }

    this.catalog.listForms(wsId).subscribe({
      next: (list) => {
        if (ticket !== this.formsLoadTicket) return;
        const all = Array.isArray(list) ? list : [];
        let accessible = all;
        try {
          accessible = all.filter(f => {
            const w = this.acl.ensureResourceWorkspace('form', f.id);
            return w === wsId && this.acl.canAccessWorkspace(w);
          });
        } catch {}
        const q = this.formsQuery.toLowerCase();
        const filtered = q
          ? accessible.filter(f => `${String(f?.name || '')} ${String(f?.description || '')}`.toLowerCase().includes(q))
          : accessible;
        const start = (page - 1) * this.formsPageSize;
        const slice = filtered.slice(start, start + this.formsPageSize);
        this.forms = append ? this.mergeFormPage(this.forms, slice) : slice;
        this.formsPage = page;
        this.formsHasMore = (start + slice.length) < filtered.length;
      },
      error: () => {
        if (ticket !== this.formsLoadTicket) return;
        if (!append) this.forms = [];
        this.formsHasMore = false;
      },
      complete: () => {
        if (ticket !== this.formsLoadTicket) return;
        this.formsLoading = false;
        this.formsLoadingMore = false;
        try { this.cdr.detectChanges(); } catch {}
      }
    });
  }

  private mergeFormPage(current: FormSummary[], incoming: FormSummary[]): FormSummary[] {
    const seen = new Set((current || []).map(f => String(f?.id || '')));
    const merged = [...(current || [])];
    for (const item of (incoming || [])) {
      const id = String(item?.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      merged.push(item);
    }
    return merged;
  }
  applySelectedForm() {
    const id = this.selectedFormId;
    if (!id) { try { this.msg.warning('Sélectionnez un formulaire d\'abord'); } catch {} return; }
    try { console.log('[center-panel] applySelectedForm: fetching', id); } catch {}
    this.catalog.getForm(id).subscribe({
      next: (doc: FormDoc) => {
        const schema = (doc as any)?.schema || { title: doc?.name || 'Formulaire', fields: [] };
        // Store imported form under startFormSchema (source of truth)
        // Clear context if it currently holds a schema, so preview binds to startFormSchema
        const m: any = this.model || {};
        const isCtxSchema = !!(m?.context && (Array.isArray(m.context?.fields) || Array.isArray(m.context?.steps)));
        this.patchModel({ startFormSchema: schema, startFormEnabled: true, startFormAppliedAt: Date.now(), context: isCtxSchema ? {} : (m.context || {}) });
        try { console.log('[center-panel] applySelectedForm: applied', { fields: Array.isArray(schema?.fields) ? schema.fields.length : null, steps: Array.isArray(schema?.steps) ? schema.steps.length : null, clearedContext: isCtxSchema }); } catch {}
        try { this.msg.success('Formulaire importé'); } catch {}
        try { this.cdr.detectChanges(); } catch {}
      },
      error: () => { try { this.msg.error('Échec de l\'import'); } catch {} }
    });
  }
  trackForm(i: number, f: FormSummary) { return f?.id || i; }
  trackIdx(i: number, v: number) { return v; }

  trackEvent(i: number, ev: any) { try { return ev?.createdAt + ':' + (ev?.type || '') + ':' + (ev?.exec ?? '') + ':' + (ev?.nodeId || '') + ':' + i; } catch { return i; } }
  trackAttempt(i: number, op: any) { try { return op?.idx ?? i; } catch { return i; } }

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

  attemptName(): string | null {
    try {
      const idx = this.selectedAttemptIdx;
      const op = (Array.isArray(this.attemptOptions) ? this.attemptOptions.find(o => o.idx === idx) : null) || null;
      if (!op) return null;
      if (Number(op.exec) === -1) return `Tentative #${op.occur + 1} (Standalone)`;
      const hasMany = (this.attemptOptions || []).some(o => o.exec === op.exec && o.idx !== op.idx);
      return hasMany ? `Tentative #${op.occur + 1}` : `Tentative #1`;
    } catch { return null; }
  }

  onAttemptChange(v: any) {
    if (v == null || v === '') return;
    const next = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(next)) return;
    this.selectedAttemptIdxChange.emit(next);
  }

  onCredChange(id: string | null) {
    try {
      const m = { ...this.model, credentialId: id || null };
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
    } catch {}
  }

  onDescChange(text: string) {
    try {
      const m = { ...this.model, description: text };
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
    } catch {}
  }

  openCreateCred() { if (this.currentProvider && this.workspaceId) this.createVisible = true; }
  onCredCreated(doc: CredentialDoc) {
    this.createVisible = false;
    // Optimistic select: insert into local list and bind immediately
    try {
      const created: CredentialSummary = { id: String(doc.id), name: String(doc.name || ''), providerId: String(doc.providerId || ''), workspaceId: String(doc.workspaceId || '') };
      const exists = (this.credentials || []).some(c => String(c.id) === String(created.id));
      if (!exists) this.credentials = [created, ...(this.credentials || [])];
      this.selectedCredId = created.id;
      this.onCredChange(created.id);
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
    // Then refresh list from backend to ensure consistency (keep selection)
    try {
      const appId = this.currentProvider?.id || '';
      if (!appId) return;
      const ws = this.workspaceId || undefined;
      this.catalog.listCredentials(ws, appId).subscribe(list => {
        this.credentials = list || [];
        // preserve selection if still present
        const sel = this.selectedCredId;
        if (sel && !this.credentials.some(c => String(c.id) === String(sel))) {
          // If not present (rare), append a minimal option to keep UI stable
          this.credentials = [{ id: sel, name: doc.name || sel, providerId: doc.providerId, workspaceId: doc.workspaceId }, ...this.credentials];
        }
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
  @HostListener('document:pointerup', ['$event'])
  onPointerUp(event?: Event) {
    if (this.commitTimer) this.commitNow();
    this.closeFormSelectIfOutside(event);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: Event) {
    this.closeFormSelectIfOutside(event);
  }

  private closeFormSelectIfOutside(event?: Event) {
    try {
      if (!this.formSelectOpen) return;
      const target = event?.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.start-form-select-trigger')) return;
      if (target.closest('.start-form-select-dropdown')) return;
      this.formSelectOpen = false;
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

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

  onToggleHideDescription(val: boolean) {
    try {
      const m = { ...this.model, hide_description: !!val };
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
    } catch {}
  }

  onToggleExpandDescription(val: boolean) {
    try {
      const m = { ...this.model, expand_description: !!val };
      this.model = m;
      this.modelChange.emit(m);
      this.committed.emit(m);
    } catch {}
  }

  // Link callback from Assistant AI tab
  onNodeAssistantLinked(ev: { threadId: string|null; type?: string } | null) {
    try {
      if (!ev || !ev.threadId) return;
      const patch: any = { aiChatThreadId: ev.threadId };
      if (ev.type) patch.aiChatType = ev.type;
      this.patchModel(patch);
      try { this.committed.emit(this.model); } catch {}
    } catch {}
  }

}
