import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FlowViewerSettingsNodeComponent } from './flow-viewer-settings-node.component';
import { CatalogService } from '../../services/catalog.service';
import { LayoutBackendService } from '../../services/layout-backend.service';
import { ConnectionSettings } from 'ngx-vflow';
import { RunsBackendService } from '../../services/runs-backend.service';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { backAwareCurve } from './edge-curves';

@Component({
  selector: 'flow-simulation',
  standalone: true,
  imports: [CommonModule, FlowViewerSettingsNodeComponent, NzDrawerModule, NzButtonModule],
  template: `
    <div class="sim-layout">
      <div class="viewer">
        <div class="loading" *ngIf="loading">
          <div class="spinner"></div>
          <div>Chargement du flow…</div>
        </div>
        <!-- Left panel (desktop) -->
        <aside class="left-panel" *ngIf="!isMobile">
          <div class="panel-title">Scénarios <span class="count" *ngIf="simScenarios?.length">({{ simScenarios.length }})</span></div>
          <div class="sc-list">
            <button class="sc-item" *ngFor="let sc of simScenarios; let i = index" [class.active]="i===simIndex" (click)="selectScenario(i)">
              <div class="label">{{ sc?.label || ('Cas ' + (i+1)) }}</div>
            </button>
          </div>
        </aside>
        <flow-viewer-settings-node *ngIf="!loading && flowId"
          [nodes]="$any(nodes)" [edges]="$any(edges)" [meta]="$any(meta)"
          [background]="$any(background)" [connectionSettings]="$any(connectionSettings)"
          [useStorage]="false" [showBottomBar]="true" [showRun]="false" [showSave]="false" [showCenterFlow]="true"
          [selectedNodeId]="$any(nodeId)" [simOutputPreview]="$any(simOutputPreview)" [focusNodeIds]="$any(focusNodeIds)">
        </flow-viewer-settings-node>
        <!-- FAB + drawer (mobile) -->
        <button nz-button nzSize="small" class="panel-toggle-fab left" *ngIf="isMobile" (click)="drawer=true" aria-label="Scénarios">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" id="sidebar">
            <g fill="none" fill-rule="evenodd" stroke="#6b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" transform="translate(1 1)">
              <rect width="16" height="16" rx="2"></rect>
              <path d="M6 0v18"></path>
            </g>
          </svg>
        </button>
        <nz-drawer [nzVisible]="drawer" (nzOnClose)="drawer=false" nzPlacement="left" [nzWidth]="300" [nzClosable]="true">
          <ng-container *nzDrawerContent>
            <div class="panel-title">Scénarios <span class="count" *ngIf="simScenarios?.length">({{ simScenarios.length }})</span></div>
            <div class="sc-list">
              <button class="sc-item" *ngFor="let sc of simScenarios; let i = index" [class.active]="i===simIndex" (click)="selectScenario(i)">
                <div class="label">{{ sc?.label || ('Cas ' + (i+1)) }}</div>
              </button>
            </div>
          </ng-container>
        </nz-drawer>
      </div>
    </div>
  `,
  styles: [`
    .sim-layout { position:relative; display:flex; flex-direction:column; height:100%; }
    .viewer { position:relative; flex:1 1 auto; min-height:0; display:grid; grid-template-columns: 300px 1fr; }
    /* Override global mobile padding in Simulation only */
    .viewer { padding-bottom: 0 !important; }
    .left-panel { border: none; padding:8px; background: linear-gradient(180deg, #f8f8f8 0%, #ececec 100%); box-sizing: border-box; }
    .panel-title { font-size:12px; color:#6b7280; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
    .panel-title .count { color:#374151; font-weight:600; }
    .sc-list { display:grid; gap:6px; }
    .sc-item { width:100%; box-sizing: border-box; display:block; text-align:left; padding:8px 10px; border:1px solid #E5E7EB; background:#fff; border-radius:10px; cursor:pointer; }
    .sc-item .label { display:block; font-size:12px; line-height:1.3; word-break: break-word; overflow-wrap: anywhere; }
    .sc-item.active, .sc-item:hover { background:#fdf2f8; border-color:#f9a8d4; }
    .loading { position:absolute; inset:0; display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center; background: rgba(255,255,255,0.6); z-index: 2; }
    .spinner { width:26px; height:26px; border-radius:50%; border:3px solid #eee; border-top-color:#e61982; animation:spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    /* Panel toggle FAB (local copy to match Flow Builder look) */
    .panel-toggle-fab { position: absolute; left: 12px; top: 12px; width: 40px; height: 40px; border-radius: 12px; padding: 0; display:inline-flex; align-items:center; justify-content:center; background:#fff; border:1px solid #e5e7eb; box-shadow: 0 8px 20px rgba(0,0,0,0.12); z-index: 3000; }
    .panel-toggle-fab i { font-size: 16px; color:#111; }
    @media (max-width: 768px) { .panel-toggle-fab { top: 12px; } }
    @media (max-width: 1024px) { .viewer { grid-template-columns: 1fr; } .left-panel { display:none; } }
    /* Avoid nz-drawer host taking layout space (same fix as Console AI/Executions) */
    nz-drawer { display: contents; }
  `]
})
export class FlowSimulationComponent implements OnInit, OnDestroy {
  flowId: string | null = null;
  nodeId: string | null = null;
  flowName = '';
  loading = false;
  private waitingLayout = false;
  private waitingScenarios = false;
  nodes: any[] = [];
  edges: any[] = [];
  meta: any = { ui: { portOrientation: 'vertical' } };
  background: any = { type: 'dots', gap: 25, color: '#e8e8e8', size: 1.6, backgroundColor: '#f8f8f8' };
  connectionSettings: ConnectionSettings = { type: 'template', curve: backAwareCurve } as any;
  isMobile = false;
  drawer = false;
  private mql?: MediaQueryList;
  private onMqlChange?: () => void;
  simScenarios: Array<{ id: string; index: number; label: string; msgIn: any; path?: { edges?: Array<{ sourceId: string; targetId: string; sourceHandle?: string }> }; trace?: Array<{ nodeId: string; kind?: string; startedAt?: string; finishedAt?: string; handlesUsed?: string[]; resultPreview?: Array<{ key: string; type: string }> }> }> = [];
  simIndex = 0;
  // Simulation output preview map for settings viewer (1-level schema per node)
  simOutputPreview: { [nodeId: string]: Array<{ id: string; name: string; type: string; children?: Array<{ id: string; name: string; type: string }> }> } = {};
  // Focused node ids used by viewer to center only on selected scenario path
  focusNodeIds: string[] = [];

