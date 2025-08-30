import { CommonModule } from '@angular/common';
import { Component, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { JsonSchemaViewerComponent } from '../../modules/json-schema-viewer/json-schema-viewer';
import { environment } from '../../../environments/environment';
import { AuthTokenService } from '../../services/auth-token.service';
import { AiFormAgentService, AgentEvent } from '../../services/ai-form-agent.service';

// AgentEvent now comes from service

@Component({
  selector: 'debug-ai-form-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule, NzCardModule, DynamicForm, JsonSchemaViewerComponent],
  template: `
  <div class="page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>AI Form Agent — Debug</h1>
          <p>Test de génération en temps réel (SSE) du schéma de formulaire.</p>
        </div>
      </div>

      <div class="controls">
        <textarea nz-input rows="3" [(ngModel)]="prompt" placeholder="Décrivez le formulaire…"></textarea>
        <div class="opts">
          <label>Layout:
            <select [(ngModel)]="layout">
              <option value="vertical">vertical</option>
              <option value="horizontal">horizontal</option>
              <option value="inline">inline</option>
            </select>
          </label>
          <label>Steps: <input type="checkbox" [(ngModel)]="steps"/></label>
          <label>Max fields: <input type="number" [(ngModel)]="maxFields"/></label>
          <label>OpenAI: <input type="checkbox" [(ngModel)]="useOpenAI"/></label>
          <label>Agent:
            <select [(ngModel)]="agentMode">
              <option value="langchain">langchain</option>
              <option value="tools">tools</option>
              <option value="none">none</option>
            </select>
          </label>
          <label>EventSource: <input type="checkbox" [(ngModel)]="useEventSource"/></label>
          <button nz-button nzType="primary" (click)="start()" [disabled]="busy">Démarrer</button>
          <button nz-button (click)="reset()" [disabled]="busy">Reset</button>
        </div>
      </div>

      <div class="grid">
        <nz-card nzSize="small" class="panel">
          <ng-template #title1>Flux</ng-template>
          <ng-container>
            <pre class="log">{{ log }}</pre>
          </ng-container>
        </nz-card>
        <nz-card nzSize="small" class="panel">
          <ng-template #title2>Schema</ng-template>
          <ng-container>
            <app-json-schema-viewer [data]="schema" [editable]="false" [editMode]="false"></app-json-schema-viewer>
          </ng-container>
        </nz-card>
      </div>

      <div class="preview" *ngIf="schema && (schema.fields || schema.steps)">
        <h3>Prévisualisation</h3>
        <app-dynamic-form [schema]="$any(schema)" [hideActions]="false" [disableExpressions]="false"></app-dynamic-form>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .page { padding: 16px; }
    .container { max-width: 1080px; margin: 0 auto; }
    .page-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 10px; }
    .controls { display:flex; flex-direction:column; gap:8px; }
    .controls .opts { display:flex; gap:8px; align-items:center; flex-wrap: wrap; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .panel { min-height: 220px; }
    .log { margin:0; max-height: 300px; overflow:auto; background:#0a0a0a; color:#e5e7eb; padding:8px; border-radius:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; }
    .preview { margin-top: 16px; }
  `]
})
export class AiFormAgentDebugComponent implements OnDestroy {
  prompt = '';
  layout: 'vertical'|'horizontal'|'inline' = 'vertical';
  steps = false;
  maxFields = 20;
  useOpenAI = false;
  agentMode: 'langchain'|'tools'|'none' = 'langchain';
  useEventSource = false;
  rawMode = false; // use structured events via service
  busy = false;
  log = '';
  schema: any = {};

  private stopStream?: () => void;
  private logBuf = '';
  private logFlushTimer: any = null;

  constructor(private zone: NgZone, private auth: AuthTokenService, private cdr: ChangeDetectorRef, private agentSvc: AiFormAgentService) {}

  reset() { this.schema = {}; this.log = ''; }

  ngOnDestroy(): void {
    try { this.stopStream?.(); } catch {}
    this.stopStream = undefined;
    if (this.logFlushTimer) { clearTimeout(this.logFlushTimer); this.logFlushTimer = null; }
  }

