import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { CatalogService } from '../../services/catalog.service';
import { RunsBackendService } from '../../services/runs-backend.service';
import { ApiClientService } from '../../services/api-client.service';
import { AuthTokenService } from '../../services/auth-token.service';

@Component({
  standalone: true,
  selector: 'public-form-start',
  imports: [CommonModule, FormsModule, DynamicForm],
  template: `
    <div class="pf-shell">
      <div class="pf-card" *ngIf="loaded; else loading">
        <h2 class="pf-title">{{ flowName || 'Formulaire' }}</h2>
        <p class="pf-sub" *ngIf="nodeTitle">{{ nodeTitle }}</p>
        <div *ngIf="!schema"><em>Formulaire non configuré.</em></div>
        <ng-container *ngIf="schema">
          <app-dynamic-form [schema]="schema" [value]="model" (valueChange)="onValue($event)" (submitted)="onSubmit($event)" *ngIf="!running && !done"></app-dynamic-form>
          <div class="pf-loading" *ngIf="running">
            <div class="row">
              <span class="spinner"></span>
              <span>Exécution en cours…</span>
            </div>
            <div class="nodes">
              <div class="node" *ngFor="let k of (nodeStatuses | keyvalue)">
                <span class="dot" [class.run]="k.value.status==='running'" [class.ok]="k.value.status==='success'" [class.err]="k.value.status==='error'"></span>
                <span class="title">{{ k.value.title }}</span>
                <span class="st">{{ k.value.status }}</span>
                <span class="time" *ngIf="k.value.startedAt as s">· Début: {{ s | date:'shortTime' }}</span>
                <span class="time" *ngIf="computeDurationMs(k.value) as d">· Durée: {{ d }} ms</span>
              </div>
            </div>
          </div>
          <div class="pf-result ok" *ngIf="done && ok">Le flow a été exécuté correctement.</div>
          <div class="pf-error" *ngIf="done && !ok">{{ error || 'L\'exécution a échoué' }}</div>
        </ng-container>
      </div>
      <ng-template #loading>
        <div class="pf-card"><span>Chargement…</span></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .pf-shell { min-height: 100vh; display:flex; align-items:center; justify-content:center; background:#f5f6f8; padding: 16px; }
    .pf-card { width: 100%; max-width: 800px; background:#fff; border:1px solid #ececec; border-radius: 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.08); padding: 16px; }
    .pf-title { margin: 0 0 6px; font-weight: 700; font-size: 18px; }
    .pf-sub { margin: 0 0 12px; color:#6b7280; font-size: 13px; }
    .pf-loading { margin-top: 12px; display:flex; flex-direction: column; align-items:flex-start; gap:10px; color:#374151; }
    .pf-loading .row { display:flex; align-items:center; gap:8px; }
    .spinner { width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #111827; border-radius: 50%; animation: spin .8s linear infinite; display:inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pf-result { margin-top: 10px; color:#374151; }
    .pf-result.ok { color:#16a34a; }
    .pf-error { margin-top: 10px; color:#ef4444; }
    .nodes { margin-top: 8px; display:flex; flex-direction:column; gap:6px; }
    .node { display:flex; align-items:center; gap:8px; font-size: 12px; color:#374151; padding:6px 0; }
    .node .title { font-weight: 600; }
    .node .st { color:#6b7280; }
    .node .time { color:#6b7280; font-size: 11px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background:#d1d5db; display:inline-block; }
    .dot.run { background:#2563eb; }
    .dot.ok { background:#16a34a; }
    .dot.err { background:#ef4444; }
  `]
})
export class PublicFormStartComponent {
  flowId: string = '';
  nodeId: string = '';
  flowName: string | null = null;
  nodeTitle: string | null = null;
  schema: any = null;
  model: any = {};
  loaded = false;
  submitted = false;
  runId: string | null = null;
  error: string | null = null;
  running = false;
  done = false;
  ok = false;
  private pollTimer: any = null;
  private sseClose: (() => void) | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private runs: RunsBackendService, private auth: AuthTokenService, private api: ApiClientService, private cdr: ChangeDetectorRef, private zone: NgZone) {
    this.flowId = this.route.snapshot.paramMap.get('flowId') || '';
    this.nodeId = this.route.snapshot.paramMap.get('nodeId') || '';
  }

  ngOnInit() {
    if (!this.flowId || !this.nodeId) { this.error = 'Lien invalide'; return; }
    const hasToken = !!this.auth.token;
    const loadPublic = () => this.api.get<any>(`/api/public/flows/${encodeURIComponent(this.flowId)}/public-form`).subscribe({
      next: (d) => {
        try { console.log('[public-form] loadPublic ok', d); } catch {}
        this.flowName = d?.name || null;
        this.nodeTitle = d?.nodeTitle || null;
        this.schema = d?.schema || null;
        this.loaded = true;
      },
      error: (e) => { try { console.error('[public-form] loadPublic error', e); } catch {}; this.error = e?.message || 'Formulaire inaccessible'; this.loaded = true; }
    });
    const loadPrivate = () => this.catalog.getFlow(this.flowId).subscribe({
      next: (doc) => {
        try { console.log('[public-form] loadPrivate ok doc', doc); } catch {}
        const node = (doc?.nodes || []).find(n => String(n?.id) === String(this.nodeId));
        if (!node) { this.error = 'Nœud introuvable'; this.loaded = true; return; }
        this.flowName = doc?.name || null;
        this.nodeTitle = node?.data?.model?.templateObj?.title || node?.data?.model?.name || null;
        this.ensureFlowNodeMap(doc);
        const m = node?.data?.model || {};
        const ty = String(m?.templateObj?.type || '').toLowerCase();
        const isStart = ty === 'start' || ty === 'start_form';
        if (!isStart) { this.error = 'Ce nœud n\'est pas un déclencheur'; this.loaded = true; return; }
        const ctx = m?.context;
        const fromCtx = (ctx && (Array.isArray(ctx.fields) || Array.isArray(ctx.steps))) ? ctx : null;
        const fromModel = m?.startFormSchema || m?.templateObj?.args || null;
        this.schema = this.normalizeSchema(fromCtx || fromModel);
        try {
          const s = this.schema;
          console.log('[public-form] picked schema', { fromCtx: !!fromCtx, fromModel: !!fromModel });
          console.log('[public-form] schema keys', s ? Object.keys(s) : null);
          console.log('[public-form] schema fields.len', Array.isArray((s as any)?.fields) ? (s as any).fields.length : null);
          console.log('[public-form] schema steps.len', Array.isArray((s as any)?.steps) ? (s as any).steps.length : null);
        } catch {}
        this.loaded = true;
        try { this.cdr.detectChanges(); } catch {}
      },
      error: (e) => { try { console.error('[public-form] loadPrivate error', e); } catch {}; this.error = 'Flow introuvable'; this.loaded = true; }
    });
    if (hasToken) loadPrivate(); else loadPublic();
  }

  private normalizeSchema(s: any): any {
    try {
      if (!s || typeof s !== 'object') return s;
      const hasFields = Array.isArray(s.fields);
      const hasSteps = Array.isArray(s.steps);
      if (!hasFields && !hasSteps) {
        console.warn('[public-form] schema has neither fields nor steps');
      }
      // Ensure UI defaults for better render
      s.ui = s.ui || {};
      if (!s.ui.layout) s.ui.layout = 'vertical';
      return s;
    } catch { return s; }
  }

  onValue(v: any) { this.model = v; }
  onSubmit(v: any) {
    try { console.log('[public-form] submit', v); } catch {}
    this.submitted = true;
    this.error = null;
    const payload = v != null ? v : this.model || {};
    try { console.log('[public-form] starting run with payload', payload); } catch {}
    const hasToken = !!this.auth.token;
    const startPublic = () => this.api.post<any>(`/api/public/flows/${encodeURIComponent(this.flowId)}/runs`, { payload }).subscribe({ next: (d) => { this.runId = d?.id ? String(d.id) : null; this.trackPublicRunSSE(); }, error: () => { this.error = 'Échec du lancement'; this.running = false; this.done = true; } });
    const startPrivate = () => this.runs.start(this.flowId, payload).subscribe({
      next: (resp) => {
        this.runId = (resp && (resp.id || resp.runId || resp._id)) ? String(resp.id || resp.runId || resp._id) : null;
        this.trackPrivateRunSSE();
      },
      error: () => { this.error = 'Échec du lancement'; this.running = false; this.done = true; }
    });
    this.running = true; this.done = false; this.ok = false;
    if (hasToken) startPrivate(); else startPublic();
  }

  private trackPublicRunSSE() {
    if (!this.runId) { this.error = 'Run introuvable'; this.running = false; this.done = true; return; }
    try {
      const base = (window as any)?.env?.apiBaseUrl || (location.origin.replace(/\/$/, ''));
      const url = `${base}/api/public/runs/${encodeURIComponent(this.runId)}/stream`;
      const es = new EventSource(url);
      es.addEventListener('live', (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data || '{}');
          const t = String(data?.type || '').toLowerCase();
          if (t === 'run.status') {
            this.zone.run(() => {
              const st = String(data?.run?.status || '').toLowerCase();
              if (st === 'running') { this.running = true; this.done = false; this.ok = false; }
              if (st === 'success') {
                this.running = false; this.done = true; this.ok = true; es.close();
                setTimeout(()=>{ this.runId = null; this.nodeStatuses = {}; this.model = {}; this.done=false; this.ok=false; try{ this.cdr.detectChanges(); }catch{} }, 2500);
              }
              if (st === 'error') {
                this.running = false; this.done = true; this.ok = false; this.error = 'Exécution échouée'; es.close();
                setTimeout(()=>{ this.runId = null; this.nodeStatuses = {}; this.done=false; this.ok=false; try{ this.cdr.detectChanges(); }catch{} }, 3000);
              }
              try { this.cdr.detectChanges(); } catch {}
            });
          }
          // Track node progress (memory streams use engine types; DB uses node.status/node.result)
          if (t === 'node.status' || t === 'node.result' || t === 'node.started' || t === 'node.done') {
            this.zone.run(() => { this.applyNodeEvent(data); try { this.cdr.detectChanges(); } catch {} });
          }
        } catch {}
      });
      es.onerror = () => { try { es.close(); } catch {}; if (!this.done) { this.zone.run(() => { this.error = 'Flux interrompu'; this.running = false; this.done = true; this.ok = false; try { this.cdr.detectChanges(); } catch {} }); } };
    } catch { this.trackPublicRun(); }
  }
  private trackPrivateRunSSE() {
    if (!this.runId) { this.error = 'Run introuvable'; this.running = false; this.done = true; return; }
    try {
      const stream = this.runs.stream(this.runId!);
      this.sseClose = () => { try { stream.close(); } catch {} };
      stream.on((ev: any) => {
        try {
          const t = String(ev?.type || '').toLowerCase();
          if (t === 'run.status') {
            this.zone.run(() => {
              const st = String(ev?.run?.status || '').toLowerCase();
              if (st === 'running') { this.running = true; this.done = false; this.ok = false; }
              if (st === 'success') {
                this.running = false; this.done = true; this.ok = true; this.sseClose?.();
                setTimeout(()=>{ this.runId = null; this.nodeStatuses = {}; this.model = {}; this.done=false; this.ok=false; try{ this.cdr.detectChanges(); }catch{} }, 2500);
              }
              if (st === 'error') {
                this.running = false; this.done = true; this.ok = false; this.error = 'Exécution échouée'; this.sseClose?.();
                setTimeout(()=>{ this.runId = null; this.nodeStatuses = {}; this.done=false; this.ok=false; try{ this.cdr.detectChanges(); }catch{} }, 3000);
              }
              try { this.cdr.detectChanges(); } catch {}
            });
          }
          if (t === 'node.status' || t === 'node.result' || t === 'node.started' || t === 'node.done') {
            this.zone.run(() => { this.applyNodeEvent(ev); try { this.cdr.detectChanges(); } catch {} });
          }
        } catch {}
      });
    } catch { this.trackPrivateRun(); }
  }
  private trackPublicRun() {
    if (!this.runId) { this.error = 'Run introuvable'; this.running = false; this.done = true; return; }
    const poll = () => {
      this.api.get<any>(`/api/public/runs/${encodeURIComponent(this.runId!)}`).subscribe({
        next: (r) => {
          const st = String(r?.status || '').toLowerCase();
          if (st === 'running') { this.running = true; this.done = false; this.ok = false; this.pollTimer = setTimeout(poll, 800); }
          else if (st === 'success') { this.running = false; this.done = true; this.ok = true; }
          else { this.running = false; this.done = true; this.ok = false; this.error = 'Exécution échouée'; }
        },
        error: () => { this.running = false; this.done = true; this.ok = false; this.error = 'Échec de suivi'; }
      });
    };
    poll();
  }
  private trackPrivateRun() {
    if (!this.runId) { this.error = 'Run introuvable'; this.running = false; this.done = true; return; }
    const poll = () => {
      this.runs.get(this.runId!).subscribe({
        next: (r) => {
          const st = String(r?.status || '').toLowerCase();
          if (st === 'running') { this.running = true; this.done = false; this.ok = false; this.pollTimer = setTimeout(poll, 800); }
          else if (st === 'success') { this.running = false; this.done = true; this.ok = true; }
          else { this.running = false; this.done = true; this.ok = false; this.error = 'Exécution échouée'; }
        },
        error: () => { this.running = false; this.done = true; this.ok = false; this.error = 'Échec de suivi'; }
      });
    };
    poll();
  }

  ngOnDestroy() { try { if (this.pollTimer) clearTimeout(this.pollTimer); } catch {} try { this.sseClose?.(); } catch {} }

  // ===== Live node progress =====
  nodeStatuses: Record<string, { title: string; status: 'running' | 'success' | 'error'; startedAt?: string; finishedAt?: string; durationMs?: number | null }> = {};
  private flowNodeTitleMap: Map<string, string> | null = null;
  private ensureFlowNodeMap(doc?: any) {
    if (this.flowNodeTitleMap) return;
    try {
      const nodes = doc?.nodes || [];
      const map = new Map<string, string>();
      for (const n of nodes) {
        const t = n?.data?.model?.templateObj;
        const title = (t?.title || t?.name || n?.data?.model?.name || n?.id) ?? String(n?.id);
        map.set(String(n?.id), String(title));
      }
      this.flowNodeTitleMap = map;
    } catch { this.flowNodeTitleMap = new Map(); }
  }
  private titleForNode(nodeId: string): string {
    try { return (this.flowNodeTitleMap && this.flowNodeTitleMap.get(String(nodeId))) || String(nodeId); } catch { return String(nodeId); }
  }
  private applyNodeEvent(ev: any) {
    try {
      // Normalize shapes
      const type = String(ev?.type || '').toLowerCase();
      const nodeId = ev?.nodeId || ev?.data?.nodeId || ev?.data?.node?.id || null;
      if (!nodeId) return;
      let st: 'running' | 'success' | 'error' | null = null;
      if (type === 'node.status') {
        const s = String(ev?.data?.status || '').toLowerCase();
        if (s === 'running') st = 'running';
        if (s === 'success') st = 'success';
        if (s === 'error') st = 'error';
      } else if (type === 'node.result' || type === 'node.done') st = 'success';
      else if (type === 'node.started') st = 'running';
      if (!st) return;
      if (!this.flowNodeTitleMap && this.auth.token) {
        // Build map from cached flow doc when private; if not present, it will fallback to nodeId
        // We don't re-fetch here to avoid extra calls; ensureFlowNodeMap is called on initial loadPrivate
      }
      const k = String(nodeId);
      const title = this.titleForNode(k);
      const cur = this.nodeStatuses[k] || { title, status: st };
      // Extract timings across engine (memory) and DB run events
      // Memory engine events are under ev.data
      const startedAt = ev?.data?.startedAt || ev?.startedAt || cur.startedAt || null;
      const finishedAt = ev?.data?.finishedAt || ev?.finishedAt || cur.finishedAt || null;
      let durationMs = (typeof (ev?.data?.durationMs) === 'number') ? ev.data.durationMs
                         : (typeof ev?.durationMs === 'number') ? ev.durationMs
                         : (typeof cur.durationMs === 'number') ? cur.durationMs
                         : null;
      if ((durationMs == null || isNaN(Number(durationMs))) && startedAt && finishedAt) {
        try { durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()); } catch {}
      }
      this.nodeStatuses[k] = { title, status: st, startedAt: startedAt || undefined, finishedAt: finishedAt || undefined, durationMs: durationMs ?? undefined };
      if (this.done) {
        // reset statuses a few seconds after completion
        setTimeout(() => { this.nodeStatuses = {}; try { this.cdr.detectChanges(); } catch {} }, 2500);
      }
    } catch {}
  }

  formatMs(ms?: number | null): string {
    try {
      if (ms == null || isNaN(Number(ms))) return '';
      const t = Math.max(0, Math.floor(Number(ms)));
      const sec = Math.floor(t / 1000);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    } catch { return ''; }
  }
  computeDurationMs(v: { startedAt?: string; finishedAt?: string; durationMs?: number | null }): number | null {
    try {
      if (typeof v?.durationMs === 'number' && !isNaN(v.durationMs)) return Math.max(0, Math.floor(v.durationMs));
      if (v?.startedAt && v?.finishedAt) {
        return Math.max(0, new Date(v.finishedAt).getTime() - new Date(v.startedAt).getTime());
      }
      return null;
    } catch { return null; }
  }
}
