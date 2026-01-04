import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FlowAdvancedCenterPanelComponent } from './advanced-editor/flow-advanced-center-panel.component';
import { JsonSchemaViewerV2Component } from '../../modules/json-schema-viewer/json-schema-viewer-v2';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';

@Component({
  selector: 'flow-node-settings-v2-dialog',
  standalone: true,
  imports: [CommonModule, FlowAdvancedCenterPanelComponent, JsonSchemaViewerV2Component, DynamicForm],
  template: `
    <div class="overlay" (click)="close.emit()"></div>
    <div class="dialog" (click)="$event.stopPropagation()">
      <div class="header">
        <div class="title">Éditeur avancé</div>
        <button class="close" (click)="close.emit()" aria-label="Fermer">✕</button>
      </div>
      <div class="body">
        <!-- Left column: Input preview (when applicable) -->
        <div class="col left" *ngIf="hasInput(model)">
          <div class="section-title">Input</div>
          <div *ngIf="loadingInput" class="loading">Chargement…</div>
          <app-json-schema-viewer-v2 *ngIf="!loadingInput && injectedInput != null && !isStart(model)"
            [data]="injectedInput" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
          </app-json-schema-viewer-v2>
        </div>

        <!-- Center column: Settings (args) -->
        <div class="col center" (pointerup)="onFormReleased()">
          <flow-advanced-center-panel [model]="model" [ctx]="ctx" [flowId]="flowId" [bare]="true"
            [disabled]="disableForChecksum" [disableReason]="'Mise à jour du format requise'"
            (updateArgs)="requestUpdateArgs.emit()" (test)="test.emit()"
            (modelChange)="modelChange.emit($event)" (committed)="modelChangeCommitted.emit($event)" (submitted)="onFormSubmitted($event)"
            [testStatus]="testStatus" [testStartedAt]="testStartedAt" [testDurationMs]="testDurationMs" [testDisabled]="testDisabled"
            [attemptEvents]="attemptEvents" [attemptOptions]="attemptOptions" [selectedAttemptIdx]="selectedAttemptIdx"
            (selectedAttemptIdxChange)="selectedAttemptIdxChange.emit($event)">
          </flow-advanced-center-panel>
        </div>

        <!-- Right column: Output / Start payload -->
        <div class="col right" *ngIf="hasOutput(model)">
          <div class="section-title">Output</div>
          <!-- Start Form: Dynamic Form in right column -->
          <app-dynamic-form *ngIf="isStartForm(model)"
            [schema]="debugRightSchema()"
            [value]="injectedOutput || {}"
            (valueChange)="startPayloadChange.emit($event)"></app-dynamic-form>
          <!-- Start simple: JSON payload editable -->
          <app-json-schema-viewer-v2 *ngIf="isStart(model) && !isStartForm(model)"
            [data]="injectedOutput" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
          </app-json-schema-viewer-v2>
          <!-- Other nodes: output viewer readonly -->
          <app-json-schema-viewer-v2 *ngIf="!isStart(model) && !isStartForm(model) && injectedOutput != null"
            [data]="injectedOutput" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
          </app-json-schema-viewer-v2>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 100000; display:block; }
    .overlay { position:absolute; inset:0; background: rgba(17,17,17,0.32); }
    .dialog { position:absolute; inset: 2.5vh 2.5vw; background:#fff; border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.12); display:flex; flex-direction: column; overflow:hidden; }
    .header { display:flex; align-items:center; gap:8px; padding: 10px 12px; }
    .title { font-weight: 600; }
    .close { margin-left:auto; border:1px solid #e5e7eb; background:#fff; border-radius: 10px; width: 32px; height: 28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .body { flex:1 1 auto; min-height:0; display:grid; grid-template-columns: 1fr minmax(520px, 1.2fr) 1fr; gap: 12px; padding: 12px; overflow:hidden; }
    .col { min-height:0; overflow:auto; border-radius: 10px; padding: 10px; }
    .col.center {}
    .section-title { font-size:12px; color:#6b7280; margin-bottom:6px; }
  `]
})
export class FlowNodeSettingsV2DialogComponent implements OnChanges {
  @Input() flowId: string | null = null;
  @Input() model: any;
  @Input() nodes: Array<{ id: string; data?: any }>|null = null;
  @Input() disableForChecksum = false;
  @Input() hasPrev: boolean = false;
  @Input() loadingInput: boolean = false;
  @Input() loadingOutput: boolean = false;
  @Input() testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  @Input() testStartedAt: number | null = null;
  @Input() testDurationMs: number | null = null;
  @Input() attemptEvents: any[] = [];
  @Input() attemptOptions: Array<{ idx: number; exec: number; occur: number; label: string }> = [];
  @Input() selectedAttemptIdx: number | null = null;
  @Output() selectedAttemptIdxChange = new EventEmitter<number>();
  @Input() testDisabled: boolean = false;
  @Input() ctx: any = {};
  @Input() injectedInput: any = null;
  @Input() injectedOutput: any = null;
  @Output() injectedInputChange = new EventEmitter<any>();
  @Output() requestUpdateArgs = new EventEmitter<void>();
  @Output() modelChange = new EventEmitter<any>();
  @Output() modelChangeCommitted = new EventEmitter<any>();
  @Output() test = new EventEmitter<void>();
  @Output() runPrev = new EventEmitter<void>();
  @Output() startPayloadChange = new EventEmitter<any>();
  @Input() simScenarios: Array<{ id: string; index: number; label: string; msgIn: any }> | null = null;
  @Input() simSelectedIndex: number = 0;
  @Output() simSelectedIndexChange = new EventEmitter<number>();
  @Output() reloadSimulation = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  labelsMap: Record<string, { label?: string; description?: string }> = {};
  nodeNamesMap: Record<string, string> = {};
  nodeMetaMap: Record<string, { name?: string; templateTitle?: string }> = {};
  