  async start() {
    if (this.busy) return;
    this.busy = true; this.log = ''; this.schema = {};
    try {
      const stream = this.agentSvc.stream({ prompt: this.prompt || '', layout: this.layout, steps: this.steps, maxFields: this.maxFields });
      this.stopStream = stream.stop;
      stream.events$.subscribe((evt) => this.onEvent(evt));
    } catch (e:any) {
      this.appendLog('Stream error: ' + (e?.message || e));
    } finally {
      this.busy = false;
    }
  }

  private appendLog(s: string) {
    // Buffer logs and flush at ~60Hz to avoid change detection storms
    this.logBuf += (s + '\n');
    if (this.logFlushTimer) return;
    this.logFlushTimer = setTimeout(() => {
      try {
        const chunk = this.logBuf; this.logBuf = ''; this.logFlushTimer = null;
        this.zone.run(() => { this.log += chunk; try { this.cdr.detectChanges(); } catch {} });
      } catch { this.logFlushTimer = null; }
    }, 16);
  }

  private onEvent(evt: AgentEvent) {
    this.zone.run(() => {
      if (evt.type === 'final') {
        let s: any = (evt as any).schema;
        if (typeof s === 'string') {
          try { s = JSON.parse(s); }
          catch { this.appendLog('[final] invalid JSON schema string'); return; }
        }
        // Console log the final schema for inspection
        try { console.log('[ai-form][final_schema]', s); } catch {}
        this.schema = s || {};
        this.appendLog('[final] schema received');
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      if (evt.type === 'message') this.appendLog('» ' + (evt.text || ''));
      else if (evt.type === 'patch') this.appendLog(`[patch] ${Array.isArray((evt as any).ops) ? (evt as any).ops.length : 0} ops`);
      else if (evt.type === 'snapshot') this.appendLog('[snapshot] (ignored)');
      else if (evt.type === 'warning') this.appendLog('[warn] ' + ((evt as any).message || (evt as any).code));
      else if (evt.type === 'error') this.appendLog('[error] ' + ((evt as any).message || (evt as any).code));
      else if (evt.type === 'done') this.appendLog('✓ done');
    });
  }

  private applyOps(ops: Array<{ op: string; path: string; value?: any }>) {
    const parsePtr = (p: string) => p.replace(/^\//,'').split('/').map(s => s.replace(/~1/g,'/').replace(/~0/g,'~'));
    const set = (obj: any, parts: string[], val: any) => {
      const last = parts[parts.length-1];
      const parent = parts.slice(0,-1).reduce((acc:any, k:string) => {
        if (acc[k] == null) acc[k] = (isFinite(+k) ? [] : {});
        return acc[k];
      }, obj);
      if (Array.isArray(parent)) {
        if (last === '-') parent.push(val); else parent[Number(last)] = val;
      } else parent[last] = val;
    };
    const removeAt = (obj: any, parts: string[]) => {
      const last = parts[parts.length-1];
      const parent = parts.slice(0,-1).reduce((acc:any, k:string) => acc?.[k], this.schema);
      if (!parent) return;
      if (Array.isArray(parent)) parent.splice(Number(last), 1); else delete parent[last];
    };
    for (const op of ops) {
      const parts = parsePtr(op.path);
      if (op.op === 'add' || op.op === 'replace') set(this.schema, parts, op.value);
      else if (op.op === 'remove') removeAt(this.schema, parts);
    }
    // Trigger change detection for consumers that rely on reference changes
    this.schema = JSON.parse(JSON.stringify(this.schema));
  }
}

function findDelimiter(s: string): number {
  const i = s.indexOf('\n\n');
  if (i >= 0) return i;
  const j = s.indexOf('\r\n\r\n');
  return j;
}
function delimiterLength(s: string, at: number): number {
  if (s.startsWith('\n\n', at)) return 2;
  if (s.startsWith('\r\n\r\n', at)) return 4;
  return 2;
}