  constructor(private route: ActivatedRoute, private catalog: CatalogService, private layoutApi: LayoutBackendService, private cdr: ChangeDetectorRef, private msg: NzMessageService, private runsApi: RunsBackendService) {
    try { this.flowId = this.route.snapshot.queryParamMap.get('flow'); this.nodeId = this.route.snapshot.queryParamMap.get('node'); } catch {}
    this.load();
  }

  ngOnInit() {
    try {
      this.mql = window.matchMedia('(max-width: 768px)');
      this.onMqlChange = () => { this.isMobile = !!this.mql?.matches; if (!this.isMobile) this.drawer = false; try { this.cdr.detectChanges(); } catch {} };
      this.mql.addEventListener ? this.mql.addEventListener('change', this.onMqlChange) : (this.mql as any).addListener?.(this.onMqlChange);
      this.onMqlChange();
    } catch {}
  }
  ngOnDestroy() {
    try { if (this.mql && this.onMqlChange) { this.mql.removeEventListener ? this.mql.removeEventListener('change', this.onMqlChange) : (this.mql as any).removeListener?.(this.onMqlChange); } } catch {}
  }

  private load() {
    const id = this.flowId; if (!id) return;
    this.loading = true; this.waitingLayout = true; this.waitingScenarios = !!this.nodeId; try { this.cdr.detectChanges(); } catch {}
    this.catalog.getFlow(id).subscribe({
      next: (doc) => {
        this.flowName = doc?.name || id;
        const meta = (doc?.meta || {}) as any;
        const ui = meta.ui || {};
        // Ignore alignment meta; force vertical orientation for Simulation
        this.meta = { ...meta, ui: { ...ui, portOrientation: 'vertical', alignmentHelper: false } };
        this.nodes = (doc?.nodes || []).map(n => ({ ...n }));
        this.edges = (doc?.edges || []).map(e => ({ ...e }));
        // If nodeId present, fetch simulation scenarios for that node and highlight path
        if (this.nodeId) { this.fetchScenariosAndHighlight(this.nodeId); }
        // Auto-layout (backend) then reveal
        // Build minimal graph like Flow Builder auto-layout and request backend ELK
        const graph = {
          nodes: (this.nodes || []).map(n => ({ id: String((n as any).id), data: { model: (n as any)?.data?.model } })),
          edges: (this.edges || []).map(e => ({ id: (e as any).id, source: String((e as any).source), target: String((e as any).target), sourceHandle: (e as any).sourceHandle, targetHandle: (e as any).targetHandle }))
        };
        const gapX = 260, gapY = 160;
        this.layoutApi.layoutGraph(graph as any, 'vertical', { width: 223, height: 110, gapX, gapY, includeDescriptions: false }).subscribe({
          next: (res: any) => {
            try {
              const positions = (res && (res.positions || (res.data && res.data.positions))) || {};
              const keys = positions ? Object.keys(positions) : [];
              if (keys.length) {
                const map = new Map<string, { x: number; y: number }>();
                keys.forEach(k => { const p = (positions as any)[k]; if (p && typeof p.x === 'number' && typeof p.y === 'number') map.set(String(k), { x: Math.round(p.x), y: Math.round(p.y) }); });
                this.nodes = (this.nodes || []).map(n => {
                  const id = String((n as any).id);
                  const p = map.get(id);
                  return p ? { ...n, point: { x: p.x, y: p.y } } : n;
                });
              }
              try { this.cdr.detectChanges(); } catch {}
            } catch {}
          },
          error: () => {},
          complete: () => { this.waitingLayout = false; this.maybeFinishLoading(); }
        });
      },
      error: () => { this.waitingLayout = false; this.waitingScenarios = false; this.loading = false; try { this.cdr.detectChanges(); } catch {}; try { this.msg.error('Échec de chargement du flow'); } catch {} }
    });
  }

