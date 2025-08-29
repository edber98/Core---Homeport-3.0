import { CommonModule } from '@angular/common';
import { Component, NgZone, ElementRef, ViewChild } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';
import { FormsModule } from '@angular/forms';
import { FlowRunService, ExecutionRun, ExecutionMode } from '../../services/flow-run.service';
import { RunsBackendService, BackendRun } from '../../services/runs-backend.service';
import { UiMessageService } from '../../services/ui-message.service';
import { FlowPathHighlightService } from '../../services/flow-path-highlight.service';
import { AccessControlService } from '../../services/access-control.service';
import { environment } from '../../../environments/environment';
import { FlowSharedStateService } from '../../services/flow-shared-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogService } from '../../services/catalog.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'flow-execution',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowViewerComponent],
  template: `
  <div class="flow-exec">
    <aside class="side executions">
      <h4>Exécutions</h4>
      <div class="mode-row apple">
        <select class="mode-select" [(ngModel)]="mode">
          <option value="test">test</option>
          <option value="prod">prod</option>
        </select>
        <button class="icon-btn ghost" (click)="onRun()" title="Lancer (local)" aria-label="Lancer (local)"><i class="fa-solid fa-play"></i></button>
        <button class="icon-btn ghost" (click)="runBackend()" title="Lancer (backend)" aria-label="Lancer (backend)"><i class="fa-solid fa-rocket"></i></button>
      </div>
      <div class="counters">
        <span class="badge">Lancements: {{ counters.launched }}</span>
        <span class="badge">Terminés: {{ counters.completed }}</span>
      </div>
      <ul class="exec-list">
        <li *ngFor="let r of visibleRuns" [class.sel]="r === selectedRun" (click)="selectRun(r)">
          <div class="line1">Run #{{ r.runId }} — {{ r.mode }} — {{ r.status }}</div>
          <div class="line2">{{ r.startedAt | date:'short' }} · {{ r.durationMs || 0 }} ms</div>
        </li>
      </ul>
      <h5 style="margin-top:10px;">Historique (backend)</h5>
      <div class="exec-list scrollable" (scroll)="onListScroll($event)">
        <div class="exec-item" *ngFor="let b of backendFlowRuns" (click)="selectBackendRun(b)">
          <div class="line1">
            <span class="badge st" [ngClass]="b.status">{{ b.status }}</span>
            <span class="id">#{{ b.id }}</span>
          </div>
          <div class="line2">
            <span *ngIf="b.startedAt as s">{{ s | date:'short' }}</span>
            <span *ngIf="b.durationMs != null"> · {{ b.durationMs }} ms</span>
            <span *ngIf="b.nodesExecuted != null"> · {{ b.nodesExecuted }} nœuds</span>
            <span *ngIf="b.eventsCount != null"> · {{ b.eventsCount }} évts</span>
          </div>
          <div class="actions">
            <button class="icon-btn primary" (click)="onViewRunClick(b); $event.stopPropagation()" title="Voir détails">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="icon-btn" (click)="cancelBackend(b.id); $event.stopPropagation()" title="Annuler"><i class="fa-solid fa-ban"></i></button>
            <button class="icon-btn" (click)="openInEditor(b); $event.stopPropagation()" title="Ouvrir dans l'éditeur"><i class="fa-solid fa-up-right-from-square"></i></button>
          </div>
        </div>
        <div class="empty" *ngIf="backendFlowRuns.length===0">Aucune exécution pour ce flow</div>
      </div>
      <div class="attempts" *ngIf="selectedRun as rs">
        <h5>Détails ({{ attemptsLen(rs.attempts) }} nœuds)</h5>
        <div class="attempt" *ngFor="let a of rs.attempts">
          <div class="hdr">
            <span class="nid">{{ a.nodeId }}</span>
            <span class="st" [ngClass]="a.status">{{ a.status }}</span>
            <span class="dur">{{ a.durationMs || 0 }} ms</span>
          </div>
          <div class="io">
            <div>
              <div class="k">input</div>
              <pre>{{ a.input | json }}</pre>
            </div>
            <div>
              <div class="k">args.pre</div>
              <pre>{{ a.argsPre | json }}</pre>
            </div>
            <div>
              <div class="k">args.post</div>
              <pre>{{ a.argsPost | json }}</pre>
            </div>
            <div>
              <div class="k">output</div>
              <pre>{{ a.result | json }}</pre>
            </div>
          </div>
        </div>
      </div>
    </aside>
    <section class="viewer">
      <div class="loading-overlay" *ngIf="loadingFlowDoc">
        <div class="spinner"></div>
        <div class="text">Chargement du flow…</div>
      </div>
      <div class="viewer-layout" [class.show-details]="!!selectedBackendRun">
        <div class="viewer-canvas-wrap">
          <flow-viewer class="viewer-canvas"
            [nodes]="decoratedNodes"
            [edges]="decoratedEdges"
            [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"></flow-viewer>
        </div>
        <aside class="details-panel" *ngIf="selectedBackendRun as br" #detailsPanel>
          <div class="panel-header">
            <div class="title">Détails de l’exécution</div>
            <div class="spacer"></div>
            <button class="apple-btn" (click)="expandAllAttempts()" title="Développer tout">Développer tout</button>
            <button class="apple-btn" (click)="collapseAllAttempts()" title="Replier tout">Replier tout</button>
          </div>
          <div class="run-meta">
            <span class="badge st" [ngClass]="br.status">{{ br.status }}</span>
            <span *ngIf="br.startedAt as s">{{ s | date:'short' }}</span>
            <span *ngIf="br.durationMs != null"> · {{ br.durationMs }} ms</span>
            <span *ngIf="br.nodesExecuted != null"> · {{ br.nodesExecuted }} nœuds</span>
          </div>
          <div class="attempt" *ngFor="let a of backendAttempts; let i = index">
            <div class="hdr">
              <span class="nid">{{ a.nodeId }}</span>
              <span class="st" [ngClass]="a.status || 'success'">{{ a.status || 'success' }}</span>
              <span class="dur">{{ a.durationMs || 0 }} ms</span>
              <span class="when" *ngIf="a.startedAt"> · {{ a.startedAt | date:'shortTime' }}</span>
              <button class="toggle apple-btn" (click)="toggleAttempt(i)">{{ expanded[i] ? 'Masquer' : 'Voir' }}</button>
            </div>
            <div class="io" *ngIf="expanded[i]">
              <div>
                <div class="k">input</div>
                <pre>{{ a.input | json }}</pre>
              </div>
              <div>
                <div class="k">msgIn</div>
                <pre>{{ a.msgIn | json }}</pre>
              </div>
              <div>
                <div class="k">args.pre</div>
                <pre>{{ a.argsPre | json }}</pre>
              </div>
              <div>
                <div class="k">args.post</div>
                <pre>{{ a.argsPost | json }}</pre>
              </div>
              <div>
                <div class="k">output</div>
                <pre>{{ a.result | json }}</pre>
              </div>
              <div>
                <div class="k">msgOut</div>
                <pre>{{ a.msgOut | json }}</pre>
              </div>
            </div>
          </div>
          <h6>Journal (brut)</h6>
          <div class="attempt" *ngFor="let ev of backendEvents">
            <div class="hdr">
              <span class="nid">{{ ev?.data?.nodeId || ev?.type }}</span>
              <span class="dur">{{ ev?.ts || ev?.data?.ts || '' }}</span>
            </div>
            <pre>{{ ev | json }}</pre>
          </div>
        </aside>
      </div>
    </section>
  </div>
  `,
  styles: [`
    .flow-exec { position: relative; display:grid; grid-template-columns: 360px 1fr; gap: 0; height:100%; }
    .side.executions { border: none; border-radius: 0; padding: 12px; background: #ffffff; overflow: auto; }
    .side.executions h4 { margin: 0 0 8px; font-weight: 600; }
     .mode-row { display:flex; gap:6px; align-items:center; margin-bottom:8px; }
    .mode-row .mode-select { flex:0 0 76px; padding:3px 6px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; font-size:12px; }
    .mode-row .icon-btn { border:1px solid #e5e7eb; background:#fff; border-radius:10px; padding:6px 8px; font-size:12px; }
    .counters { display:flex; gap:8px; margin: 8px 0; }
    .badge { display:inline-block; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:4px 8px; font-size:12px; }
    .exec-list { list-style: none; padding: 0; margin: 8px 0; display:flex; flex-direction:column; gap:6px; }
    .exec-list.scrollable { max-height: 42vh; overflow: auto; }
    .exec-list li { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; cursor:pointer; }
    .exec-item { position: relative; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
    .exec-item .line1 { display:flex; gap:8px; align-items:center; font-weight:600; }
    .exec-item .line2 { color:#6b7280; font-size:12px; margin-top:2px; }
    .exec-item .badge.st { border:1px solid #e5e7eb; padding:2px 6px; border-radius:6px; font-size:12px; text-transform: lowercase; }
    .exec-item .badge.st.success { color:#0f5132; background:#d1e7dd; border-color:#badbcc; }
    .exec-item .badge.st.error { color:#842029; background:#f8d7da; border-color:#f5c2c7; }
    .exec-item .badge.st.running { color:#1d4ed8; background:#dbeafe; border-color:#bfdbfe; }
    .exec-item .actions { position:absolute; right:8px; top:8px; display:flex; gap:6px; }
    .icon-btn.primary { background:#1677ff; color:#fff; border:1px solid #1677ff; }
    .exec-list li.sel { border-color:#1677ff; }
    .attempts { margin-top: 10px; }
    .attempts h5 { margin: 8px 0; }
    .attempt { border:1px solid #e5e7eb; border-radius:10px; padding:8px; margin-bottom:8px; }
    .attempt .hdr { display:flex; gap:8px; align-items:center; font-size:12px; }
    .attempt .hdr .nid { font-weight:600; }
    .attempt .hdr .st { padding:2px 6px; border-radius:6px; border:1px solid #e5e7eb; }
    .attempt .hdr .st.success { color:#0f5132; background:#d1e7dd; border-color:#badbcc; }
    .attempt .hdr .st.error { color:#842029; background:#f8d7da; border-color:#f5c2c7; }
    .attempt .hdr .dur { margin-left:auto; color:#8c8c8c; }
    .attempt .hdr .when { color:#8c8c8c; }
    .attempt .hdr .toggle { margin-left:8px; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; font-size:12px; cursor:pointer; }
    .attempt .io { display:grid; grid-template-columns: 1fr; gap:8px; margin-top:6px; }
    .attempt .io .k { font-size:12px; color:#8c8c8c; margin-bottom:4px; }
    pre { background:#fafafa; border:1px solid #eee; border-radius:6px; padding:6px; font-size:11px; overflow:auto; }
    .viewer { position: relative; height:100%; overflow: hidden; }
    .viewer-layout { display:grid; grid-template-columns: 1fr 0; height:100%; transition: grid-template-columns .25s ease; }
    .viewer-layout.show-details { grid-template-columns: 1fr 380px; }
    .viewer-canvas-wrap { height:100%; }
    .viewer-canvas { height: 100%; display:block; }
    .details-panel { border-left:1px solid #e5e7eb; background:#fff; height:100%; overflow:auto; padding:10px; }
    .panel-header { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .panel-header .title { font-weight:600; }
    .panel-header .spacer { flex:1 1 auto; }
    .loading-overlay { position:absolute; inset:0; background: rgba(255,255,255,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index: 10; }
    .loading-overlay .spinner { width:28px; height:28px; border:3px solid #e5e7eb; border-top-color:#111827; border-radius:50%; animation: spin .8s linear infinite; }
    .loading-overlay .text { margin-top:10px; color:#374151; font-weight:500; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class FlowExecutionComponent {
  mode: ExecutionMode = 'test';
  runs: ExecutionRun[] = [];
  visibleRuns: ExecutionRun[] = [];
  counters = { launched: 0, completed: 0 };
  selectedRun: ExecutionRun | null = null;

  currentFlowId: string | null = null;
  hasFlowParam = false;
  loadingFlowDoc = false;

  constructor(
    private runner: FlowRunService,
    private shared: FlowSharedStateService,
    private route: ActivatedRoute,
    private router: Router,
    private catalog: CatalogService,
    private cdr: ChangeDetectorRef,
    private runsApi: RunsBackendService,
    private ui: UiMessageService,
    private acl: AccessControlService,
    private zone: NgZone,
    private pathSvc: FlowPathHighlightService,
  ) {
    this.runner.runs$.subscribe(rs => { this.runs = rs; this.updateVisibleRuns(); });
    this.runner.counters$.subscribe(c => this.counters = c);
    this.shared.getGraph$().subscribe(g => {
      if (g && !this.currentFlowId) {
        this.currentGraph = g; this.updateVisibleRuns();
        try { this.cdr.detectChanges(); } catch {}
      }
    });
    // React to query param changes to load flow graph proactively
    try {
      this.route.queryParamMap.subscribe(qp => {
        const flowId = qp.get('flow');
        this.hasFlowParam = !!flowId;
        if (flowId && flowId !== this.currentFlowId) {
          this.currentFlowId = flowId;
          this.currentGraph = null;
          this.loadingFlowDoc = true;
          this.catalog.getFlow(flowId).subscribe({
            next: (doc) => this.zone.run(() => {
              if (doc) this.currentGraph = { id: doc.id, name: doc.name, description: doc.description, nodes: doc.nodes || [], edges: doc.edges || [] };
              this.updateVisibleRuns();
              this.loadBackendRuns(flowId);
              this.loadingFlowDoc = false;
              try { this.cdr.detectChanges(); } catch {}
            }),
            error: () => this.zone.run(() => { this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {} }),
            complete: () => this.zone.run(() => { /* ensure overlay clears in all cases */ this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {} })
          });
        }
      });
    } catch {}
    // Load workspace runs initially even if no ?flow param (recent runs)
    try { setTimeout(() => this.loadBackendRuns(), 0); } catch {}
  }
  currentGraph: any = null;
  exampleGraph = {
    nodes: [
      {
        id: 'node_send',
        point: { x: 380, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_send',
            name: 'SendMail',
            template: 'tmpl_sendmail',
            templateObj: {
              id: 'tmpl_sendmail',
              name: 'SendMail',
              type: 'function',
              icon: 'fa-solid fa-envelope',
              title: 'Send mail',
              subtitle: 'Exemple',
              output: [],
              args: {}
            },
            context: {},
            invalid: false
          }
        }
      },
      {
        id: 'node_fn2',
        point: { x: 180, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_fn2',
            name: 'Function2',
            template: 'tmpl_fn2',
            templateObj: {
              id: 'tmpl_fn2',
              name: 'Function2',
              type: 'function',
              icon: 'fa-solid fa-bolt',
              title: 'Function 2 outputs',
              subtitle: 'Demo',
              output: ['Oui','Non'],
              args: {}
            },
            context: {}
          }
        }
      },
      {
        id: 'node_cond',
        point: { x: 600, y: 320 },
        type: 'html-template',
        data: {
          model: {
            id: 'node_cond',
            name: 'Condition',
            template: 'tmpl_condition',
            templateObj: {
              id: 'tmpl_condition',
              name: 'Condition',
              type: 'condition',
              icon: 'fa-solid fa-code-branch',
              title: 'Condition',
              subtitle: 'Multi-branch',
              args: {},
              output_array_field: 'items'
            },
            context: { items: ['A','B','C'] }
          }
        }
      }
    ],
    edges: []
  };

  onRun() {
    const graph = this.currentGraph || this.exampleGraph;
    const flowId = (this.currentGraph && (this.currentGraph as any).id) || this.route.snapshot.queryParamMap.get('flow') || 'adhoc';
    const run = this.runner.run(graph, this.mode, { hello: 'world' }, flowId);
    this.selectedRun = run;
  }

  // Backend runs (history + start/cancel)
  backendFlowRuns: BackendRun[] = [];
  backendWsRuns: BackendRun[] = [];
  selectedBackendRun: BackendRun | null = null;
  backendEvents: any[] = [];
  backendAttempts: Array<{ nodeId: string; exec?: number; status?: string; durationMs?: number; startedAt?: string; finishedAt?: string; input?: any; argsPre?: any; argsPost?: any; result?: any; msgIn?: any; msgOut?: any }> = [];
  expanded: boolean[] = [];
  private currentStream?: { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void };
  private backendLastNodeId: string | null = null;
  private backendPairs = new Set<string>();
  @ViewChild('detailsPanel', { static: false }) detailsPanel?: ElementRef<HTMLElement>;
  // Pagination state for backendFlowRuns
  private flowRunsPage = 1;
  private flowRunsLimit = 20;
  private flowRunsLoading = false;
  private flowRunsHasMore = true;
  private loadBackendRuns(flowId?: string, append: boolean = false) {
    const fid = flowId || this.currentFlowId || undefined;
    const wsId = this.acl.currentWorkspaceId() || undefined;
    if (!environment.useBackend) return;
    const sort = 'startedAt:desc';
    const offset = append ? (this.flowRunsPage - 1) * this.flowRunsLimit : 0;
    this.flowRunsLoading = true;
    if (fid) {
      this.runsApi.listByFlow(fid, { limit: this.flowRunsLimit, offset, sort } as any).subscribe({ next: l => {
        this.zone.run(() => {
          const arr = l || [];
          this.flowRunsHasMore = arr.length === this.flowRunsLimit;
          this.backendFlowRuns = append ? [...this.backendFlowRuns, ...arr] : arr;
          this.flowRunsLoading = false;
          try { this.cdr.detectChanges(); } catch {}
        });
      }, error: () => { this.flowRunsLoading = false; } });
    } else if (wsId) {
      this.runsApi.listByWorkspace(wsId, { limit: this.flowRunsLimit, offset, sort } as any).subscribe({ next: l => {
        this.zone.run(() => {
          const arr = l || [];
          this.flowRunsHasMore = arr.length === this.flowRunsLimit;
          this.backendFlowRuns = append ? [...this.backendFlowRuns, ...arr] : arr;
          this.flowRunsLoading = false;
          try { this.cdr.detectChanges(); } catch {}
        });
      }, error: () => { this.flowRunsLoading = false; } });
    }
  }

  attemptsLen(v: any): number {
    try { return Array.isArray(v) ? v.length : 0; } catch { return 0; }
  }
  runBackend() {
    const fid = this.currentFlowId || (this.currentGraph && (this.currentGraph as any).id) || null;
    if (!fid) { this.ui.error('Aucun flow associé'); try { console.warn('[frontend][exec] runBackend: missing flowId'); } catch {} return; }
    this.runsApi.start(fid, { hello: 'world' }).subscribe({
      next: (resp: any) => {
        this.ui.success('Exécution démarrée');
        try { console.log('[frontend][exec] run started', resp); } catch {}
        this.loadBackendRuns(fid);
        try {
          const runId = resp?.id || resp?.data?.id || resp?.runId;
          if (runId) {
            // Decharge l'ancien run (visuels) et sélectionne le nouveau
            this.backendPairs.clear();
            this.backendAttempts = [];
            this.backendEvents = [];
            this.selectedBackendRun = { id: runId, flowId: this.currentFlowId || '', status: 'running' } as BackendRun;
            this.openBackendStream(runId);
          }
        } catch {}
      },
      error: (e) => { try { console.error('[frontend][exec] run start error', e); } catch {} this.ui.error('Échec du démarrage'); },
    });
  }
  cancelBackend(runId: string) {
    this.runsApi.cancel(runId).subscribe({ next: () => { this.ui.success('Annulation demandée'); this.loadBackendRuns(this.currentFlowId || undefined); }, error: () => this.ui.error('Échec de l\'annulation') });
  }

  selectRun(r: ExecutionRun) { this.selectedRun = r; }

  selectBackendRun(b: BackendRun) {
    if (this.selectedBackendRun && this.selectedBackendRun.id === b.id) {
      this.selectedBackendRun = null;
      try { this.currentStream?.close(); } catch {}
      // Clear visuals when no run is selected
      this.backendPairs.clear();
      this.backendAttempts = [];
      this.backendEvents = [];
      return;
    }
    this.selectedBackendRun = b;
    const fid = b?.flowId || null;
    if (fid && (!this.currentGraph || String(this.currentGraph.id) !== String(fid))) {
      this.loadingFlowDoc = true;
      this.catalog.getFlow(fid).subscribe({
        next: (doc) => { this.currentGraph = doc ? { id: doc.id, name: doc.name, description: doc.description, nodes: doc.nodes || [], edges: doc.edges || [] } : null; this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {}; if (b && b.id) this.prepareRunDetail(b); },
        error: () => { this.loadingFlowDoc = false; try { this.cdr.detectChanges(); } catch {}; if (b && b.id) this.prepareRunDetail(b); }
      });
    } else if (b && b.id) {
      this.prepareRunDetail(b);
    }
  }
  private prepareRunDetail(runOrId: BackendRun | string){
    const runId = typeof runOrId === 'string' ? runOrId : runOrId.id;
    const status = typeof runOrId === 'string' ? (this.selectedBackendRun?.status || 'running') : (runOrId.status || 'running');
    // Load attempts + events snapshot so historic runs render with exact path
    this.runsApi.getWith(runId, ['attempts','events']).subscribe({ next: (r) => {
      const attempts = (r as any)?.attempts || [];
      const events = (r as any)?.events || [];
      this.backendAttempts = attempts.map((a: any) => ({ nodeId: a.nodeId, exec: a.attempt, status: a.status, durationMs: a.durationMs, startedAt: a.startedAt, finishedAt: a.finishedAt, input: a.input, argsPre: a.argsPre, argsPost: a.argsPost, result: a.result, msgIn: a.msgIn, msgOut: a.msgOut }));
      this.backendEvents = events;
      this.expanded = this.backendAttempts.map(() => false);
      try { this.cdr.detectChanges(); } catch {}
    }, complete: () => {
      if (status === 'running') this.openBackendStream(runId);
    } });
  }
  onViewRunClick(b: BackendRun) {
    this.selectBackendRun(b);
    this.scrollToDetails();
  }
  openInEditor(b: BackendRun) {
    try { this.router.navigate(['/flow-builder'], { queryParams: { flow: b.flowId, run: b.id } }); } catch {}
  }
  private scrollToDetails() {
    try { setTimeout(() => { const el = this.detailsPanel?.nativeElement; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); } catch {}
  }

  private updateVisibleRuns() {
    const fid = this.currentFlowId;
    if (fid) this.visibleRuns = (this.runs || []).filter(r => String(r.flowVersionId) === String(fid));
    else this.visibleRuns = this.runs || [];
  }

  toggleAttempt(i: number) {
    try { this.expanded[i] = !this.expanded[i]; } catch {}
  }
  expandAllAttempts() {
    try { this.expanded = (this.backendAttempts || []).map(() => true); } catch {}
  }
  collapseAllAttempts() {
    try { this.expanded = (this.backendAttempts || []).map(() => false); } catch {}
  }

  // Decorate nodes/edges for selected run: add status per node and highlight taken edges
  get decoratedNodes(): any[] {
    const baseNodes = (this.currentGraph?.nodes || []) as any[];
    const smap = new Map<string, string>();
    const counts = new Map<string, number>();
    if (this.selectedBackendRun) {
      for (const a of this.backendAttempts) {
        const nid = String(a.nodeId);
        smap.set(nid, a.status || 'success');
        counts.set(nid, (counts.get(nid) || 0) + 1);
      }
    } else {
      const atts = this.selectedRun?.attempts || [];
      for (const a of atts) { const nid = String(a.nodeId); smap.set(nid, a.status); counts.set(nid, (counts.get(nid) || 0) + 1); }
    }
    return baseNodes.map((n: any) => ({ ...n, data: { ...n.data, execStatus: smap.get(String(n.id)), execCount: counts.get(String(n.id)) || 0 } }));
  }
  get decoratedEdges(): any[] {
    const baseEdges = (this.currentGraph?.edges || []) as any[];
    // Build pairs like in builder: prefer explicit live pairs, else exact events, else linear attempts
    const pairs = this.pathSvc.buildPairs({ explicitPairs: this.backendPairs, events: this.backendEvents, attempts: this.backendAttempts });
    return this.pathSvc.decorateEdges(baseEdges, pairs);
  }

  private openBackendStream(runId: string) {
    // Close previous stream
    try { this.currentStream?.close(); } catch {}
    this.backendEvents = [];
    this.backendAttempts = [];
    this.expanded = [];
    this.backendPairs.clear();
    this.backendLastNodeId = null;
    const s = this.runsApi.stream(runId);
    this.currentStream = s;
    s.on((ev) => {
      const t = ev?.type as string;
      if (!t) return;
      if (t === 'run.status') {
        const st = ev?.run?.status || ev?.data?.status;
        if (this.selectedBackendRun) this.selectedBackendRun.status = st || this.selectedBackendRun.status;
        // Also reflect in history list item if present
        try {
          const idx = this.backendFlowRuns.findIndex(x => String(x.id) === String(runId));
          if (idx >= 0 && st) this.backendFlowRuns[idx] = { ...this.backendFlowRuns[idx], status: st } as any;
        } catch {}
        // Seed start node to allow prev->current fallback path coloring
        if (st === 'running') {
          this.backendLastNodeId = this.findStartNodeId();
        }
        // Close stream on terminal state to avoid EventSource auto-reconnect loop
        if (st === 'success' || st === 'error' || st === 'cancelled' || st === 'timed_out') {
          try { s.close(); } catch {}
        }
      }
      if (t === 'node.status') {
        const nodeId = String(ev.nodeId || ev.data?.nodeId || '');
        const exec = (ev as any)?.exec ?? ev?.data?.exec;
        const status = ev?.data?.status || 'running';
        const startedAt = ev?.data?.startedAt;
        const finishedAt = ev?.data?.finishedAt;
        const durationMs = ev?.data?.durationMs;
        if (status === 'running') {
          const existing = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
          if (existing) {
            existing.startedAt = existing.startedAt || startedAt;
            existing.status = 'running';
          } else {
            this.backendAttempts.push({ nodeId, exec, status, startedAt } as any);
            this.expanded.push(false);
          }
          const prev = this.backendLastNodeId;
          if (prev && nodeId && prev !== nodeId) this.backendPairs.add(`${prev}->${nodeId}`);
          this.backendLastNodeId = nodeId || this.backendLastNodeId;
        } else {
          const cur = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
          if (cur) {
            cur.status = status;
            cur.finishedAt = finishedAt ?? cur.finishedAt;
            cur.durationMs = durationMs ?? cur.durationMs;
          } else {
            this.backendAttempts.push({ nodeId, exec, status, startedAt, finishedAt, durationMs } as any);
            this.expanded.push(false);
          }
        }
      }
      if (t === 'edge.taken') {
        const s = String(ev?.data?.sourceId || ev?.sourceId || '');
        const d = String(ev?.data?.targetId || ev?.targetId || '');
        if (s && d && s !== d) this.backendPairs.add(`${s}->${d}`);
      }
      if (t === 'node.result') {
        const nodeId = String(ev.nodeId || '');
        const exec = (ev as any)?.exec ?? ev?.data?.exec;
        const cur = this.backendAttempts.find(a => a.nodeId === nodeId && a.exec === exec);
        if (cur) {
          if (!cur.status || cur.status === 'running') cur.status = 'success';
          cur.input = ev.data?.input ?? cur.input;
          cur.argsPre = ev.data?.argsPre ?? cur.argsPre;
          cur.result = (ev.result ?? ev.data?.result) ?? cur.result;
          cur.argsPost = ev.data?.argsPost ?? cur.argsPost;
          cur.msgIn = ev.data?.msgIn ?? cur.msgIn;
          cur.msgOut = ev.data?.msgOut ?? cur.msgOut;
          cur.durationMs = ev.data?.durationMs ?? cur.durationMs;
          cur.startedAt = ev.data?.startedAt ?? cur.startedAt;
          cur.finishedAt = ev.data?.finishedAt ?? cur.finishedAt;
        } else {
          this.backendAttempts.push({ nodeId, exec, status: 'success', input: ev.data?.input, argsPre: ev.data?.argsPre, argsPost: ev.data?.argsPost, result: ev.result ?? ev.data?.result, msgIn: ev.data?.msgIn, msgOut: ev.data?.msgOut, durationMs: ev.data?.durationMs, startedAt: ev.data?.startedAt, finishedAt: ev.data?.finishedAt } as any);
          this.expanded.push(false);
        }
      }
      if (!this.selectedBackendRun) this.selectedBackendRun = { id: runId, flowId: this.currentFlowId || '', status: 'running' } as BackendRun;
      try { this.cdr.detectChanges(); } catch {}
    });
  }

  private findStartNodeId(): string | null {
    try {
      const nodes = (this.currentGraph?.nodes || []) as any[];
      for (const n of nodes) {
        const t = n?.data?.model?.templateObj || {};
        const ty = String(t?.type || '').toLowerCase();
        if (ty === 'start') return String(n.id);
      }
      for (const n of nodes) { if (String(n.id).toLowerCase().includes('start')) return String(n.id); }
    } catch {}
    return null;
  }
  onListScroll(ev: Event) {
    try {
      const el = ev.target as HTMLElement;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
      if (nearBottom && !this.flowRunsLoading && this.flowRunsHasMore) {
        this.flowRunsPage += 1;
        this.loadBackendRuns(undefined, true);
      }
    } catch {}
  }

}
