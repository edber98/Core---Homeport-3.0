import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Vflow, Edge, Connection, ConnectionSettings } from 'ngx-vflow';
import { MonacoJsonEditorComponent } from '../dynamic-form/components/monaco-json-editor.component';
import { FlowAdvancedEditorDialogComponent } from './advanced-editor/flow-advanced-editor-dialog.component';
import { FormsModule } from '@angular/forms';
import { FlowHistoryService } from './flow-history.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { Subscription } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { CatalogService, AppProvider } from '../../services/catalog.service';
import { DynamicFormService, FieldConfig } from '../../modules/dynamic-form/dynamic-form.service';
import { AccessControlService } from '../../services/access-control.service';
import { FlowPaletteService } from './flow-palette.service';
import { FlowGraphService } from './flow-graph.service';
import { FlowBuilderUtilsService } from './flow-builder-utils.service';
import { FlowPalettePanelComponent } from './palette/flow-palette-panel.component';
import { FlowInspectorPanelComponent } from './inspector/flow-inspector-panel.component';
import { FlowRunService } from '../../services/flow-run.service';
import { RunsBackendService } from '../../services/runs-backend.service';
import { FlowSharedStateService } from '../../services/flow-shared-state.service';
import { FlowHistoryTimelineComponent } from './history/flow-history-timeline.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'flow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzToolTipModule, NzPopoverModule, NzDrawerModule, NzButtonModule, NzModalModule, NzInputModule, NzSelectModule, NzFormModule, Vflow, MonacoJsonEditorComponent, FlowAdvancedEditorDialogComponent, FlowPalettePanelComponent, FlowInspectorPanelComponent, FlowHistoryTimelineComponent],
  templateUrl: './flow-builder.component.html',
  styleUrl: './flow-builder.component.scss'
})
export class FlowBuilderComponent {
  // Palette configurable (peut évoluer vers un service)
  private DRAFT_KEY_PREFIX = 'flow.draft.';
  private lastSavedChecksum: string | null = null;
  items: any[] = [];

  templates: any[] = [
   ];

  nodes: any[] = [];
  edges: Edge[] = [];
  connectionSettings: ConnectionSettings = {};
  private errorNodes = new Set<string>();

  @ViewChild('flowHost', { static: false }) flowHost?: ElementRef<HTMLElement>;
  @ViewChild('flow', { static: false }) flow?: any;
  // Drop zone host is the canvas host element

  selection: any = null;
  inspectorTab: 'settings' | 'json' = 'settings';
  get selectedNode() { return this.selection; }
  get selectedModel() { return this.selection?.data?.model || null; }
  editJson = '';
  advancedOpen = false;
  isImporting = false;
  toastMsg = '';
  // Advanced dialog injected contexts for test mode
  advancedCtx: any = {};
  advancedInjectedInput: any = null;
  advancedInjectedOutput: any = null;
  builderMode: 'test'|'prod' = 'test';
  lastRun: any = null;
  currentRun: any = null;
  loadingFlowDoc = false;
  // Backend live run state (per current execution)
  backendRunId: string | null = null;
  private backendStream?: { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void };
  private backendNodeStats = new Map<string, { count: number; lastStatus?: 'success'|'error'|'skipped'|'running' }>();
  private backendNodeAttempts = new Map<string, Array<{ exec?: number; status?: string; startedAt?: string; finishedAt?: string; durationMs?: number; input?: any; argsPre?: any; argsPost?: any; result?: any }>>();
  private backendLastNodeId: string | null = null;
  private backendEdgesTaken = new Set<string>();
  private startPayloadKey(): string {
    const fid = this.currentFlowId || 'adhoc';
    return `flow.startPayload.${fid}`;
  }
  private getStartPayload(): any {
    try {
      const key = this.startPayloadKey();
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
      const def = { payload: null };
      try { localStorage.setItem(key, JSON.stringify(def)); } catch {}
      return def;
    } catch { return { payload: null }; }
  }

  
  private setStartPayload(v: any) {
    try { localStorage.setItem(this.startPayloadKey(), JSON.stringify(v ?? {})); } catch {}
  }
  private toastTimer: any;
  private applyingHistory = false;
  private ignoreEventsUntil = 0;
  private pushPending = false;
  private allowedRemovedEdgeIds = new Set<string>();
  private draggingPalette = new Set<string>();

  // Lightweight tooltip state for output handles
  tipVisible = false;
  tipText = '';
  tipX = 0;
  tipY = 0;
  tipError = false;

  zoomDisplay = 1;
  private viewportSub?: Subscription;
  zoomPercent = 100;


  // Context menu state
  ctxMenuVisible = false;
  ctxMenuX = 0;
  ctxMenuY = 0;
  ctxMenuTarget: any = null; // node or edge
  /* private applyingHistory = false; */
  constructor(
    public history: FlowHistoryService,
    private message: NzMessageService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private catalog: CatalogService,
    private paletteSvc: FlowPaletteService,
    private graph: FlowGraphService,
    private fbUtils: FlowBuilderUtilsService,
    private acl: AccessControlService,
    private dfs: DynamicFormService,
    private route: ActivatedRoute,
    private runner: FlowRunService,
    private runsApi: RunsBackendService,
    private shared: FlowSharedStateService,
    private modal: NzModalService,
    private router: Router,
  ) { }
  isMobile = false;
  // Apps map for provider grouping/logo
  private appsMap = new Map<string, AppProvider>();
  // Responsive drawers (mobile/tablet)
  leftDrawer = false;
  rightDrawer = false;
  // When opening on mobile, hide vflow first, then open the drawer
  prepOpenDrawer = false;
  openPanel(where: 'left' | 'right') { if (where === 'left') this.leftDrawer = true; else this.rightDrawer = true; }
  openMobilePanel(where: 'left' | 'right') {
    if (!this.isMobile) { this.openPanel(where); this.updateGlobalBlockers(); return; }
    this.prepOpenDrawer = true;
    try { this.cdr.detectChanges(); } catch { }
    setTimeout(() => {
      if (where === 'left') this.leftDrawer = true; else this.rightDrawer = true;
      this.updateGlobalBlockers();
      this.prepOpenDrawer = false;
      try { this.cdr.detectChanges(); } catch { }
    }, 0);
  }
  get dndDisabled(): boolean { return !!(this.isMobile || this.leftDrawer || this.rightDrawer); }
  // Mobile drawer DnD helpers


  // Global blockers to prevent vflow/CDK from handling events when a drawer is open (iOS fix)
  private blockersActive = false;
  private teardownBlockers: Array<() => void> = [];
  // Neutralize global blockers (dev page works without them). Keep API but no-op.
  private enableGlobalBlockers() { /* no-op */ }
  private disableGlobalBlockers() { /* no-op */ }
  updateGlobalBlockers() { /* no-op */ }
  onLeftDrawerClose() { this.leftDrawer = false; this.prepOpenDrawer = false; this.updateGlobalBlockers(); }
  onRightDrawerClose() { this.rightDrawer = false; this.prepOpenDrawer = false; this.updateGlobalBlockers(); }
  // Palette search and groups (materialized to avoid re-creating arrays each CD cycle)
  paletteQuery = '';
  paletteGroups: { title: string; items: any[]; appId?: string; appColor?: string; appIconClass?: string; appIconUrl?: string }[] = [];
  // Header labels
  headerTitle = 'Flow Builder';
  headerSubtitle = 'Conception du flow';
  private currentFlowId: string | null = null;
  currentFlowName: string = '';
  currentFlowDesc: string = '';
  currentFlowStatus: 'draft'|'test'|'production' = 'draft';
  currentFlowEnabled: boolean = false;

  // Long-press detection for mobile context menu
  private lpTimer: any = null;
  private lpStartX = 0;
  private lpStartY = 0;
  private lpCurX = 0;
  private lpCurY = 0;
  private lpTarget: any = null;
  private lpFired = false;
  private readonly lpDelay = 520; // ms
  private readonly lpMoveThresh = 10; // px
  private allTemplates: any[] = [];
  private allowedTplIds = new Set<string>();
  private allFlows: { id: string; name: string; description?: string }[] = [];
  validationIssues: Array<{ kind: 'node' | 'flow'; nodeId?: string; message: string }> = [];
  private openedNodeConfig = new Set<string>();

  // Removed event interceptors to align with working dev playground

