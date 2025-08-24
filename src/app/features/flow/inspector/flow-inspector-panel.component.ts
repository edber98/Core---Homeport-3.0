import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonacoJsonEditorComponent } from '../../dynamic-form/components/monaco-json-editor.component';

@Component({
  selector: 'flow-inspector-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoJsonEditorComponent],
  template: `
    <aside class="inspector" [class.drawer-mode]="mode==='drawer'">
      <div class="panel-heading">
        <div class="card-title left">
          <span class="t">Navigation & Contrôles</span>
          <span class="s">Inspecteur</span>
        </div>
      </div>
      <ng-container *ngIf="selected; else noSel">
        <div class="tabs">
          <button [class.active]="inspectorTab==='settings'" (click)="inspectorTabChange.emit('settings')">Settings</button>
          <button [class.active]="inspectorTab==='json'" (click)="inspectorTabChange.emit('json')">JSON</button>
        </div>
        <div *ngIf="inspectorTab==='settings'" class="rows">
          <div class="row"><span class="k">ID</span><span class="v mono">{{ selectedModel?.id }}</span></div>
          <div class="row"><span class="k">Name</span><span class="v mono">{{ selectedModel?.name }}</span></div>
          <div class="row"><span class="k">Type</span><span class="v mono">{{ selectedModel?.templateObj?.type }}</span></div>
          <div class="row"><span class="k">Template</span><span class="v mono">{{ selectedModel?.template }}</span></div>
          <div class="hint">Édition avancée disponible via l’onglet JSON.</div>
          <div class="actions-line">
            <button class="btn" (click)="openAdvanced.emit()">Ouvrir l’éditeur avancé</button>
            <button class="btn danger" (click)="delete.emit()" title="Supprimer">Supprimer</button>
          </div>
        </div>
        <div *ngIf="inspectorTab==='json'" class="json-box slim">
          <monaco-json-editor [value]="editJson" (valueChange)="editJsonChange.emit($event)" [height]="220"></monaco-json-editor>
          <div class="actions-line right">
            <button class="btn primary" (click)="saveJson.emit()">Appliquer</button>
          </div>
        </div>
      </ng-container>
      <ng-template #noSel>
        <p>Sélectionnez un nœud.</p>
      </ng-template>
    </aside>
  `,
  styles: [`
    :host { display:block; min-height: 0; }
    /* Default (outside): let parent control height/scroll */
    .inspector { border: none; border-radius: 0; padding: 10px 10px 8px 10px; background: #fff; padding-top: 0 !important; height: auto; overflow: visible; }
    /* Drawer mode: reduce padding and avoid overflow */
    .inspector.drawer-mode { height: 100%; overflow: auto; padding: 8px 8px; }
    .inspector .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 6px; border-bottom:0; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    .inspector .tabs { display:flex; gap:6px; margin: 2px 0 8px; }
    .inspector .tabs button { border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:4px 8px; font-size:12px; cursor:pointer; }
    .inspector .tabs button.active { border-color:#1677ff; color:#1677ff; }
    .inspector .rows { display:flex; flex-direction:column; gap:8px; }
    .inspector .row { display:flex; align-items:center; justify-content:space-between; border-bottom: 1px solid #f2f2f2; padding: 6px 0; }
    .inspector .row .k { color:#6b7280; font-size:12px; }
    .inspector .row .v { color:#111; font-size:12px; max-width: 55%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
    .inspector .row .v.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .inspector .hint { color:#8c8c8c; font-size:12px; margin-top:4px; }
    .inspector .json-box { border:0; border-radius:10px; padding:0; background:#fff; }
    .inspector .json-box.slim monaco-json-editor .editor { min-height: 180px; }
    .inspector .actions-line { display:flex; align-items:center; gap:8px; margin-top:8px; }
    .inspector .actions-line.right { justify-content:flex-end; }
    .inspector .btn { border:1px solid #e5e7eb; background:#fff; border-radius:10px; padding:6px 10px; font-size:12px; cursor:pointer; }
    .inspector .btn.primary { background:#1677ff; color:#fff; border-color:#1677ff; }
    .inspector .btn.danger { background:#ef4444; color:#fff; border-color:#ef4444; }
  `]
})
export class FlowInspectorPanelComponent {
  @Input() mode: 'drawer' | 'outside' = 'outside';
  @Input() selected: any;
  @Input() selectedModel: any;
  @Input() inspectorTab: 'settings' | 'json' = 'settings';
  @Output() inspectorTabChange = new EventEmitter<'settings' | 'json'>();
  @Input() editJson = '';
  @Output() editJsonChange = new EventEmitter<string>();
  @Output() openAdvanced = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() saveJson = new EventEmitter<void>();
}
