import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CatalogService, NodeTemplate } from '../../services/catalog.service';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'node-template-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTagModule, NzButtonModule, NzIconModule, NzToolTipModule, NzCheckboxModule, DynamicForm],
  template: `
  <div class="tpl-viewer">
    <div class="page-header">
      <div class="left">
        <button class="icon-btn back" (click)="back()" title="Retour"><i class="fa-solid fa-arrow-left"></i></button>
        <div class="card-title left">
          <span class="t">Template</span>
          <span class="s">Informations détaillées</span>
        </div>
      </div>
      <div class="actions">
        <button nz-button class="apple-btn" *ngIf="view?.id" (click)="openEditor()" nz-tooltip="Modifier ce template">
          <i class="fa-regular fa-pen-to-square"></i>
          <span class="label">Édition</span>
        </button>
        <button nz-button class="apple-btn" *ngIf="view?.id" (click)="duplicate()" nz-tooltip="Dupliquer ce template">
          <i class="fa-regular fa-copy"></i>
          <span class="label">Dupliquer</span>
        </button>
      </div>
    </div>
    <div class="grid cols-2">
      <div class="panel">
        <div class="panel-title">Général</div>
        <div class="kv">
          <div><span class="k">ID</span><span class="v">{{view.id || '—'}}</span></div>
          <div><span class="k">Nom</span><span class="v">{{view.name || '—'}}</span></div>
          <div><span class="k">Type</span><span class="v"><nz-tag>{{view.type}}</nz-tag></span></div>
          <div><span class="k">Catégorie</span><span class="v">{{view.category || '—'}}</span></div>
          <div *ngIf="view.group"><span class="k">Groupe</span><span class="v">{{view.group}}</span></div>
          <div *ngIf="appLbl"><span class="k">App</span><span class="v app">
            <span class="icon" [style.background]="appIconClass ? appColor : 'transparent'">
              <i *ngIf="appIconClass" [class]="appIconClass"></i>
              <img *ngIf="!appIconClass && appIconUrl" [src]="appIconUrl" alt="icon"/>
              <img *ngIf="!appIconClass && !appIconUrl && appId" [src]="simpleIconUrl(appId)" alt="icon"/>
            </span>
            <span class="lbl">{{ appLbl }}</span>
          </span></div>
          <div *ngIf="tags?.length"><span class="k">Tags</span><span class="v tags">
            <nz-tag *ngFor="let t of tags">{{ t }}</nz-tag>
          </span></div>
          <div><span class="k">Description</span><span class="v">{{view.description || '—'}}</span></div>
        </div>
      </div>
      <div class="panel" *ngIf="tplUi as ui">
        <div class="panel-title">UI (optionnel)</div>
        <div class="kv">
          <div><span class="k">Icône</span><span class="v">{{ ui.icon || '—' }}</span></div>
          <div><span class="k">Titre</span><span class="v">{{ ui.title || '—' }}</span></div>
          <div><span class="k">Sous-titre</span><span class="v">{{ ui.subtitle || '—' }}</span></div>
        </div>
      </div>
      
      <div class="panel preview-col" *ngIf="true">
        <div class="panel-title">Aperçu (flow-builder)</div>
        <div class="node-card">
          <div class="inputs" *ngIf="inputCount > 0">
            <div class="in" *ngFor="let i of inputArray"><span class="dot" nz-tooltip="Entrée"></span></div>
          </div>
          <div class="header">
            <ng-container *ngIf="tplUi?.icon as ic">
              <i [class]="ic" class="icon"></i>
            </ng-container>
            <div class="meta">
              <div class="title">{{ tplUi?.title || view.name || 'Sans titre' }}</div>
              <div class="subtitle">
                {{ tplUi?.subtitle || view.category || view.type }}
                <span *ngIf="appLbl" style="margin-left:6px; color:#6b7280">• {{ appLbl }}</span>
              </div>
            </div>
          </div>
          <div class="outputs" *ngIf="previewOutputs?.length">
            <div class="out" *ngFor="let o of previewOutputs">
              <span class="dot" [ngClass]="{ error: (o || '').toLowerCase() === 'error' || (o || '').toLowerCase() === 'err' }" [nz-tooltip]="o"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="panel" *ngIf="view.type==='function'">
        <div class="panel-title">Function</div>
        <div class="kv">
          <div><span class="k">authorize_catch_error</span><span class="v">{{ !!view.authorize_catch_error }}</span></div>
          <div><span class="k">authorize_skip_error</span><span class="v">{{ !!view.authorize_skip_error }}</span></div>
        </div>
        <div class="panel-title" style="margin-top:8px;">Sorties</div>
        <div class="outputs readonly">
          <div class="row" *ngFor="let o of outputs; let i=index">
            <span class="idx">{{ i + 1 }}</span>
            <span class="arrow">→</span>
            <span class="name" [nz-tooltip]="o">{{ o || '—' }}</span>
          </div>
        </div>
      </div>
      <div class="panel" *ngIf="tplUi?.output_array_field">
        <div class="panel-title">Condition</div>
        <div class="kv">
          <div><span class="k">output_array_field</span><span class="v">{{ tplUi?.output_array_field }}</span></div>
        </div>
      </div>
      <div class="panel span-2 controls-row">
        <div class="panel-controls"><label nz-checkbox [(ngModel)]="showJson">Afficher JSON (Arguments)</label></div>
      </div>
      <div class="panel span-2" *ngIf="showJson">
        <div class="panel-title">Arguments (JSON)</div>
        <pre class="args">{{ argsText }}</pre>
      </div>
      <div class="panel span-2" *ngIf="isFormSchema(view?.args)">
        <div class="panel-title">Aperçu du formulaire (Arguments)</div>
        <div class="dialog-preview">
          <div class="dialog-box">
            <app-dynamic-form [schema]="view?.args" [value]="{}" [forceBp]="'xs'"></app-dynamic-form>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .tpl-viewer { padding: 12px; max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
    .page-header .left { display:flex; align-items:left; gap:0px; }
    .icon-btn.back { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; border:0; background:transparent; border-radius:8px; cursor:pointer; }
    .actions { display:flex; gap:8px; }
    @media (max-width: 640px) { .apple-btn .label { display:none; } }
    .card-title { display:flex; flex-direction:column; align-items:center; line-height:1.2; }
    .card-title.left { align-items:flex-start; text-align:left; }
    .card-title .t { font-weight:600; font-size:14px; }
    .card-title .s { font-size:12px; color:#64748b; }
    .grid { display:grid; gap:10px; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid .span-2 { grid-column: span 2; }
    @media (max-width: 960px) { .grid.cols-2 { grid-template-columns: 1fr; } }
    .panel { background: transparent; border: none; border-radius: 0; padding: 6px 2px; }
    .panel-title { font-weight:600; margin-bottom:8px; color:#6b7280; }
    .panel-controls { display:flex; align-items:center; justify-content:flex-start; margin-bottom: 8px; }
    .kv { display:flex; flex-direction:column; gap:6px; }
    .kv .k { color:#6b7280; width:180px; display:inline-block; }
    .kv .v { color:#111; }
    .kv .v.tags { display:inline-flex; gap:6px; flex-wrap: wrap; }
    .kv .v.app { display:inline-flex; align-items:center; gap:8px; }
    .kv .v.app .icon { width: 20px; height: 20px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; }
    .kv .v.app .icon img { width: 16px; height: 16px; object-fit: contain; }
    .outputs { display:flex; flex-direction:column; gap:4px; }
    .outputs.readonly .row { display:flex; align-items:center; gap:8px; padding:2px 0; }
    .outputs .idx { color:#64748b; font-variant-numeric: tabular-nums; min-width: 16px; text-align:right; }
    .outputs .arrow { color:#94a3b8; }
    .outputs .name { color:#111; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .args { margin: 0; background:#f8fafc; color:#0f172a; padding:8px; border:none; border-radius: 0; max-height: 280px; overflow:auto; }

    /* Preview styles cloned from flow-builder */
    .preview-col { grid-column: span 2; margin-bottom: 8px; }
    @media (min-width: 960px) { .preview-col { grid-column: auto; } }
    /* no preview toolbar in viewer */
    .node-card { position: relative; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; width: 240px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
    .node-card .header { display:flex; align-items:center; gap:8px; margin-bottom: 0; }
    /* Preview icon sizing: slightly larger and centered */
    .node-card .icon { width: 24px; height: 24px; display:inline-flex; align-items:center; justify-content:center; }
    .node-card i.icon { font-size: 16px; line-height: 1; }
    .node-card .icon img { width: 20px; height: 20px; object-fit: contain; display:block; }
    .node-card .meta .title { font-weight: 600; }
    .node-card .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .node-card .inputs { position:absolute; left: 8px; right: 8px; top: 0; display:flex; justify-content: center; align-items:center; height: 0; transform: translateY(-50%); gap: 10px; }
    .node-card .inputs .in { display:flex; align-items:center; justify-content:center; width:16px; }
    .node-card .inputs .dot { width:8px; height:8px; border-radius:50%; background:#000; border:1px solid #fff; display:inline-block; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
    .node-card .outputs { position:absolute; left: 8px; right: 8px; bottom: 0; display:flex; flex-direction: row; flex-wrap: nowrap; justify-content: center; align-items:center; gap: 10px; height: 0; transform: translateY(50%); }
    .node-card .outputs .out { display:flex; align-items:center; justify-content:center; width:16px; }
    .node-card .outputs .dot { width:8px; height:8px; border-radius:50%; background:#000; border:1px solid #fff; display:inline-block; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); }
    .node-card .outputs .dot.error { background:#f759ab; }
    /* Gradient hover on all buttons (no extra shadow/transform) */
    :host ::ng-deep button[nz-button], :host ::ng-deep .ant-btn { transition: background 160ms ease; }
    :host ::ng-deep button[nz-button]:hover, :host ::ng-deep .ant-btn:hover { background: radial-gradient(100% 100% at 100% 0%, #f5f7ff 0%, #eaeefc 100%); }

    /* Simulate flow-builder node dialog sizing */
    .dialog-preview { display:flex; justify-content:center; padding: 6px 0; }
    .dialog-box { max-width: 400px; width: 100%; background:#fff; border-right:1px solid #e5e7eb; border-left:1px solid #e5e7eb; padding:12px; }
  `]
})
export class NodeTemplateViewerComponent implements OnInit {
  @Input() id?: string;
  tpl?: NodeTemplate;
  view: NodeTemplate = { id: '', name: '', type: 'function', args: {}, output: [] };
  tplUi: { icon?: string; title?: string; subtitle?: string; output_array_field?: string } | null = null;
  argsText = '{}';
  showJson = false;
  isFormSchema(obj: any): boolean {
    try {
      if (!obj || typeof obj !== 'object') return false;
      // Accept if it has fields or steps arrays (even empty). Title optional.
      const hasFields = Array.isArray((obj as any).fields);
      const hasSteps = Array.isArray((obj as any).steps);
      return hasFields || hasSteps || !!(obj as any).title;
    } catch { return false; }
  }
  outputs: string[] = [];
  previewOutputs: string[] = [];
  inputCount = 0;
  tags: string[] = [];
  appId = '';
  appLbl = '';
  appIconClass = '';
  appIconUrl = '';
  appColor = '';
  get inputArray() { return Array.from({ length: this.inputCount }); }
  duplicate() {
    const id = this.view?.id || this.id; if (!id) return;
    this.router.navigate(['/node-templates/editor'], { queryParams: { duplicateFrom: id } });
  }
  openEditor() {
    const id = this.view?.id || this.id;
    if (!id) return;
    this.router.navigate(['/node-templates/editor'], { queryParams: { id } });
  }
  constructor(private catalog: CatalogService, private route: ActivatedRoute, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  ngOnInit(): void {
    const id = this.id || this.route.snapshot.queryParamMap.get('id') || '';
    if (id) {
      this.catalog.getNodeTemplate(id).subscribe(t => this.zone.run(() => {
        this.tpl = t;
        if (t) {
          this.view = { id: t.id, name: t.name, type: t.type, category: t.category, description: t.description, args: t.args || {}, output: t.output || [], authorize_catch_error: t.authorize_catch_error, authorize_skip_error: (t as any).authorize_skip_error, group: (t as any).group } as any;
          this.tags = (t as any).tags || [];
          this.appId = ((t as any).app && (t as any).app._id) ? (t as any).app._id : ((t as any).appId || '');
          if (this.appId) this.catalog.getApp(this.appId).subscribe(a => this.zone.run(() => {
            if (a) {
              this.appLbl = a.title || a.name;
              this.appIconClass = a.iconClass || '';
              this.appIconUrl = a.iconUrl || '';
              this.appColor = a.color || '';
            }
            try { this.cdr.detectChanges(); } catch {}
          }));
        }
        const anyt = (t || {}) as any;
        this.tplUi = { icon: anyt?.icon, title: anyt?.title, subtitle: anyt?.subtitle, output_array_field: anyt?.output_array_field };
        this.argsText = JSON.stringify((t && t.args) || {}, null, 2);
        this.outputs = [...(this.view.output || [])];
        this.computePreviewPorts();
        try { this.cdr.detectChanges(); } catch {}
      }));
    } else {
      // Show empty viewer with default values
      this.tplUi = { icon: '', title: '', subtitle: '', output_array_field: '' };
      this.argsText = JSON.stringify({}, null, 2);
      this.outputs = [];
      this.computePreviewPorts();
    }
  }
  simpleIconUrl(id: string) { return `https://cdn.simpleicons.org/${encodeURIComponent(id)}`; }
  back() { history.back(); }
  openApp() { if (this.appId) this.router.navigate(['/apps/viewer'], { queryParams: { id: this.appId } }); }
  private computePreviewPorts() {
    const type = (this.view?.type || 'function') as string;
    // Input handles: default 1, except 'start' = 0. Keep parity with flow (single top handle), but allow future types.
    this.inputCount = type === 'start' ? 0 : 1;
    const outs: string[] = [];
    if (type === 'function') {
      const core = (this.outputs || []).filter(o => (String(o || '').toLowerCase() !== 'err'));
      if (this.view?.authorize_catch_error) outs.push('err');
      outs.push(...core);
    } else if (type === 'condition') {
      const key = this.tplUi?.output_array_field || 'items';
      const arr: any[] = ((this.tpl as any)?.args?.[key]) || ((this.view as any)?.args?.[key]) || [];
      if (Array.isArray(arr)) {
        arr.forEach((it, i) => {
          const name = typeof it === 'string' ? it : (it?.name || it?.label || `Case ${i + 1}`);
          outs.push(String(name));
        });
        if (outs.length === 0) outs.push('True', 'False');
      }
    } else if (type === 'end') {
      // no outputs
    } else if (type === 'loop') {
      // Simulate common loop branches if none provided
      if ((this.outputs || []).length) outs.push(...this.outputs);
      else outs.push('each', 'next', 'end');
    } else {
      // default: single next output if nothing provided
      if ((this.outputs || []).length) outs.push(...this.outputs);
      else outs.push('next');
    }
    this.previewOutputs = outs;
  }
}