  ngOnInit() {
    // Debug helpers removed
    // Subscribe run streams (builder live panel)
    try {
      (this.runner as any).runs$?.subscribe((rs: any[]) => {
        this.lastRun = rs && rs.length ? rs[0] : null;
        this.currentRun = rs.find(r => r.status === 'running') || null;
      });
    } catch {}
    this.updateIsMobile();
    // Open specific run in editor if ?run is provided
    try {
      this.route.queryParamMap.subscribe(qp => {
        const runId = qp.get('run');
        const flowId = qp.get('flow');
        if (flowId && (!this.currentFlowId || String(this.currentFlowId) !== String(flowId))) {
          // Load flow graph first, then open run stream/snapshot
          this.loadingFlowDoc = true;
          this.catalog.getFlow(flowId).subscribe({
            next: (doc) => {
              this.currentFlowId = flowId;
              this.currentFlowName = doc?.name || this.currentFlowName;
              this.currentFlowDesc = doc?.description || this.currentFlowDesc;
              this.nodes = (doc?.nodes || []);
              this.edges = (doc?.edges || []);
              this.loadingFlowDoc = false;
              if (runId) this.openRunSnapshotInEditor(runId);
              try { this.cdr.detectChanges(); } catch {}
            },
            error: () => { this.loadingFlowDoc = false; if (runId) this.openRunSnapshotInEditor(runId); }
          });
        } else if (runId) {
          this.openRunSnapshotInEditor(runId);
        }
      });
    } catch {}
    try {
      this.catalog.listApps().subscribe(list => this.zone.run(() => {
        (list || []).forEach(a => this.appsMap.set(a.id, a));
        try { this.cdr.detectChanges(); } catch { }
      }));
      // Load palette from Node Templates list (dynamic source)
      this.catalog.listNodeTemplates().subscribe(tpls => this.zone.run(() => {
        try {
          this.allTemplates = tpls || [];
          this.applyWorkspaceTemplateFilter();
        } catch { }
      }));
      // Load flows to expose in "Workflows" palette group (scoped to current workspace)
      this.loadFlowsForWorkspace();
      // Recompute palette when workspace changes
      try {
        this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.zone.run(() => { this.applyWorkspaceTemplateFilter(); this.loadFlowsForWorkspace(); }));
      } catch { }
    } catch { }
    // Load flow by id if provided
    try {
      const flowId = this.route.snapshot.queryParamMap.get('flow');
      const focusNode = this.route.snapshot.queryParamMap.get('node');
      if (flowId) {
        this.currentFlowId = flowId;
        this.loadingFlowDoc = true;
        this.catalog.getFlow(flowId).subscribe(doc => this.zone.run(() => {
          try {
            if (doc) {
              this.currentFlowName = doc.name || '';
              this.currentFlowDesc = doc.description || '';
              this.currentFlowStatus = (doc as any).status || 'draft';
              this.currentFlowEnabled = !!(doc as any).enabled;
              // Suppress Vflow transient events while swapping graph
              this.suppressGraphEventsUntil = Date.now() + 1200;
              this.log('flow.load.swap', { nodes: (doc.nodes||[]).length, edges: (doc.edges||[]).length });
              this.nodes = (doc.nodes || []) as any[];
              this.edges = (doc.edges || []) as any;
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
              this.updateSharedGraph();
              this.tryRestoreDraft(flowId);
              const hydrated = this.tryHydrateHistory();
              if (!hydrated) { this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory(); } else { this.updateTimelineCaches(); }
            }
          } finally {
            this.loadingFlowDoc = false;
            try { this.cdr.detectChanges(); } catch { }
            // Deep-link: focus a specific node if requested
            try {
              if (focusNode) {
                const id = String(focusNode);
                const node = this.nodes.find(n => String(n.id) === id);
                if (node) {
                  this.selectItem(node);
                  // Center after a tick to ensure view init
                  setTimeout(() => this.centerOnNodeId(id), 0);
                }
              }
            } catch {}
          }
          return;
        }));
      }
    } catch { this.loadingFlowDoc = false; }
    // React to query param changes (same component instance)
    try {
      this.route.queryParamMap.subscribe(pm => {
        const fid = pm.get('flow');
        const node = pm.get('node') || undefined;
        if (!fid) return;
        if (fid === this.currentFlowId) return;
        this.currentFlowId = fid;
        this.loadingFlowDoc = true;
        this.catalog.getFlow(fid).subscribe(doc => this.zone.run(() => {
          try {
            if (doc) {
              this.currentFlowName = doc.name || '';
              this.currentFlowDesc = doc.description || '';
              this.currentFlowStatus = (doc as any).status || 'draft';
              this.currentFlowEnabled = !!(doc as any).enabled;
              this.nodes = (doc.nodes || []) as any[];
              this.edges = (doc.edges || []) as any;
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
              this.updateSharedGraph();
              this.tryRestoreDraft(fid);
              const hydrated = this.tryHydrateHistory();
              if (!hydrated) { this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory(); } else { this.updateTimelineCaches(); }
            }
          } finally {
            this.loadingFlowDoc = false;
            try { this.cdr.detectChanges(); } catch { }
            if (node) {
              try {
                const id = String(node);
                const n = this.nodes.find(nn => String(nn.id) === id);
                if (n) { this.selectItem(n); setTimeout(() => this.centerOnNodeId(id), 0); }
              } catch {}
            }
          }
        }));
      });
    } catch {}
    // Seed only when no flow id (adhoc graph)
    if (!this.currentFlowId && (!this.nodes || this.nodes.length === 0)) {
      // Initialise un graphe par défaut à partir de la palette
      const seed = this.fbUtils.buildDefaultGraphFromPalette(this.items);
      this.nodes = seed.nodes;
      this.edges = seed.edges as any;
      const hydratedAdhoc = this.tryHydrateHistory();
      if (!hydratedAdhoc) { this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory(); } else { this.updateTimelineCaches(); }
    }
    this.updateTimelineCaches();
    this.recomputeValidation();
    try { window.addEventListener('beforeunload', this.beforeUnloadHandler as any); } catch {}
  }
  ngOnDestroy() {
    try { window.removeEventListener('beforeunload', this.beforeUnloadHandler as any); } catch {}
    try { this.viewportSub?.unsubscribe(); } catch { }
    // If leaving builder without unsaved changes, clear persisted snapshots/drafts
    try { if (!this.hasUnsavedChanges()) this.purgeDraft(); } catch {}
  }

  private loadFlowsForWorkspace(){
    try {
      const ws = this.acl.currentWorkspaceId();
      if (!ws) { this.allFlows = []; this.rebuildPaletteGroups(); return; }
      this.catalog.listFlows(ws).subscribe(list => this.zone.run(() => {
        this.allFlows = list || [];
        this.rebuildPaletteGroups();
        try { this.cdr.detectChanges(); } catch {}
      }));
    } catch { this.allFlows = []; this.rebuildPaletteGroups(); }
  }

  private beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (this.hasUnsavedChanges()) { e.preventDefault(); (e as any).returnValue = ''; return ''; }
    return;
  };
  private draftKey(flowId: string) { return this.DRAFT_KEY_PREFIX + (flowId || 'adhoc'); }
  private computeChecksum(obj: any): string { try { return JSON.stringify(obj); } catch { return ''; } }
  private saveDraft() {
    const fid = this.currentFlowId || '';
    if (!fid) return;
    const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
    // Keep draft only if it differs from backend; otherwise clear it to avoid noise
    if (current !== (this.lastSavedChecksum || '')) {
      const draft = { nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, ts: Date.now(), serverChecksum: this.lastSavedChecksum };
      try { localStorage.setItem(this.draftKey(fid), JSON.stringify(draft)); } catch {}
    } else {
      try { localStorage.removeItem(this.draftKey(fid)); } catch {}
    }
  }
  private tryRestoreDraft(flowId: string) {
    try {
      const raw = localStorage.getItem(this.draftKey(flowId));
      if (!raw) return;
      const draft = JSON.parse(raw);
      // Only restore if draft matches current server version
      const server = this.lastSavedChecksum || null;
      if (draft && draft.serverChecksum && server && String(draft.serverChecksum) !== String(server)) {
        // Stale draft: discard
        try { localStorage.removeItem(this.draftKey(flowId)); } catch {}
        return;
      }
      this.currentFlowName = draft.name || this.currentFlowName;
      this.currentFlowDesc = draft.desc || this.currentFlowDesc;
      this.currentFlowStatus = draft.status || this.currentFlowStatus;
      this.currentFlowEnabled = !!draft.enabled;
      this.nodes = (draft.nodes || []) as any[];
      this.edges = (draft.edges || []) as any;
    } catch {}
  }
  hasUnsavedChanges(): boolean {
    const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
    return current !== (this.lastSavedChecksum || '');
  }
  get canSave(): boolean { return !!this.currentFlowId && this.hasUnsavedChanges(); }

  // Keep shared checksum updated when meta fields change via ngModel (name/desc/status/enabled)
  onMetaChange() {
    try {
      this.updateSharedGraph();
      this.saveDraft();
    } catch {}
  }

  // Exposed for route guard: clear current flow draft from localStorage
  public purgeDraft() {
    try {
      const fid = this.currentFlowId || '';
      if (!fid) return;
      localStorage.removeItem(this.draftKey(fid));
      try { localStorage.removeItem(this.historyKey()); } catch {}
    } catch {}
  }



  private applyWorkspaceTemplateFilter() {
    try {
      const ws = this.acl.currentWorkspaceId();
      this.acl.listAllowedTemplates(ws).subscribe(ids => {
        const allow = Array.isArray(ids) ? ids : [];
        this.allowedTplIds = new Set(allow);
        const filtered = allow.length === 0 ? [] : (this.allTemplates || []).filter(t => allow.includes((t as any).id));
        this.items = this.paletteSvc.toPaletteItems(filtered);
        this.rebuildPaletteGroups();
        try { this.cdr.detectChanges(); } catch { }
        this.recomputeValidation();
      });
    } catch { }
  }

  // Resolve mini icon for palette: use only template.icon if it is a class (no app logo fallback)
  miniIconClass(it: any): string {
    try {
      const tpl = it?.template || {};
      const ic = tpl?.icon;
      if (ic && typeof ic === 'string' && !/^https?:\/\//i.test(ic)) return ic;
      return '';
    } catch { return ''; }
  }
  simpleIconUrl(id: string): string { return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}` : ''; }
  typeIconClass(tpl: any): string {
    const type = String(tpl?.type || '').toLowerCase();
    switch (type) {
      case 'start': return 'fa-solid fa-play';
      case 'event': return 'fa-solid fa-bell';
      case 'endpoint': return 'fa-solid fa-link';
      case 'function': return 'fa-solid fa-cog';
      case 'condition': return 'fa-solid fa-code-branch';
      case 'loop': return 'fa-solid fa-sync';
      case 'end': return 'fa-solid fa-stop';
      case 'flow': return 'fa-solid fa-diagram-project';
      default: return 'fa-regular fa-square';
    }
  }

  appLabelOf(tpl: any): string {
    try {
      const appId = String((tpl?.appId || (tpl?.app && tpl.app._id) || '')).trim();
      if (!appId) return '';
      const app = this.appsMap.get(appId);
      return app ? (app.title || app.name || '') : '';
    } catch { return ''; }
  }

  // Map NodeTemplate list to palette display items


  ngAfterViewInit() {
    // Subscribe to viewport change end events to update zoom indicator
    try {
      const vs: any = this.flow?.viewportService;
      if (vs?.viewportChangeEnd$) {
        this.viewportSub = vs.viewportChangeEnd$.subscribe(() => this.zone.run(() => this.updateZoomDisplay()));
      }
    } catch { }
    // Initial update
    this.updateZoomDisplay();
  }

  @HostListener('window:resize') onResize() { this.updateIsMobile(); }
  private updateIsMobile() {
    try {
      // Consider coarse pointer or small viewport as mobile
      const coarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || false;
      const small = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
      this.isMobile = coarse || small;
    } catch { this.isMobile = false; }
  }



  private updateZoomDisplay() {
    try {
      const z = this.flow?.viewportService?.readableViewport()?.zoom;
      if (typeof z === 'number' && z > 0) {
        this.zoomDisplay = z;
        this.zoomPercent = Math.max(5, Math.min(300, Math.round(z * 100)));
        try { localStorage.setItem('flow.zoom', String(z)); } catch { }

        // Force immediate change detection even si hors zone ou sans interaction
        try { this.cdr.detectChanges(); } catch { }
      }
    } catch { }
  }

  // Execution stats: expose last status/count for badges
  nodeExecStatus(id: string): { count: number; lastStatus?: string } | null {
    try {
      // Prefer backend overlay attempts if present
      const arr = this.backendNodeAttempts.get(String(id));
      if (arr && arr.length) {
        const last = arr[arr.length - 1];
        return { count: arr.length, lastStatus: last?.status || 'running' } as any;
      }
      // Then prefer current backend run stats if present
      if (this.backendRunId) {
        const b = this.backendNodeStats.get(String(id));
        if (b) return { count: b.count, lastStatus: b.lastStatus } as any;
      }
      const map = (this.runner as any).nodeStats$?.value as Map<string, any>;
      if (!map) return null;
      const v = map.get(String(id));
      return v || null;
    } catch { return null; }
  }

  onZoomSlider(val: number | string) {
    const pct = Math.max(5, Math.min(300, Number(val) || 0));
    this.zoomPercent = pct;
    this.applyZoomPercent(pct);
  }

  private applyZoomPercent(pct: number) {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs || !this.flowHost?.nativeElement) return;
      const vp = this.flow.viewportService.readableViewport();
      const newZoom = Math.max(0.05, Math.min(3, pct / 100));
      const rect = this.flowHost.nativeElement.getBoundingClientRect();
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      // Keep the world point under screen center stable during zoom change
      const wx = (centerScreenX - vp.x) / (vp.zoom || 1);
      const wy = (centerScreenY - vp.y) / (vp.zoom || 1);
      const x = centerScreenX - (wx * newZoom);
      const y = centerScreenY - (wy * newZoom);
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: newZoom, x, y }, duration: 80 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch { }
      this.updateZoomDisplay();
    } catch { }
  }

  // No grouped palette; simple flat list used by template
  onPaletteQueryChange(v: string) { this.paletteQuery = (v || ''); this.rebuildPaletteGroups(); }
  rebuildPaletteGroups() {
    const base = this.paletteSvc.buildGroups(this.items, this.paletteQuery, this.appsMap) || [];
    // Build bottom group: Workflows (flows available in current workspace)
    const ws = this.acl.currentWorkspaceId();
    const q = (this.paletteQuery || '').trim().toLowerCase();
    // In backend mode, allFlows is already scoped to the current workspace. In local mode, filter by ACL mapping.
    const flowsInWs = environment.useBackend
      ? (this.allFlows || [])
      : (this.allFlows || []).filter(f => (this.acl.getResourceWorkspace('flow', f.id) || 'default') === ws);
    const sorted = flowsInWs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const filtered = q ? sorted.filter(f => `${f.name} ${f.id} ${f.description || ''}`.toLowerCase().includes(q)) : sorted;
    // Use canonical template from catalog to keep checksum stable; pass selected flowId via __preContext
    const canonical = (this.allTemplates || []).find(t => String((t as any)?.id) === 'tmpl_call_flow');
    const makeTplForFlow = (f: any) => {
      const t = canonical ? JSON.parse(JSON.stringify(canonical)) : {
        id: 'tmpl_call_flow', type: 'flow', name: 'Call Flow', title: 'Call Flow', subtitle: 'Workflow', icon: 'fa-solid fa-diagram-project', category: 'Workflow', authorize_catch_error: true, authorize_skip_error: true, output: ['Success'], args: { title: 'Call Flow', ui: { layout: 'vertical', labelsOnTop: true }, fields: [{ type: 'text', key: 'flowId', label: 'Flow ID', col: { xs: 24 }, disabledIf: true }] }
      };
      (t as any).__preContext = { flowId: f.id };
      t.title = f.name || t.title;
      return t;
    };
    const wfItems = filtered.map(f => ({ label: f.name || f.id, template: makeTplForFlow(f) }));
    const groups = [...base];
    groups.push({ title: 'Workflows', items: wfItems });
    this.paletteGroups = groups;
    try { this.cdr.detectChanges(); } catch {}
  }

  trackGroup = (_: number, g: any) => (g && (g.appId || g.title)) || _;
  trackItem = (_: number, it: any) => {
    try {
      const flowId = it?.template?.__preContext?.flowId || '';
      const tplId = it?.template?.id || '';
      const label = it?.label || '';
      // Ensure unique key per flow item to avoid trackBy collisions
      if (flowId) return `${tplId}:${flowId}`;
      if (tplId || label) return `${tplId}:${label}`;
      return _;
    } catch { return _; }
  };

  // No-op; change tracking handled via vflow outputs

  inputId(tmpl: any): string | null {
    if (!tmpl) return null;
    const ty = String(tmpl.type || '').toLowerCase();
    return (ty === 'start' || ty === 'event' || ty === 'endpoint') ? null : 'in';
  }
  outputIds(model: any): string[] { return this.graph.outputIds(model, this.edges); }

  getOutputName(model: any, idxOrId: number | string): string { return this.graph.getOutputName(model, idxOrId); }
  onExternalDrop(event: any) {
    // logs disabled
    if (this.isMobile) return; // Disable DnD on mobile

    // Écran -> coordonnées relatives -> viewport -> monde
    const dropHost = this.flowHost?.nativeElement as HTMLElement | undefined;
    if (!dropHost || !this.flow?.viewportService) return;
    // Support multiple CDK versions: prefer dropPoint/pointerPosition; fallback to original event
    const dp = (event && (event.dropPoint || event.pointerPosition)) || null;
    const mouseEvent: MouseEvent | null = (event && event.event) ? (event.event as MouseEvent) : null;
    let relX: number | null = null;
    let relY: number | null = null;
    const rect = dropHost.getBoundingClientRect();
    if (dp && typeof dp.x === 'number' && typeof dp.y === 'number') {
      relX = dp.x - rect.left;
      relY = dp.y - rect.top;
    } else if (mouseEvent) {
      relX = mouseEvent.clientX - rect.left;
      relY = mouseEvent.clientY - rect.top;
    }
    if (relX == null || relY == null) { return; }
    const relative = { x: relX, y: relY };
    const viewport = this.flow.viewportService.readableViewport();
    const scale = viewport.zoom;
    const offsetX = viewport.x;
    const offsetY = viewport.y;
    const positionInFlow = { x: ((relative.x - offsetX) / scale) - (250 / 2), y: ((relative.y - offsetY) / scale) - 50 };


    const t = event?.item?.data?.template || event?.item?.data || event?.item?.data?.data;
    const templateObj = this.normalizeTemplate(t);
    if (this.isStartLike(templateObj) && this.hasStartLikeNode()) {
      try { this.message.warning('Un nœud de départ existe déjà'); } catch { }
      return;
    }
    const newId = this.generateNodeId(templateObj, templateObj?.name || templateObj?.title);
    const preCtx = (templateObj as any)?.__preContext || null;
    // If start-like, snap position above best target
    const isStartLike = this.isStartLike(templateObj);
    let point = positionInFlow;
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(positionInFlow.x, positionInFlow.y);
      if (target) point = this.computePositionAboveTarget(target);
    }
    const nodeModel = {
      id: newId,
      name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node',
      template: templateObj?.id || null,
      templateObj,
      context: preCtx ? { ...preCtx } : {},
      templateChecksum: this.fbUtils.argsChecksum(templateObj?.args || {}),
      templateFeatureSig: this.fbUtils.featureChecksum(templateObj)
    };
    const vNode = { id: newId, point, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    // If start-like, auto-connect to best target
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(point.x, point.y + 200) || this.findBestTargetNodeForStart(point.x + 1, point.y + 200);
      if (target) {
        const edge: Edge = {
          type: 'template',
          id: `${newId}->${target.id}:out:`,
          source: newId,
          target: target.id as any,
          sourceHandle: 'out',
          targetHandle: null,
          edgeLabels: { center: { type: 'html-template', data: { text: this.computeEdgeLabel(newId, 'out') } } },
          data: { strokeWidth: 2, color: '#b1b1b7' },
          markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } }
        } as any;
        this.edges = [...this.edges, edge];
      }
    }
    this.pushState('drop.node');
    this.recomputeValidation();
  }
  private normalizeTemplate(t: any) { return this.fbUtils.normalizeTemplate(t); }
  private computeDropPoint(ev: any) {
    const mouse = ev?.event as MouseEvent;
    const hostEl = this.flowHost?.nativeElement as HTMLElement | undefined;
    const vp = this.flow?.viewportService?.readableViewport();
    if (!mouse || !hostEl || !vp) return { x: 400, y: 300 };
    const rect = hostEl.getBoundingClientRect();
    return this.fbUtils.computeDropPointFromMouse(mouse, rect, vp);
  }
  onConnect(c: Connection) {
    // logs disabled
    const labelText = this.computeEdgeLabel(c.source, c.sourceHandle);
    const isErr = (c.sourceHandle === 'err') || this.errorNodes.has(String(c.source));
    if (isErr) this.errorNodes.add(String(c.target));
    this.edges = [
      ...this.edges,
      {
        type: 'template',
        id: `${c.source}->${c.target}:${c.sourceHandle || ''}:${c.targetHandle || ''}`,
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle,
        targetHandle: c.targetHandle,
        edgeLabels: { center: { type: 'html-template', data: { text: labelText } } },
        data: isErr ? { error: true, strokeWidth: 1, color: '#f759ab' } : { strokeWidth: 2, color: '#b1b1b7' },
        markers: { end: { type: 'arrow-closed', color: isErr ? '#f759ab' : '#b1b1b7' } }
      }
    ];
    // Keep error branch propagation consistent after new connection
    this.recomputeErrorPropagation();
    this.pushState('connect.edge');
    try { this.suppressRemoveUntil = Date.now() + 300; } catch { }
  }

  deleteEdge(edge: Edge) {
    const id = String((edge as any)?.id || '');
    if (!id) return;
    this.edges = this.edges.filter(e => String((e as any)?.id || '') !== id);
    // After edge deletion, recompute error branch propagation
    this.recomputeErrorPropagation();
    this.pushState('delete.edge');
  }
  onDeleteEdgeClick(ev: MouseEvent, edge: Edge) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch { }
    // Allow subsequent onEdgesRemoved events for this edge id without restoration
    try {
      const id = String((edge as any)?.id || '');
      if (id) {
        this.allowedRemovedEdgeIds.add(id);
        setTimeout(() => this.allowedRemovedEdgeIds.delete(id), 800);
        // In case ctx.edge is not the same ref, resolve by id from current edges
        const real = this.edges.find(e => String((e as any)?.id || '') === id) as Edge | undefined;
        this.deleteEdge(real || edge);
      }
    } catch { this.deleteEdge(edge); }
    try { this.cdr.detectChanges(); } catch { }
  }

  getEdgeLabel(edge: Edge): string {
    try {
      const fromModel = this.computeEdgeLabel(edge.source as any, edge.sourceHandle as any);
      if (fromModel && String(fromModel).trim().length) return fromModel;
      const stored = (edge as any)?.edgeLabels?.center?.data?.text;
      if (stored && String(stored).trim().length) return stored;
      return '';
    } catch { return ''; }
  }
  computeEdgeLabel(sourceId: string, sourceHandle: any): string { return this.graph.computeEdgeLabel(sourceId, sourceHandle, this.nodes); }
  // Timeline items mapping for nz-timeline (cached)
  timelinePastItemsCache: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  timelineFutureItemsCache: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  private updateTimelineCaches() {
    try {
      const pastMeta = (this.history as any).getPastMeta?.() || [];
      const futureMeta = (this.history as any).getFutureMeta?.() || [];
      const past = pastMeta.map((m: any, i: number) => this.mapMetaToItem(m, 'past', i));
      const future = futureMeta.map((m: any, i: number) => this.mapMetaToItem(m, 'future', i));
      this.timelinePastItemsCache = past.reverse();
      this.timelineFutureItemsCache = future;
    } catch {
      this.timelinePastItemsCache = [];
      this.timelineFutureItemsCache = [];
    }
  }
  private mapMetaToItem(m: { ts: number; reason: string }, section: 'past' | 'future' = 'past', idx = 0) {
    const time = this.formatTime(m?.ts || Date.now());
    const { type, color, message } = this.describeReason(m?.reason || '');
    const key = `${section}:${m?.ts || ''}:${m?.reason || ''}:${idx}`;
    return { key, time, type, color, message };
  }
  private formatTime(ts: number) { try { const d = new Date(ts); const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0'); const ss = String(d.getSeconds()).padStart(2, '0'); return `${hh}:${mm}:${ss}`; } catch { return ''; } }
  private describeReason(r: string): { type: string; color: string; message: string } {
    const map: Record<string, { type: string; color: string }> = {
      'init': { type: 'Init', color: '#64748b' },
      'restore': { type: 'Restore', color: '#0ea5e9' },
      'palette.click.add': { type: 'Add', color: '#10b981' },
      'drop.node': { type: 'Add', color: '#10b981' },
      'connect.edge': { type: 'Connect', color: '#1677ff' },
      'delete.edge': { type: 'Delete', color: '#b91c1c' },
      'nodes.removed': { type: 'Delete', color: '#b91c1c' },
      'edges.removed': { type: 'Cleanup', color: '#9ca3af' },
      'edges.detached.final': { type: 'Detach', color: '#f59e0b' },
      'node.position.final': { type: 'Move', color: '#f59e0b' },
      'inspector.saveJson': { type: 'Edit', color: '#8b5cf6' },
      'dialog.modelCommit.final': { type: 'Edit', color: '#8b5cf6' },
    };
    const base = map[r] || { type: r || 'State', color: '#64748b' };
    return { type: base.type, color: base.color, message: r };
  }

  // Recompute error-branch propagation from current edges and update styles
  private recomputeErrorPropagation() {
    const { edges, errorNodes } = this.fbUtils.recomputeErrorPropagation(this.edges);
    this.edges = edges as any;
    this.errorNodes = errorNodes;
  }

  isNodeInError(id: string): boolean {
    // Pink (error-branch) should reflect try/catch propagation only
    // Do NOT include form invalid state here; that is handled by isNodeHardError (red)
    try { return this.errorNodes.has(String(id)); } catch { return false; }
  }

  isEdgeDeleteDisabled(edge: Edge): boolean {
    try {
      const src = this.nodes.find(n => n.id === edge.source);
      const tgt = this.nodes.find(n => n.id === edge.target);
      const srcNo = !!src?.data?.model?.templateObj?.no_delete_edge;
      const tgtNo = !!tgt?.data?.model?.templateObj?.no_delete_edge;
      return srcNo || tgtNo;
    } catch { return false; }
  }

  // DnD events (debug logging)
  onDragEnter(e: any) { }
  onDragLeave(e: any) { }
  onDragOver(e: any) { if (this.isMobile) return; try { e.preventDefault(); } catch { } }
  onDragStart(item: any, ev: any) {
    if (this.isMobile) return;
    try { const key = String(item?.template?.id || item?.label || ''); if (key) this.draggingPalette.add(key); } catch { }
  }
  onDragEnd(item: any, ev: any) {
    if (this.isMobile) return;
    try { const key = String(item?.template?.id || item?.label || ''); if (key) this.draggingPalette.delete(key); } catch { }
  }
  // Click-to-add from palette: place near viewport center, auto-connect to best free output above
  onPaletteClick(it: any, ev?: MouseEvent) {
    // logs disabled
    // Do not prevent default or stop propagation to avoid blocking input focus in overlays (iOS/desktop)
    if (this.isPaletteItemDisabled(it)) return;
    const templateObj = this.normalizeTemplate(it?.template || it);
    // Guard: allow only one start/trigger-like node in the canvas
    if (this.isStartLike(templateObj) && this.hasStartLikeNode()) {
      try { this.message.warning('Un nœud de départ existe déjà'); } catch { }
      return;
    }
    const isStartLike = this.isStartLike(templateObj);
    // Auto-connect uniquement pour les nœuds de type 'function'
    const wantsConnect = String(templateObj?.type || '').toLowerCase() === 'function';
    const newId = this.generateNodeId(templateObj, templateObj?.name || templateObj?.title);
    const vpTmp = this.flow?.viewportService?.readableViewport();
    const hostRect = this.flowHost?.nativeElement?.getBoundingClientRect();
    const worldCenter = (vpTmp && hostRect) ? this.fbUtils.viewportCenterWorld(vpTmp, hostRect) : { x: 400, y: 300 };
    // For start-like nodes: find best target and place new node above it
    let pos = worldCenter as any;
    let sourceForConnect: any = null;
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(worldCenter.x, worldCenter.y);
      if (target) {
        pos = this.computePositionAboveTarget(target);
      } else {
        // fallback: near top-left area
        pos = { x: worldCenter.x - 90, y: worldCenter.y - 160 };
      }
    } else {
      // Find best source near center with a free output and place node below it
      sourceForConnect = wantsConnect ? this.fbUtils.findBestSourceNode(this.nodes, worldCenter.x, worldCenter.y) : null;
      pos = this.computeNewNodePosition(sourceForConnect, worldCenter);
    }
    const preCtx = (templateObj as any)?.__preContext || null;
    const nodeModel: any = {
      id: newId,
      name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node',
      template: templateObj?.id || null,
      templateObj,
      context: preCtx ? { ...preCtx } : {},
      templateChecksum: this.fbUtils.argsChecksum(templateObj?.args || {}),
      templateFeatureSig: this.fbUtils.featureChecksum(templateObj)
    };
    const vNode = { id: newId, point: pos, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    // Auto-connect logic
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(pos.x, pos.y + 200) || this.findBestTargetNodeForStart(worldCenter.x, worldCenter.y);
      if (target) {
        const edge: Edge = {
          type: 'template',
          id: `${newId}->${target.id}:out:`,
          source: newId,
          target: target.id as any,
          sourceHandle: 'out',
          targetHandle: null,
          edgeLabels: { center: { type: 'html-template', data: { text: this.computeEdgeLabel(newId, 'out') } } },
          data: { strokeWidth: 2, color: '#b1b1b7' },
          markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } }
        } as any;
        this.edges = [...this.edges, edge];
      }
      // Record addition of start/event-like node
      this.pushState('palette.click.add');
    } else if (wantsConnect) {
      // Utiliser la source calculée avant l'ajout pour éviter l'auto-liaison vers soi-même
      const source = sourceForConnect || this.fbUtils.findBestSourceNode(this.nodes.filter(n => n.id !== newId), worldCenter.x, worldCenter.y);
      if (source && String(source.id) === String(newId)) {
        // Sécurité anti-boucle
        return;
      }
      // Auto-connect from best output handle if found
      if (source) {
        const handle = this.findFreeOutputHandle(source, true, worldCenter.x);
        if (handle && source && String(source.id) !== String(newId)) {
          const labelText = this.computeEdgeLabel(source.id, handle);
          const isErr = (handle === 'err') || this.errorNodes.has(String(source.id));
          const edge: Edge = {
            type: 'template',
            id: `${source.id}->${newId}:${handle}:in`,
            source: source.id,
            target: newId,
            sourceHandle: handle,
            targetHandle: 'in' as any,
            edgeLabels: { center: { type: 'html-template', data: { text: labelText } } } as any,
            data: isErr ? { error: true, strokeWidth: 1, color: '#f759ab' } : { strokeWidth: 2, color: '#b1b1b7' },
            markers: { end: { type: 'arrow-closed', color: isErr ? '#f759ab' : '#b1b1b7' } } as any
          } as any;
          this.edges = [...this.edges, edge];
          this.recomputeErrorPropagation();
          try { this.suppressRemoveUntil = Date.now() + 300; } catch { }
        }
      }
      this.pushState('palette.click.add');
      // Immediately reflect required-field issues for the new node
      this.recomputeValidation();
    } else {
      // Non-function node: still record addition and revalidate
      this.pushState('palette.click.add');
      this.recomputeValidation();
    }
  }
  // (removed) delegation handler
  // findBestSourceNode now provided by FlowBuilderUtilsService
  isStartLike(tmpl: any): boolean {
    try {
      const ty = String(tmpl?.type || '').toLowerCase();
      return ty === 'start' || ty === 'trigger' || ty === 'event' || ty === 'endpoint';
    } catch { return false; }
  }
  private hasStartLikeNode(): boolean {
    try { return this.nodes.some(n => this.isStartLike(n?.data?.model?.templateObj)); } catch { return false; }
  }
  isPaletteItemDisabled(it: any): boolean {
    try {
      const tmpl = this.normalizeTemplate(it?.template || it);
      return this.isStartLike(tmpl) && this.hasStartLikeNode();
    } catch { return false; }
  }
  private findFreeOutputHandle(node: any, onlyNonError = true, targetWorldX?: number): string | null {
    try {
      const model = node?.data?.model; const outs = this.outputIds(model) || [];
      const taken = new Set(this.edges.filter(e => String(e.source) === String(node.id)).map(e => String(e.sourceHandle ?? '')));
      // Build list of candidate handles (free ones), optionally skip 'err'
      const candidates: Array<{ handle: string; ix: number; dist: number }> = [];
      // Approximate handle x position based on node width and output index
      let w = 180;
      try {
        const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(node.id)}\"]`) as HTMLElement | null;
        const vp = this.flow?.viewportService?.readableViewport();
        if (el && vp) { const r = el.getBoundingClientRect(); if (r && r.width) w = r.width / (vp.zoom || 1); }
      } catch { }
      const leftX = (node.point?.x || 0);
      const m = outs.length || 1;
      for (let i = 0; i < outs.length; i++) {
        const h = String(outs[i]);
        if (onlyNonError && h === 'err') continue;
        if (taken.has(h)) continue;
        let dist = 0;
        if (typeof targetWorldX === 'number' && Number.isFinite(targetWorldX)) {
          const cx = leftX + (w * ((i + 0.5) / m));
          dist = Math.abs(cx - targetWorldX);
        }
        candidates.push({ handle: h, ix: i, dist });
      }
      if (!candidates.length) return null;
      // If no target provided, keep original ordering; else pick nearest to world center X
      if (typeof targetWorldX === 'number' && Number.isFinite(targetWorldX)) {
        candidates.sort((a, b) => a.dist - b.dist || a.ix - b.ix);
      }
      return candidates[0].handle;
    } catch { return null; }
  }
  private computeNewNodePosition(source: any | null, center: { x: number; y: number }): { x: number; y: number } {
    if (!source) return { x: center.x - 90, y: center.y + 80 };
    try {
      // Align below source node with a comfortable vertical gap
      const vp = this.flow?.viewportService?.readableViewport();
      const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(source.id)}\"]`) as HTMLElement | null;
      let w = 180, h = 100;
      if (el && vp) { const r = el.getBoundingClientRect(); if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); } }
      const gap = 60;
      const x = (source.point?.x || 0);
      const y = (source.point?.y || 0) + h + gap;
      return { x, y };
    } catch { return { x: center.x - 90, y: center.y + 80 }; }
  }
  isDragging(item: any): boolean { try { const key = String(item?.template?.id || item?.label || ''); return key ? this.draggingPalette.has(key) : false; } catch { return false; } }

  // Context menu actions for nodes
  onNodeContextMenu(ev: MouseEvent, node: any) {
    if (this.isMobile) return; // use long-press on mobile
    try { ev.preventDefault(); ev.stopPropagation(); } catch { }
    this.openCtxMenuAt(ev.clientX, ev.clientY, node);
  }
  private openCtxMenuAt(x: number, y: number, node: any) {
    this.ctxMenuVisible = true;
    this.ctxMenuX = x;
    this.ctxMenuY = y;
    this.ctxMenuTarget = node;
    try { this.selectItem(node); } catch { }
  }
  // Run selected node in test mode and show I/O in dialog wings
  onTestSelectedNode() {
    try {
      const m = this.selectedModel;
      if (!m) return;
      const isStart = String(m?.templateObj?.type || '').toLowerCase() === 'start';
      const input = isStart ? (this.getStartPayload() || {}) : (this.computePrevPayload(m?.id) || {});
      const run = this.runner.runNode(m?.templateObj || {}, m?.id, 'test', input);
      const last = run.attempts[run.attempts.length - 1];
      this.advancedInjectedInput = last?.input ?? input;
      if (isStart) {
        this.advancedInjectedOutput = this.getStartPayload() || {};
      } else {
        const flowOut = (this.lastRun && this.lastRun.finalPayload) ? this.lastRun.finalPayload : null;
        const nodeOut = last?.result;
        this.advancedInjectedOutput = flowOut ?? nodeOut ?? null;
      }
      // ctx à plat
      this.advancedCtx = this.advancedInjectedInput || {};
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  onRunPrevNodes() {
    try {
      const nodeId = this.selectedModel?.id;
      if (!nodeId) return;
      const injected = this.runPredecessorsAndGetResult(nodeId);
      this.advancedInjectedInput = injected;
      this.advancedCtx = { input: this.advancedInjectedInput, output: this.advancedInjectedOutput };
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  private runPredecessorsAndGetResult(nodeId: string): any {
    // Depth-first: compute input for predecessors first
    const preds = (this.edges || []).filter(e => String(e.target) === String(nodeId)).map(e => String(e.source));
    if (!preds.length) return {};
    let lastResult: any = {};
    for (const pid of preds) {
      const before = this.runPredecessorsAndGetResult(pid);
      const pn = (this.nodes || []).find(n => String(n.id) === pid);
      const pmodel = pn?.data?.model || {};
      const run = this.runner.runNode(pmodel?.templateObj || {}, pmodel?.id || pid, 'test', before);
      const att = run.attempts[run.attempts.length - 1];
      lastResult = att?.result ?? before;
    }
    return lastResult;
  }

  private computePrevPayload(nodeId: string | null | undefined): any {
    if (!nodeId) return null;
    try {
      // Find any predecessor in edges
      const pred = (this.edges || []).filter(e => String(e.target) === String(nodeId)).map(e => String(e.source));
      if (!pred.length) return null;
      // Use last known run to pick the last attempt for the first predecessor
      const runs = (this.runner as any).runs$?.value || [];
      for (let i = 0; i < runs.length; i++) {
        const r = runs[i];
        const att = (r?.attempts || []).slice().reverse().find((a: any) => pred.includes(String(a.nodeId)));
        if (att && att.result != null) return att.result;
      }
    } catch {}
    return null;
  }

  // Mobile long-press: open context menu
  onNodeTouchStart(ev: TouchEvent, node: any) {
    if (!this.isMobile) return;
    try {
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      this.lpStartX = this.lpCurX = t.clientX; this.lpStartY = this.lpCurY = t.clientY;
      this.lpTarget = node; this.lpFired = false;
      if (this.lpTimer) clearTimeout(this.lpTimer);
      this.lpTimer = setTimeout(() => {
        // If moved too much, ignore
        const dx = Math.abs(this.lpCurX - this.lpStartX);
        const dy = Math.abs(this.lpCurY - this.lpStartY);
        if (dx <= this.lpMoveThresh && dy <= this.lpMoveThresh && this.lpTarget) {
          this.zone.run(() => this.openCtxMenuAt(this.lpCurX, this.lpCurY, this.lpTarget));
          this.lpFired = true;
        }
      }, this.lpDelay);
    } catch { }
  }
  onNodeTouchMove(ev: TouchEvent) {
    if (!this.isMobile) return;
    try {
      const t = ev.touches && ev.touches[0];
      if (!t) return;
      this.lpCurX = t.clientX; this.lpCurY = t.clientY;
      const dx = Math.abs(this.lpCurX - this.lpStartX);
      const dy = Math.abs(this.lpCurY - this.lpStartY);
      if (dx > this.lpMoveThresh || dy > this.lpMoveThresh) {
        if (this.lpTimer) { clearTimeout(this.lpTimer); this.lpTimer = null; }
      }
    } catch { }
  }
  onNodeTouchEnd() {
    if (!this.isMobile) return;
    try { if (this.lpTimer) clearTimeout(this.lpTimer); } catch { }
    this.lpTimer = null; this.lpTarget = null; this.lpFired = false;
  }
  closeCtxMenu() { this.ctxMenuVisible = false; this.ctxMenuTarget = null; }
  ctxOpenAdvancedAndInspector() {
    if (!this.ctxMenuTarget) return;
    try { this.selectItem(this.ctxMenuTarget); } catch { }
    this.openAdvancedEditor();
    this.closeCtxMenu();
  }
  ctxDuplicateTarget() {
    const tgt = this.ctxMenuTarget;
    this.closeCtxMenu();
    if (!tgt || !tgt.id) return;
    try {
      const node = this.nodes.find(n => n.id === tgt.id);
      if (!node) return;
      // Prevent duplicating start/trigger-like nodes
      if (this.isStartLike(node?.data?.model?.templateObj)) {
        try { this.message.warning('Le nœud de départ ne peut pas être dupliqué'); } catch { }
        return;
      }
      const newId = this.generateNodeId(node?.data?.model?.templateObj, node?.data?.model?.name || node?.data?.model?.templateObj?.name || node?.data?.model?.templateObj?.title);
      const newPoint = { x: (node.point?.x ?? 0) + 40, y: (node.point?.y ?? 0) + 40 };
      const model = JSON.parse(JSON.stringify(node.data?.model || {}));
      model.id = newId;
      // Adjust name to indicate duplication (non-bloquant)
      try { if (model?.name) model.name = String(model.name) + ' (copy)'; } catch { }
      // For condition nodes: regenerate stable _id for items to avoid handle collisions
      try {
        const tmpl = model?.templateObj || {};
        if (tmpl?.type === 'condition') {
          const field = tmpl.output_array_field || 'items';
          const used = this.collectAllConditionHandleIds();
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          for (const it of arr) {
            if (it && typeof it === 'object') {
              let id = '';
              do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id));
              it._id = id; used.add(id);
            }
          }
        }
      } catch { }
      const vNode = { id: newId, point: newPoint, type: node.type, data: { ...node.data, model } };
      this.nodes = [...this.nodes, vNode];
      this.selection = vNode as any;
      this.history.push(this.snapshot());
      this.recomputeValidation();
    } catch { }
  }

  private collectAllConditionHandleIds(): Set<string> {
    const s = new Set<string>();
    try {
      for (const n of this.nodes) {
        const m = n?.data?.model;
        const t = m?.templateObj;
        if (!t || t.type !== 'condition') continue;
        const field = t.output_array_field || 'items';
        const arr: any[] = (m?.context && Array.isArray(m.context[field])) ? m.context[field] : [];
        for (const it of arr) {
          const id = (it && typeof it === 'object' && it._id) ? String(it._id) : '';
          if (id) s.add(id);
        }
      }
    } catch { }
    return s;
  }

  private generateNodeId(tpl?: any, fallbackName?: string): string {
    const used = new Set(this.nodes.map(n => String(n.id)));
    return this.fbUtils.generateNodeId(tpl, fallbackName || '', used);
  }

  // === Validation: templates allowlist and future checks ===
  private getNodeTemplateId(node: any): string {
    try {
      const m = node?.data?.model || {};
      return String(m?.templateObj?.id || m?.template?.id || m?.template || '').trim();
    } catch { return ''; }
  }
  private computeTemplateChecksumForId(tplId: string): string {
    try {
      const currentTpl = (this.allTemplates || []).find((t: any) => String(t?.id) === String(tplId));
      return this.fbUtils.argsChecksum(currentTpl?.args || {});
    } catch { return ''; }
  }
  hasTemplateMismatch(model: any): boolean {
    try {
      if (!model) return false;
      const tplId = String(model?.template || model?.templateObj?.id || '');
      if (!tplId) return false;
      const stored = String(model?.templateChecksum || '');
      const current = this.computeTemplateChecksumForId(tplId);
      const argsMismatch = !!(stored && current && stored !== current);
      const list = this.allTemplates || [];
      const tpl = list.find((t: any) => String(t?.id) === String(tplId));
      const storedFeat = String((model && (model as any).templateFeatureSig) != null ? (model as any).templateFeatureSig : '00');
      const currentFeat = this.fbUtils.featureChecksum(tpl);
      const featMismatch = !!(storedFeat && currentFeat && storedFeat !== currentFeat);
      return argsMismatch || featMismatch;
    } catch { return false; }
  }
  onRequestUpdateArgs() {
    try {
      const m = this.selectedModel;
      if (!m) return;
      const tplId = String(m?.template || m?.templateObj?.id || '');
      const curTpl = (this.allTemplates || []).find((t: any) => String(t?.id) === String(tplId));
      if (!curTpl) return;
      const newArgs = JSON.parse(JSON.stringify((curTpl as any).args || {}));
      const newChecksum = this.fbUtils.argsChecksum(newArgs);
      const newFeatureSig = this.fbUtils.featureChecksum(curTpl);
      // Merge latest template flags (authorize_catch_error, authorize_skip_error, outputs, etc.)
      const updatedTplObj = { ...(m.templateObj || {}), ...(curTpl as any), args: newArgs };
      const newModel = { ...m, templateObj: updatedTplObj, templateChecksum: newChecksum, templateFeatureSig: newFeatureSig };
      // Keep the same context; dynamic-form will handle missing/extra fields
      this.onAdvancedModelChange(newModel);
      this.onAdvancedModelCommitted(newModel);
    } catch { }
  }
  isNodeHardError(id: string): boolean {
    try {
      const n = this.nodes.find(nn => nn.id === id);
      const tplId = this.getNodeTemplateId(n);
      if (!tplId) return false;
      if (!this.allowedTplIds.has(tplId)) return true;
      // Checksum mismatch: template args changed since node was created
      try {
        const model: any = n?.data?.model || {};
        if (model?.invalid === true) return true;
        const stored = String(model?.templateChecksum || '');
        const currentTpl = (this.allTemplates || []).find((t: any) => String(t?.id) === String(tplId));
        const current = this.fbUtils.argsChecksum(currentTpl?.args || {});
        if (stored && current && stored !== current) return true;
        const storedFeat = String((model && (model as any).templateFeatureSig) != null ? (model as any).templateFeatureSig : '00');
        const currentFeat = this.fbUtils.featureChecksum(currentTpl);
        if (storedFeat && currentFeat && storedFeat !== currentFeat) return true;
      } catch { }
      // Credentials requirement
      try {
        const m: any = n?.data?.model || {};
        const appId = String(m?.templateObj?.appId || m?.templateObj?.app?._id || '') || '';
        if (appId) {
          const app = this.appsMap.get(appId);
          const providerHas = !!app?.hasCredentials;
          const providerAllows = !!app?.allowWithoutCredentials;
          const tplAllows = !!m?.templateObj?.allowWithoutCredentials;
          const allow = providerAllows || tplAllows;
          if (providerHas && !allow) {
            if (!m?.credentialId) return true;
          }
        }
      } catch { }
      // Missing required fields based on schema
      try {
        const m: any = n?.data?.model || {};
        const schema: any = m?.templateObj?.args || null;
        // Feature misuse: catch/skip activated while not authorized by template
        try {
          const t: any = m?.templateObj || {};
          if (m?.catch_error && !t?.authorize_catch_error) return true;
          if (m?.skip_error && !t?.authorize_skip_error) return true;
          if (m?.catch_error && m?.skip_error) return true; // mutually exclusive
        } catch { }
        if (schema) {
          const fields: FieldConfig[] = this.dfs.flattenAllInputFields(schema) as any;
          const missing = fields.filter((f: any) => Array.isArray(f?.validators) && f.validators.some((v: any) => v?.type === 'required'))
            .filter((f: any) => {
              const v = (m?.context || {})[f.key];
              return v == null || v === '';
            });
          if (missing.length) return true;
        }
      } catch { }
      return false;
    } catch { return false; }
  }
  private recomputeValidation() {
    const issues: Array<{ kind: 'node' | 'flow'; nodeId?: string; message: string }> = [];
    try {
      for (const n of this.nodes) {
        const id = String(n.id);
        const tpl = this.getNodeTemplateId(n);
        if (tpl && !this.allowedTplIds.has(tpl)) {
          issues.push({ kind: 'node', nodeId: id, message: `Template ${tpl} non autorisé dans ce workspace` });
        }
        // Template changes: args checksum or feature flags
        try {
          const model: any = n?.data?.model || {};
          const currentTpl = (this.allTemplates || []).find((t: any) => String(t?.id) === String(tpl));
          const stored = String(model?.templateChecksum || '');
          const current = this.fbUtils.argsChecksum(currentTpl?.args || {});
          if (stored && current && stored !== current) issues.push({ kind: 'node', nodeId: id, message: `Le template ${tpl} a changé (arguments). Vérifier ce nœud.` });
          const storedFeat = String((model && (model as any).templateFeatureSig) != null ? (model as any).templateFeatureSig : '00');
          const currentFeat = this.fbUtils.featureChecksum(currentTpl);
          if (storedFeat && currentFeat && storedFeat !== currentFeat) issues.push({ kind: 'node', nodeId: id, message: `Le template ${tpl} a changé (options). Vérifier ce nœud.` });
        } catch { }
        // Credentials and form validation
        try {
          const model: any = n?.data?.model || {};
          if (model?.invalid === true) {
            issues.push({ kind: 'node', nodeId: id, message: `Formulaire du nœud invalide.` });
          }
          // Credentials requirement
          const appId = String(model?.templateObj?.appId || model?.templateObj?.app?._id || '') || '';
          if (appId) {
            const app = this.appsMap.get(appId);
            const providerHas = !!app?.hasCredentials;
            const providerAllows = !!app?.allowWithoutCredentials;
            const tplAllows = !!model?.templateObj?.allowWithoutCredentials;
            const allow = providerAllows || tplAllows;
            if (providerHas && !allow && !model?.credentialId) {
              issues.push({ kind: 'node', nodeId: id, message: `Credentials requis pour ce nœud (${app?.title || app?.name || appId}).` });
            }
          }
          // Feature misuse
          const t: any = model?.templateObj || {};
          if (model?.catch_error && !t?.authorize_catch_error) issues.push({ kind: 'node', nodeId: id, message: `Option catch_error non autorisée par le template.` });
          if (model?.skip_error && !t?.authorize_skip_error) issues.push({ kind: 'node', nodeId: id, message: `Option skip_error non autorisée par le template.` });
          if (model?.catch_error && model?.skip_error) issues.push({ kind: 'node', nodeId: id, message: `Options catch et skip ne peuvent pas être activées ensemble.` });
          const schema: any = model?.templateObj?.args || null;
          if (schema) {
            const fields: FieldConfig[] = this.dfs.flattenAllInputFields(schema) as any;
            const missing = fields.filter((f: any) => Array.isArray(f?.validators) && f.validators.some((v: any) => v?.type === 'required'))
              .filter((f: any) => {
                const v = (model?.context || {})[f.key];
                return v == null || v === '';
              })
              .map((f: any) => f.label || f.key || 'Champ requis');
            if (missing.length) issues.push({ kind: 'node', nodeId: id, message: `Champs requis manquants: ${missing.join(', ')}` });
          }
        } catch { }
        // TODO: required-fields validation, only after node dialog opened at least once
        // if (this.openedNodeConfig.has(id)) { ... }
      }
    } catch { }
    this.validationIssues = issues;
    try { this.cdr.detectChanges(); } catch { }
  }
  nodeErrorTooltip(nodeId: string): string {
    try {
      const msgs = (this.validationIssues || []).filter(it => it.nodeId === nodeId).map(it => it.message);
      return msgs.length ? msgs.join('\n') : 'Problème sur ce nœud';
    } catch { return 'Problème sur ce nœud'; }
  }
  ctxDeleteTarget() {
    const tgt = this.ctxMenuTarget;
    this.closeCtxMenu();
    if (!tgt) return;
    try {
      // If it's an edge, delete edge; if it's a node, delete node and linked edges
      if ((tgt as any).source && (tgt as any).target) {
        this.edges = this.edges.filter(e => e !== tgt);
        this.pushState('delete.edge');
      } else {
        const id = (tgt as any).id;
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
        this.errorNodes.delete(String(id));
        this.pushState('nodes.removed');
      }
      this.selection = null;
      // Context deletions may affect error branches
      this.recomputeErrorPropagation();
      this.recomputeValidation();
    } catch { }
  }
  ctxCenterTarget() {
    const tgt = this.ctxMenuTarget;
    this.closeCtxMenu();
    try {
      const nodeId = (tgt && (tgt as any).id) ? String((tgt as any).id) : '';
      if (!nodeId) return;
      this.centerOnNodeId(nodeId);
    } catch { }
  }

  onSelected(ev: any) {
    // ngx-vflow peut renvoyer une entité ou une liste; on normalise
    const item = Array.isArray(ev) ? ev[0] : ev;
    this.selection = item || null;
    try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
  }

  selectItem(changes: any) {
    // Do not deselect on repeated click/press; only set when different
    if (!this.selection || this.selection.id !== changes.id) {
      this.selection = changes;
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
    }
  }

  openAdvancedEditor() {
    // Prefill input wing from previous node last result
    try {
      const nodeId = this.selectedModel?.id;
      const isStart = String(this.selectedModel?.templateObj?.type || '').toLowerCase() === 'start';
      this.advancedInjectedInput = isStart ? (this.getStartPayload() || {}) : this.computePrevPayload(nodeId);
      if (isStart) this.advancedInjectedOutput = this.getStartPayload() || {};
      this.advancedCtx = this.advancedInjectedInput || {};
    } catch { this.advancedInjectedInput = null; this.advancedCtx = {}; }
    this.advancedOpen = true;
  }
  onStartPayloadChange(v: any) {
    this.setStartPayload(v);
    this.advancedInjectedInput = v || {};
    this.advancedInjectedOutput = v || {};
    this.advancedCtx = this.advancedInjectedInput || {};
    try { this.cdr.detectChanges(); } catch {}
  }
  closeAdvancedEditor() { this.advancedOpen = false; }
  onAdvancedModelChange(m: any) {
    // Apply the model to the selected node and refresh
    if (!m?.id) return;
    const oldModel = (this.nodes.find(n => n.id === this.selection?.id)?.data?.model) || this.selectedModel;
    this.nodes = this.nodes.map(n => n.id === this.selection?.id ? ({ ...n, data: { ...n.data, model: m } }) : n);
    this.selection = this.nodes.find(n => n.id === m.id) || this.selection;
    // Stabilize condition ids then reconcile edges
    const stable = this.fbUtils.ensureStableConditionIds(oldModel, m);
    const res = this.fbUtils.reconcileEdgesForNode(stable, oldModel, this.edges, (sid, h) => this.computeEdgeLabel(sid, h));
    this.edges = res.edges as any;
    // Ne pas pousser dans l’historique ici; on attend l’événement "committed"
    this.recomputeValidation();
  }
  onAdvancedModelCommitted(m: any) {
    if (!m?.id) return;
    try { this.openedNodeConfig.add(String(m.id)); } catch { }
    const oldModel = (this.nodes.find(n => n.id === m.id)?.data?.model) || null;
    const stable = this.fbUtils.ensureStableConditionIds(oldModel, m);
    const res = this.fbUtils.reconcileEdgesForNode(stable, oldModel, this.edges, (sid, h) => this.computeEdgeLabel(sid, h));
    if (res.deletedEdgeIds?.length) {
      res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.add(id));
      setTimeout(() => { res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.delete(id)); }, 600);
    }
    this.edges = res.edges as any;

    this.pushState('dialog.modelCommit.final');
    this.recomputeValidation();
  }

  saveSelectedJson() {
    if (!this.selection) return;
    try {
      const parsed = this.editJson && this.editJson.trim().length ? JSON.parse(this.editJson) : null;
      if (!parsed || !parsed.id) return;
      // Remplace le model du nœud dans la liste pour déclencher le re-render
      const oldModel = (this.nodes.find(n => n.id === this.selection!.id)?.data?.model) || this.selectedModel;
      const stable = this.fbUtils.ensureStableConditionIds(oldModel, parsed);
      this.nodes = this.nodes.map(n => n.id === this.selection!.id ? ({ ...n, data: { ...n.data, model: stable } }) : n);
      // Met à jour la sélection en mémoire
      this.selection = this.nodes.find(n => n.id === stable.id) || null;
      // Reconcile edges for this node after model update
      const res = this.fbUtils.reconcileEdgesForNode(stable, oldModel, this.edges, (sid, h) => this.computeEdgeLabel(sid, h));
      if (res.deletedEdgeIds?.length) {
        res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.add(id));
        setTimeout(() => { res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.delete(id)); }, 600);
      }
      this.edges = res.edges as any;
      this.pushState('inspector.saveJson');
      this.recomputeValidation();
    } catch { }
  }


  // Inspector actions
  deleteSelected() {
    if (!this.selection) return;
    const sel = this.selection;
    if ((sel as any).source && (sel as any).target) {
      // selected an edge
      this.edges = this.edges.filter(e => e !== sel);
      // Record deletion of a specific edge
      this.pushState('delete.edge');
    } else {
      // selected a node
      const id = sel.id;
      this.nodes = this.nodes.filter(n => n.id !== id);
      this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
      this.errorNodes.delete(String(id));
      // Record deletion of one or more nodes
      this.pushState('nodes.removed');
    }
    this.selection = null;
    // Deletion may change error-branch reachability
    this.recomputeErrorPropagation();
    this.recomputeValidation();
  }

  private findBestTargetNodeForStart(wx: number, wy: number): any | null {
    try {
      let best: any = null; let bestD = Infinity;
      for (const n of this.nodes) {
        const tmpl = n?.data?.model?.templateObj || {};
        const ty = String(tmpl?.type || '').toLowerCase();
        // target must accept an input (not start-like/end)
        if (ty === 'start' || ty === 'event' || ty === 'endpoint' || ty === 'end') continue;
        const p = n?.point || { x: 0, y: 0 };
        const dx = (p.x - wx);
        const dy = (p.y - wy);
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { best = n; bestD = d2; }
      }
      return best;
    } catch { return null; }
  }

  private computePositionAboveTarget(target: any): { x: number; y: number } {
    try {
      const vp = this.flow?.viewportService?.readableViewport();
      const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(target.id)}\"]`) as HTMLElement | null;
      let w = 180, h = 100;
      if (el && vp) { const r = el.getBoundingClientRect(); if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); } }
      const gap = 60;
      const x = (target.point?.x || 0);
      const y = (target.point?.y || 0) - h - gap;
      return { x, y };
    } catch { return { x: (target?.point?.x || 0), y: (target?.point?.y || 0) - 160 }; }
  }

  undo() {

    this.beginApplyingHistory(500);
    const prev = this.history.undo(this.snapshot());
    if (!prev) return;
    this.nodes = prev.nodes;
    this.edges = prev.edges as any;
    // Restore derived error branches from the resulting graph
    this.recomputeErrorPropagation();
  }
  redo() {

    this.beginApplyingHistory(500);
    const next = this.history.redo(this.snapshot());
    if (!next) return;
    this.nodes = next.nodes;
    this.edges = next.edges as any;
    // Restore derived error branches from the resulting graph
    this.recomputeErrorPropagation();
  }

  centerFlow() {
    try {
      if (!this.nodes.length) return;
      const vp = this.flow?.viewportService?.readableViewport() || { zoom: 1 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of this.nodes) {
        const id = n.id;
        const p = n?.point || { x: 0, y: 0 };
        let w = 180, h = 100;
        try {
          const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(id)}\"]`) as HTMLElement | null;
          if (el) {
            const r = el.getBoundingClientRect();
            if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); }
          }
        } catch { }
        const x1 = p.x, y1 = p.y, x2 = p.x + w, y2 = p.y + h;
        if (x1 < minX) minX = x1; if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2; if (y2 > maxY) maxY = y2;
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      this.centerViewportOnWorldPoint(cx, cy, 250);
    } catch { }
  }
  centerOnSelection() {
    try {
      const sel = this.selection;
      const nodeId = (sel && !(sel as any).source && (sel as any).id) ? String((sel as any).id) : '';
      if (!nodeId) return; // only nodes supported
      this.centerOnNodeId(nodeId);
    } catch { }
  }

  private centerOnNodeId(nodeId: string) {
    const n = this.nodes.find(nn => nn.id === nodeId);
    if (!n) return;
    const p = n.point || { x: 0, y: 0 };
    const vp = this.flow?.viewportService?.readableViewport() || { zoom: 1 };
    let w = 180, h = 100;
    try {
      const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id="${CSS.escape(nodeId)}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); }
      }
    } catch { }
    const wx = p.x + (w / 2);
    const wy = p.y + (h / 2);
    this.centerViewportOnWorldPoint(wx, wy, 250);
  }

  onIssueClick(it: { kind: 'node' | 'flow'; nodeId?: string; message: string }) {
    try {
      if (it && it.nodeId) {
        const node = this.nodes.find(n => String(n.id) === String(it.nodeId));
        if (node) {
          this.selectItem(node);
          this.centerOnNodeId(String(it.nodeId));
        }
      }
    } catch { }
  }

  private centerViewportOnWorldPoint(wx: number, wy: number, duration = 0) {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs || !this.flowHost?.nativeElement) return;
      const vp = this.flow.viewportService.readableViewport();
      const rect = this.flowHost.nativeElement.getBoundingClientRect();
      const state = this.fbUtils.centerViewportOnWorldPoint(vp, rect, wx, wy);
      (vs as any).writableViewport.set({ changeType: 'absolute', state, duration });
      try { vs.triggerViewportChangeEvent?.('end'); } catch { }
    } catch { }
  }

  get canUndo() { return this.history.canUndo(); }
  get canRedo() { return this.history.canRedo(); }

  // Export/Import
  exportFlow() {
    const data = JSON.stringify({ nodes: this.nodes, edges: this.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    try { this.message.success('Export réussi'); } catch { this.showToast('Export réussi'); }
  }

  // Placeholder actions for save and run
  saveFlow() {
    try {
      if (this.currentFlowId) {
        this.catalog.saveFlow({ id: this.currentFlowId, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: {} } as any).subscribe({
          next: () => {
            try { this.message.success('Flow sauvegardé'); } catch { this.showToast('Flow sauvegardé'); }
            // Mettre à jour la référence serveur (checksum) pour refléter l’état sauvegardé
            this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
            // Mettre à jour le snapshot partagé et le draft local afin que le bouton Sauvegarder se désactive
            try {
              this.updateSharedGraph();
              this.saveDraft(); // efface le draft si identique à la version serveur
              this.persistHistory();
            } catch {}
            try { this.cdr.detectChanges(); } catch {}
          },
          error: (e) => {
            const apiErr = this.normalizeApiError(e);
            const code = String(apiErr?.code || '');
            if (code === 'flow_invalid'){
              const errors = Array.isArray(apiErr?.details?.errors) ? apiErr.details.errors : [];
              const warnings = Array.isArray(apiErr?.details?.warnings) ? apiErr.details.warnings : [];
              const fmt = (it: any) => {
                const c = it?.code || 'error';
                const msg = it?.message ? `: ${it.message}` : '';
                const detNode = it?.details?.nodeId ? ` (nœud ${it.details.nodeId})` : '';
                const detEdge = it?.details?.edge ? ` (arête ${it.details.edge})` : '';
                const detProv = it?.details?.providerKey ? ` [${it.details.providerKey}]` : '';
                const detKey = it?.details?.key ? ` [${it.details.key}]` : '';
                const detField = it?.details?.field ? ` [${it.details.field}]` : '';
                return `• ${c}${msg}${detNode}${detEdge}${detProv}${detKey}${detField}`;
              };
              const listErr = errors.map(fmt).join('<br/>') || '• Erreurs inconnues';
              const listWarn = warnings.length ? ('<br/><br/><b>Avertissements</b><br/>' + warnings.map(fmt).join('<br/>')) : '';
              this.modal.confirm({
                nzTitle: 'Flow invalide',
                nzContent: `Le flow contient des erreurs de validation.<br/><br/><b>Erreurs</b><br/>${listErr}${listWarn}<br/><br/>Forcer la sauvegarde, désactiver le flow et créer une notification ?`,
                nzOkText: 'Forcer', nzOkDanger: true, nzCancelText: 'Annuler',
                nzOnOk: () => this.catalog.saveFlow({ id: this.currentFlowId!, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: {} } as any, true).subscribe({ next: () => {
                  try { this.message.warning('Flow forcé et désactivé'); } catch { this.showToast('Flow forcé et désactivé'); }
                  this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
                  try { this.updateSharedGraph(); this.saveDraft(); this.persistHistory(); } catch {}
                } })
              });
            } else {
              try { this.message.error(apiErr?.message || 'Échec de la sauvegarde'); } catch { this.showToast(apiErr?.message || 'Échec de la sauvegarde'); }
            }
          },
        });
      } else {
        try { this.message.warning('Aucun flow associé'); } catch { this.showToast('Aucun flow associé'); }
      }
    } catch { try { this.message.error('Échec de la sauvegarde'); } catch { this.showToast('Échec de la sauvegarde'); } }
  }
  runFlow() {
    const snap = this.snapshot();
    // Always update the shared graph snapshot (used by the executions page)
    this.shared.setGraph({ nodes: snap.nodes, edges: snap.edges, id: this.currentFlowId || undefined, name: this.currentFlowName, description: this.currentFlowDesc });

    // If backend is enabled and we have a flowId, launch on backend
    if (environment.useBackend && this.currentFlowId) {
      // Optional: ensure we have a start-like node to avoid ambiguous entrypoint
      if (!this.hasStartLikeNode()) {
        try { this.message.warning('Ajoutez un nœud de départ (Start) avant de lancer sur le backend'); } catch { this.showToast('Nœud Start requis pour lancer sur le backend'); }
        // Fallback: still allow local run to preview
        try { this.runner.run({ nodes: snap.nodes, edges: snap.edges }, this.builderMode, this.getStartPayload(), this.currentFlowId || 'adhoc'); } catch {}
        return;
      }
      const launch = () => {
        const p = this.getStartPayload();
        this.runsApi.start(this.currentFlowId!, (p && (p as any).payload) ?? null).subscribe({
          next: (r: any) => {
            try { this.message.success('Exécution backend démarrée'); } catch { this.showToast('Exécution backend démarrée'); }
            // Ouvrir le flux SSE et afficher l’état en direct dans l’éditeur (pas de redirection)
            try {
              const runId = r?.id || r?.data?.id || r?.runId;
              if (runId) this.openBackendStream(runId);
            } catch {}
          },
          error: (e) => {
            const err = this.normalizeApiError(e);
            try { this.message.error(err?.message || 'Échec du démarrage backend'); } catch { this.showToast(err?.message || 'Échec du démarrage backend'); }
          }
        });
      };
      // Save first if there are unsaved changes to ensure backend has the latest graph
      if (this.hasUnsavedChanges()) {
        this.catalog.saveFlow({ id: this.currentFlowId, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: {} } as any).subscribe({
          next: () => {
            // Update checksum/draft like saveFlow()
            this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
            try { this.updateSharedGraph(); this.saveDraft(); this.persistHistory(); } catch {}
            launch();
          },
          error: (e) => {
            const err = this.normalizeApiError(e);
            try { this.message.error(err?.message || 'Échec de la sauvegarde'); } catch { this.showToast(err?.message || 'Échec de la sauvegarde'); }
          }
        });
      } else {
        launch();
      }
      return;
    }

    // Local run fallback (dev playground)
    try { this.message.info(`Lancement local (${this.builderMode})…`); } catch { this.showToast(`Lancement local (${this.builderMode})…`); }
    try { this.runner.run({ nodes: snap.nodes, edges: snap.edges }, this.builderMode, this.getStartPayload(), this.currentFlowId || 'adhoc'); } catch {}
  }

  private openBackendStream(runId: string) {
    // Reset per-run visual state
    this.backendRunId = runId;
    this.backendNodeStats = new Map();
    this.backendNodeAttempts = new Map();
    this.backendEdgesTaken.clear();
    this.backendLastNodeId = null;
    // Refresh edge visuals immediately
    this.applyBackendEdgeHighlights();
    try { this.cdr.detectChanges(); } catch {}

    try { this.backendStream?.close(); } catch {}
    const s = this.runsApi.stream(runId);
    this.backendStream = s;
    s.on((ev) => {
      const type = ev?.type as string;
      if (!type) return;
      // LiveEvent mapping
      if (type === 'run.status') {
        const st = ev?.run?.status || ev?.data?.status;
        if (st === 'running') {
          this.backendNodeStats.clear();
          this.backendEdgesTaken.clear();
          this.backendLastNodeId = this.findStartNodeId();
          this.applyBackendEdgeHighlights();
          try { this.cdr.detectChanges(); } catch {}
        } else if (st === 'success' || st === 'error' || st === 'cancelled' || st === 'timed_out') {
          try { s.close(); } catch {}
          // Keep snapshot of attempts but stop further updates
        }
        return;
      }
      if (type === 'node.status') {
        const nid = String(ev.nodeId || ev.data?.nodeId || '');
        const st = ev?.data?.status || 'running';
        const exec = (ev as any)?.exec ?? ev?.data?.exec;
        if (nid) {
          const cur = this.backendNodeStats.get(nid) || { count: 0 } as any;
          cur.lastStatus = st as any;
          this.backendNodeStats.set(nid, cur);
          // Track per-node attempts by (nodeId, exec)
          let arr = this.backendNodeAttempts.get(nid) || [];
          let at = arr.find(a => a.exec === exec);
          if (!at) { at = { exec, status: st }; arr = [...arr, at]; this.backendNodeAttempts.set(nid, arr); }
          else { at.status = st || at.status; }
          this.updateNodeVisual(nid);
          // Track path on running transition (edge from previous to current)
          if (st === 'running') {
            const prev = this.backendLastNodeId;
            if (prev && prev !== nid) {
              this.backendEdgesTaken.add(`${prev}->${nid}`);
              this.applyBackendEdgeHighlights();
            }
            this.backendLastNodeId = nid;
          }
        }
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      if (type === 'edge.taken') {
        const sId = String(ev?.data?.sourceId || ev?.sourceId || '');
        const tId = String(ev?.data?.targetId || ev?.targetId || '');
        if (sId && tId && sId !== tId) {
          this.backendEdgesTaken.add(`${sId}->${tId}`);
          this.applyBackendEdgeHighlights();
        }
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      if (type === 'node.result') {
        const nid = String(ev.nodeId || '');
        if (nid) {
          const exec = (ev as any)?.exec ?? ev?.data?.exec;
          // Update per-node attempt I/O and status for this exec
          let arr = this.backendNodeAttempts.get(nid) || [];
          let at = arr.find(a => a.exec === exec);
          if (!at) { at = { exec }; arr = [...arr, at]; this.backendNodeAttempts.set(nid, arr); }
          at.status = 'success';
          at.input = ev.data?.input ?? at.input;
          at.argsPre = ev.data?.argsPre ?? at.argsPre;
          at.argsPost = ev.data?.argsPost ?? at.argsPost;
          at.result = (ev.result ?? ev.data?.result) ?? at.result;
          at.durationMs = ev.data?.durationMs ?? at.durationMs;
          at.startedAt = ev.data?.startedAt ?? at.startedAt;
          at.finishedAt = ev.data?.finishedAt ?? at.finishedAt;
          // Update quick stats (count is attempts length)
          const cur = this.backendNodeStats.get(nid) || { count: 0 } as any;
          cur.count = (this.backendNodeAttempts.get(nid)?.length || 0);
          cur.lastStatus = 'success';
          this.backendNodeStats.set(nid, cur);
          this.updateNodeVisual(nid);
          // Edge path was updated on node.status running; nothing else to do here
        }
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
    });
  }

  private findStartNodeId(): string | null {
    try {
      const nodes = (this.nodes || []) as any[];
      for (const n of nodes) {
        const t = n?.data?.model?.templateObj || {};
        const ty = String(t?.type || '').toLowerCase();
        if (ty === 'start') return String(n.id);
      }
      for (const n of nodes) { if (String(n.id).toLowerCase().includes('start')) return String(n.id); }
    } catch {}
    return null;
  }

  private applyBackendEdgeHighlights() {
    try {
      const pairs = this.backendEdgesTaken;
      (this.edges || []).forEach((e: any) => {
        const took = pairs.has(`${e.source}->${e.target}`);
        const data = e.data || (e.data = {});
        const end = (e as any).markers?.end || {};
        if (took) {
          (data as any).strokeWidth = 2;
          (data as any).color = '#1677ff';
          (e as any).markers = { ...(e.markers || {}), end: { ...end, color: '#1677ff' } };
        } else {
          if ((data as any).color === '#1677ff') (data as any).color = '#b1b1b7';
          if (((data as any).strokeWidth || 0) > 2) (data as any).strokeWidth = 2;
          if (end && end.color === '#1677ff') (e as any).markers = { ...(e.markers || {}), end: { ...end, color: '#b1b1b7' } };
        }
      });
    } catch {}
  }

  // (no decorated getters; we update in place to preserve Vflow entity identity)
  private updateNodeVisual(nid: string) {
    try {
      const atts = this.backendNodeAttempts.get(nid) || [];
      const last = atts[atts.length - 1];
      const execCount = atts.length;
      const node = (this.nodes || []).find(n => String(n.id) === String(nid));
      if (!node) return;
      const data = node.data || (node.data = {} as any);
      (data as any).execStatus = last?.status || 'running';
      (data as any).execCount = execCount;
    } catch {}
  }

  private openRunSnapshotInEditor(runId: string) {
    // Load attempts snapshot (for historic runs) and open SSE if still running
    this.runsApi.getWith(runId, ['attempts']).subscribe({
      next: (r: any) => {
        // Reset state
        this.backendNodeStats = new Map();
        this.backendNodeAttempts = new Map();
        this.backendEdgesTaken.clear();
        // Fill attempts per node/exec
        const attempts = (r?.attempts || []) as any[];
        attempts.forEach(a => {
          const nid = String(a.nodeId);
          const exec = a.attempt;
          const arr = this.backendNodeAttempts.get(nid) || [];
          arr.push({ exec, status: a.status, startedAt: a.startedAt, finishedAt: a.finishedAt, durationMs: a.durationMs, input: a.input, argsPre: a.argsPre, argsPost: a.argsPost, result: a.result });
          this.backendNodeAttempts.set(nid, arr);
          this.updateNodeVisual(nid);
        });
        // Derive path pairs from attempts order for historical view
        try {
          this.backendEdgesTaken.clear();
          for (let i = 1; i < attempts.length; i++) {
            const prev = String(attempts[i - 1]?.nodeId || '');
            const cur = String(attempts[i]?.nodeId || '');
            if (prev && cur && prev !== cur) this.backendEdgesTaken.add(`${prev}->${cur}`);
          }
          this.applyBackendEdgeHighlights();
        } catch {}
        try { this.cdr.detectChanges(); } catch {}
        // Open live stream if still running
        const st = r?.status || 'success';
        if (st === 'running') this.openBackendStream(runId);
      },
      error: () => { this.openBackendStream(runId); }
    });
  }
  stopLastRun() { if (this.lastRun) try { this.runner.cancel(this.lastRun.runId); } catch {} }


  private showToast(msg: string) {
    this.toastMsg = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 1800);
  }

  // Normalize API error from either envelope unwrap or HttpErrorResponse
  private normalizeApiError(e: any): { code?: string; message?: string; details?: any } {
    try {
      // Already-unwrapped shape thrown by ApiClientService.unwrap
      if (e && (e.code || e.message || e.details)) return { code: e.code, message: e.message, details: e.details };
      // HttpErrorResponse with envelope in e.error
      const ee = e?.error;
      if (ee && (ee.error || ee.message || ee.details)) {
        const inner = ee.error || ee; // prefer nested error object
        return { code: inner.code, message: inner.message, details: inner.details };
      }
      // Fallback
      return { message: (e && e.message) || 'API error' };
    } catch { return { message: 'API error' }; }
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement | null;
    const tag = (target?.tagName || '').toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (target?.isContentEditable ?? false);
    if (isInput) return;
    const cmd = ev.metaKey || ev.ctrlKey;
    if (!cmd) return;
    if (ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
      ev.preventDefault();
      this.undo();
    } else if ((ev.key.toLowerCase() === 'z' && ev.shiftKey) || ev.key.toLowerCase() === 'y') {
      ev.preventDefault();
      this.redo();
    }
  }

  private snapshot() {
    const snap = {
      nodes: JSON.parse(JSON.stringify(this.nodes)),
      edges: JSON.parse(JSON.stringify(this.edges)),
      id: this.currentFlowId || undefined,
      name: this.currentFlowName || undefined,
      description: this.currentFlowDesc || undefined,
    } as any;
    try {
      const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled });
      snap.currentChecksum = current;
      snap.serverChecksum = this.lastSavedChecksum;
    } catch {}
    return snap;
  }
  private updateSharedGraph() {
    try { this.shared.setGraph(this.snapshot() as any); } catch {}
  }
  private historyKey(): string {
    const fid = this.currentFlowId || 'adhoc';
    return `flow.history.${fid}`;
  }
  private persistHistory() {
    try {
      const dump = (this.history as any).exportAll?.();
      if (!dump) return;
      const payload = {
        version: 1,
        flowId: this.currentFlowId || 'adhoc',
        serverChecksum: this.lastSavedChecksum || null,
        ts: Date.now(),
        dump,
      };
      localStorage.setItem(this.historyKey(), JSON.stringify(payload));
    } catch {}
  }
  private tryHydrateHistory(): boolean {
    try {
      const raw = localStorage.getItem(this.historyKey());
      if (!raw) return false;
      const obj = JSON.parse(raw);
      // Back-compat: either { past, future, ... } or wrapper { version, dump }
      const isWrapper = obj && typeof obj === 'object' && ('dump' in obj || 'version' in obj);
      if (!isWrapper) {
        // legacy format without checksum/flowId — discard to avoid stale timelines
        try { localStorage.removeItem(this.historyKey()); } catch {}
        return false;
      }
      const dump = (obj.dump || {});
      const storedChecksum = isWrapper ? (obj.serverChecksum || null) : null;
      const storedFlowId = isWrapper ? (obj.flowId || null) : null;
      // Hydrate only if same flow and same server checksum (prevents stale history from another version)
      if (storedFlowId && this.currentFlowId && String(storedFlowId) !== String(this.currentFlowId)) {
        localStorage.removeItem(this.historyKey());
        return false;
      }
      if (storedChecksum && this.lastSavedChecksum && String(storedChecksum) !== String(this.lastSavedChecksum)) {
        localStorage.removeItem(this.historyKey());
        return false;
      }
      (this.history as any).hydrate?.(dump);
      this.updateTimelineCaches();
      return true;
    } catch {
      return false;
    }
  }
  private now() { return Date.now(); }
  private isIgnoring() { return this.applyingHistory || this.now() < this.ignoreEventsUntil; }
  private beginApplyingHistory(ms = 400) {
    this.applyingHistory = true;
    this.ignoreEventsUntil = this.now() + ms;
    setTimeout(() => { this.applyingHistory = false; }, ms);
  }
  private pushState(reason: string) {
    if (this.isIgnoring()) { return; }
    // Coalesce frequent triggers into a single push
    const isFinal = /\.final$/.test(reason);
    if (!isFinal) {
      if (this.pushPending) { return; }
      this.pushPending = true;
      setTimeout(() => {
        this.pushPending = false;
        try {
          this.zone.run(() => {
            this.history.push(this.snapshot(), reason);
            this.updateSharedGraph();
            this.updateTimelineCaches();
            try { this.cdr.detectChanges(); } catch { }
            this.saveDraft();
            this.persistHistory();
          });
        } catch {
          this.history.push(this.snapshot(), reason);
          this.updateSharedGraph();
          this.updateTimelineCaches();
          try { this.cdr.detectChanges(); } catch { }
          this.persistHistory();
        }
      }, 60);
    } else {
      try {
        this.zone.run(() => {
          this.history.push(this.snapshot(), reason);
          this.updateSharedGraph();
          this.updateTimelineCaches();
          try { this.cdr.detectChanges(); } catch { }
          this.saveDraft();
          this.persistHistory();
        });
      } catch {
        this.history.push(this.snapshot(), reason);
        this.updateSharedGraph();
        this.updateTimelineCaches();
        try { this.cdr.detectChanges(); } catch { }
        this.persistHistory();
      }
    }
  }

  // Output handle tooltip helpers
  onHandleEnter(ev: MouseEvent, model: any, out: string) {
    try {
      const txt = this.getOutputName(model, out) || '';
      this.tipText = txt;
      this.tipVisible = !!txt;
      this.tipError = String(out) === 'err';
      this.onHandleMove(ev);
    } catch { this.tipVisible = false; }
  }
  onHandleMove(ev: MouseEvent) {
    try {
      // Offset a bit from cursor
      this.tipX = ev.clientX + 8;
      this.tipY = ev.clientY + 8;
    } catch { }
  }
  onHandleLeave() { this.tipVisible = false; }

  // Change handlers from ngx-vflow
  private posDebounceTimer: any;
  private draggingNodes = new Set<string>();
  private pendingPositions: Record<string, { x: number; y: number }> = {};
  private zoomUpdateTimer: any;
  onNodePositionChange(change: any) {
    // logs disabled
    if (this.isIgnoring()) { return; }
    const id = change?.id;
    const pt = change?.to?.point || change?.point || change?.to;
    if (!id || !pt) { return; }
    const before = this.nodes.find(n => n.id === id);

    // Cache the last known point; do not mutate nodes during drag
    this.pendingPositions[String(id)] = { x: pt.x, y: pt.y };
    // Mark drag in progress; final apply happens on pointerup/cancel
    this.draggingNodes.add(String(id));
  }

  onWheel(_ev: WheelEvent) {
    try { if (this.zoomUpdateTimer) clearTimeout(this.zoomUpdateTimer); } catch { }
    this.zoomUpdateTimer = setTimeout(() => this.zone.run(() => this.updateZoomDisplay()), 80);
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onPointerUp() {
    if (this.isIgnoring()) return;
    if (!this.draggingNodes.size) return;
    const ids = Array.from(this.draggingNodes);
    // logs disabled
    const posMap = this.pendingPositions;
    this.nodes = this.nodes.map(n => (posMap[n.id] ? ({ ...n, point: { x: posMap[n.id].x, y: posMap[n.id].y } }) : n));
    this.draggingNodes.clear();
    this.pendingPositions = {} as any;
    this.pushState('node.position.final');
    // Suppress spurious nodes.removed events that may follow a move
    this.suppressNodesRemovedUntil = Date.now() + 400;
  }

  onNodesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      if (Date.now() < (this.suppressGraphEventsUntil || 0)) { this.log('nodes.removed.suppressed', { until: this.suppressGraphEventsUntil }); return; }
      const ids = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (Date.now() < this.suppressNodesRemovedUntil) { this.log('nodes.removed.ignored.window', { until: this.suppressNodesRemovedUntil }); return; }
      if (!ids.size) return;
      const beforeNodes = this.nodes.length;
      const beforeEdges = this.edges.length;
      this.log('nodes.removed', { ids: Array.from(ids) });
      this.nodes = this.nodes.filter(n => !ids.has(n.id));
      this.edges = this.edges.filter(e => !ids.has(String(e.source)) && !ids.has(String(e.target)));
      const changed = (this.nodes.length !== beforeNodes) || (this.edges.length !== beforeEdges);
      ids.forEach(id => this.errorNodes.delete(String(id)));
      if (changed) {
        // Removal can break error paths: recompute error propagation
        this.recomputeErrorPropagation();
        this.pushState('nodes.removed');
      }
    } catch { }
  }
  onEdgesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      if (Date.now() < (this.suppressGraphEventsUntil || 0)) { this.log('edges.removed.suppressed', { until: this.suppressGraphEventsUntil }); return; }
      const removedIds = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (Date.now() < this.suppressRemoveUntil) return;
      if (!removedIds.size) return;
      this.log('edges.removed', { ids: Array.from(removedIds) });
      const nextEdges: Edge[] = [];
      let changed = false;
      for (const e of this.edges) {
        if (!removedIds.has(e.id as any)) { nextEdges.push(e); continue; }
        const isAllowedDeletion = this.allowedRemovedEdgeIds.has(e.id as any);
        if (isAllowedDeletion) { changed = true; continue; }
        // Only remove if one of the endpoints no longer exists; otherwise ignore (likely a transient detach while reattaching)
        const hasSource = this.nodes.some(n => n.id === e.source);
        const hasTarget = this.nodes.some(n => n.id === e.target);
        if (!hasSource || !hasTarget) { changed = true; continue; }
        // Keep the edge; will be restored visually
        nextEdges.push(e);
      }
      if (changed) {
        this.edges = nextEdges as any;
        // Any change in edges can affect error-branch propagation
        this.recomputeErrorPropagation();
        this.pushState('edges.removed');
      }
    } catch { }
  }

  private pendingDetachTimers: Record<string, any> = {};
  private suppressRemoveUntil = 0;
  private suppressNodesRemovedUntil = 0;
  private suppressGraphEventsUntil = 0;
  private previewBaseline: { nodes: any[]; edges: any[] } | null = null;
  private log(evt: string, data?: any) { try { console.log('[editor]', evt, data || ''); } catch {} }
  onEdgesDetached(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      const ids = (changes || []).map(c => c?.id).filter(Boolean) as string[];
      for (const id of ids) {
        if (this.pendingDetachTimers[id]) { clearTimeout(this.pendingDetachTimers[id]); }
        // Re-vérifier après un court délai (évite de supprimer pendant un drag)
        this.pendingDetachTimers[id] = setTimeout(() => {
          delete this.pendingDetachTimers[id];
          const edge = this.edges.find(e => (e.id as any) === id);
          if (!edge) return;
          const hasSource = this.nodes.some(n => n.id === edge.source);
          const hasTarget = this.nodes.some(n => n.id === edge.target);
          // Ne supprimer que si la source ou la cible n’existe vraiment plus
          if (!hasSource || !hasTarget) {
            this.edges = this.edges.filter(e => e !== edge);
            // Edge actually detached, update error propagation
            this.recomputeErrorPropagation();
            this.pushState('edges.detached.final');
          }
        }, 250);
      }
    } catch { }
  }

  // Import with loading feedback
  // History timeline interactions
  onHistoryHoverPast(index: number) {
    // UI shows newest first; map UI index to original past index
    const uiIndex = Math.max(0, Number(index) || 0);
    const origIndex = Math.max(0, (this.history.pastCount() - 1) - uiIndex);
    const snap = this.history.getPastAt(origIndex);
    if (!snap) return;
    this.previewSnapshot(snap);
  }
  onHistoryHoverFuture(index: number) {
    const snap = this.history.getFutureAt(index);
    if (!snap) return;
    this.previewSnapshot(snap);
  }
  onHistoryHoverLeave() {
    this.revertPreview();
  }
  private previewSnapshot(s: { nodes: any[]; edges: any[] }) {
    try {
      if (!this.previewBaseline) this.previewBaseline = this.snapshot();
      this.beginApplyingHistory(400);
      this.suppressGraphEventsUntil = Date.now() + 800;
      this.nodes = JSON.parse(JSON.stringify(s.nodes || []));
      this.edges = JSON.parse(JSON.stringify(s.edges || []));
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
    } catch { }
  }
  private revertPreview() {
    if (!this.previewBaseline) return;
    try {
      const s = this.previewBaseline; this.previewBaseline = null;
      this.beginApplyingHistory(200);
      this.suppressGraphEventsUntil = Date.now() + 600;
      this.nodes = JSON.parse(JSON.stringify(s.nodes || []));
      this.edges = JSON.parse(JSON.stringify(s.edges || []));
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
    } catch { this.previewBaseline = null; }
  }
  onHistoryClickPast(index: number) {
    // UI shows newest first; steps equal UI index (0 = current, 1 = one undo, etc.)
    try {
      this.previewBaseline = null; // finalize any preview
      this.beginApplyingHistory(600);
      this.suppressGraphEventsUntil = Date.now() + 1000;
      // Build message content from meta
      let loadedMsg: string | null = null;
      try {
        const uiIndex = Math.max(0, Number(index) || 0);
        const metas = (this.history as any).getPastMeta?.() || [];
        const origIndex = Math.max(0, (this.history.pastCount() - 1) - uiIndex);
        const meta = metas[origIndex];
        if (meta) { const t = this.formatTime(meta.ts); const d = this.describeReason(meta.reason); loadedMsg = `Snapshot chargé • ${t} • ${d.type} – ${d.message}`; }
      } catch { }
      let cur = this.snapshot();
      const steps = Math.max(0, Number(index) || 0);
      for (let i = 0; i < steps; i++) {
        const next = this.history.undo(cur);
        if (!next) break;
        cur = next;
      }
      this.nodes = cur.nodes; this.edges = cur.edges as any;
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
      try { this.history.push(this.snapshot(), 'restore', true); } catch { }
      try { this.updateTimelineCaches(); } catch { }
      try {
        if (!loadedMsg) loadedMsg = steps > 0 ? `Snapshot chargé (undo ×${steps})` : 'Snapshot courant';
        this.message.success(loadedMsg);
      } catch { this.showToast(loadedMsg || 'Snapshot chargé'); }
    } catch { }
  }
  onHistoryClickFuture(index: number) {
    try {
      this.previewBaseline = null;
      this.beginApplyingHistory(600);
      this.suppressGraphEventsUntil = Date.now() + 1000;
      // Build message content from meta
      let loadedMsg: string | null = null;
      try {
        const uiIndex = Math.max(0, Number(index) || 0);
        const metas = (this.history as any).getFutureMeta?.() || [];
        const meta = metas[uiIndex];
        if (meta) { const t = this.formatTime(meta.ts); const d = this.describeReason(meta.reason); loadedMsg = `Snapshot chargé • ${t} • ${d.type} – ${d.message}`; }
      } catch { }
      let cur = this.snapshot();
      const steps = Math.max(0, index + 1); // index 0 = next redo
      for (let i = 0; i < steps; i++) {
        const next = this.history.redo(cur);
        if (!next) break;
        cur = next;
      }
      this.nodes = cur.nodes; this.edges = cur.edges as any;
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
      try { this.history.push(this.snapshot(), 'restore', true); } catch { }
      try { this.updateTimelineCaches(); } catch { }
      try {
        if (!loadedMsg) loadedMsg = `Snapshot chargé (redo ×${steps})`;
        this.message.success(loadedMsg);
      } catch { this.showToast(loadedMsg || 'Snapshot chargé'); }
    } catch { }
  }

  importFlow(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || !files.length) return;
    const file = files[0];
    let loadingId: string | null = null;
    try { const m = this.message.loading('Import du flow…', { nzDuration: 0 }); loadingId = (m as any)?.messageId || null; } catch { }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) {
          const mapTemplate = (tplId: any) => (
            this.templates.find(t => t.id === tplId) || this.items.map(x => x.template).find((t: any) => t?.id === tplId)
          );
          this.beginApplyingHistory(700);
          this.nodes = parsed.nodes.map((n: any) => {
            try {
              const m = n?.data?.model;
              if (m && (!m.templateObj || !m.templateObj.type) && m.template) {
                const t = mapTemplate(m.template);
                if (t) return { ...n, data: { ...n.data, model: { ...m, templateObj: t } } };
              }
            } catch { }
            return n;
          });
          this.edges = parsed.edges;
          // After import, reconcile edges for all nodes (in case formats changed)
          try {
            this.nodes.forEach(n => {
              const m = n?.data?.model;
              const res = this.fbUtils.reconcileEdgesForNode(m, null, this.edges, (sid, h) => this.computeEdgeLabel(sid, h));
              if (res.deletedEdgeIds?.length) {
                res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.add(id));
                setTimeout(() => { res.deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.delete(id)); }, 600);
              }
              this.edges = res.edges as any;
            });
          } catch { }
          this.selection = null;
          // Rebuild error-branch state from imported edges
          this.recomputeErrorPropagation();
          this.history.reset(this.snapshot());
          try { this.message.success('Flow importé'); } catch { this.showToast('Flow importé'); }
        } else {
          try { this.message.error('Fichier invalide'); } catch { this.showToast('Fichier invalide'); }
        }
      } catch {
        try { this.message.error('Erreur lors de l\'import'); } catch { this.showToast('Erreur lors de l\'import'); }
      }
      try { if (loadingId) this.message.remove(loadingId); } catch { }
      if (input) input.value = '';
    };
    reader.onerror = () => {
      try { if (loadingId) this.message.remove(loadingId); } catch { }
      try { this.message.error('Erreur de lecture du fichier'); } catch { this.showToast('Erreur de lecture du fichier'); }
      if (input) input.value = '';
    };
    reader.readAsText(file);
  }
}
