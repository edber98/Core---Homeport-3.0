import { CommonModule } from '@angular/common';
import { Component, NgZone } from '@angular/core';
import { FlowViewerComponent } from './flow-viewer.component';
import { FormsModule } from '@angular/forms';
import { FlowRunService, ExecutionRun, ExecutionMode } from '../../services/flow-run.service';
import { RunsBackendService, BackendRun } from '../../services/runs-backend.service';
import { UiMessageService } from '../../services/ui-message.service';
import { AccessControlService } from '../../services/access-control.service';
import { environment } from '../../../environments/environment';
import { FlowSharedStateService } from '../../services/flow-shared-state.service';
import { ActivatedRoute } from '@angular/router';
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
      <div class="exec-list">
        <div class="exec-item" *ngFor="let b of backendFlowRuns" (click)="selectedBackendRun=b">
          <div class="line1">#{{ b.id }} — {{ b.status }}</div>
          <div class="actions">
            <button class="icon-btn" (click)="cancelBackend(b.id); $event.stopPropagation()" title="Annuler"><i class="fa-solid fa-ban"></i></button>
          </div>
        </div>
        <div class="empty" *ngIf="backendFlowRuns.length===0">Aucune exécution pour ce flow</div>
      </div>
      <div class="attempts" *ngIf="selectedRun as rs">
        <h5>Détails ({{ rs.attempts?.length || 0 }} nœuds)</h5>
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
      <flow-viewer class="viewer-canvas"
        [nodes]="decoratedNodes"
        [edges]="decoratedEdges"
        [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"></flow-viewer>
      <div *ngIf="selectedBackendRun as br" style="padding:10px;">
        <h5>Exécution backend sélectionnée</h5>
        <pre>{{ br | json }}</pre>
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
    .exec-list li { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; cursor:pointer; }
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
    .attempt .io { display:grid; grid-template-columns: 1fr; gap:8px; margin-top:6px; }
    .attempt .io .k { font-size:12px; color:#8c8c8c; margin-bottom:4px; }
    pre { background:#fafafa; border:1px solid #eee; border-radius:6px; padding:6px; font-size:11px; overflow:auto; }
    .viewer { position: relative; height:100%; overflow: hidden; }
    .viewer-canvas { height: 100%; display:block; }
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
    private catalog: CatalogService,
    private cdr: ChangeDetectorRef,
    private runsApi: RunsBackendService,
    private ui: UiMessageService,
    private acl: AccessControlService,
    private zone: NgZone,
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
  private loadBackendRuns(flowId?: string) {
    const fid = flowId || this.currentFlowId || undefined;
    const wsId = this.acl.currentWorkspaceId() || undefined;
    if (environment.useBackend) {
      if (fid) this.runsApi.listByFlow(fid, { page: 1, limit: 50, sort: 'createdAt:desc' }).subscribe({ next: l => this.backendFlowRuns = l || [] });
      if (wsId) this.runsApi.listByWorkspace(wsId, { page: 1, limit: 50, sort: 'createdAt:desc' }).subscribe({ next: l => this.backendWsRuns = l || [] });
    }
  }
  runBackend() {
    const fid = this.currentFlowId;
    if (!fid) { this.ui.error('Aucun flow associé'); return; }
    this.runsApi.start(fid, { hello: 'world' }).subscribe({
      next: () => { this.ui.success('Exécution démarrée'); this.loadBackendRuns(fid); },
      error: () => this.ui.error('Échec du démarrage'),
    });
  }
  cancelBackend(runId: string) {
    this.runsApi.cancel(runId).subscribe({ next: () => { this.ui.success('Annulation demandée'); this.loadBackendRuns(this.currentFlowId || undefined); }, error: () => this.ui.error('Échec de l\'annulation') });
  }

  selectRun(r: ExecutionRun) { this.selectedRun = r; }

  private updateVisibleRuns() {
    const fid = this.currentFlowId;
    if (fid) this.visibleRuns = (this.runs || []).filter(r => String(r.flowVersionId) === String(fid));
    else this.visibleRuns = this.runs || [];
  }

  // Decorate nodes/edges for selected run: add status per node and highlight taken edges
  get decoratedNodes(): any[] {
    const baseNodes = this.hasFlowParam ? (this.currentGraph?.nodes || []) : ((this.currentGraph?.nodes || this.exampleGraph.nodes) || []);
    const smap = new Map<string, string>();
    const atts = this.selectedRun?.attempts || [];
    for (const a of atts) smap.set(String(a.nodeId), a.status);
    return baseNodes.map((n: any) => ({ ...n, data: { ...n.data, execStatus: smap.get(String(n.id)) } }));
  }
  get decoratedEdges(): any[] {
    const baseEdges = this.hasFlowParam ? (this.currentGraph?.edges || []) : ((this.currentGraph?.edges || this.exampleGraph.edges) || []);
    const atts = (this.selectedRun?.attempts || []).slice();
    const pairs = new Set<string>();
    for (let i = 1; i < atts.length; i++) {
      const prev = atts[i - 1]?.nodeId; const cur = atts[i]?.nodeId;
      if (prev && cur) pairs.add(`${prev}->${cur}`);
    }
    return baseEdges.map((e: any) => {
      const took = pairs.has(`${e.source}->${e.target}`);
      const data = { ...(e.data || {}) };
      if (took) { data.strokeWidth = (data.strokeWidth || 2) + 2; data.color = '#1677ff'; }
      return { ...e, data };
    });
  }
}