  private fetchScenariosAndHighlight(nodeId: string) {
    const fid = this.flowId || '';
    this.runsApi.simulateMsg(fid, nodeId, 'engine_split').subscribe({
      next: (resp: any) => {
        const arr = Array.isArray(resp?.scenarios) ? resp.scenarios : [];
        this.simScenarios = arr;
        this.simIndex = 0;
        try { this.cdr.detectChanges(); } catch {}
        try { this.highlightScenarioIndex(0); } catch {}
      },
      error: () => {},
      complete: () => { this.waitingScenarios = false; this.maybeFinishLoading(); }
    });
  }
  selectScenario(i: number) { this.simIndex = i; try { this.highlightScenarioIndex(i); } catch {}; try { this.cdr.detectChanges(); } catch {} }

  private highlightPathTo(targetId: string) {
    const incoming = new Map<string, string[]>();
    for (const e of this.edges) {
      const to = String((e as any).to || (e as any).target || '');
      const from = String((e as any).from || (e as any).source || '');
      if (!to || !from) continue;
      const list = incoming.get(to) || []; list.push(from); incoming.set(to, list);
    }
    const visited = new Set<string>();
    const stack: string[] = [targetId];
    const pathEdges = new Set<any>();
    while (stack.length) {
      const n = stack.pop()!; if (visited.has(n)) continue; visited.add(n);
      const preds = incoming.get(n) || [];
      for (const p of preds) {
        stack.push(p);
        const ee = this.edges.filter(e => String((e as any).from|| (e as any).source||'')===p && String((e as any).to||(e as any).target||'')===n);
        ee.forEach(e => pathEdges.add(e));
      }
    }
    this.edges = this.edges.map(e => pathEdges.has(e) ? ({ ...e, data: { ...(e as any).data, color: '#e61982', strokeWidth: 2 } }) : e);
    try { this.cdr.detectChanges(); } catch {}
  }

  private highlightEdgesList(list: Array<{ sourceId: string; targetId: string; sourceHandle?: string }> | undefined) {
    if (!Array.isArray(list) || list.length === 0) return this.highlightPathTo(this.nodeId || '');
    const key = (e: any) => `${String(e.source || e.from)}|${String(e.target || e.to)}|${String(e.sourceHandle || '')}`;
    const wanted = new Set(list.map(it => `${String(it.sourceId)}|${String(it.targetId)}|${String(it.sourceHandle || '')}`));
    this.edges = (this.edges || []).map(e => {
      const match = wanted.has(key(e));
      return match ? { ...e, data: { ...(e as any).data, color: '#e61982', strokeWidth: 2, onPath: true } } : { ...e, data: { ...(e as any).data, color: (e as any).data?.color && (e as any).data?.color !== '#e61982' ? (e as any).data?.color : undefined, strokeWidth: undefined, onPath: false } };
    });
    // Update focused node ids for subset centering
    try {
      const nidSet = new Set<string>();
      for (const it of list) { nidSet.add(String(it.sourceId)); nidSet.add(String(it.targetId)); }
      this.focusNodeIds = Array.from(nidSet.values());
    } catch { this.focusNodeIds = []; }
  }

  private highlightScenarioIndex(i: number) {
    const sc = this.simScenarios && this.simScenarios[i];
    if (!sc) { this.highlightPathTo(this.nodeId || ''); return; }
    const edges = sc.path && Array.isArray(sc.path.edges) ? sc.path.edges : undefined;
    this.highlightEdgesList(edges);
    // Build 1-level outputs preview map from scenario trace
    try { this.simOutputPreview = this.buildOutputPreviewFromTrace(sc.trace || []); } catch { this.simOutputPreview = {}; }
    // Trigger a layout pass that accounts for first-level outputs (adjust vertical spacing)
    try { this.relayoutForScenario(sc); } catch {}
  }

