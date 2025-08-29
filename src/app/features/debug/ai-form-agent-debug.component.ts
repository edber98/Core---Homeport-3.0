import { CommonModule } from '@angular/common';
import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCardModule } from 'ng-zorro-antd/card';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { JsonSchemaViewerComponent } from '../../modules/json-schema-viewer/json-schema-viewer';
import { environment } from '../../../environments/environment';
import { AuthTokenService } from '../../services/auth-token.service';

type AgentEvent =
  | { type: 'message'; role?: string; text?: string }
  | { type: 'patch'; ops: Array<{ op: 'add'|'replace'|'remove'; path: string; value?: any }> }
  | { type: 'snapshot'; schema: any }
  | { type: 'warning'; code?: string; message?: string }
  | { type: 'error'; code?: string; message?: string }
  | { type: 'done' };

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
        <app-dynamic-form [schema]="$any(schema)" [hideActions]="true" [disableExpressions]="false"></app-dynamic-form>
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
export class AiFormAgentDebugComponent {
  prompt = '';
  layout: 'vertical'|'horizontal'|'inline' = 'vertical';
  steps = false;
  maxFields = 20;
  useOpenAI = false;
  busy = false;
  log = '';
  schema: any = {};

  constructor(private zone: NgZone, private auth: AuthTokenService, private cdr: ChangeDetectorRef) {}

  reset() { this.schema = {}; this.log = ''; }

  async start() {
    if (this.busy) return;
    this.busy = true; this.log = ''; this.schema = {};
    try {
      const url = `${environment.apiBaseUrl}/api/ai/form/build`;
      const tok = this.auth.token;
      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
      if (tok) headers['Authorization'] = `Bearer ${tok}`;
      console.log('[AI-DBG] POST', url);
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: this.prompt || '', provider: this.useOpenAI ? 'openai' : undefined, options: { layout: this.layout, steps: this.steps, maxFields: this.maxFields } })
      });
      console.log('[AI-DBG] Response', resp.status, resp.statusText, resp.headers.get('content-type'));
      if (!resp.body) { this.appendLog('No stream body'); this.busy = false; return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        console.log('[AI-DBG] chunk len=', chunk.length);
        buf += chunk;
        // Support both LF and CRLF delimiters between SSE events
        let sepIdx = findDelimiter(buf);
        while (sepIdx >= 0) {
          const raw = buf.slice(0, sepIdx).trim();
          buf = buf.slice(sepIdx + delimiterLength(buf, sepIdx));
          if (!raw.startsWith('data:')) { this.appendLog('Skip chunk: ' + raw); console.log('[AI-DBG] skip', raw); sepIdx = findDelimiter(buf); continue; }
          const json = raw.slice(5).trim();
          try { const evt = JSON.parse(json) as AgentEvent; console.log('[AI-DBG] evt', evt); this.onEvent(evt); }
          catch { this.appendLog('Parse error on chunk: ' + raw); console.warn('[AI-DBG] parse error', raw); }
          sepIdx = findDelimiter(buf);
        }
      }
      this.appendLog('Stream closed');
      console.log('[AI-DBG] stream closed');
    } catch (e:any) {
      this.appendLog('Stream error: ' + (e?.message || e));
    } finally {
      this.busy = false;
    }
  }

  private appendLog(s: string) {
    try {
      this.zone.run(() => { this.log += (s + '\n'); try { this.cdr.detectChanges(); } catch {} });
      console.log('[AI-DBG]', s);
    } catch {}
  }

  private onEvent(evt: AgentEvent) {
    this.zone.run(() => {
      if (evt.type === 'message') { this.appendLog('» ' + (evt.text || '')); }
      else if (evt.type === 'patch') { this.applyOps(evt.ops || []); this.appendLog('[patch] ' + JSON.stringify(evt.ops)); }
      else if (evt.type === 'snapshot') { this.schema = evt.schema || {}; this.appendLog('[snapshot]'); try { this.cdr.detectChanges(); } catch {} }
      else if (evt.type === 'warning') this.appendLog('[warn] ' + (evt.message || evt.code));
      else if (evt.type === 'error') this.appendLog('[error] ' + (evt.message || evt.code));
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
