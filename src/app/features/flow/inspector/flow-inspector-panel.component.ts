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
        <div *ngIf="inspectorTab==='settings'">
          <div><strong>ID:</strong> {{ selectedModel?.id }}</div>
          <div><strong>Name:</strong> {{ selectedModel?.name }}</div>
          <div><strong>Type:</strong> {{ selectedModel?.templateObj?.type }}</div>
          <div><strong>Template:</strong> {{ selectedModel?.template }}</div>
          <div class="hint">Édition avancée disponible via l’onglet JSON.</div>
          <div class="inspector-actions">
            <button class="open-advanced" (click)="openAdvanced.emit()">Ouvrir l’éditeur avancé</button>
            <button class="danger" (click)="delete.emit()" title="Supprimer">Supprimer</button>
          </div>
        </div>
        <div *ngIf="inspectorTab==='json'" class="json-box">
          <monaco-json-editor [value]="editJson" (valueChange)="editJsonChange.emit($event)" [height]="240"></monaco-json-editor>
          <div class="inspector-actions">
            <button class="save" (click)="saveJson.emit()">Appliquer</button>
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
    .inspector { border: none; border-radius: 0; padding: 12px; padding-right: 9px; background: #ffffff; padding-top: 0 !important; height: auto; overflow: visible; }
    /* Drawer mode: keep internal scroll */
    .inspector.drawer-mode { height: 100%; overflow: auto; }
    .inspector .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    .inspector .tabs { display:flex; gap:6px; margin-bottom:8px; }
    .inspector .tabs button { border:1px solid #e5e7eb; background:#fff; border-radius:6px; padding:4px 8px; font-size:12px; cursor:pointer; }
    .inspector .tabs button.active { border-color:#1677ff; color:#1677ff; }
    .inspector .hint { color:#8c8c8c; font-size:12px; margin-top:6px; }
    .inspector .json-box { border:1px solid #e5e7eb; border-radius:8px; padding:4px; background:#fff; }
    .inspector .inspector-actions { display:flex; justify-content:flex-end; margin-top:6px; }
    .inspector .inspector-actions .save { background:#1677ff; color:#fff; border:none; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px; }
    .inspector .inspector-actions .open-advanced { background:#111; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
    .inspector .inspector-actions .danger { background:#b91c1c; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; margin-left:6px; }
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
