import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { JsonSchemaViewerComponent } from '../../modules/json-schema-viewer/json-schema-viewer';
import { ExpressionEditorComponent } from '../../modules/expression-editor/expression-editor';

type ExprTag = { path: string; name?: string };

@Component({
  selector: 'debug-expr-json-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzDividerModule, NzTagModule, NzSwitchModule, NzSelectModule, JsonSchemaViewerComponent, ExpressionEditorComponent],
  template: `
  <div class="list-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>Debug — JSON Viewer + Expression Editor</h1>
          <p>Tester l'éditeur d'expressions avec un JSON draggable + presets rapides.</p>
        </div>
      </div>

      <div class="grid cols-2">
        <section class="panel">
          <div class="panel-header">
            <div>
              <div class="title">JSON Viewer</div>
              <div class="subtitle">Faites glisser les champs vers l'éditeur</div>
            </div>
            <div class="actions">
              <button nz-button nzSize="small" *ngFor="let p of jsonPresets; trackBy: trackName" (click)="setJsonPreset(p)" [nzType]="currentJsonPreset.name===p.name ? 'primary' : 'default'">{{ p.name }}</button>
            </div>
          </div>
          <app-json-schema-viewer [data]="currentJson" [rootAlias]="'json'" [editable]="true" [initialMode]="'Schema'" [title]="'Contexte JSON'" [subtitle]="currentJsonPreset.name || ''" (dataChange)="onJsonEdited($event)"></app-json-schema-viewer>
          <div class="below">
            <div class="hint">Entrées possibles (tags) — cliquer pour insérer</div>
            <div class="tags">
              <nz-tag *ngFor="let t of tags; trackBy: trackTag" (click)="insertTag(t)">{{ t.path }}</nz-tag>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <div class="title">Expression</div>
              <div class="subtitle">Prévisualisation en direct</div>
            </div>
            <div class="actions">
              <button nz-button nzSize="small" *ngFor="let e of exprPresets; trackBy: trackName" (click)="setExprPreset(e)" [nzType]="expr===e.value ? 'primary' : 'default'">{{ e.name }}</button>
            </div>
          </div>

          <div class="expr-box">
            <app-expression-editor #ee [(ngModel)]="expr" [context]="ctx" [showPreview]="true" [errorMode]="errorMode" [large]="optLarge" [autoHeight]="optAutoHeight" [groupBefore]="optGroupBefore" [showDialogAction]="optDialogAction" [dialogMode]="optDialogMode"></app-expression-editor>
          </div>
          <div class="below">
            <div class="hint">Contexte rapide</div>
            <div class="quick">
              <button nz-button nzSize="small" (click)="setEnvPreset('dev')" [nzType]="envPreset==='dev'?'primary':'default'">Env: dev</button>
              <button nz-button nzSize="small" (click)="setEnvPreset('prod')" [nzType]="envPreset==='prod'?'primary':'default'">Env: prod</button>
              <button nz-button nzSize="small" (click)="toggleErrorMode()">{{ errorMode ? 'Erreur: ON' : 'Erreur: OFF' }}</button>
            </div>
            <div class="controls">
              <label class="ctrl"><span>Large</span> <nz-switch [(ngModel)]="optLarge"></nz-switch></label>
              <label class="ctrl"><span>Group Before</span> <nz-switch [(ngModel)]="optGroupBefore"></nz-switch></label>
              <label class="ctrl"><span>Dialog Action</span> <nz-switch [(ngModel)]="optDialogAction"></nz-switch></label>
              <label class="ctrl"><span>Dialog Mode</span>
                <nz-select [(ngModel)]="optDialogMode" style="min-width: 140px;">
                  <nz-option nzValue="textarea" nzLabel="Textarea"></nz-option>
                  <nz-option nzValue="editor" nzLabel="Editor (CodeMirror)"></nz-option>
                </nz-select>
              </label>
            </div>
            <div class="preview">
              <label>Expression:</label>
              <input nz-input [(ngModel)]="expr" [attr.placeholder]="'{{ json.user.name }}'" />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .list-page { padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 16px; gap:10px; flex-wrap: wrap; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 650; letter-spacing: -0.02em; }
    .page-header p { margin: 4px 0 0; color:#6b7280; }
    .grid { display:grid; grid-template-columns: 1fr; gap:16px; }
    @media (min-width: 1060px) { .grid.cols-2 { grid-template-columns: 1fr 1fr; } }
    .panel { background: #fff; border:1px solid #ececec; border-radius:14px; padding:14px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    .panel-header { display:flex; align-items:flex-end; justify-content:space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .panel-header .title { font-weight: 700; letter-spacing: -0.02em; }
    .panel-header .subtitle { color:#6b7280; font-size: 12.5px; }
    .panel .below { margin-top: 10px; }
    .hint { color:#6b7280; font-size: 12px; margin-bottom: 6px; }
    .tags { display:flex; flex-wrap: wrap; gap:6px; }
    .expr-box { border: 1px dashed #e5e7eb; border-radius: 10px; padding: 8px; background: #fafafa; }
    .quick { display:flex; flex-wrap: wrap; gap:8px; margin-bottom: 8px; }
    .controls { display:flex; flex-wrap: wrap; gap:12px; margin: 8px 0; align-items: center; }
    .controls .ctrl { display:flex; align-items:center; gap:8px; color:#475569; font-size: 12.5px; }
    .preview { display:flex; align-items:center; gap:8px; }
    .preview label { color:#6b7280; font-size: 12px; }
  `]
})
export class DebugExprJsonPlaygroundComponent {
  @ViewChild(ExpressionEditorComponent) editor?: ExpressionEditorComponent;