  onFormSubmitted(m: any) {
    try { this.modelChange.emit(m || this.model); } catch {}
    try { this.modelChangeCommitted.emit(m || this.model); } catch {}
    this.close.emit();
  }
  onFormReleased() {
    // V2 keeps same behavior: commit on pointer up
    try { this.modelChangeCommitted.emit(this.model); } catch {}
  }

  hasInput(model: any): boolean {
    try {
      const t = String(model?.templateObj?.type || '').toLowerCase();
      return !(t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint');
    } catch { return false; }
  }
  hasOutput(model: any): boolean { try { return !!model && model.templateObj?.type !== 'end'; } catch { return false; } }
  isStart(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start'; } catch { return false; } }
  isStartForm(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start_form'; } catch { return false; } }
  debugRightSchema(): any {
    try { return (this.model?.startFormSchema || this.model?.templateObj?.args) || { title: 'Formulaire', fields: [] }; }
    catch { return { title: 'Formulaire', fields: [] }; }
  }

  ngOnChanges(_changes?: SimpleChanges) { this.rebuildLabelMaps(); }

  private rebuildLabelMaps() {
    const labels: Record<string, { label?: string; description?: string }> = {};
    const nodeNames: Record<string, string> = {};
    try {
      const arr = Array.isArray(this.nodes) ? this.nodes! : [];
      for (const n of arr) {
        const id = String((n as any)?.id || (n as any)?.data?.model?.id || (n as any)?.data?.id || '');
        if (!id) continue;
        const model = (n as any)?.data?.model || (n as any)?.data || {};
        const template = model?.templateObj || {};
        const name = model?.name || template?.title || template?.name || id;
        nodeNames[id] = String(name);
        const tplTitle = template?.title || template?.name || '';
        this.nodeMetaMap[id] = { name: String(name), templateTitle: String(tplTitle || '') };
        // Collect output schemas from template
        let outSchemas = (template?.outputSchemas && typeof template.outputSchemas === 'object') ? template.outputSchemas : {} as any;
        if ((!outSchemas || !Object.keys(outSchemas).length) && Array.isArray(template?.outputHandles)) {
          try {
            const oh = template.outputHandles as any[];
            const acc: any = {};
            for (const h of oh) { const hid = String(h?.id || 'out'); if (h?.schema) acc[hid] = h.schema; }
            outSchemas = acc;
          } catch {}
        }
        // Merge args for start_form (payload keys)
        const isStartForm = String(template?.type || '').toLowerCase() === 'start_form';
        const startSchema = isStartForm ? (model?.startFormSchema || template?.args || null) : null;
        // Flatten schemas into labels with full path "nodeId.path"
        const addFields = (baseId: string, schema: any, basePath?: string) => {
          try {
            if (!schema) return;
            const fields = (schema.fields || []) as any[];
            for (const f of fields) {
              if (!f) continue;
              const key = (f.key || f.id || '').toString();
              if (!key) { if (f.type === 'section' || f.type === 'section_array') { addFields(baseId, { fields: f.fields || [] }, basePath); } continue; }
              const full = basePath ? `${basePath}.${key}` : `${baseId}.${key}`;
              labels[full] = { label: f.title || f.label || key, description: f.description || f.help || '' };
              // Recurse into section/section_array
              if (f.type === 'section' || f.type === 'section_array' || f.mode === 'array') {
                addFields(baseId, { fields: f.fields || [] }, `${baseId}.${key}`);
              }
            }
          } catch {}
        };
        // For each output handle schema, flatten
        try {
          const handles = Object.keys(outSchemas || {});
          for (const hid of handles) addFields(id, outSchemas[hid], `${id}`);
        } catch {}
        // Start_form payload fields
        if (startSchema) addFields(id, startSchema, `${id}`);
      }
    } catch {}
    this.labelsMap = labels;
    this.nodeNamesMap = nodeNames;
  }
}
