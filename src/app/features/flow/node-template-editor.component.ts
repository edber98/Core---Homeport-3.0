import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { CatalogService, NodeTemplate } from '../../services/catalog.service';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'node-template-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzSwitchModule, NzCheckboxModule, NzButtonModule, NzIconModule, NzToolTipModule, NzAutocompleteModule,
    MonacoJsonEditorComponent, DragDropModule
  ],
  template: `
  <div class="tpl-editor">
    <div class="header">
      <div class="card-title left">
        <span class="t">Template de nœud</span>
        <span class="s">Créer / Éditer</span>
      </div>
      <div class="actions">
        <button nz-button class="apple-btn" (click)="cancel()">
          <i nz-icon nzType="arrow-left"></i>
          <span class="label">Retour</span>
        </button>
        <button nz-button class="apple-btn" nzType="primary" [disabled]="form.invalid || saving" (click)="save()">
          <i nz-icon nzType="save"></i>
          <span class="label">Enregistrer</span>
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
              <nz-option nzValue="loop" nzLabel="loop"></nz-option>
              <nz-option nzValue="end" nzLabel="end"></nz-option>
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
          <nz-form-label>Icône</nz-form-label>
          <nz-form-control>
            <input nz-input formControlName="icon" [nzAutocomplete]="autoIcon" placeholder="fa-solid fa-bolt"/>
            <nz-autocomplete #autoIcon>
              <nz-auto-option *ngFor="let opt of iconOptions" [nzValue]="opt">{{ opt }}</nz-auto-option>
            </nz-autocomplete>
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

      <!-- Function-specific options -->
      <div class="grid cols-2" *ngIf="form.get('type')?.value==='function'">
        <div>
          <div class="sub-header">
            <div class="card-title left"><span class="t">Options (function)</span><span class="s">Sorties & erreurs</span></div>
          </div>
          <nz-form-item>
            <nz-form-control>
              <label nz-checkbox formControlName="authorize_catch_error" nz-tooltip="Autoriser le catch d'erreur (branche err)">Autoriser catch error</label>
            </nz-form-control>
          </nz-form-item>
        </div>
        <div>
          <div class="sub-header">
            <div class="card-title left"><span class="t">Sorties</span><span class="s">Liste des labels</span></div>
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
        <div class="card-title"><span class="t">Arguments (JSON)</span><span class="s">Configuration spécifique</span></div>
      </div>
      <monaco-json-editor [value]="argsJson" (valueChange)="onArgsChange($event)" [height]="220"></monaco-json-editor>
    </form>
  </div>
  `,
  styles: [`
    .tpl-editor { padding: 12px; max-width: 1080px; margin: 0 auto; }
    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
    .header .actions { display:flex; gap:8px; }
    .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .card-title.left { align-items:flex-start; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .ins-section-header { display:flex; justify-content:center; padding:6px 0 8px; margin:12px 0 8px; border-bottom:1px solid #E2E1E4; }
    .ins-section-header.args { margin-top: 18px; }
    .sub-header { display:flex; align-items:flex-end; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
    .form { display:block; }
    .grid { display:grid; gap:8px; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid .span-2 { grid-column: span 2; }
    @media (max-width: 960px) { .grid.cols-2 { grid-template-columns: 1fr; } }
    .outputs { display:flex; flex-direction:column; gap:6px; }
    .outputs .row { display:flex; gap:6px; align-items:center; padding:6px 8px; border-radius:8px; transition: background 160ms ease; }
    .outputs .row:hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }
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
  `]
})
export class NodeTemplateEditorComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  argsJson = '{\n  \n}';
  iconOptions: string[] = [
    'fa-solid fa-bolt', 'fa-solid fa-play', 'fa-solid fa-envelope', 'fa-solid fa-cloud', 'fa-solid fa-database',
    'fa-solid fa-code-branch', 'fa-solid fa-sync', 'fa-solid fa-sliders', 'fa-solid fa-gear', 'fa-solid fa-message'
  ];

  apps: { id: string; name: string; title?: string }[] = [];
  constructor(private fb: FormBuilder, private catalog: CatalogService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
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
      title: new FormControl<string>(''),
      subtitle: new FormControl<string>(''),
      authorize_catch_error: new FormControl<boolean>(true, { nonNullable: true }),
      output_array_field: new FormControl<string>('items'),
      output: this.fb.array<FormGroup<any>>([])
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    this.catalog.listApps().subscribe(list => { this.apps = (list || []).map(a => ({ id: a.id, name: a.name, title: a.title })); });
    if (id) {
      this.catalog.getNodeTemplate(id).subscribe(t => { if (t) this.patchTemplate(t); });
    }
  }

  get outputs(): FormArray<FormGroup<{ value: FormControl<string> }>> { return this.form.get('output') as any; }
  addOutput(v: string = '') { this.outputs.push(this.fb.group({ value: this.fb.control(v, { nonNullable: true }) })); }
  removeOutput(i: number) { this.outputs.removeAt(i); }

  dropOutput(ev: CdkDragDrop<any>) {
    const prev = this.outputs.at(ev.previousIndex);
    if (!prev) return;
    this.outputs.removeAt(ev.previousIndex);
    const targetIndex = ev.currentIndex > this.outputs.length ? this.outputs.length : ev.currentIndex;
    this.outputs.insert(targetIndex, prev);
  }

  onArgsChange(v: string) { this.argsJson = v || ''; }

  private patchTemplate(t: NodeTemplate) {
    this.form.patchValue({
      id: t.id, name: t.name || '', type: t.type, category: t.category || '', group: (t as any).group || '', description: t.description || '',
      appId: ((t as any).app && (t as any).app._id) ? (t as any).app._id : ((t as any).appId || null), tags: (t as any).tags || []
    }, { emitEvent: false });
    // Optional UI fields
    // @ts-ignore
    this.form.patchValue({ icon: (t as any).icon || '', title: (t as any).title || '', subtitle: (t as any).subtitle || '' }, { emitEvent: false });
    if (t.type === 'function') {
      this.form.get('authorize_catch_error')?.setValue(!!t.authorize_catch_error, { emitEvent: false });
      this.outputs.clear();
      (t.output || []).forEach(o => this.addOutput(o));
    }
    if (t.type === 'condition') {
      // @ts-ignore
      this.form.get('output_array_field')?.setValue((t as any).output_array_field || 'items', { emitEvent: false });
    }
    this.argsJson = JSON.stringify(t.args || {}, null, 2);
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
    let args: any = {};
    try { args = this.argsJson && this.argsJson.trim().length ? JSON.parse(this.argsJson) : {}; } catch { args = {}; }
    const generated = v.id || this.makeIdFromName(v.name);
    const tpl: NodeTemplate = {
      id: generated,
      // also store _id for external systems expecting it
      ...( { _id: generated } as any ),
      type: v.type,
      name: v.name,
      category: v.category || undefined,
      group: v.group || undefined,
      appId: v.appId || undefined,
      tags: (v.tags && v.tags.length) ? v.tags : undefined,
      description: v.description || undefined,
      authorize_catch_error: v.type === 'function' ? !!v.authorize_catch_error : undefined,
      output: v.type === 'function' ? (this.outputs.value || []).map((x:any)=>x.value).filter((s:string)=>!!s && s.trim().length) : undefined,
      args
    } as any;
    // also store app object with _id for compatibility
    if (v.appId) (tpl as any).app = { _id: v.appId };
    // constraints removed per new model (not used)
    if (v.type === 'condition') (tpl as any).output_array_field = v.output_array_field || 'items';
    // Optional UI hints
    (tpl as any).icon = v.icon || undefined; (tpl as any).title = v.title || undefined; (tpl as any).subtitle = v.subtitle || undefined;
    this.catalog.saveNodeTemplate(tpl).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/node-templates']); },
      error: () => { this.saving = false; }
    });
  }
}
