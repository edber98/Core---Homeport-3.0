import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { MonacoJsonEditorComponent } from '../../features/dynamic-form/components/monaco-json-editor.component';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { CatalogService, NodeTemplate } from '../../services/catalog.service';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'node-template-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzSwitchModule, NzCheckboxModule, NzButtonModule, NzIconModule, NzToolTipModule, NzAutocompleteModule,
    MonacoJsonEditorComponent, DragDropModule, NzDrawerModule, DynamicForm
  ],
  template: `
  <div class="tpl-editor">
    <div class="header">
      <div class="left">
        <button type="button" class="icon-btn back" (click)="cancel()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left">
          <span class="t">Template</span>
          <span class="s">{{ form?.value?.title || form?.value?.name || 'Nouveau' }}</span>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="icon-ghost" (click)="save()" [disabled]="form.invalid || saving" aria-label="Enregistrer">
          <i nz-icon nzType="save"></i>
        </button>
      </div>
    </div>

    <form [formGroup]="form" class="form" nz-form nzLayout="vertical">
      <div class="grid cols-2">
        <nz-form-item>
          <nz-form-label>Nom</nz-form-label>
          <nz-form-control><input nz-input formControlName="name" placeholder="Ex: SendMail"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Type</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="type" [nzShowSearch]="true" nzAllowClear>
              <nz-option nzValue="function" nzLabel="function"></nz-option>
              <nz-option nzValue="condition" nzLabel="condition"></nz-option>
              <nz-option nzValue="start" nzLabel="start"></nz-option>
              <nz-option nzValue="event" nzLabel="event"></nz-option>
              <nz-option nzValue="endpoint" nzLabel="endpoint"></nz-option>
              <nz-option nzValue="loop" nzLabel="loop"></nz-option>
              <nz-option nzValue="end" nzLabel="end"></nz-option>
              <nz-option nzValue="flow" nzLabel="flow"></nz-option>
              <nz-option nzValue="agent" nzLabel="agent"></nz-option>
              <nz-option nzValue="tool_ai" nzLabel="tool_ai"></nz-option>
              <nz-option nzValue="memory" nzLabel="memory"></nz-option>
              <nz-option nzValue="router" nzLabel="router"></nz-option>
              <nz-option nzValue="choice" nzLabel="choice"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Catégorie</nz-form-label>
          <nz-form-control><input nz-input formControlName="category" placeholder="Ex: Core, HTTP"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Groupe</nz-form-label>
          <nz-form-control><input nz-input formControlName="group" placeholder="Ex: Functions"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>App / Logiciel</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="appId" nzAllowClear nzPlaceHolder="Ex: gmail">
              <nz-option *ngFor="let a of apps" [nzValue]="a.id" [nzLabel]="a.title || a.name"></nz-option>
            </nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Description</nz-form-label>
          <nz-form-control><input nz-input formControlName="description" placeholder="Brève description"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Tags</nz-form-label>
          <nz-form-control>
            <nz-select formControlName="tags" nzMode="tags" nzPlaceHolder="Mots-clés"></nz-select>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Icône (classe FA)</nz-form-label>
          <nz-form-control>
            <input nz-input formControlName="icon" [nzAutocomplete]="autoIcon" placeholder="fa-solid fa-bolt"/>
            <nz-autocomplete #autoIcon>
              <nz-auto-option *ngFor="let opt of iconOptions" [nzValue]="opt">{{ opt }}</nz-auto-option>
            </nz-autocomplete>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Icône (URL)</nz-form-label>
          <nz-form-control>
            <input nz-input formControlName="iconUrl" placeholder="https://.../icon.svg"/>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Aperçu</nz-form-label>
          <nz-form-control>
            <div class="icon" style="width:36px;height:36px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e5e7eb;">
              <img *ngIf="form.value.iconUrl" [src]="form.value.iconUrl" alt="icon" style="width:22px;height:22px;object-fit:contain;"/>
              <i *ngIf="!form.value.iconUrl && form.value.icon" [class]="form.value.icon" style="font-size:18px;color:#64748b;"></i>
            </div>
          </nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Titre</nz-form-label>
          <nz-form-control><input nz-input formControlName="title" placeholder="Ex: Send mail"/></nz-form-control>
        </nz-form-item>
        <nz-form-item>
          <nz-form-label>Sous-titre</nz-form-label>
          <nz-form-control><input nz-input formControlName="subtitle" placeholder="Ex: Gmail"/></nz-form-control>
        </nz-form-item>
      </div>

      <!-- Function-specific options (legacy v1 outputs kept for back-compat UI, but v2 handles sont recommandés) -->
      <div class="grid cols-2" *ngIf="form.get('type')?.value==='function'">
        <div>
          <div class="sub-header">
            <div class="card-title left"><span class="t">Options (function)</span><span class="s">Sorties, erreurs, identifiants</span></div>
          </div>
          <nz-form-item>
            <nz-form-control>
              <label nz-checkbox formControlName="authorize_catch_error" nz-tooltip="Autoriser le catch d'erreur (branche err)">Autoriser catch error</label>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-control>
              <label nz-checkbox formControlName="authorize_skip_error" nz-tooltip="Autoriser l'option de saut d'erreur (skip)">Autoriser skip error</label>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-control>
              <label nz-checkbox formControlName="allow_without_credentials"
                nz-tooltip="Si le Provider a des identifiants mais qu'ils peuvent être facultatifs, cocher pour autoriser l'exécution sans credentials.">Autoriser sans credentials</label>
            </nz-form-control>
          </nz-form-item>
        </div>
        <div>
          <div class="sub-header">
            <div class="card-title left"><span class="t">Sorties (v1, obsolète)</span><span class="s">Préférez les handles v2 ci-dessous</span></div>
          </div>
          <div class="outputs" cdkDropList (cdkDropListDropped)="dropOutput($event)">
            <div class="row" *ngFor="let ctrl of outputs.controls; let i=index" [formGroup]="ctrl" cdkDrag>
              <span class="drag" cdkDragHandle>⋮⋮</span>
              <input nz-input formControlName="value" placeholder="Ex: Success"/>
              <button nz-button nzDanger (click)="removeOutput(i)"><i nz-icon nzType="delete"></i></button>
            </div>
            <button nz-button class="apple-btn" (click)="addOutput()"><i nz-icon nzType="plus"></i><span class="label">Ajouter une sortie</span></button>
          </div>
        </div>
      </div>

      <!-- v2 Handles Editor -->
      <div class="ins-section-header" *ngIf="form.get('type')?.value!=='condition'">
        <div class="card-title"><span class="t">Handles v2</span><span class="s">Entrées / Sorties typées</span></div>
      </div>
      <div class="grid cols-1" *ngIf="form.get('type')?.value!=='condition'">
        <div class="full-line">
          <div class="sub-header"><div class="card-title left"><span class="t">Entrées</span><span class="s">inputHandles</span></div></div>
          <div class="outputs">
            <div class="row" *ngFor="let ctrl of inputHandles.controls; let i=index" [formGroup]="ctrl">
              <div class="row-top">
                <div class="row-fields">
                  <input nz-input formControlName="id" placeholder="id (ex: in, tools)"/>
                  <input nz-input formControlName="name" placeholder="Nom"/>
                  <nz-select formControlName="type" [nzOptions]="knownTypeOptions" nzAllowClear nzShowSearch></nz-select>
                  <label nz-checkbox formControlName="multiple" nz-tooltip="Autoriser plusieurs connexions entrantes vers ce handle">multiple</label>
                </div>
                <div class="row-actions">
                  <button nz-button nzDanger (click)="removeInputHandle(i)" nz-tooltip="Supprimer"><i nz-icon nzType="delete"></i></button>
                </div>
              </div>
            </div>
            <button nz-button class="apple-btn" (click)="addInputHandle()"><i nz-icon nzType="plus"></i><span class="label">Ajouter une entrée</span></button>
          </div>
        </div>
        <div class="full-line">
          <div class="sub-header"><div class="card-title left"><span class="t">Sorties</span><span class="s">outputHandles</span></div></div>
          <div class="outputs">
            <div class="row" *ngFor="let ctrl of outputHandles.controls; let i=index" [formGroup]="ctrl">
              <div class="row-top">
                <div class="row-fields">
                  <input nz-input formControlName="id" placeholder="id (ex: ok, memory)"/>
                  <input nz-input formControlName="name" placeholder="Nom"/>
                  <nz-select formControlName="type" [nzOptions]="knownTypeOptions" nzAllowClear nzShowSearch></nz-select>
                  <label nz-checkbox formControlName="multiple" nz-tooltip="Autoriser plusieurs connexions sortantes depuis ce handle">multiple</label>
                </div>
                <div class="row-actions">
                  <button nz-button type="button" (click)="toggleOutRow(i)" nz-tooltip="Voir le schéma"><i nz-icon nzType="eye"></i></button>
                  <button nz-button type="button" (click)="selectOutHandleByIndex(i); openOutputFormBuilderRoute(); $event.preventDefault(); $event.stopPropagation();" nz-tooltip="Configurer le schéma"><i nz-icon nzType="form"></i></button>
                  <button nz-button nzDanger (click)="removeOutputHandle(i)" nz-tooltip="Supprimer"><i nz-icon nzType="delete"></i></button>
                </div>
              </div>
              <div class="out-row-preview" *ngIf="isOutRowOpen(i)">
                <div class="args-controls">
                  <label nz-checkbox [(ngModel)]="rowShowJson[i]" [ngModelOptions]="{standalone: true}" nz-tooltip="Afficher/masquer l’éditeur JSON">Afficher JSON (Monaco)</label>
                </div>
                <div class="args-row" [class.json-visible]="rowShowJson[i] === true">
                  <div class="preview-col">
                    <div class="dialog-preview">
                      <div class="dialog-box">
                        <ng-container *ngIf="outSchemaReady">
                          <ng-container *ngIf="isFormSchema(getOutSchemaObjAt(i)); else outInvalidSchema">
                            <app-dynamic-form [schema]="getOutSchemaObjAt(i)" [value]="{}" [forceBp]="'xs'" [hideActions]="true" [disableExpressions]="true"></app-dynamic-form>
                          </ng-container>
                          <ng-template #outInvalidSchema>
                            <div class="schema-hint">Le JSON ne ressemble pas à un schéma de formulaire (fields/steps). Corrigez ou utilisez le Form Builder.</div>
                          </ng-template>
                        </ng-container>
                      </div>
                    </div>
                  </div>
                  <div class="json-col" *ngIf="rowShowJson[i] === true">
                    <monaco-json-editor class="json" [value]="getOutSchemaJsonAt(i)" (valueChange)="onOutSchemaChangeAt(i, $event)" [height]="220"></monaco-json-editor>
                  </div>
                </div>
              </div>
            </div>
            <button nz-button class="apple-btn" (click)="addOutputHandle()"><i nz-icon nzType="plus"></i><span class="label">Ajouter une sortie</span></button>
          </div>
        </div>
      </div>

      <!-- Linked Handles (cibles) -->
      <div class="ins-section-header" *ngIf="form.get('type')?.value!=='condition'">
        <div class="card-title"><span class="t">Linked Handles</span><span class="s">Cibles typées (ex: Tools, Memory)</span></div>
      </div>
      <div class="grid cols-1" *ngIf="form.get('type')?.value!=='condition'">
        <div>
          <div class="outputs">
            <div class="row" *ngFor="let ctrl of linkedHandles.controls; let i=index" [formGroup]="ctrl">
              <div class="row-top">
                <div class="row-fields">
                  <input nz-input formControlName="id" placeholder="id (ex: tools)"/>
                  <input nz-input formControlName="name" placeholder="Nom"/>
                  <nz-select formControlName="type" [nzOptions]="knownTypeOptions" nzAllowClear nzShowSearch></nz-select>
                  <label nz-checkbox formControlName="multiple" nz-tooltip="Autoriser plusieurs liens vers cette cible (link handle)">multiple</label>
                </div>
                <div class="row-actions"><button nz-button nzDanger (click)="removeLinkedHandle(i)" nz-tooltip="Supprimer"><i nz-icon nzType="delete"></i></button></div>
              </div>
            </div>
            <button nz-button class="apple-btn" (click)="addLinkedHandle()"><i nz-icon nzType="plus"></i><span class="label">Ajouter un link</span></button>
          </div>
        </div>
      </div>

      <!-- Condition-specific options -->
      <div class="ins-section-header" *ngIf="form.get('type')?.value==='condition'">
        <div class="card-title"><span class="t">Options (condition)</span><span class="s">Champ des branchements</span></div>
      </div>
      <div class="grid cols-2" *ngIf="form.get('type')?.value==='condition'">
        <nz-form-item class="span-2">
          <nz-form-label nzTooltipTitle="Champ du tableau dans args qui contient les items (ex: items)">output_array_field</nz-form-label>
          <nz-form-control><input nz-input formControlName="output_array_field" placeholder="items"/></nz-form-control>
        </nz-form-item>
      </div>

      <!-- Arguments (JSON) -->
      <div class="ins-section-header args">
        <div class="card-title"><span class="t">Arguments</span><span class="s">Configuration spécifique</span></div>
      </div>
      <div class="args-controls">
        <label nz-checkbox formControlName="fb_preset_tpl" nz-tooltip="Vertical + colonnes 24 + expressions activées par défaut">Appliquer preset (Form Builder)</label>
        <label nz-checkbox formControlName="show_args_json" nz-tooltip="Afficher/masquer l’éditeur JSON">Afficher JSON (Monaco)</label>
        <span class="spacer"></span>
        <button nz-button type="button" class="apple-btn" (click)="openFormBuilderRoute(); $event.preventDefault(); $event.stopPropagation();"><i nz-icon nzType="form"></i><span class="label">Form Builder…</span></button>
      </div>
      <div class="args-row" [class.json-visible]="form.get('show_args_json')?.value === true">
        <div class="preview-col">
          <div class="dialog-preview">
            <div class="dialog-box">
              <ng-container *ngIf="argsReady; else argsLoadingTpl">
                <ng-container *ngIf="isFormSchema(argsObj); else invalidSchema">
                  <app-dynamic-form [schema]="argsObj" [value]="{}" [forceBp]="'xs'"></app-dynamic-form>
                </ng-container>
                <ng-template #invalidSchema>
                  <div class="schema-hint">Le JSON ne ressemble pas à un schéma de formulaire (fields/steps). Corrigez ou utilisez le Form Builder.</div>
                </ng-template>
              </ng-container>
              <ng-template #argsLoadingTpl>
                <div class="schema-loading">Chargement…</div>
              </ng-template>
            </div>
          </div>
        </div>
        <div class="json-col" *ngIf="form.get('show_args_json')?.value">
          <monaco-json-editor class="json" [value]="argsJson" (valueChange)="onArgsChange($event)" [height]="220"></monaco-json-editor>
        </div>
      </div>
    </form>
    <!-- Full-screen builder route preferred over drawer for space; kept route button above -->
  </div>
  `,
  styles: [`
    .tpl-editor { padding: 12px; max-width: 1080px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; }
    .header .left { display:flex; align-items:left; gap:0px; }
    .header .actions { display:flex; gap:8px; }
    .card-title, .ts { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .card-title.left { align-items:flex-start; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .icon-btn.back:hover { background:#f3f4f6; }
    .icon-ghost { border:0; background:transparent; padding:6px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; color:#111; cursor:pointer; }
    .icon-ghost[disabled] { opacity:.5; cursor:not-allowed; }
    .icon-ghost:hover { background:#f5f5f5; }
    .ins-section-header { display:flex; justify-content:center; padding:6px 0 8px; margin:12px 0 8px; border-bottom:1px solid #E2E1E4; }
    .ins-section-header.args { margin-top: 18px; }
    .sub-header { display:flex; align-items:flex-end; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
    .form { display:block; }
    .grid { display:grid; gap:8px; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid.cols-1 { grid-template-columns: 1fr; }
    .grid .span-2 { grid-column: span 2; }
    .full-line { grid-column: 1 / -1; }
    @media (max-width: 960px) { .grid.cols-2 { grid-template-columns: 1fr; } }
    .outputs { display:flex; flex-direction:column; gap:10px; }
    .outputs .row { display:block; padding:10px 12px; border-radius:8px; border: 0 !important; background: transparent !important; box-shadow: none !important; transition: none !important; }
    .outputs .row:hover { background: transparent !important; }
    .outputs .row .row-top { display:flex; gap:10px; align-items:center; }
    .outputs .row .row-fields { display:grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap:10px; align-items:center; flex:1; }
    .outputs .row .row-actions { display:flex; gap:8px; align-items:center; }
    .out-row-preview { margin-top: 6px; }
    .outputs .drag { cursor: grab; color:#94a3b8; user-select:none; padding:0 4px; }
    /* Drag animations */
    :host ::ng-deep .cdk-drag-animating { transition: transform 180ms cubic-bezier(0.2, 0, 0, 1); }
    :host ::ng-deep .cdk-drag-preview { box-shadow: 0 10px 24px rgba(0,0,0,0.18); border-radius: 10px; }
    :host ::ng-deep .cdk-drag-placeholder { opacity: .35; border:1px dashed #cbd5e1; border-radius:8px; }
    /* Buttons hover/animation */
    .apple-btn { transition: background 160ms ease; }
    .apple-btn:hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
    /* Apply gradient to all NZ buttons in this view */
    :host ::ng-deep button[nz-button], :host ::ng-deep .ant-btn { transition: background 160ms ease; }
    :host ::ng-deep button[nz-button]:hover, :host ::ng-deep .ant-btn:hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
    .args-controls { display:flex; align-items:center; gap:12px; margin: 8px 0 10px; flex-wrap: wrap; }
    .args-controls .spacer { flex: 1 1 auto; }
    .args-row { display:grid; grid-template-columns: 1fr auto; gap:12px; align-items:flex-start; }
    .args-row.json-visible { grid-template-columns: 1fr 1fr; }
    .args-row .preview-col { min-width: 0; }
    .args-row .json-col { min-width: 0; }
    .args-row .json { width: 100%; max-width: 100%; }
    .args-row .actions { display:flex; flex-direction:column; gap:8px; min-width: 220px; }
    /* Simulated dialog like flow-builder */
    .dialog-preview { display:flex; justify-content:center; padding: 6px 0; }
    .dialog-box { max-width: 400px; width: 100%; background:#fff; border-right:1px solid #e5e7eb; border-left:1px solid #e5e7eb; padding:12px; }
    .schema-loading { color:#6b7280; font-size: 12px; padding: 8px 0; }
    .schema-hint { color:#6b7280; font-size: 12px; padding: 8px 0; }
    .json-visible .dialog-box { max-width: 100%; }
    @media (max-width: 1024px) {
      .args-row { grid-template-columns: 1fr; }
    }
    .fb-drawer { display:flex; flex-direction:column; height:100%; }
    .fb-header { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #ececec; }
  `]
})
export class NodeTemplateEditorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  argsJson = '{\n  \n}';
  fbVisible = false;
  fbSchema: any = { title: 'Arguments', fields: [] };
  argsReady = false;
  private _parsedArgsCache: any = null;
  private _parsedArgsSig = '';
  // Output schemas editing state
  selectedOutIndex: number = -1;
  outSchemaReady = true;
  showOutJson = false;
  rowShowJson: Record<number, boolean> = {};
  private _openOutRows = new Set<number>();
  showOutSection = false;
  private _parsedOutSig = '';
  private _parsedOutCache: any = null;
  // Pending returns from Form Builder for output handles (when handles not yet loaded)
  private _pendingOutSchemas: Map<number, string> = new Map();
  private _pendingOutSessions: Map<number, string> = new Map();
  // Embed form builder state
  // duplicate declarations removed
  iconOptions: string[] = [
    'fa-solid fa-bolt', 'fa-solid fa-play', 'fa-solid fa-envelope', 'fa-solid fa-cloud', 'fa-solid fa-database',
    'fa-solid fa-code-branch', 'fa-solid fa-sync', 'fa-solid fa-sliders', 'fa-solid fa-gear', 'fa-solid fa-message'
  ];

  apps: { id: string; name: string; title?: string }[] = [];
  constructor(private fb: FormBuilder, private catalog: CatalogService, private route: ActivatedRoute, private router: Router, private modal: NzModalService) {}

  ngOnInit(): void {
    // Known data types used for typed handles
    this.knownTypes = ['any','payload','text','event','message','record','ai_tool','ai_memory','ai_image','ai_context','file','vector','ai_vector'];
    this.knownTypeOptions = this.knownTypes.map(t => ({ label: t, value: t }));
    this.form = this.fb.group({
      id: new FormControl<string | null>(null),
      name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
      type: new FormControl<NodeTemplate['type']>('function', { nonNullable: true }),
      category: new FormControl<string>(''),
      group: new FormControl<string>(''),
      appId: new FormControl<string | null>(null),
      description: new FormControl<string>(''),
      vendors: new FormControl<string[] | null>([], { nonNullable: false }),
      tags: new FormControl<string[] | null>([], { nonNullable: false }),
      icon: new FormControl<string>(''),
      iconUrl: new FormControl<string>(''),
      title: new FormControl<string>(''),
      subtitle: new FormControl<string>(''),
      authorize_catch_error: new FormControl<boolean>(true, { nonNullable: true }),
      authorize_skip_error: new FormControl<boolean>(false, { nonNullable: true }),
      allow_without_credentials: new FormControl<boolean>(false, { nonNullable: true }),
      output_array_field: new FormControl<string>('items'),
      output: this.fb.array<FormGroup<any>>([]),
      inputHandles: this.fb.array<FormGroup<any>>([]),
      outputHandles: this.fb.array<FormGroup<any>>([]),
      linkedHandles: this.fb.array<FormGroup<any>>([]),
      fb_preset_tpl: new FormControl<boolean>(true, { nonNullable: true }),
      show_args_json: new FormControl<boolean>(false, { nonNullable: true })
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    // Also react to fbSession changes when navigating back to the same route
    let lastSession: string | null = null;
    // When coming back from Form Builder, we must prefer the returned args
    // over any later template patch coming from the catalog fetch.
    let preferArgsFromSession = false;
    const tryLoad = (sess: string | null, outIndex: string | null = null) => {
      if (!sess || sess === lastSession) return;
      lastSession = sess;
      try {
        const raw = localStorage.getItem('formbuilder.session.' + sess);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (outIndex != null && outIndex !== '') {
            const idx = Number(outIndex);
            if (!Number.isNaN(idx)) {
              // If handles not yet loaded, stash and apply later in patchTemplate
              const json = JSON.stringify(parsed, null, 2);
              if ((this.outputHandles?.length || 0) > idx && this.outCtrlAt(idx)) {
                this.selectedOutIndex = idx;
                this.onOutSchemaChange(json);
                try { localStorage.removeItem('formbuilder.session.' + sess); } catch {}
              } else {
                this._pendingOutSchemas.set(idx, json);
                this._pendingOutSessions.set(idx, sess);
              }
            }
          } else {
            this.argsJson = JSON.stringify(parsed, null, 2);
            preferArgsFromSession = true;
            // Also expose on instance so later patchTemplate can read it
            // @ts-ignore
            (this as any).__preferArgsFromSession = true;
            try { localStorage.removeItem('formbuilder.session.' + sess); } catch {}
          }
        }
      } catch {}
    };
    tryLoad(this.route.snapshot.queryParamMap.get('fbSession'), this.route.snapshot.queryParamMap.get('fbOutIndex'));
    try {
      this.route.queryParamMap.subscribe(map => tryLoad(map.get('fbSession'), map.get('fbOutIndex')));
    } catch {}
    // Fallback: if we previously opened a session for this template and no fbSession param is present
    try {
      if (!this.route.snapshot.queryParamMap.get('fbSession')) {
        const lastKey = 'formbuilder.session.last.tpl.' + (id || 'new');
        const lastSess = localStorage.getItem(lastKey);
        if (lastSess) { tryLoad(lastSess); localStorage.removeItem(lastKey); }
        // Also check last session for output by index 0 as a fallback
        try {
          const outIdxKey = `formbuilder.session.last.tpl.outidx.${id || 'new'}.0`;
          const sess0 = localStorage.getItem(outIdxKey);
          if (sess0) { tryLoad(sess0, '0'); localStorage.removeItem(outIdxKey); }
        } catch {}
      }
    } catch {}
    const dup = this.route.snapshot.queryParamMap.get('duplicateFrom');
    this.catalog.listApps().subscribe(list => {
      const all = (list || []);
      this.apps = all.map(a => ({ id: a.id, name: a.name, title: a.title }));
      // @ts-ignore
      this._appsFull = new Map(all.map(a => [a.id, a]));
      this.updateAllowWithoutStatus();
    });
    // React to appId changes to enforce allow_without_credentials state
    try { this.form.get('appId')?.valueChanges.subscribe(() => this.updateAllowWithoutStatus()); } catch {}
    if (dup) {
      this.catalog.getNodeTemplate(dup).subscribe(t => {
        if (t) {
          this.patchTemplate(t);
          // reset id and tweak name for duplication
          this.form.patchValue({ id: null, name: (t.name || '') + ' (copie)' }, { emitEvent: false });
        }
        this.argsReady = true;
      });
    } else if (id) {
      this.catalog.getNodeTemplate(id).subscribe(t => { if (t) this.patchTemplate(t); this.argsReady = true; });
    }
  }

  get outputs(): FormArray<FormGroup<{ value: FormControl<string> }>> { return this.form.get('output') as any; }
  addOutput(v: string = '') { this.outputs.push(this.fb.group({ value: this.fb.control(v, { nonNullable: true }) })); }
  removeOutput(i: number) { this.outputs.removeAt(i); }

  public knownTypes: string[] = [];
  public knownTypeOptions: Array<{ label: string; value: string }>= [];
  get inputHandles(): FormArray<FormGroup<any>> { return this.form.get('inputHandles') as any; }
  get outputHandles(): FormArray<FormGroup<any>> { return this.form.get('outputHandles') as any; }
  get linkedHandles(): FormArray<FormGroup<any>> { return this.form.get('linkedHandles') as any; }
  addInputHandle(v: any = { id: '', name: '', type: 'any', multiple: false }) {
    this.inputHandles.push(this.fb.group({ id: this.fb.control(v.id), name: this.fb.control(v.name), type: this.fb.control(v.type), multiple: this.fb.control(!!v.multiple) }));
  }
  removeInputHandle(i: number) { this.inputHandles.removeAt(i); }
  addOutputHandle(v: any = { id: '', name: '', type: 'any', multiple: false, schema: undefined }) {
    const schemaJson = v.schema ? JSON.stringify(v.schema, null, 2) : JSON.stringify(this.defaultOutSchema(v.name || v.id || 'ok'), null, 2);
    this.outputHandles.push(this.fb.group({ id: this.fb.control(v.id), name: this.fb.control(v.name), type: this.fb.control(v.type), multiple: this.fb.control(!!v.multiple), schemaJson: this.fb.control(schemaJson) }));
    if (this.selectedOutIndex < 0) this.selectedOutIndex = 0;
  }
  removeOutputHandle(i: number) { this.outputHandles.removeAt(i); }
  addLinkedHandle(v: any = { id: '', name: '', type: 'any', multiple: true }) {
    this.linkedHandles.push(this.fb.group({ id: this.fb.control(v.id), name: this.fb.control(v.name), type: this.fb.control(v.type), multiple: this.fb.control(!!v.multiple) }));
  }
  removeLinkedHandle(i: number) { this.linkedHandles.removeAt(i); }

  dropOutput(ev: CdkDragDrop<any>) {
    const prev = this.outputs.at(ev.previousIndex);
    if (!prev) return;
    this.outputs.removeAt(ev.previousIndex);
    const targetIndex = ev.currentIndex > this.outputs.length ? this.outputs.length : ev.currentIndex;
    this.outputs.insert(targetIndex, prev);
  }

  onArgsChange(v: string) { this.argsJson = v || ''; }

  get argsObj(): any {
    try {
      const raw = this.argsJson || '';
      const sig = raw.trim();
      if (this._parsedArgsSig === sig && this._parsedArgsCache) return this._parsedArgsCache;
      if (!sig) { this._parsedArgsSig = sig; this._parsedArgsCache = { title: 'Arguments', fields: [] }; return this._parsedArgsCache; }
      const parsed = JSON.parse(sig);
      this._parsedArgsSig = sig; this._parsedArgsCache = (parsed && typeof parsed === 'object') ? parsed : { title: 'Arguments', fields: [] };
      return this._parsedArgsCache;
    } catch {
      this._parsedArgsSig = this.argsJson || '';
      this._parsedArgsCache = { title: 'Arguments', fields: [] };
      return this._parsedArgsCache;
    }
  }

  isFormSchema(obj: any): boolean {
    try {
      if (!obj || typeof obj !== 'object') return false;
      if (Array.isArray((obj as any).fields) || Array.isArray((obj as any).steps)) return true;
      return !!(obj as any).title;
    } catch { return false; }
  }

  private patchTemplate(t: NodeTemplate) {
    this.form.patchValue({
      id: t.id, name: t.name || '', type: t.type, category: t.category || '', group: (t as any).group || '', description: t.description || '',
      appId: ((t as any).app && (t as any).app._id) ? (t as any).app._id : ((t as any).appId || null), tags: (t as any).tags || []
    }, { emitEvent: false });
    // Optional UI fields
    // @ts-ignore
    this.form.patchValue({ icon: (t as any).icon || '', iconUrl: (t as any).iconUrl || '', title: (t as any).title || '', subtitle: (t as any).subtitle || '' }, { emitEvent: false });
    if (t.type === 'function') {
      this.form.get('authorize_catch_error')?.setValue(!!t.authorize_catch_error, { emitEvent: false });
      // skip support visibility flag
      // @ts-ignore
      this.form.get('authorize_skip_error')?.setValue(!!(t as any).authorize_skip_error, { emitEvent: false });
      // allow without credentials
      // @ts-ignore
      this.form.get('allow_without_credentials')?.setValue(!!(t as any).allowWithoutCredentials, { emitEvent: false });
      this.outputs.clear();
      (t.output || []).forEach(o => this.addOutput(o));
    }
    // v2 handles
    try {
      this.inputHandles.clear(); (t.inputHandles || []).forEach((h: any) => this.addInputHandle({ id: h.id, name: h.name, type: (h.type || (Array.isArray(h.accepts) && h.accepts.length ? h.accepts[0] : 'any')), multiple: !!h.multiple }));
      this.outputHandles.clear();
      if (t.type !== 'condition') (t.outputHandles || []).forEach((h: any) => this.addOutputHandle({ id: h.id, name: h.name, type: h.type, multiple: !!h.multiple, schema: (h as any).schema }));
      this.linkedHandles.clear();
      if (t.type !== 'condition') (t as any).linkedHandles && (t as any).linkedHandles.forEach((h: any) => this.addLinkedHandle({ id: h.id, name: h.name, type: (h.type || (Array.isArray(h.accepts) && h.accepts.length ? h.accepts[0] : 'any')), multiple: !!h.multiple }));
    } catch {}
    this.updateAllowWithoutStatus();
    if (t.type === 'condition') {
      // @ts-ignore
      this.form.get('output_array_field')?.setValue((t as any).output_array_field || 'items', { emitEvent: false });
    }
    // If we are returning from Form Builder in this navigation cycle, do not
    // overwrite the freshly returned Arguments JSON with the older stored one.
    // We detect this via a sticky flag on the closure captured at init time.
    try {
      // Access the closure-scoped flag via a property assigned on the instance
      // the first time tryLoad sets it.
      // @ts-ignore
      const preferArgs = (this as any).__preferArgsFromSession === true ? true : false;
      if (!preferArgs || !this.argsJson || this.argsJson.trim().length === 0) {
        this.argsJson = JSON.stringify(t.args || {}, null, 2);
      }
      // Reset the preference after the first patch to avoid future skips.
      // @ts-ignore
      (this as any).__preferArgsFromSession = false;
    } catch {
      this.argsJson = JSON.stringify(t.args || {}, null, 2);
    }
    // Appliquer d'éventuels retours différés (si handles pas prêts au moment du retour)
    try {
      if (this._pendingOutSchemas.size) {
        this._pendingOutSchemas.forEach((json, idx) => {
          const g = this.outCtrlAt(idx);
          if (!g) return;
          this.selectedOutIndex = idx;
          this.onOutSchemaChange(json);
          const sess = this._pendingOutSessions.get(idx);
          if (sess) { try { localStorage.removeItem('formbuilder.session.' + sess); } catch {} }
        });
        this._pendingOutSchemas.clear();
        this._pendingOutSessions.clear();
      }
    } catch {}

    // Fallback: charger d'éventuelles sessions Form Builder pour chaque handle (si retour sans query)
    try {
      const id = this.form.get('id')?.value || 'new';
      const count = this.outputHandles.length;
      for (let i = 0; i < count; i++) {
        const k = `formbuilder.session.last.tpl.outidx.${id}.${i}`;
        const sess = localStorage.getItem(k);
        if (sess) {
          try {
            const raw = localStorage.getItem('formbuilder.session.' + sess);
            if (raw) {
              this.selectedOutIndex = i;
              this.onOutSchemaChange(JSON.stringify(JSON.parse(raw), null, 2));
              localStorage.removeItem('formbuilder.session.' + sess);
            }
          } catch {}
          localStorage.removeItem(k);
        }
      }
    } catch {}
  }

  private updateAllowWithoutStatus() {
    try {
      const appId = this.form.get('appId')?.value || null;
      // @ts-ignore
      const app = appId ? (this._appsFull?.get?.(appId) as any) : null;
      const forbid = !!(app && app.hasCredentials && app.allowWithoutCredentials === false);
      const ctrl = this.form.get('allow_without_credentials');
      if (!ctrl) return;
      if (forbid) { ctrl.setValue(false, { emitEvent: false }); ctrl.disable({ emitEvent: false }); }
      else { ctrl.enable({ emitEvent: false }); }
    } catch {}
  }

  private makeIdFromName(name: string): string {
    const s = (name || '').trim().toLowerCase().normalize('NFD').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const base = s || 'template';
    return base + '-' + Date.now().toString(36);
  }

  cancel() { history.back(); }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value as any;
    // sanitize technical name: letters/numbers/underscore only; no spaces
    const safeName = String(v.name || '')
      .trim()
      .normalize('NFD')
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
      .replace(/[\s-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    v.name = safeName || 'node';
    let args: any = {};
    try { args = this.argsJson && this.argsJson.trim().length ? JSON.parse(this.argsJson) : {}; } catch { args = {}; }
    const generated = v.id || this.makeIdFromName(v.name);
    // Build v2 handles
    const toList = (val:any) => Array.isArray(val) ? val : String(val||'').split(',').map((s:string)=>s.trim()).filter(Boolean);
    // Inputs/Linked: single selector → map to accepts: [type]
    const inHs = (this.inputHandles.value || []).map((h:any)=> ({ id: String(h.id||'').trim()||'in', name: h.name || h.id || 'In', type: h.type || 'any', multiple: !!h.multiple, accepts: [h.type || 'any'] }))
    const outHs = (this.outputHandles.value || []).map((h:any)=> {
      let schema: any = undefined;
      try { schema = h.schemaJson && String(h.schemaJson).trim().length ? JSON.parse(h.schemaJson) : this.defaultOutSchema(h.name || h.id || 'ok'); } catch { schema = this.defaultOutSchema(h.name || h.id || 'ok'); }
      return ({ id: String(h.id||'').trim()||'ok', name: h.name || h.id || 'Ok', type: h.type || 'any', multiple: !!h.multiple, schema });
    })
    const linkHs = (this.linkedHandles.value || []).map((h:any)=> ({ id: String(h.id||'').trim(), name: h.name || h.id, type: h.type || 'any', multiple: !!h.multiple, accepts: [h.type || 'any'] }))
    const tpl: NodeTemplate = {
      id: generated,
      // also store _id for external systems expecting it
      ...( { _id: generated } as any ),
      type: v.type,
      name: v.name,
      title: v.title || undefined,
      subtitle: v.subtitle || undefined,
      icon: v.icon || undefined,
      iconUrl: v.iconUrl || undefined,
      category: v.category || undefined,
      group: v.group || undefined,
      appId: v.appId || undefined,
      tags: (v.tags && v.tags.length) ? v.tags : undefined,
      description: v.description || undefined,
      authorize_catch_error: v.type === 'function' ? !!v.authorize_catch_error : undefined,
      authorize_skip_error: v.type === 'function' ? !!v.authorize_skip_error : undefined,
      allowWithoutCredentials: v.type === 'function' ? !!v.allow_without_credentials : undefined,
      inputHandles: inHs.length ? inHs : undefined,
      outputHandles: v.type === 'condition' ? undefined : (outHs.length ? outHs : undefined),
      linkedHandles: v.type === 'condition' ? undefined : (linkHs.length ? linkHs : undefined),
      output: undefined,
      output_array_field: v.type === 'condition' ? (v.output_array_field || 'items') : undefined,
      args
    } as any;
    // also store app object with _id for compatibility
    if (v.appId) (tpl as any).app = { _id: v.appId };
    // constraints removed per new model (not used)
    this.catalog.saveNodeTemplate(tpl).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/node-templates']); },
      error: (err: any) => {
        this.saving = false;
        if (err && err.code === 'template_update_breaks_flows' && err.details && Array.isArray(err.details.impacted)) {
          this.showImpactedConfirm(tpl, err.details.impacted);
        }
      }
    });
  }

  private showImpactedConfirm(tpl: NodeTemplate, impacted: any[]) {
    const count = impacted.length;
    const listHtml = impacted.slice(0, 6).map((it: any) => {
      const name = it?.name || it?.flowId;
      const firstErr = (it?.errors && it.errors[0] && (it.errors[0].message || it.errors[0].code)) || 'Erreur de validation';
      return `<li><strong>${this.escapeHtml(name)}</strong> — ${this.escapeHtml(firstErr)}</li>`;
    }).join('');
    const more = impacted.length > 6 ? `<div style=\"margin-top:6px;color:#6b7280\">… et ${impacted.length - 6} autres</div>` : '';
    this.modal.confirm({
      nzTitle: `Des flows deviendront invalides (${count})`,
      nzContent: `<div>La mise à jour de ce template invalide ${count} flow(s).<br/>Détails (extraits):<ul style=\"margin-top:8px;\">${listHtml}</ul>${more}<div style=\"margin-top:10px;\">Voulez-vous forcer la mise à jour ? Les flows impactés seront désactivés et marqués en erreur.</div></div>`,
      nzOkText: 'Forcer et invalider',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => new Promise<void>((resolve) => {
        this.saving = true;
        this.catalog.saveNodeTemplate(tpl, true).subscribe({
          next: () => { this.saving = false; resolve(); this.router.navigate(['/node-templates']); },
          error: () => { this.saving = false; resolve(); }
        });
      })
    });
  }

  private escapeHtml(s: string): string { return String(s || '').replace(/[&<>"\']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c] || c); }

  // ===== Form Builder embedding
  openFormBuilderRoute() {
    // Route to full builder with session + return + preloaded schema + locks
    try {
      const id = this.form.get('id')?.value;
      const name = this.form.get('name')?.value || 'Arguments';
      const session = 's_' + Date.now().toString(36);
      const schema = this.argsJson && this.argsJson.trim().length ? this.argsJson : JSON.stringify({ title: 'Arguments', fields: [] });
      const returnTo = this.router.createUrlTree(['/node-templates/editor'], { queryParams: { id, fbSession: session } }).toString();
      // Mark last session for this template so back navigation without fbSession can recover
      try { localStorage.setItem('formbuilder.session.last.tpl.' + (id || 'new'), session); } catch {}
      const tplPreset = this.form.get('fb_preset_tpl')?.value ? '1' : undefined;
      this.router.navigate(['/dynamic-form'], { queryParams: { session, return: returnTo, schema, lockTitle: name, tplPreset } });
    } catch (e) { console.log(e)/* this.router.navigate(['/dynamic-form']); */ }
  }

  // ===== Output schema helpers =====
  private outCtrlAt(i: number): FormGroup | null { try { return (this.outputHandles.at(i) as any) || null; } catch { return null; } }
  selectOutHandleByIndex(i: number) { this.selectedOutIndex = i; }
  get currentOutSchemaJson(): string {
    const g = this.outCtrlAt(this.selectedOutIndex);
    const raw = g?.get('schemaJson')?.value;
    if (typeof raw === 'string') return raw;
    return JSON.stringify(this.defaultOutSchema(g?.get('name')?.value || g?.get('id')?.value || 'ok'), null, 2);
  }
  get currentOutSchemaObj(): any {
    try {
      const sig = (this.currentOutSchemaJson || '').trim();
      if (this._parsedOutSig === sig && this._parsedOutCache) return this._parsedOutCache;
      if (!sig) { this._parsedOutSig = sig; this._parsedOutCache = { title: 'Sortie', fields: [] }; return this._parsedOutCache; }
      const parsed = JSON.parse(sig);
      this._parsedOutSig = sig; this._parsedOutCache = (parsed && typeof parsed === 'object') ? parsed : { title: 'Sortie', fields: [] };
      return this._parsedOutCache;
    } catch { this._parsedOutSig = this.currentOutSchemaJson || ''; this._parsedOutCache = { title: 'Sortie', fields: [] }; return this._parsedOutCache; }
  }
  onOutSchemaChange(v: string) { const g = this.outCtrlAt(this.selectedOutIndex); g?.get('schemaJson')?.setValue(v || ''); }
  defaultOutSchema(name: string) { return { title: `Sortie — ${name || 'ok'}`, ui: { layout: 'vertical', labelsOnTop: true }, fields: [] }; }
  openOutputFormBuilderRoute() {
    try {
      const g = this.outCtrlAt(this.selectedOutIndex); if (!g) return;
      const id = this.form.get('id')?.value;
      const name = (g.get('name')?.value || g.get('id')?.value || 'ok');
      const session = 's_' + Date.now().toString(36);
      const schema = this.currentOutSchemaJson && this.currentOutSchemaJson.trim().length ? this.currentOutSchemaJson : JSON.stringify(this.defaultOutSchema(name));
      const returnTo = this.router.createUrlTree(['/node-templates/editor'], { queryParams: { id, fbSession: session, fbOutIndex: String(this.selectedOutIndex) } }).toString();
      try { localStorage.setItem(`formbuilder.session.last.tpl.outidx.${id || 'new'}.${this.selectedOutIndex}`, session); } catch {}
      const tplPreset = this.form.get('fb_preset_tpl')?.value ? '1' : undefined;
      this.router.navigate(['/dynamic-form'], { queryParams: { session, return: returnTo, schema, lockTitle: `Sortie — ${name}`, tplPreset } });
    } catch {}
  }
  toggleOutSection() { this.showOutSection = !this.showOutSection; }
  // Per-row preview helpers
  toggleOutRow(i: number){ if (this._openOutRows.has(i)) this._openOutRows.delete(i); else this._openOutRows.add(i); }
  isOutRowOpen(i: number): boolean { return this._openOutRows.has(i); }
  getOutSchemaJsonAt(i: number): string { const g = this.outCtrlAt(i); const raw = g?.get('schemaJson')?.value; return typeof raw === 'string' && raw.trim().length ? raw : JSON.stringify(this.defaultOutSchema(g?.get('name')?.value || g?.get('id')?.value || 'ok'), null, 2); }
  getOutSchemaObjAt(i: number): any { try { return JSON.parse(this.getOutSchemaJsonAt(i)); } catch { return this.defaultOutSchema('ok'); } }
  onOutSchemaChangeAt(i: number, v: string) { const g = this.outCtrlAt(i); g?.get('schemaJson')?.setValue(v || ''); }
}