  jsonPresets = [
    { name: 'User', data: { id: 'u-123', user: { name: 'Alice', email: 'a@example.com', address: { city: 'Paris', zip: '75000' } }, roles: ['admin','editor'] } },
    { name: 'Order', data: { id: 'o-987', total: 123.45, currency: 'EUR', items: [{ sku: 'A1', qty: 2 }, { sku: 'B2', qty: 1 }] } },
    { name: 'Empty', data: {} },
  ];
  currentJsonPreset = this.jsonPresets[0];
  currentJson: any = this.currentJsonPreset.data;

  envPreset: 'dev'|'prod' = 'dev';
  exprPresets = [
    { name: 'json.id', value: '{{ json.id }}' },
    { name: 'user.name', value: '{{ json.user.name }}' },
    { name: 'items[0].sku', value: '{{ json.items[0].sku }}' },
    { name: 'now ISO', value: '{{ now.toISOString() }}' },
    { name: 'multi-line', value: 'Hello,\nUser: {{ json.user.name }}\nItems: {{ json.items[0].sku }}' },
    { name: 'calc', value: 'Total: {{ (json.items?.[0]?.qty ?? 0) * 2 }}' },
  ];
  expr = '{{ json.user.name }}';
  errorMode = false;
  // New editor options (to test ExpressionEditor inputs)
  optLarge = false;
  optGroupBefore = true;
  optDialogAction = true;
  optDialogMode: 'textarea'|'editor' = 'editor';
  optAutoHeight = false;

  get ctx() { return { json: this.currentJson, env: this.envPreset==='dev' ? { NODE_ENV: 'development' } : { NODE_ENV: 'production' }, now: new Date(), node: { Demo: { data: { ok: true } } } }; }

  tags: ExprTag[] = [];

  constructor() { this.rebuildTags(); }

  trackName = (_: number, it: any) => it?.name || _;
  trackTag = (_: number, it: ExprTag) => it?.path || _;

  setJsonPreset(p: { name: string; data: any }) { this.currentJsonPreset = p; this.currentJson = p.data; this.rebuildTags(); }
  onJsonEdited(v: any) { this.currentJson = v; this.rebuildTags(); }
  setExprPreset(p: { name: string; value: string }) { this.expr = p.value; }
  openEditorDialogExtern() { try { this.editor?.openDialog(); } catch {} }
  setEnvPreset(name: 'dev'|'prod') { this.envPreset = name; }
  toggleErrorMode() { this.errorMode = !this.errorMode; }

  insertTag(t: ExprTag) {
    const snippet = `{{ ${t.path} }}`;
    // Append to expression; if too long, add a space
    const sep = this.expr && !this.expr.endsWith(' ') ? ' ' : '';
    this.expr = (this.expr || '') + sep + snippet;
  }

  private rebuildTags() {
    this.tags = flattenToTags(this.currentJson, 'json');
  }
}

function flattenToTags(obj: any, prefix: string): ExprTag[] {
  const out: ExprTag[] = [];
  const walk = (o: any, path: string) => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
    } else if (Array.isArray(o)) {
      walk(o[0], `${path}[0]`);
    } else {
      const name = path.split('.').pop() || path;
      out.push({ path, name });
    }
  };
  walk(obj, prefix);
  return out;
}