  private buildOutputPreviewFromTrace(trace: Array<any>): { [nodeId: string]: Array<any> } {
    const map: { [nodeId: string]: Array<any> } = {};
    try {
      for (const t of trace || []){
        const nodeId = String(t.nodeId||''); if (!nodeId) continue;
        const arr = Array.isArray(t.resultPreview) ? t.resultPreview : [];
        map[nodeId] = arr.map((it:any, idx:number) => {
          const item: any = { id: `sim_${nodeId}_${idx}`, name: String(it?.key ?? it?.name ?? `item_${idx}`), type: String(it?.type ?? '') };
          if (Array.isArray(it?.children) && it.children.length) {
            item.children = it.children.map((ch: any, ci: number) => ({
              id: `sim_${nodeId}_${idx}_${ci}`, name: String(ch?.key ?? ch?.name ?? `child_${ci}`), type: String(ch?.type ?? '')
            }));
          }
          return item;
        });
      }
      // Fallback: for nodes with empty preview, try output handle schema
      for (const [nid, items] of Object.entries(map)) {
        if ((items as any[]).length > 0) continue;
        const nd = (this.nodes || []).find((n: any) => String((n as any).id) === nid);
        const tmpl = (nd as any)?.data?.model?.templateObj;
        if (!tmpl) continue;
        const outs = Array.isArray(tmpl.outputHandles) ? tmpl.outputHandles : [];
        const okH = outs.find((h: any) => String(h?.id) === 'ok') || outs[0] || null;
        if (okH?.schema?.fields && Array.isArray(okH.schema.fields)) {
          map[nid] = okH.schema.fields.filter((f: any) => f.key).map((f: any, i: number) => ({
            id: `sch_${nid}_${i}`, name: String(f.key || f.name || `field_${i}`), type: String(f.type || 'text')
          }));
        }
      }
    } catch {}
    return map;
  }

  private relayoutForScenario(sc: any) {
    // Build counts from scenario trace (prefer outputsCount from backend), fallback to preview length
    const counts: Record<string, number> = {};
    try {
      const trace: any[] = Array.isArray(sc?.trace) ? sc.trace : [];
      for (const t of trace) {
        const id = String(t?.nodeId || ''); if (!id) continue;
        const c = Number(t?.outputsCount);
        if (Number.isFinite(c)) counts[id] = c;
      }
      // Fallbacks for nodes not in trace or missing outputsCount
      for (const [k, arr] of Object.entries(this.simOutputPreview || {})) {
        if (counts[k as string] == null) counts[String(k)] = Array.isArray(arr) ? (arr as any[]).reduce((sum: number, it: any) => sum + 1 + (it.children?.length || 0), 0) : 0;
      }
    } catch {}
    const ids = Object.keys(counts).filter(k => (counts as any)[k] > 0);
    if (!ids.length) return;
    const graph = {
      nodes: (this.nodes || []).map(n => ({ id: String((n as any).id), data: { model: (n as any)?.data?.model } })),
      edges: (this.edges || []).map(e => ({ id: (e as any).id, source: String((e as any).source), target: String((e as any).target), sourceHandle: (e as any).sourceHandle, targetHandle: (e as any).targetHandle }))
    };
    const gapX = 260, gapY = 160;
    // Revenir au mode précédent (par niveau) avec 20px par item: base gap + (max du niveau précédent * 20)
    const baseGapY = 160; // espacement vertical de base (inchangé)
    this.layoutApi.layoutGraph(graph as any, 'vertical', { width: 223, height: 110, gapX, gapY: baseGapY, adjustByOutputs: true, perOutputYOffset: 25, perOutputXOffset: 12, outputsCount: counts, outputsMode: 'max', includeDescriptions: false }).subscribe({
      next: (res: any) => {
        try {
          const positions = (res && (res.positions || (res.data && res.data.positions))) || {};
          const keys = positions ? Object.keys(positions) : [];
          if (keys.length) {
            const map = new Map<string, { x: number; y: number }>();
            keys.forEach(k => { const p = (positions as any)[k]; if (p && typeof p.x === 'number' && typeof p.y === 'number') map.set(String(k), { x: Math.round(p.x), y: Math.round(p.y) }); });
            this.nodes = (this.nodes || []).map(n => {
              const id = String((n as any).id);
              const p = map.get(id);
              return p ? { ...n, point: { x: p.x, y: p.y } } : n;
            });
          }
          try { this.cdr.detectChanges(); } catch {}
        } catch {}
      },
      error: () => {},
      complete: () => {}
    });
  }

  // NOTE: When backend returns per-scenario path info, we can enrich highlighting here.

  private maybeFinishLoading() {
    if (!this.waitingLayout && !this.waitingScenarios) { this.loading = false; try { this.cdr.detectChanges(); } catch {} }
  }
}
