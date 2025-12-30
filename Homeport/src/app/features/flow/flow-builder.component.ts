import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
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
import { FlowRunService } from '../../services/flow-run.service';
import { FlowPathHighlightService } from '../../services/flow-path-highlight.service';
import { LayoutBackendService } from '../../services/layout-backend.service';
import { RunsBackendService } from '../../services/runs-backend.service';
import { FlowSharedStateService } from '../../services/flow-shared-state.service';
import { FlowRightPanelComponent } from './panels/flow-right-panel.component';
import { FlowAiChatComponent } from './components/ai-flow-chat.component';
import { environment } from '../../../environments/environment';
import { NodeCardHeaderComponent } from '../../shared/node-card-header.component';
import { VflowSafariForeignObjectPatchDirective } from './flow-builder.directive';

@Component({
  selector: 'flow-builder',
  standalone: true,
  imports: [CommonModule,VflowSafariForeignObjectPatchDirective, FormsModule, DragDropModule, NzToolTipModule, NzPopoverModule, NzDrawerModule, NzButtonModule, NzModalModule, NzInputModule, NzSelectModule, NzFormModule, Vflow, FlowAdvancedEditorDialogComponent, FlowPalettePanelComponent, FlowRightPanelComponent, FlowAiChatComponent, NodeCardHeaderComponent],
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
  connectionSettings: ConnectionSettings = {
    validator: (c) => this.validateConnection(c)
  };
  private errorNodes = new Set<string>();

  @ViewChild('flowHost', { static: false }) flowHost?: ElementRef<HTMLElement>;
  @ViewChild('flow', { static: false }) flow?: any;
  // Drop zone host is the canvas host element

  selection: any = null;
  selectionList: any[] = [];
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
  // When opening a specific backend run in editor, skip restoring local drafts
  private openingRunId: string | null = null;
  // Backend live run state (per current execution)
  backendRunId: string | null = null;
  private backendStream?: { source: EventSource, on: (cb: (ev: any) => void) => void, close: () => void };
  private backendNodeStats = new Map<string, { count: number; lastStatus?: 'success'|'error'|'skipped'|'running' }>();
  private backendNodeAttempts = new Map<string, Array<{ exec?: number; status?: string; startedAt?: string; finishedAt?: string; durationMs?: number; input?: any; argsPre?: any; argsPost?: any; result?: any; msgIn?: any; msgOut?: any; events?: any[] }>>();
  private backendLastNodeId: string | null = null; // legacy linear tracker
  private backendEdgesTaken = new Set<string>();
  private backendAttemptSeq: string[] = [];
  private lastOverlayPairs = new Set<string>();
  private backendRunStatus: 'idle'|'running'|'done' = 'idle';
  // Control whether exec badges are shown on nodes
  private showExecBadges = false;
  // Snapshot of selected run (from backend) for right panel
  currentRunMeta: { id?: string; status?: string; startedAt?: string; finishedAt?: string } | null = null;
  // Recent local runs (fallback list)
  recentRuns: Array<{ id?: string; status?: string; startedAt?: string; finishedAt?: string }> = [];
  private runsPage = 1;
  private runsLimit = 20;
  runsHasMore = true;
  private runsLoading = false;
  // AI Chat popover visibility
  aiChatOpen = false;
  rightPanelOpen = false;
  leftPanelOpen = false;
  // Transient animation flags for newly added nodes
  spawnAnimNodes = new Set<string>();
  spawnLiteAnimNodes = new Set<string>();
  private isIOSSafari = false;
  removingNodes = new Set<string>();
  removingLiteNodes = new Set<string>();
  private pendingRemoveTimers: Record<string, any> = {};
  private scheduleRemove(ids: Set<string>, reason: string = 'nodes.removed') {
    try {
      const toRemove = Array.from(ids).filter(id => !!id);
      if (!toRemove.length) return;
      toRemove.forEach(id => {
        const key = String(id);
        if (this.isIOSSafari) this.removingLiteNodes.add(key); else this.removingNodes.add(key);
        if (this.pendingRemoveTimers[key]) return;
        this.pendingRemoveTimers[key] = setTimeout(() => {
          delete this.pendingRemoveTimers[key];
          this.nodes = this.nodes.filter(n => String(n.id) !== key);
          this.edges = this.edges.filter(e => String(e.source) !== key && String(e.target) !== key);
          this.errorNodes.delete(key);
          if (this.isIOSSafari) this.removingLiteNodes.delete(key); else this.removingNodes.delete(key);
          try { this.cdr.detectChanges(); } catch {}
          this.recomputeErrorPropagation();
        }, 260);
      });
      this.selection = null; this.selectionList = [];
      this.pushState(reason);
      this.recomputeValidation();
    } catch {}
  }
  private triggerSpawnAnim(id: string) {
    try {
      const key = String(id);
      if (this.isIOSSafari) {
        this.spawnLiteAnimNodes.add(key);
        setTimeout(() => { this.spawnLiteAnimNodes.delete(key); try { this.cdr.detectChanges(); } catch {} }, 700);
      } else {
        this.spawnAnimNodes.add(key);
        setTimeout(() => { this.spawnAnimNodes.delete(key); try { this.cdr.detectChanges(); } catch {} }, 1100);
      }
    } catch {}
  }
  private panelsStateKey(): string {
    const fid = this.currentFlowId || 'adhoc';
    return `flow.ui.panels.${fid}`;
  }
  private savePanelsState() {
    try {
      const payload = { left: !!this.leftPanelOpen, right: !!this.rightPanelOpen };
      localStorage.setItem(this.panelsStateKey(), JSON.stringify(payload));
    } catch {}
  }
  private restorePanelsState() {
    try {
      const raw = localStorage.getItem(this.panelsStateKey());
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (typeof obj?.left === 'boolean') this.leftPanelOpen = obj.left;
      if (typeof obj?.right === 'boolean') this.rightPanelOpen = obj.right;
    } catch {}
  }
  // Ports orientation (inputs/outputs placement)
  portOrientation: 'vertical' | 'horizontal' = 'horizontal';
  // Alignment helper guidelines (visual lines)
  alignmentHelper: boolean | { tolerance: number; lineColor: string } = false;
  // Optional grid snapping (magnetic)
  snapGrid: [number, number] | null = null;
  get snapGridInput(): [number, number] { return (this.snapGrid || [0, 0]) as any; }
  // Dots background, light grey
  flowBackground: any = { type: 'dots', gap: 25, color: '#D4D8E0', size: 1.6, backgroundColor: '#F5F7FA' };

  togglePortOrientation() {
    this.portOrientation = this.portOrientation === 'vertical' ? 'horizontal' : 'vertical';
    try { this.message.info(`Orientation: ${this.portOrientation}`); } catch {}
    
    // Persist and refresh placement/viewport
    try { this.updateSharedGraph(); this.saveDraft(); this.saveLocalUiMeta(); } catch {}
    // Force UI refresh so handles reposition without user interaction
    try {
      this.forceViewRefresh('toggle-orientation');
    } catch {}
    try { setTimeout(() => { this.centerFlow(); this.forceViewRefresh('toggle-orientation-post-center'); }, 0); } catch {}
  }

  get alignmentHelperInput(): any {
    if (!this.alignmentHelper) return false;
    if (typeof this.alignmentHelper === 'object') return this.alignmentHelper;
    // default settings when enabled via boolean
    return { tolerance: 35, lineColor: '#D1D5DB' };
  }

  toggleAlignmentHelper() {
    try {
      const enabled = !!this.alignmentHelper;
      this.alignmentHelper = enabled ? false : { tolerance: 35, lineColor: '#D1D5DB' };
      try { this.message.info(this.alignmentHelper ? 'Aides d\'alignement: activées' : 'Aides d\'alignement: désactivées'); } catch {}
      this.updateSharedGraph();
      this.saveDraft();
      this.saveLocalUiMeta();
      this.forceViewRefresh('toggle-alignment-helper');
    } catch {}
  }

  toggleSnapGrid() {
    try {
      this.snapGrid = this.snapGrid ? null : [8, 8];
      try { this.message.info(this.snapGrid ? 'Grille magnétique: activée' : 'Grille magnétique: désactivée'); } catch {}
      this.updateSharedGraph();
      this.saveDraft();
      this.saveLocalUiMeta();
      this.forceViewRefresh('toggle-snap-grid');
    } catch {}
  }

  // Compute vertical offset (px) for horizontal handles so that multiple are centered
  horizHandleTop(index: number, count: number): number {
    try {
      const center = 35; // px (middle of a 70px visual height)
      const gap = 16;    // px between handles
      const start = center - ((count - 1) * gap) / 2;
      return Math.round(start + index * gap);
    } catch { return 23; }
  }
  
  get nodesView(): any[] {
    try {
 /*      if (this.portOrientation === 'horizontal') {
        // Force a fixed visual height for anchoring handles: 70 units
        return (this.nodes || []).map(n => ({ ...n, height: 70 }));
      } */
      return this.nodes || [];
    } catch { return this.nodes || []; }
  }
  private forceViewRefresh(_reason: string) {
    try {
      // Bump inputs for Vflow (new array refs)
      this.nodes = [...(this.nodes || [])];
      this.edges = [...(this.edges || [])];
      // Kick Angular CD
      try { this.cdr.detectChanges(); } catch {}
      // Nudge viewport listeners so internals recalc
      const vs: any = this.flow?.viewportService;
      try { this.suppressNodesRemovedUntil = Date.now() + 400; } catch {}
      try { vs?.triggerViewportChangeEvent?.('end'); } catch {}
    } catch { }
  }
  // (Horizontal handle vertical centering uses ngx-vflow hctx.point().y)
  // Derived pairs builder for overlay (does not mutate base edges)
  private buildOverlayPairs(): Set<string> {
    const pairs = new Set<string>();
    // Prefer explicit edge.taken collected live
    if (this.backendEdgesTaken && this.backendEdgesTaken.size) {
      this.backendEdgesTaken.forEach(p => pairs.add(p));
    }
    // Fallback to live attempt sequence (linear) if available
    if (pairs.size === 0 && this.backendAttemptSeq && this.backendAttemptSeq.length > 1) {
      for (let i = 1; i < this.backendAttemptSeq.length; i++) {
        const prev = this.backendAttemptSeq[i - 1];
        const cur = this.backendAttemptSeq[i];
        if (prev && cur && prev !== cur) pairs.add(`${prev}->${cur}`);
      }
    }
    return pairs;
  }

  // Exposed to template: compute decorated edges from base + overlay pairs with memoization
  private _cachedRenderedEdges: any[] | null = null;
  private _cachedRenderedEdgesBaseRef: any[] | null = null;
  private _cachedRenderedPairsKey: string = '';
  private pairsKey(pairs: Set<string>): string { try { return pairs && pairs.size ? Array.from(pairs).sort().join('|') : ''; } catch { return ''; } }
  get renderedEdges(): any[] {
    try {
      const base = this.edges as any[];
      const pairs = this.buildOverlayPairs();
      const key = this.pairsKey(pairs);
      if (this._cachedRenderedEdges && this._cachedRenderedEdgesBaseRef === base && this._cachedRenderedPairsKey === key) {
        return this._cachedRenderedEdges;
      }
      const next = pairs.size === 0 ? base : this.pathSvc.decorateEdges(base, pairs);
      this._cachedRenderedEdges = next;
      this._cachedRenderedEdgesBaseRef = base;
      this._cachedRenderedPairsKey = key;
      return next;
    } catch { return this.edges as any[]; }
  }

  private logEdgeColorChange(src: string, dst: string, to: 'blue'|'grey', reason: string) {
    try {
      console.log('[editor][edge-color]', { source: src, target: dst, to, reason });
    } catch {}
  }
  private refreshOverlayDiff(reason: string) {
    try {
      const next = this.buildOverlayPairs();
      // additions -> blue; removals -> grey
      next.forEach(p => { if (!this.lastOverlayPairs.has(p)) {
        const [s, d] = p.split('->'); this.logEdgeColorChange(s, d, 'blue', reason);
      }});
      this.lastOverlayPairs.forEach(p => { if (!next.has(p)) {
        const [s, d] = p.split('->'); this.logEdgeColorChange(s, d, 'grey', reason);
      }});
      this.lastOverlayPairs = new Set(next);
    } catch {}
  }
  private startPayloadKey(): string {
    const fid = this.currentFlowId || 'adhoc';
    return `flow.startPayload.${fid}`;
  }

  // Load AI-generated graph from chat
  applyAiGraph(g: any) {
    try {
      try { console.log('[ai-flow][applyAiGraph][received]', g); } catch {}
      const nodes = Array.isArray(g?.nodes) ? g.nodes : [];
      const edges = Array.isArray(g?.edges) ? g.edges : [];
      this.nodes = nodes as any[];
      this.edges = edges as any[];
      this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
      this.updateSharedGraph();
      this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory();
      this.recomputeValidation();
      // Center the viewport on the loaded graph (like frontend initial centering)
      try {
        // Delay to allow DOM to render node sizes before centering
        setTimeout(() => this.centerFlow(), 0);
      } catch {}
      try { this.message.success('Workflow chargé depuis l\'assistant IA'); } catch {}
    } catch {
      try { this.message.error('Graphe IA invalide'); } catch {}
    }
    this.aiChatOpen = false;
  }
  private getStartPayload(): { payload: any } {
    try {
      const key = this.startPayloadKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const obj = JSON.parse(raw);
        // Normalize legacy format: if stored value is the payload itself, wrap it
        if (obj && typeof obj === 'object' && 'payload' in obj) return { payload: obj.payload };
        return { payload: obj };
      }
      const def = { payload: null };
      try { localStorage.setItem(key, JSON.stringify(def)); } catch {}
      return def;
    } catch { return { payload: null }; }
  }

  private setStartPayload(v: any) {
    try {
      const wrapped = (v && typeof v === 'object' && 'payload' in v) ? { payload: (v as any).payload } : { payload: v };
      localStorage.setItem(this.startPayloadKey(), JSON.stringify(wrapped));
    } catch {}
  }
  private triggerSpawnForNodes(ids: string[]) {
    try { ids.forEach(id => this.triggerSpawnAnim(id)); } catch {}
  }

  private applyFlowMeta(meta: any) {
    try {
      const ui = meta && typeof meta === 'object' ? ((meta as any).ui || (meta as any).builder || (meta as any).flow || {}) : {};
      const ori = String((ui as any).portOrientation || (ui as any).portsOrientation || '').toLowerCase();
      if (ori === 'horizontal' || ori === 'vertical') {
        this.portOrientation = ori as any;
        
        // Ensure UI updates immediately when meta applies
        try { this.forceViewRefresh('apply-flow-meta'); } catch {}
        try { setTimeout(() => { this.centerFlow(); this.forceViewRefresh('apply-flow-meta-post-center'); }, 0); } catch {}
      }
      // Fallback to local UI meta for orientation when not defined on server
      if (!(ori === 'horizontal' || ori === 'vertical')) {
        const lm = this.readLocalUiMeta();
        const lo = String(lm?.portOrientation || '').toLowerCase();
        if (lo === 'horizontal' || lo === 'vertical') this.portOrientation = lo as any;
      }
      // alignmentHelper (boolean | string | settings)
      try {
        const ah = (ui as any).alignmentHelper;
        if (ah && typeof ah === 'object') {
          const tol = Number(ah.tolerance);
          const col = String(ah.lineColor || '#D1D5DB');
          this.alignmentHelper = { tolerance: isFinite(tol) && tol > 0 ? tol : 6, lineColor: col };
        } else if (typeof ah === 'boolean') {
          this.alignmentHelper = ah ? { tolerance: 6, lineColor: '#D1D5DB' } : false;
        } else if (typeof ah === 'string') {
          const s = ah.toLowerCase();
          const on = ['1','true','yes','on'].includes(s);
          this.alignmentHelper = on ? { tolerance: 6, lineColor: '#D1D5DB' } : false;
        } else {
          // Default at creation: enable alignment helper when not specified
          this.alignmentHelper = { tolerance: 35, lineColor: '#D1D5DB' };
        }
      } catch {}
      // Fallback to local meta for helper/grid when not in server settings
      try {
        const lm = this.readLocalUiMeta();
        if (lm && typeof lm === 'object') {
          if (lm.alignmentHelper != null && (ui as any).alignmentHelper == null) this.alignmentHelper = lm.alignmentHelper;
          if (Array.isArray(lm.snapGrid) && (ui as any).snapGrid == null) this.snapGrid = [Number(lm.snapGrid[0]), Number(lm.snapGrid[1])] as any;
        }
      } catch {}
      // snapGrid ([x,y] or disabled)
      try {
        const sg = (ui as any).snapGrid;
        if (Array.isArray(sg) && sg.length === 2) {
          const x = Number(sg[0]); const y = Number(sg[1]);
          if (isFinite(x) && isFinite(y) && x > 0 && y > 0) this.snapGrid = [x, y];
        } else {
          this.snapGrid = null;
        }
      } catch {}
      // Mirror to local meta after applying
      try { this.saveLocalUiMeta(); } catch {}
    } catch {}
  }
  private toastTimer: any;
  private applyingHistory = false;
  private ignoreEventsUntil = 0;
  private pushPending = false;
  private allowedRemovedEdgeIds = new Set<string>();
  private draggingPalette = new Set<string>();
  private skipStartFormPromptOnce = false;
  previewLoading = false;
  outputLoading = false;
  layoutLoading = false;
  testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  testStartedAt: number | null = null;
  testDurationMs: number | null = null;
  // Dialog logs for current node latest attempt
  advancedAttemptEvents: any[] = [];
  // Attempt selection shared across nodes: selected exec number, plus per-node occurrence index
  advancedSelectedExec: number | null = null;
  private advancedOccurByNode = new Map<string, number>();
  advancedAttemptExecs: Array<{ exec: number; count: number }> = [];
  advancedExecCount: number | null = null;
  advancedOccurIndex: number | null = null;
  // Unified attempt options (single select)
  advancedAttemptOptions: Array<{ idx: number; exec: number; occur: number; label: string }> = [];
  advancedSelectedAttemptIdx: number | null = null;
  // When starting a run with Start Form and missing payload, open dialog and run after first payload change
  private pendingRunAfterStartForm: boolean = false;
  isTestDisabled(): boolean {
    try {
      if (this.testStatus === 'running') return true;
      if (this.backendRunStatus === 'running') return true;
      const nodeId = this.selectedModel?.id;
      if (!nodeId) return false;
      const arr = this.backendNodeAttempts.get(String(nodeId)) || [];
      const last = arr[arr.length - 1];
      if (last && last.status === 'running') return true;
      return false;
    } catch { return false; }
  }

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
    private pathSvc: FlowPathHighlightService,
    private layoutApi: LayoutBackendService,
  ) { }
  isMobile = false;
  // Width-based responsive flag (<= 1280px): use drawers and single-column grid
  isTabletOrBelow = false;

  // Whether a run is currently in progress (backend or local)
  isRunBusy(): boolean {
    try {
      if (this.backendRunStatus === 'running') return true;
      if (this.testStatus === 'running') return true;
      const l = this.lastRun; if (l && l.status === 'running') return true;
      return false;
    } catch { return false; }
  }
  private lastTabletFlag = false;
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
      if (where === 'left') this.leftDrawer = true; else { this.rightDrawer = true; if (!this.recentRuns || this.recentRuns.length === 0) this.fetchRuns(true); }
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
  private dbgListeners: Array<() => void> = [];
  debugGestures = false;
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
  currentFlowId: string | null = null;
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
  // Double-tap detection for opening config dialog on mobile
  private lastTapAt = 0;
  private readonly dtThresh = 350; // ms between taps
  // Explicit toggle for marquee selection (mobile/tablet)
  marqueeMode: boolean = false;
  private allTemplates: any[] = [];
  private allowedTplIds = new Set<string>();
  private allFlows: { id: string; name: string; description?: string }[] = [];
  validationIssues: Array<{ kind: 'node' | 'flow'; nodeId?: string; message: string }> = [];
  private openedNodeConfig = new Set<string>();
  // Pending Dynamic Form return session (apply after flow graph is loaded)
  private pendingFbSession: string | null = null;
  private pendingFbNodeId: string | null = null;

  // Removed event interceptors to align with working dev playground

  ngOnInit() {
    // Detect iOS/iPadOS Safari early (animation fallback)
    try {
      const nav: any = (typeof navigator !== 'undefined') ? navigator : {};
      const agent: string = String(nav.userAgent || '').toLowerCase();
      const platform: string = String((nav.platform || '')).toLowerCase();
      const maxTP: number = Number((nav.maxTouchPoints || 0));
      const isIOSDevice = /iphone|ipod|ipad/.test(agent) || (platform === 'macintel' && maxTP > 1);
      // Safari uniquement (exclut Chrome/Edge/Firefox iOS: CriOS/FxiOS/EdgiOS, etc.)
      const isMobileSafari = /safari/.test(agent) && !/crios|fxios|edgios|opios|chrome|opr|android/.test(agent);
      this.isIOSSafari = !!(isIOSDevice && isMobileSafari);
    } catch { this.isIOSSafari = false; }
    // Debug helpers removed
    // Subscribe run streams (builder live panel)
    try {
      (this.runner as any).runs$?.subscribe((rs: any[]) => {
        this.lastRun = rs && rs.length ? rs[0] : null;
        this.currentRun = rs.find(r => r.status === 'running') || null;
        // Keep backend list managed by fetchRuns(); runner list used only for last/current
      });
    } catch {}
    this.updateIsMobile();
    // Open specific run in editor if ?run is provided
    try {
      this.route.queryParamMap.subscribe(qp => {
        const runId = qp.get('run');
        const flowId = qp.get('flow');
        const fbSession = qp.get('fbSession');
        this.openingRunId = runId;
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
              this.applyFlowMeta((doc as any).meta || {});
              this.loadingFlowDoc = false;
              if (runId) this.openRunSnapshotInEditor(runId);
              try { this.cdr.detectChanges(); } catch {}
            },
            error: () => { this.loadingFlowDoc = false; if (runId) this.openRunSnapshotInEditor(runId); }
          });
        } else if (runId) {
          this.openRunSnapshotInEditor(runId);
        }
        // Defer Dynamic Form session application until after the flow is loaded
        if (fbSession) { this.pendingFbSession = fbSession; this.pendingFbNodeId = qp.get('node'); }
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
      const centerParam = this.route.snapshot.queryParamMap.get('center');
      const centerActive = !!centerParam && ['1','true','yes','on'].includes(String(centerParam).toLowerCase());
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
              this.suppressNodesRemovedUntil = Date.now() + 1500;
              this.log('flow.load.swap', { nodes: (doc.nodes||[]).length, edges: (doc.edges||[]).length });
              this.nodes = (doc.nodes || []) as any[];
              
              this.edges = (doc.edges || []) as any;
              this.applyFlowMeta((doc as any).meta || {});
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
              this.updateSharedGraph();
              if (!this.openingRunId) this.tryRestoreDraft(flowId);
              const hydrated = this.tryHydrateHistory();
              if (!hydrated) { this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory(); } else { this.updateTimelineCaches(); }
            }
          } finally {
            this.loadingFlowDoc = false;
            // Extend suppression window a bit after render to avoid initial remove glitches
            this.suppressNodesRemovedUntil = Math.max(this.suppressNodesRemovedUntil, Date.now() + 1200);
            try { this.cdr.detectChanges(); } catch { }
            // Center the view after panels are closed and layout is ready
            try {
              const hasSavedZoom = !!localStorage.getItem('flow.zoom');
              // Restore panel open state from last session before centering
              this.restorePanelsState();
              this.savePanelsState();
              if (centerActive || !hasSavedZoom) { this.scheduleCenterIfRequested(true, true); }
            } catch { if (centerActive) this.scheduleCenterIfRequested(true); }
            // Apply pending Dynamic Form session (if any) once nodes are available
            try {
              const sess = this.pendingFbSession || this.route.snapshot.queryParamMap.get('fbSession');
              if (sess) {
                this.applyStartFormSchemaFromSession(sess);
                this.pendingFbSession = null;
                // Clean the query param to avoid reapplying
                try {
                  const qp = this.route.snapshot.queryParamMap;
                  const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any) };
                  delete q.fbSession;
                  this.router.navigate([], { queryParams: q, replaceUrl: true });
                } catch {}
              }
            } catch {}
            // If we are opening a specific run, re-apply backend highlights after any flow swap
            try { if (this.openingRunId && this.backendEdgesTaken && this.backendEdgesTaken.size) this.applyBackendEdgeHighlights(); } catch {}
            // Deep-link: focus a specific node if requested (unless center view param is active)
            try {
              if (focusNode && !centerActive) {
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
        const fbSession = pm.get('fbSession') || undefined;
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
              this.applyFlowMeta((doc as any).meta || {});
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
              this.updateSharedGraph();
              if (!this.openingRunId) this.tryRestoreDraft(fid);
              const hydrated = this.tryHydrateHistory();
              if (!hydrated) { this.history.reset(this.snapshot()); this.updateTimelineCaches(); this.persistHistory(); } else { this.updateTimelineCaches(); }
            }
          } finally {
            this.loadingFlowDoc = false;
            try { this.cdr.detectChanges(); } catch { }
            // Center the view after panels are closed and layout is ready
            try {
              const centerParam = this.route.snapshot.queryParamMap.get('center');
              const centerActive2 = !!centerParam && ['1','true','yes','on'].includes(String(centerParam).toLowerCase());
              const hasSavedZoom = !!localStorage.getItem('flow.zoom');
              if (centerActive2 || !hasSavedZoom) { this.scheduleCenterIfRequested(true); }
            } catch {}
            // Apply pending Dynamic Form session (if any) once nodes are available
            try {
              const sess = this.pendingFbSession || this.route.snapshot.queryParamMap.get('fbSession');
              if (sess) {
                this.applyStartFormSchemaFromSession(sess);
                this.pendingFbSession = null;
                try {
                  const qp = this.route.snapshot.queryParamMap;
                  const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any) };
                  delete q.fbSession;
                  this.router.navigate([], { queryParams: q, replaceUrl: true });
                } catch {}
              }
            } catch {}
            // If a run is open, re-apply backend highlights after swap
            try { if (this.openingRunId && this.backendEdgesTaken && this.backendEdgesTaken.size) this.applyBackendEdgeHighlights(); } catch {}
            if (node) {
              try {
                const id = String(node);
                const n = this.nodes.find(nn => String(nn.id) === id);
                if (n) { this.selectItem(n); setTimeout(() => this.centerOnNodeId(id), 0); }
              } catch {}
            }
            // Apply session import if present after loading flow
            if (fbSession) {
              this.applyStartFormSchemaFromSession(fbSession);
              try { const q: any = { ...Object.fromEntries(pm.keys.map(k => [k, pm.get(k)]) as any) }; delete q.fbSession; this.router.navigate([], { queryParams: q, replaceUrl: true }); } catch {}
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
  
  private dbg(label: string, ev: any) {
    if (!this.debugGestures) return;
    try {
      const tgt = ev?.target as HTMLElement | null;
      const path = (ev && (ev.composedPath ? ev.composedPath() : [])) || [];
      const p0 = path && path.length ? path[0] : null;
      const info = {
        t: Date.now(),
        label,
        type: ev?.type,
        touches: ev?.touches ? ev.touches.length : undefined,
        changed: ev?.changedTouches ? ev.changedTouches.length : undefined,
        pointerType: (ev as any)?.pointerType,
        defaultPrevented: !!ev?.defaultPrevented,
        target: tgt ? { tag: tgt.tagName, cls: tgt.className } : null,
        path0: p0 && (p0 as any).tagName ? { tag: (p0 as any).tagName, cls: (p0 as any).className } : null,
      };
      // gesture debug disabled
    } catch {}
  }
  private installGestureDebugListeners() {
    if (!this.debugGestures) return;
    try {
      const host = this.flowHost?.nativeElement as HTMLElement | undefined;
      const vflowEl = host ? (host.querySelector('vflow') as HTMLElement | null) : null;
      const add = (el: EventTarget | null | undefined, type: string, label: string, capture: boolean) => {
        if (!el) return;
        const fn = (e: Event) => this.dbg(label, e);
        (el as any).addEventListener(type, fn, { capture, passive: false });
        this.dbgListeners.push(() => { try { (el as any).removeEventListener(type, fn, { capture }); } catch {} });
      };
      const types = ['touchstart','touchmove','touchend','touchcancel','pointerdown','pointerup','click','dblclick','contextmenu'];
      const targets: Array<{ el: any; name: string }> = [
        { el: document, name: 'doc' },
        { el: window, name: 'win' },
        { el: host, name: 'host' },
        { el: vflowEl, name: 'vflow' }
      ];
      for (const t of targets) {
        for (const ty of types) { add(t.el, ty, `${t.name}.capture.${ty}`, true); add(t.el, ty, `${t.name}.bubble.${ty}`, false); }
      }
      // Document capture listener for diagnostics only (no-op)
      this.globalTouchEndDetect = (_e: TouchEvent) => { /* no-op: double-tap disabled */ };
      document.addEventListener('touchend', this.globalTouchEndDetect as any, { capture: true, passive: true } as any);
      this.dbgListeners.push(() => { try { document.removeEventListener('touchend', this.globalTouchEndDetect as any, { capture: true } as any); } catch {} });
      // gesture debug disabled
    } catch {}
  }
  ngOnDestroy() {
    try { window.removeEventListener('beforeunload', this.beforeUnloadHandler as any); } catch {}
    try { this.viewportSub?.unsubscribe(); } catch { }
    // If leaving builder without unsaved changes, clear persisted snapshots/drafts
    try { if (!this.hasUnsavedChanges()) this.purgeDraft(); } catch {}
    // Remove marquee global capture listeners
    try {
      if (this.canvasGlobalDown) document.removeEventListener('pointerdown', this.canvasGlobalDown as any, true as any);
      if (this.canvasGlobalMove) document.removeEventListener('pointermove', this.canvasGlobalMove as any, true as any);
      if (this.canvasGlobalUp) document.removeEventListener('pointerup', this.canvasGlobalUp as any, true as any);
    } catch {}
    try { (this.dbgListeners || []).forEach(teardown => teardown()); this.dbgListeners = []; } catch {}
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
    const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
    // Keep draft only if it differs from backend; otherwise clear it to avoid noise
    if (current !== (this.lastSavedChecksum || '')) {
      const draft = { nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid, ts: Date.now(), serverChecksum: this.lastSavedChecksum };
      try { localStorage.setItem(this.draftKey(fid), JSON.stringify(draft)); } catch {}
    } else {
      try { localStorage.removeItem(this.draftKey(fid)); } catch {}
    }
  }
  private uiMetaKey(): string { const fid = this.currentFlowId || 'adhoc'; return `flow.ui.meta.${fid}`; }
  private saveLocalUiMeta() {
    try {
      const v = { portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid };
      localStorage.setItem(this.uiMetaKey(), JSON.stringify(v));
    } catch {}
  }
  private readLocalUiMeta(): any {
    try { const raw = localStorage.getItem(this.uiMetaKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
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
      if (draft.portOrientation === 'horizontal' || draft.portOrientation === 'vertical') this.portOrientation = draft.portOrientation;
      if (typeof draft.alignmentHelper === 'boolean') this.alignmentHelper = draft.alignmentHelper ? { tolerance: 6, lineColor: '#D1D5DB' } : false;
      else if (draft.alignmentHelper && typeof draft.alignmentHelper === 'object') {
        const tol = Number((draft.alignmentHelper as any).tolerance);
        const col = String((draft.alignmentHelper as any).lineColor || '#D1D5DB');
        this.alignmentHelper = { tolerance: isFinite(tol) && tol > 0 ? tol : 6, lineColor: col };
      }
      if (Array.isArray(draft.snapGrid) && draft.snapGrid.length === 2) this.snapGrid = [Number(draft.snapGrid[0]), Number(draft.snapGrid[1])] as any;
      this.nodes = (draft.nodes || []) as any[];
      this.edges = (draft.edges || []) as any;
    } catch {}
  }
  hasUnsavedChanges(): boolean {
    const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
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
      case 'start':
      case 'start_form':
        return 'fa-solid fa-play';
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

  getAppById(id?: string|null): AppProvider | undefined {
    try { const key = String(id || '').trim(); return key ? this.appsMap.get(key) : undefined; } catch { return undefined; }
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
    // iOS/Safari: ensure first paint applies HTML transforms
    try { setTimeout(() => { this.forceViewRefresh('afterViewInit'); }, 0); } catch {}
    try { setTimeout(() => this.installGestureDebugListeners(), 0); } catch {}

    // Attach global capture listeners for marquee selection to preempt vflow pan/zoom
    try {
      const host = this.flowHost?.nativeElement;
      if (host) {
        this.canvasGlobalDown = (ev: PointerEvent) => {
          try {
            // When marqueeMode is enabled, capture touch/mouse to start selection and block vflow pan/zoom
            const pt: any = (ev as any).pointerType;
            const inside = host.contains(ev.target as Node);
            if (!inside) return;
            // If explicit multi-select mode is on and not hitting UI/node, start immediately
            if (this.marqueeMode) {
              const e: any = ev as any;
              if (this.isEventOnUiControls(e) || this.isEventOnNode(e)) return;
              ev.preventDefault(); ev.stopPropagation();
              this.selectionBoxStart = { x: ev.clientX, y: ev.clientY };
              this.selectionBoxRect = { left: ev.clientX, top: ev.clientY, width: 0, height: 0 };
              try { this.cdr.detectChanges(); } catch {}
              return;
            }
            // Desktop fallback (mouse right or modifiers)
            const ctrl = !!ev.ctrlKey, meta = !!ev.metaKey, alt = !!ev.altKey;
            const isRight = ev.button === 2;
            if (pt && pt !== 'mouse') return;
            if (!(ctrl || meta || alt || isRight)) return;
            const target = ev.target as HTMLElement;
            if (!ctrl && !meta && !alt && target?.closest && target.closest('.node-card')) return;
            ev.preventDefault(); ev.stopPropagation();
            this.selectionBoxStart = { x: ev.clientX, y: ev.clientY };
            this.selectionBoxRect = { left: ev.clientX, top: ev.clientY, width: 0, height: 0 };
            try { this.cdr.detectChanges(); } catch {}
          } catch {}
        };
        this.canvasGlobalMove = (ev: PointerEvent) => {
          try {
            // When drawing a marquee, eat events to block vflow pan/zoom
            if (!this.selectionBoxStart) return;
            if (!host.contains(ev.target as Node)) return;
            ev.preventDefault(); ev.stopPropagation();
            const sx = this.selectionBoxStart.x, sy = this.selectionBoxStart.y;
            const cx = ev.clientX, cy = ev.clientY;
            const left = Math.min(sx, cx), top = Math.min(sy, cy);
            const width = Math.abs(cx - sx), height = Math.abs(cy - sy);
            this.selectionBoxRect = { left, top, width, height };
            // debug logs removed
            // Live-update selection while dragging when rect has a visible size
            try {
              if (width >= 2 && height >= 2) {
                const tl = this.flow?.documentPointToFlowPoint?.({ x: left, y: top });
                const br = this.flow?.documentPointToFlowPoint?.({ x: left + width, y: top + height });
                if (tl && br) {
                  const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
                  const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
                  const models: any[] = this.flow?.nodeModels?.() || [];
                  const ids: string[] = [];
                  for (const m of models) {
                    try {
                      const gp = m?.globalPoint?.();
                      const sz = m?.size?.();
                      const id = String(m?.rawNode?.id ?? '');
                      if (!gp || !sz || !id) continue;
                      const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
                      const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
                      if (overlap) ids.push(id);
                    } catch {}
                  }
                  const idsSet = new Set(ids);
                  this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
                  this.selection = this.selectionList[0] || null;
                  try { this.setVflowSelectedIds(ids); } catch {}
                }
              }
            } catch {}
            try { this.cdr.detectChanges(); } catch {}
          } catch {}
        };
        this.canvasGlobalUp = (ev: PointerEvent) => {
          try {
            // End any ongoing connect gesture
            try { this.onConnectEnd(); } catch {}
            const hadStart = !!this.selectionBoxStart;
            if (!hadStart) return;
            if (!host.contains(ev.target as Node)) return;
            ev.preventDefault(); ev.stopPropagation();
            const rect = this.selectionBoxRect;
            this.selectionBoxStart = null;
            this.selectionBoxRect = null;
            if (!rect || rect.width < 2 || rect.height < 2) { try { this.cdr.detectChanges(); } catch {}; return; }
            const tl = this.flow?.documentPointToFlowPoint?.({ x: rect.left, y: rect.top });
            const br = this.flow?.documentPointToFlowPoint?.({ x: rect.left + rect.width, y: rect.top + rect.height });
            if (!tl || !br) { try { this.cdr.detectChanges(); } catch {}; return; }
            const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
            const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
            const models: any[] = this.flow?.nodeModels?.() || [];
            const ids: string[] = [];
            for (const m of models) {
              try {
                const gp = m?.globalPoint?.();
                const sz = m?.size?.();
                const id = String(m?.rawNode?.id ?? '');
                if (!gp || !sz || !id) continue;
                const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
                const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
                if (overlap) ids.push(id);
              } catch {}
            }
            const idsSet = new Set(ids);
            this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
            this.selection = this.selectionList[0] || null;
            try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
            // debug logs removed
            try { this.setVflowSelectedIds(ids); } catch {}
            try { this.cdr.detectChanges(); } catch {}
            // Auto-disable marquee mode after completing selection
            if (this.marqueeMode) { this.marqueeMode = false; }
          } catch {}
        };
        document.addEventListener('pointerdown', this.canvasGlobalDown as any, { capture: true, passive: false } as any);
        document.addEventListener('pointermove', this.canvasGlobalMove as any, { capture: true, passive: false } as any);
        document.addEventListener('pointerup', this.canvasGlobalUp as any, { capture: true, passive: false } as any);
      }
    } catch {}
  }

  @HostListener('window:resize') onResize() { this.updateIsMobile(); }
  private updateIsMobile() {
    try {
      // Consider coarse pointer or small viewport as mobile
      const coarse = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || false;
      const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const small = width <= 768;
      this.isMobile = coarse || small;
      // Treat widths below a "large desktop" as tablet-or-below to avoid grid on 1281..1535px tablets
      const isDesktop = (width >= 1536) && !coarse;
      const flag = !isDesktop;
      this.isTabletOrBelow = flag;
      // Normalize panel states when crossing the breakpoint to avoid double-tap feeling
      if (flag !== this.lastTabletFlag) {
        if (flag) { this.leftPanelOpen = false; this.rightPanelOpen = false; }
        // Always close drawers when leaving small to large to reset UX
        if (!flag) { this.leftDrawer = false; this.rightDrawer = false; }
        this.lastTabletFlag = flag;
      }
      if (this.isMobile) {
        try { setTimeout(() => this.forceViewRefresh('mobile-viewport-change'), 0); } catch {}
      }
    } catch { this.isMobile = false; }
  }

  // Unified toggle handlers for FABs
  toggleLeftPanel() {
    try {
      if (this.isTabletOrBelow) {
        this.leftPanelOpen = false; this.rightPanelOpen = false; // ensure desktop panels are closed
        this.openMobilePanel('left');
      } else {
        this.leftPanelOpen = !this.leftPanelOpen;
        this.savePanelsState();
      }
    } catch {}
  }
  toggleRightPanel() {
    try {
      if (this.isTabletOrBelow) {
        this.leftPanelOpen = false; this.rightPanelOpen = false; // ensure desktop panels are closed
        this.openMobilePanel('right');
        if (!this.recentRuns || this.recentRuns.length === 0) this.fetchRuns(true);
      } else {
        this.rightPanelOpen = !this.rightPanelOpen;
        if (this.rightPanelOpen && (!this.recentRuns || this.recentRuns.length === 0)) this.fetchRuns(true);
        this.savePanelsState();
      }
    } catch {}
  }

  // Right panel advanced actions from consolidated component
  onClearRun() {
    try {
      // Stop and clear UI references; backend may still keep history
      this.stopLastRun();
      this.backendRunId = null;
      this.backendRunStatus = 'idle';
      this.showExecBadges = false;
      this.backendNodeStats = new Map();
      this.backendNodeAttempts = new Map();
      this.backendEdgesTaken.clear();
      this.backendAttemptSeq = [];
      this.lastRun = null;
      this.currentRun = null;
      this.currentRunMeta = null;
      // Clear node badges
      try {
        (this.nodes || []).forEach(n => {
          if (n?.data) { delete (n.data as any).execStatus; delete (n.data as any).execCount; }
        });
      } catch {}
      // Remove run from URL
      try {
        const qp = this.route.snapshot.queryParamMap;
        const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any) };
        delete q.run;
        this.router.navigate([], { queryParams: q, replaceUrl: true });
      } catch {}
      this.forceViewRefresh('clear-run');
      try { this.message.info('Exécution effacée'); } catch {}
    } catch {}
  }
  onRestartRun() {
    try {
      this.onClearRun();
      // Relaunch with current builderMode
      this.showExecBadges = true;
      this.runFlow();
    } catch {}
  }
  onSelectRun(runId: string) {
    try {
      if (!runId) return;
      this.showExecBadges = true;
      // Update URL with ?run= and open snapshot
      const qp = this.route.snapshot.queryParamMap;
      const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any), run: runId };
      this.router.navigate([], { queryParams: q, replaceUrl: true });
      this.openRunSnapshotInEditor(runId);
    } catch {}
  }
  reloadFlowOnly() {
    try {
      const fid = this.currentFlowId || '';
      if (!fid) return;
      this.loadingFlowDoc = true;
      this.catalog.getFlow(fid).subscribe({
        next: (doc) => {
          this.nodes = (doc?.nodes || []);
          this.edges = (doc?.edges || []);
          this.applyFlowMeta((doc as any).meta || {});
          this.loadingFlowDoc = false;
          // Do not select any run; clear backend state
          this.currentRunMeta = null;
          this.backendRunId = null;
          this.backendRunStatus = 'idle';
          this.showExecBadges = false;
          this.backendNodeStats = new Map();
          this.backendNodeAttempts = new Map();
          this.backendEdgesTaken.clear();
          this.backendAttemptSeq = [];
          try { this.cdr.detectChanges(); } catch {}
        },
        error: () => { this.loadingFlowDoc = false; }
      });
    } catch { this.loadingFlowDoc = false; }
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
      if (!this.showExecBadges) return null;
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
    if (ty === 'start' || ty === 'start_form' || ty === 'event' || ty === 'endpoint') return null;
    if (Array.isArray(tmpl.inputHandles) && tmpl.inputHandles.length) return String(tmpl.inputHandles[0].id || 'in');
    return 'in';
  }
  isTriggerTemplate(tmpl: any): boolean {
    try {
      const ty = String((tmpl && tmpl.type) || '').toLowerCase();
      return ty === 'start' || ty === 'start_form' || ty === 'event' || ty === 'endpoint';
    } catch { return false; }
  }
  outputIds(model: any): string[] { return this.graph.outputIds(model, this.edges); }

  getOutputName(model: any, idxOrId: number | string): string { return this.graph.getOutputName(model, idxOrId); }
  private _linkCache = new Map<string, { sig: string; links: Array<{ id: string; name: string; type: string }> }>();
  linkHandlesForNode(nodeId: string, model: any): Array<{ id: string; name: string; type: string }> {
    try {
      const tmpl = model?.templateObj || {};
      const linksArr: any[] = Array.isArray((tmpl as any).linkedHandles) ? (tmpl as any).linkedHandles : [];
      const arr: any[] = linksArr.length ? linksArr : (Array.isArray(tmpl.outputHandles) ? (tmpl.outputHandles as any[]).filter((h:any)=> Array.isArray(h?.accepts)) : []);
      const sig = JSON.stringify(arr);
      const key = String(nodeId);
      const cached = this._linkCache.get(key);
      if (cached && cached.sig === sig) return cached.links;
      const links = arr
        .filter((h:any) => Array.isArray(h?.accepts))
        .map((h:any) => ({ id: String(h.id), name: h.name || h.id, type: h.type || 'any' }));
      this._linkCache.set(key, { sig, links });
      return links;
    } catch { return []; }
  }
  hasPredecessor(nodeId?: string | null): boolean {
    try { const id = String(nodeId || ''); if (!id) return false; return (this.edges || []).some(e => String(e.target) === id); } catch { return false; }
  }
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
      context: (() => {
        const base = preCtx ? { ...preCtx } : {};
        try {
          const ty = String(templateObj?.type || '').toLowerCase();
          if (ty === 'condition') {
            const field = String((templateObj as any)?.output_array_field || 'items');
            const arr = Array.isArray((base as any)[field]) ? (base as any)[field] : [];
            if (arr.length === 0) {
              // Initialize with a single default branch and a stable id
              const cid = 'cid_' + Math.random().toString(36).slice(2);
              (base as any)[field] = [{ _id: cid, name: 'Condition 1', condition: '' }];
            }
          }
        } catch {}
        return base;
      })(),
      templateChecksum: this.fbUtils.argsChecksum(templateObj?.args || {}),
      templateFeatureSig: this.fbUtils.featureChecksum(templateObj)
    };
    const vNode = { id: newId, point, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    this.triggerSpawnAnim(newId);
    try { this.suppressNodesRemovedUntil = Date.now() + 600; } catch {}
    
    // If start-like, auto-connect to best target
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(point.x, point.y + 200) || this.findBestTargetNodeForStart(point.x + 1, point.y + 200);
      if (target) {
        const edge: Edge = {
          type: 'template',
          id: `${newId}->${target.id}:out:in`,
          source: newId,
          target: target.id as any,
          sourceHandle: 'out',
          // Target of a start/start_form is a regular node input
          targetHandle: 'in' as any,
          edgeLabels: { center: { type: 'html-template', data: { text: this.computeEdgeLabel(newId, 'out') } } },
          data: { strokeWidth: 2, color: '#b1b1b7' },
          markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } }
        } as any;
        this.edges = [...this.edges, edge];
      }
    }
    this.pushState('drop.node');
    this.recomputeValidation();
    // Mobile fix: force refresh to apply HTML node transform after drop
    try { if (this.isMobile) setTimeout(() => this.forceViewRefresh('drop-node-mobile'), 0); } catch {}
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
      'nodes.position.final': { type: 'Move', color: '#f59e0b' },
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
    this.triggerSpawnAnim(newId);
    try { this.suppressNodesRemovedUntil = Date.now() + 600; } catch {}
    // Auto-connect logic
    if (isStartLike) {
      const target = this.findBestTargetNodeForStart(pos.x, pos.y + 200) || this.findBestTargetNodeForStart(worldCenter.x, worldCenter.y);
      if (target) {
        const edge: Edge = {
          type: 'template',
          id: `${newId}->${target.id}:out:in`,
          source: newId,
          target: target.id as any,
          sourceHandle: 'out',
          targetHandle: 'in' as any,
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
    // Mobile fix: nudge Vflow HTML node positioning after node insertion
    try { if (this.isMobile) setTimeout(() => this.forceViewRefresh('palette-add-mobile'), 0); } catch {}
  }
  // (removed) delegation handler
  // findBestSourceNode now provided by FlowBuilderUtilsService
  isStartLike(tmpl: any): boolean {
    try {
      const ty = String(tmpl?.type || '').toLowerCase();
      return ty === 'start' || ty === 'start_form' || ty === 'trigger' || ty === 'event' || ty === 'endpoint';
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
    try {
      const horizontal = this.portOrientation === 'horizontal';
      if (!source) {
        // Place relative to center depending on orientation
        return horizontal
          ? { x: center.x + 120, y: center.y }
          : { x: center.x - 90, y: center.y + 80 };
      }
      const vp = this.flow?.viewportService?.readableViewport();
      const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(source.id)}\"]`) as HTMLElement | null;
      let w = 180, h = 100;
      if (el && vp) {
        const r = el.getBoundingClientRect();
        if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); }
      }
      // Increase spacing so the new node is a bit further from the source
      const gap = 100;
      if (horizontal) {
        // Place to the right of the source on the same row
        const x = (source.point?.x || 0) + w + gap;
        const y = (source.point?.y || 0);
        return { x, y };
      } else {
        // Default: place below the source
        const x = (source.point?.x || 0);
        const y = (source.point?.y || 0) + h + gap;
        return { x, y };
      }
    } catch {
      // Fallback a bit further too
      return this.portOrientation === 'horizontal'
        ? { x: center.x + 160, y: center.y }
        : { x: center.x - 90, y: center.y + 120 };
    }
  }
  isDragging(item: any): boolean { try { const key = String(item?.template?.id || item?.label || ''); return key ? this.draggingPalette.has(key) : false; } catch { return false; } }

  // Context menu actions for nodes
  onNodeContextMenu(ev: MouseEvent, node: any) {
    if (this.isMobile) return; // use long-press on mobile
    try { ev.preventDefault(); ev.stopPropagation(); } catch { }
    this.openCtxMenuAt(ev.clientX, ev.clientY, node);
  }
  
  private openCtxMenuAt(x: number, y: number, node: any) {
    try { this.selectionBoxStart = null; this.selectionBoxRect = null; this.marqueePrimed = false; } catch {}
    this.ctxMenuVisible = true;
    this.ctxMenuX = x;
    this.ctxMenuY = y;
    this.ctxMenuTarget = node;
    try {
      const count = (this.selectionList || []).length;
      if (count <= 1) {
        // If zero or a different single selection, switch to the node under the menu
        if (count === 0 || String(this.selectionList[0]?.id) !== String(node?.id)) {
          this.selectionList = [node];
          this.selection = node;
          try { this.setVflowSelectedIds([node.id]); } catch {}
          try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
        }
      }
      // If multiple selection exists, keep it as-is (group actions will apply)
    } catch { }
  }
  // Run selected node in test mode and show I/O in dialog wings
  onTestSelectedNode() {
    try {
      const m = this.selectedModel; if (!m) return;
      const isStart = String(m?.templateObj?.type || '').toLowerCase() === 'start';
      let msgIn = this.advancedInjectedInput;
      const isEmpty = (v: any) => v == null || (typeof v === 'object' && Object.keys(v).length === 0);
      if (isStart && m?.startFormEnabled && isEmpty(msgIn)) {
        const openForm = () => {
          import('./start-form-modal.component').then(mod => {
            const ref = this.modal.create({ nzTitle: 'Remplir le formulaire', nzContent: mod.StartFormModalComponent as any, nzFooter: null, nzWidth: 720 });
            const inst: any = ref.getContentComponent();
            try { inst.schema = m?.startFormSchema || { title: 'Formulaire', fields: [] }; inst.value = {}; } catch {}
            const sub = inst.submitted.subscribe((val: any) => {
              try { sub.unsubscribe(); } catch {}
              ref.close();
              this.advancedInjectedInput = val; this.advancedCtx = val || {};
              // Après saisie, exécuter directement (la sauvegarde a déjà été confirmée en amont)
              this._doTestNodeBackend(m, isStart, this.advancedInjectedInput || {});
            });
          });
        };
        // Demande de sauvegarde avant d'ouvrir la dialog si nécessaire
        if (environment.useBackend && this.currentFlowId && this.hasUnsavedChanges()) this._saveIfNeededThen(() => openForm()); else openForm();
        return;
      }
      if (isEmpty(msgIn)) {
        this.modal.confirm({ nzTitle: 'Exécuter sans entrée ?', nzContent: 'Aucune entrée détectée pour ce nœud. Voulez-vous exécuter quand même ?', nzOnOk: () => this._saveIfNeededThen(() => this._doTestNodeBackend(m, isStart, msgIn || {})) });
        return;
      }
      this._saveIfNeededThen(() => this._doTestNodeBackend(m, isStart, msgIn));
    } catch {}
  }
  private _doTestNode(m: any, isStart: boolean, input: any) {
    try {
      // Prepare UI: input ready, output loading until result
      this.advancedInjectedInput = input;
      this.advancedCtx = this.advancedInjectedInput || {};
      this.previewLoading = false;
      this.outputLoading = true;
      this.testStatus = 'running'; this.testStartedAt = Date.now(); this.testDurationMs = null;
      const t0 = performance.now();
      const run = this.runner.runNode(m?.templateObj || {}, m?.id, 'test', input);
      const t1 = performance.now();
      const last = run.attempts[run.attempts.length - 1];
      this.advancedInjectedInput = last?.input ?? input;
      if (isStart) {
        this.advancedInjectedOutput = this.getStartPayload().payload || {};
      } else {
        // Show the node's own result, not the flow final payload
        const nodeOut = last?.result;
        this.advancedInjectedOutput = nodeOut ?? null;
      }
      this.advancedCtx = this.advancedInjectedInput || {};
      this.testDurationMs = Math.round(t1 - t0);
      this.testStatus = 'success';
      this.outputLoading = false;
      // Record as a standalone attempt (exec = -1)
      try {
        const nid = String(m?.id || this.selectedModel?.id || '');
        if (nid) {
          let arr = this.backendNodeAttempts.get(nid) || [];
          const att = { exec: -1, status: 'success', input: last?.input ?? input, argsPre: last?.argsPre, argsPost: last?.argsPost, result: last?.result, msgIn: last?.input ?? input, msgOut: last?.result, durationMs: this.testDurationMs || undefined, startedAt: new Date(this.testStartedAt || Date.now()).toISOString(), finishedAt: new Date().toISOString(), events: [] } as any;
          arr = [...arr, att];
          this.backendNodeAttempts.set(nid, arr);
          this.advancedSelectedExec = -1;
          // Select last standalone occurrence
          const same = arr.filter(a => Number(a.exec) === -1);
          this.advancedOccurByNode.set(nid, Math.max(0, same.length - 1));
          this.recomputeAttemptExecOptionsFor(nid);
          this.recomputeExecCountAndOccIndex(nid);
          this.recomputeAttemptOptionsFor(nid);
          this.recomputeSelectedAttemptIdxForNode(nid);
        }
      } catch {}
      try { this.cdr.detectChanges(); } catch {}
    } catch (e) {
      this.testStatus = 'error';
      this.testDurationMs = null;
      this.outputLoading = false;
      try { this.cdr.detectChanges(); } catch {}
    }
  }
  private _doTestNodeBackend(m: any, isStart: boolean, msgIn: any) {
    if (environment.useBackend && this.currentFlowId) {
      // Prepare UI: input ready, output loading until result
      this.advancedInjectedInput = msgIn;
      this.advancedCtx = this.advancedInjectedInput || {};
      this.previewLoading = false;
      this.outputLoading = true;
      this.testStatus = 'running'; this.testStartedAt = Date.now(); this.testDurationMs = null;
      const t0 = performance.now();
      this.runsApi.testNode(this.currentFlowId, m?.id, msgIn).subscribe({
        next: (resp: any) => {
          const t1 = performance.now();
          this.advancedInjectedInput = resp?.msgIn ?? msgIn;
          if (isStart) {
            this.advancedInjectedOutput = this.getStartPayload().payload || {};
          } else {
            this.advancedInjectedOutput = resp?.msgOut ?? resp?.result ?? null;
          }
          this.advancedCtx = this.advancedInjectedInput || {};
          this.testDurationMs = this.testDurationMs ?? Math.round(t1 - t0);
          this.testStatus = 'success';
          this.outputLoading = false;
          // Record as a standalone attempt (exec = -1)
          try {
            const nid = String(m?.id || this.selectedModel?.id || '');
            if (nid) {
              let arr = this.backendNodeAttempts.get(nid) || [];
              const att = { exec: -1, status: 'success', input: resp?.input ?? resp?.msgIn ?? msgIn, argsPre: resp?.argsPre, argsPost: resp?.argsPost, result: resp?.result, msgIn: resp?.msgIn ?? msgIn, msgOut: resp?.msgOut ?? resp?.result, durationMs: this.testDurationMs || undefined, startedAt: resp?.startedAt || new Date(this.testStartedAt || Date.now()).toISOString(), finishedAt: resp?.finishedAt || new Date().toISOString(), events: [] } as any;
              arr = [...arr, att];
              this.backendNodeAttempts.set(nid, arr);
              this.advancedSelectedExec = -1;
              const same = arr.filter(a => Number(a.exec) === -1);
              this.advancedOccurByNode.set(nid, Math.max(0, same.length - 1));
              this.recomputeAttemptExecOptionsFor(nid);
              this.recomputeExecCountAndOccIndex(nid);
              this.recomputeAttemptOptionsFor(nid);
              this.recomputeSelectedAttemptIdxForNode(nid);
            }
          } catch {}
          try { this.cdr.detectChanges(); } catch {}
        },
        error: () => { this.testStatus = 'error'; this.testDurationMs = null; this.outputLoading = false; try { this.cdr.detectChanges(); } catch {} },
      });
    } else {
      this._doTestNode(m, isStart, msgIn);
    }
  }

  onRunPrevNodes() {
    try {
      const nodeId = this.selectedModel?.id;
      if (!nodeId) return;
      if (environment.useBackend && this.currentFlowId) {
        const runPreview = () => {
          const p = this.getStartPayload().payload;
          this.previewLoading = true;
          this.runsApi.preview(this.currentFlowId!, nodeId, p).subscribe({
            next: (resp) => {
              this.advancedInjectedInput = (resp && (resp as any).msgIn) || {};
              this.advancedCtx = this.advancedInjectedInput || {};
              try { this.cdr.detectChanges(); } catch {}
            },
            error: () => {
              // Fallback to local simulation
              const injected = this.runPredecessorsAndGetResult(nodeId);
              this.advancedInjectedInput = injected;
              this.advancedCtx = this.advancedInjectedInput || {};
              try { this.cdr.detectChanges(); } catch {}
            },
            complete: () => { this.previewLoading = false; try { this.cdr.detectChanges(); } catch {} }
          });
        };
        this._saveIfNeededThen(runPreview);
      } else {
        const injected = this.runPredecessorsAndGetResult(nodeId);
        this.advancedInjectedInput = injected;
        this.advancedCtx = this.advancedInjectedInput || {};
        try { this.cdr.detectChanges(); } catch {}
      }
    } catch {}
  }

  // Ask to save when using backend and flow has unsaved changes, then run the action
  private _saveIfNeededThen(action: () => void) {
    if (!(environment.useBackend && this.currentFlowId && this.hasUnsavedChanges())) { action(); return; }
    this.modal.confirm({
      nzTitle: 'Changements non sauvegardés',
      nzContent: 'Le flow a des modifications non sauvegardées. Il sera sauvegardé avant exécution. Confirmer ?',
      nzOkText: 'Sauvegarder et exécuter',
      nzCancelText: 'Annuler',
      nzOnOk: () => new Promise<void>((resolve) => {
        this.catalog.saveFlow({ id: this.currentFlowId!, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: { ui: { portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper } } } as any, true).subscribe({
          next: () => {
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
            try { this.updateSharedGraph(); this.saveDraft(); this.persistHistory(); } catch {}
            try { this.cdr.detectChanges(); } catch {}
            action();
            resolve();
          },
          error: (e) => {
            const err = this.normalizeApiError(e);
            try { this.message.error(err?.message || 'Échec de la sauvegarde'); } catch { this.showToast(err?.message || 'Échec de la sauvegarde'); }
            resolve();
          }
        });
      })
    });
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
    this.lpTimer = null;
    // If long-press already fired, do nothing further
    const now = Date.now();
    const dx = Math.abs(this.lpCurX - this.lpStartX);
    const dy = Math.abs(this.lpCurY - this.lpStartY);
    const isTap = dx <= this.lpMoveThresh && dy <= this.lpMoveThresh;
    if (!this.lpFired && isTap) {
      if (now - this.lastTapAt <= this.dtThresh) {
        const node = this.lpTarget;
        this.lastTapAt = 0;
        this.lpTarget = null; this.lpFired = false;
        if (node) {
          // Open configuration dialog on double-tap
          try { this.zone.run(() => { this.selectItem(node); this.openAdvancedEditor(); }); } catch {}
          return;
        }
      } else {
        this.lastTapAt = now;
      }
    }
    this.lpTarget = null; this.lpFired = false;
  }
  onNodeDoubleClick(ev: MouseEvent, node: any) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    try { this.selectItem(node); } catch {}
    this.openAdvancedEditor();
  }

  // Auto-layout the entire graph via backend (ELK)
  onBackendAutoLayout() {
    try {
      if (this.layoutLoading) return;
      if (environment.useBackend !== true) { try { this.message.warning('Backend requis pour l\'auto-placement'); } catch {}; return; }
      const graph = {
        nodes: (this.nodes || []).map(n => ({ id: String(n.id) })),
        edges: (this.edges || []).map(e => ({ id: e.id, source: String(e.source), target: String(e.target) }))
      };
      this.layoutLoading = true; try { this.cdr.detectChanges(); } catch {}
      const gapX = this.portOrientation === 'horizontal' ? 360 : 260;
      const gapY = this.portOrientation === 'horizontal' ? 160 : 160;
      this.layoutApi.layoutGraph(graph, this.portOrientation, { width: 250, height: 110, gapX, gapY }).subscribe({
        next: (resp: any) => {
          this.zone.run(() => {
            try {
              const positions = (resp && (resp.positions || (resp.data && resp.data.positions))) || {};
              const keys = positions ? Object.keys(positions) : [];
              if (!keys.length) { try { this.message.warning('Auto-placement: aucune position renvoyée'); } catch {}; return; }
              // Suppress transient graph events while applying
              const until = Date.now() + 900;
              this.suppressNodesRemovedUntil = until as any;
              this.suppressGraphEventsUntil = until as any;
              this.suppressRemoveUntil = until as any;

              const map = new Map<string, { x: number; y: number }>();
              keys.forEach(k => { const p = (positions as any)[k]; if (p && typeof p.x === 'number' && typeof p.y === 'number') map.set(String(k), { x: Math.round(p.x), y: Math.round(p.y) }); });
              // Create a fresh array so Vflow diff can reconcile by id without detach
              const updated = (this.nodes || []).map(n => {
                const id = String(n.id);
                const p = map.get(id);
                return p ? { ...n, point: { x: p.x, y: p.y } } : n;
              });
              this.nodes = updated;
              this.updateSharedGraph();
              this.pushState('auto.layout.backend');
              this.forceViewRefresh('auto-layout-apply');
              setTimeout(() => this.centerFlow(), 0);
            } catch {}
          });
        },
        error: (e) => { try { const er = this.normalizeApiError(e); this.message.error(er?.message || 'Échec de l\'auto-placement'); } catch {} },
        complete: () => { this.layoutLoading = false; try { this.cdr.detectChanges(); } catch {} }
      });
    } catch {}
  }

  // Dialog attempt helpers
  private nodeAttempts(nodeId?: string): Array<{ exec?: number; status?: string; startedAt?: string; finishedAt?: string; durationMs?: number; input?: any; argsPre?: any; argsPost?: any; result?: any; msgIn?: any; msgOut?: any; events?: any[] }> {
    const id = String(nodeId || this.selectedModel?.id || '');
    if (!id) return [];
    return (this.backendNodeAttempts.get(id) || []).slice();
  }
  // Exposé au template: dernier attempt pour un nœud (argsPre/argsPost)
  getLastAttemptFor(nodeId?: string): { argsPre?: any; argsPost?: any } | null {
    try {
      const id = String(nodeId || this.selectedModel?.id || '');
      if (!id) return null;
      const arr = this.backendNodeAttempts.get(id) || [];
      if (!arr.length) return null;
      const last = arr[arr.length - 1];
      return { argsPre: (last as any).argsPre, argsPost: (last as any).argsPost };
    } catch { return null; }
  }
  private groupExecCounts(atts: any[]): Map<number, number> {
    const m = new Map<number, number>();
    for (const a of atts) { const e = Number(a.exec); if (!Number.isFinite(e)) continue; m.set(e, (m.get(e) || 0) + 1); }
    return m;
  }
  private recomputeAttemptExecOptionsFor(nodeId?: string) {
    try {
      const atts = this.nodeAttempts(nodeId);
      if (!atts.length) { this.advancedAttemptExecs = []; return; }
      const counts = this.groupExecCounts(atts);
      const ops = Array.from(counts.entries()).map(([exec, count]) => ({ exec, count }));
      ops.sort((a, b) => a.exec - b.exec);
      // Expand standalone occurrences as separate pseudo-exec options
      const standaloneCount = counts.get(-1) || 0;
      if (standaloneCount > 0) {
        // remove generic -1 entry
        const base = ops.filter(o => o.exec !== -1);
        for (let i = 0; i < standaloneCount; i++) base.push({ exec: -1000 - i, count: 1 } as any);
        base.sort((a,b) => a.exec - b.exec);
        this.advancedAttemptExecs = base as any;
      } else {
        this.advancedAttemptExecs = ops;
      }
    } catch { this.advancedAttemptExecs = []; }
  }
  private applyStartFormSchemaFromSession(session: string | null) {
    if (!session) return;
    try {
      const raw = localStorage.getItem('formbuilder.session.' + session);
      if (!raw) return;
      const schema = JSON.parse(raw);
      let m = this.selectedModel;
      if (!m) {
        try {
          const nodeId = this.pendingFbNodeId || this.route.snapshot.queryParamMap.get('node');
          if (nodeId) {
            const node = this.nodes.find(n => String(n.id) === String(nodeId));
            if (node) { this.selectItem(node); m = node.data?.model || null; }
          }
        } catch {}
      }
      if (!m) return;
      const newModel = { ...m, startFormEnabled: true, context: schema };
      this.onAdvancedModelChange(newModel);
      this.onAdvancedModelCommitted(newModel);
      // Re-sélectionner le nœud et rouvrir la boîte de dialogue pour permettre de tester/remplir immédiatement
      try {
        const id = String(newModel.id || '');
        const node = this.nodes.find(n => String(n.id) === id);
        if (node) {
          this.selectItem(node);
          setTimeout(() => this.openAdvancedEditor(), 0);
        }
      } catch {}
      // Do not auto-save the flow here; let the user decide to save
      try { localStorage.removeItem('formbuilder.session.' + session); } catch {}
      try { this.message.success('Formulaire importé dans le nœud'); } catch { this.showToast('Formulaire importé'); }
    } catch {}
  }
  private resolveAttemptForSelection(nodeId?: string): any | null {
    const id = String(nodeId || this.selectedModel?.id || ''); if (!id) return null;
    const atts = this.nodeAttempts(id);
    if (!atts.length) return null;
    let exec = this.advancedSelectedExec;
    if (exec == null) {
      exec = Number(atts[atts.length - 1]?.exec);
      if (Number.isFinite(exec)) this.advancedSelectedExec = exec;
    }
    const sameExec = atts.filter(a => Number(a.exec) === Number(exec));
    if (!sameExec.length) return atts[atts.length - 1];
    const occIdx = Math.max(0, Math.min((this.advancedOccurByNode.get(id) ?? (sameExec.length - 1)), sameExec.length - 1));
    this.advancedOccurByNode.set(id, occIdx);
    return sameExec[occIdx];
  }
  private recomputeExecCountAndOccIndex(nodeId?: string) {
    try {
      const id = String(nodeId || this.selectedModel?.id || ''); if (!id) { this.advancedExecCount = null; this.advancedOccurIndex = null; return; }
      const atts = this.nodeAttempts(id);
      if (!atts.length || this.advancedSelectedExec == null) { this.advancedExecCount = null; this.advancedOccurIndex = null; return; }
      const counts = this.groupExecCounts(atts);
      const c = counts.get(Number(this.advancedSelectedExec)) || 0;
      this.advancedExecCount = c > 0 ? c : null;
      this.advancedOccurIndex = (this.advancedExecCount && this.advancedExecCount > 1) ? (this.advancedOccurByNode.get(id) ?? (this.advancedExecCount - 1)) : null;
    } catch { this.advancedExecCount = null; this.advancedOccurIndex = null; }
  }

  // Build unified attempt options for single-select UI
  private recomputeAttemptOptionsFor(nodeId?: string) {
    try {
      const id = String(nodeId || this.selectedModel?.id || ''); if (!id) { this.advancedAttemptOptions = []; return; }
      const atts = this.nodeAttempts(id);
      const options: Array<{ idx: number; exec: number; occur: number; label: string }> = [];
      const seenExecOccurs = new Map<number, number>();
      for (let i = 0; i < atts.length; i++) {
        const a = atts[i];
        const e = Number(a.exec);
        const prev = seenExecOccurs.get(e) || 0;
        const occur = prev; // 0-based
        seenExecOccurs.set(e, prev + 1);
        const label = (e === -1) ? `Standalone #${occur + 1}` : (`#${e}` + ((atts.filter(x => Number(x.exec) === e).length > 1) ? ` · ${occur + 1}` : ''));
        options.push({ idx: i, exec: e, occur, label });
      }
      this.advancedAttemptOptions = options;
    } catch { this.advancedAttemptOptions = []; }
  }
  onDialogExecChange(exec: number) {
    try { this.advancedSelectedExec = Number(exec); } catch { this.advancedSelectedExec = exec as any; }
    // Handle standalone occurrence encoded in exec (<= -1000)
    if (Number(this.advancedSelectedExec) <= -1000) {
      const id = String(this.selectedModel?.id || '');
      const occ = Math.max(0, (-1000 - Number(this.advancedSelectedExec)));
      this.advancedSelectedExec = -1;
      if (id) this.advancedOccurByNode.set(id, occ);
      this.recomputeExecCountAndOccIndex();
      this.recomputeAttemptOptionsFor(id);
      this.refreshDialogIOFromSelection();
      return;
    }
    // Reset per-node occurrence to last for new exec by default
    try {
      const id = String(this.selectedModel?.id || '');
      if (id) {
        const atts = this.nodeAttempts(id).filter(a => Number(a.exec) === Number(this.advancedSelectedExec));
        const idx = atts.length ? (atts.length - 1) : 0;
        this.advancedOccurByNode.set(id, idx);
      }
    } catch {}
    this.recomputeExecCountAndOccIndex();
    this.recomputeAttemptOptionsFor();
    this.refreshDialogIOFromSelection();
  }
  onDialogOccurChange(idx: number) {
    const id = String(this.selectedModel?.id || ''); if (!id) return;
    const v = Math.max(0, Number(idx) || 0);
    this.advancedOccurByNode.set(id, v);
    this.advancedOccurIndex = v;
    this.recomputeAttemptOptionsFor(id);
    this.recomputeSelectedAttemptIdxForNode(id);
    this.refreshDialogIOFromSelection();
  }
  onDialogAttemptIdxChange(idx: number) {
    try {
      this.advancedSelectedAttemptIdx = Number(idx);
      const id = String(this.selectedModel?.id || '');
      const atts = this.nodeAttempts(id);
      const att = atts[this.advancedSelectedAttemptIdx || 0];
      const e = Number(att?.exec);
      // derive occurrence within that exec
      let occur = 0;
      for (let i = 0; i < (this.advancedSelectedAttemptIdx || 0); i++) if (Number(atts[i]?.exec) === e) occur++;
      this.advancedSelectedExec = e;
      if (id) this.advancedOccurByNode.set(id, occur);
      this.recomputeExecCountAndOccIndex(id);
      this.refreshDialogIOFromSelection();
    } catch {}
  }
  onDialogInputChange(v: any) {
    try {
      this.advancedInjectedInput = v;
      this.advancedCtx = v || {};
    } catch {}
  }
  private recomputeSelectedAttemptIdxForNode(id: string) {
    try {
      const atts = this.nodeAttempts(id);
      if (!atts.length) { this.advancedSelectedAttemptIdx = null; return; }
      const e = Number(this.advancedSelectedExec);
      if (!Number.isFinite(e)) { this.advancedSelectedAttemptIdx = atts.length - 1; return; }
      let occur = this.advancedOccurByNode.get(id) ?? 0; if (occur < 0) occur = 0;
      let idx = -1; let seen = -1;
      for (let i = 0; i < atts.length; i++) { if (Number(atts[i]?.exec) === e) { seen++; if (seen === occur) { idx = i; break; } } }
      this.advancedSelectedAttemptIdx = idx >= 0 ? idx : (atts.length - 1);
    } catch { this.advancedSelectedAttemptIdx = null; }
  }
  private refreshDialogIOFromSelection() {
    try {
      const id = String(this.selectedModel?.id || '');
      const att = this.resolveAttemptForSelection(id);
      const isStart = String(this.selectedModel?.templateObj?.type || '').toLowerCase() === 'start';
      this.advancedInjectedInput = att?.msgIn ?? att?.input ?? (isStart ? (this.getStartPayload().payload || {}) : null);
      this.advancedInjectedOutput = att?.msgOut ?? att?.result ?? (isStart ? (this.getStartPayload().payload || {}) : null);
      this.advancedAttemptEvents = (att?.events || []).slice().sort((a:any,b:any)=> new Date(a?.createdAt||0).getTime() - new Date(b?.createdAt||0).getTime());
      this.advancedCtx = this.advancedInjectedInput || {};
      // Output loader should reflect current attempt status
      try {
        const st = (att && (att.status as any)) || null;
        this.outputLoading = (st === 'running');
        // Update badge/meta from selected attempt when no test is currently running
        if (att) {
          if (st === 'running') this.testStatus = 'running';
          else if (st === 'error') this.testStatus = 'error';
          else if (st === 'success') this.testStatus = 'success';
          else this.testStatus = 'idle';
          // startedAt may be number or string; normalize to epoch ms; fallback to earliest event.createdAt
          let started: any = (att as any).startedAt;
          if (typeof started === 'string') { const p = Date.parse(started as any); started = Number.isFinite(p) ? p : null; }
          else if (typeof started === 'number') { /* keep as-is */ }
          else {
            // try earliest event createdAt
            try {
              const evs = Array.isArray(att?.events) ? att.events.slice().sort((a:any,b:any)=> new Date(a?.createdAt||0).getTime() - new Date(b?.createdAt||0).getTime()) : [];
              const first = evs[0];
              if (first && first.createdAt) { const p = Date.parse(first.createdAt as any); started = Number.isFinite(p) ? p : null; }
              else { started = null; }
            } catch { started = null; }
          }
          this.testStartedAt = (started != null && Number.isFinite(started)) ? Number(started) : null;
          // Prefer attempt.durationMs; if missing, compute from finishedAt - startedAt
          let dur: any = (att as any).durationMs;
          if (dur == null) {
            let fin: any = (att as any).finishedAt;
            if (typeof fin === 'string') { const pf = Date.parse(fin as any); fin = Number.isFinite(pf) ? pf : null; }
            if (typeof fin === 'number' && typeof started === 'number') {
              const d = Math.max(0, fin - started);
              dur = Number.isFinite(d) ? d : null;
            }
          }
          this.testDurationMs = (dur != null && dur !== '') ? Number(dur) : null;
        }
      } catch { this.outputLoading = false; }
      // When a backend run is in progress and node hasn't started yet, keep both spinners on
      if (this.backendRunStatus === 'running' && !att) {
        this.previewLoading = true;
        this.outputLoading = true;
      } else if (!att) {
        // No attempt (e.g., finished without this node)
        this.previewLoading = false;
      } else {
        // Attempt exists: ensure input spinner is off
        this.previewLoading = false;
      }
    } catch {}
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
      const oldModel = node.data?.model || {};
      const model = JSON.parse(JSON.stringify(oldModel || {}));
      model.id = newId;
      // Adjust name to indicate duplication (non-bloquant)
      try { if (model?.name) model.name = String(model.name) + ' (copy)'; } catch { }
      // For condition nodes: regenerate stable _id for items to avoid handle collisions
      try {
        const tmpl = model?.templateObj || {};
        if (tmpl?.type === 'condition') {
          const field = tmpl.output_array_field || 'items';
          const used = this.collectAllConditionHandleIds();
          // Build old->new handle id mapping by index
          const oldArr = (oldModel?.context && Array.isArray(oldModel.context[field])) ? oldModel.context[field] : [];
          const arr = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
          const handleMap: Record<string,string> = {};
          for (const it of arr) {
            if (it && typeof it === 'object') {
              let id = '';
              do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id));
              const idx = arr.indexOf(it);
              handleMap[String(oldArr?.[idx]?._id || '')] = id;
              it._id = id; used.add(id);
            }
          }
          // Else mapping
          const oldElseId = (oldModel?.context?.else && oldModel.context.else._id) ? String(oldModel.context.else._id) : '';
          if (model?.context?.else && model.context.else._id) {
            let eid = '';
            do { eid = 'else_' + Math.random().toString(36).slice(2); } while (used.has(eid));
            handleMap[oldElseId] = eid;
            model.context.else._id = eid; used.add(eid);
          }
          // Duplicate outgoing edges from original node with remapped sourceHandle
          const newEdges: any[] = [];
          for (const e of (this.edges || [])) {
            if (String((e as any).source) === String(node.id)) {
              const ne = JSON.parse(JSON.stringify(e));
              ne.source = newId;
              if (ne.sourceHandle && handleMap[String(ne.sourceHandle)]) ne.sourceHandle = handleMap[String(ne.sourceHandle)];
              try {
                const sh = String(ne.sourceHandle || '');
                const th = String(ne.targetHandle || '');
                ne.id = `${ne.source}->${ne.target}:${sh}:${th}`;
              } catch {}
              newEdges.push(ne);
            }
          }
          if (newEdges.length) this.edges = [...this.edges, ...newEdges];
        }
      } catch { }
      const vNode = { id: newId, point: newPoint, type: node.type, data: { ...node.data, model } };
      this.nodes = [...this.nodes, vNode];
      try { this.triggerSpawnAnim(newId); } catch {}
      try { this.triggerSpawnAnim(newId); } catch {}
      try { this.suppressNodesRemovedUntil = Date.now() + 600; } catch {}
      // After duplicate (single), select only the new node and clear any previous selection
      this.selectionList = [vNode as any];
      this.selection = vNode as any;
      try { this.cdr.detectChanges(); } catch {}
      try { this.selectIdsWithRetry([newId]); } catch {}
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      this.history.push(this.snapshot());
      this.recomputeValidation();
    } catch { }
  }

  // Duplicate the whole current selection, preserving internal connections
  ctxDuplicateGroup() {
    this.closeCtxMenu();
    try {
      const sels = Array.isArray(this.selectionList) ? this.selectionList.slice() : [];
      const ids = sels.map(n => String(n?.id)).filter(Boolean);
      const idSet = new Set(ids);
      if (ids.length < 2) { this.ctxDuplicateTarget(); return; }
      // Build id remap and compute offset
      const bbox = { minx: Infinity, miny: Infinity };
      for (const n of sels) { const p = n?.point || { x:0, y:0 }; bbox.minx = Math.min(bbox.minx, p.x||0); bbox.miny = Math.min(bbox.miny, p.y||0); }
      const dx = 60, dy = 60;
      const idMap = new Map<string,string>();
      for (const n of sels) {
        const tpl = n?.data?.model?.templateObj;
        // Skip triggers
        if (this.isStartLike(tpl)) continue;
        const newId = this.generateNodeId(tpl, n?.data?.model?.name || tpl?.name || tpl?.title);
        idMap.set(String(n.id), newId);
      }
      const usedCondIds = this.collectAllConditionHandleIds();
      // Prepare per-node condition handle remapping: oldId -> (oldHandle -> newHandle)
      const condHandleMap = new Map<string, Map<string,string>>();
      const newNodes: any[] = [];
      for (const n of sels) {
        const oldId = String(n.id);
        const newId = idMap.get(oldId);
        if (!newId) continue; // skipped (e.g., start)
        const oldM = n?.data?.model || {};
        const m = JSON.parse(JSON.stringify(oldM || {}));
        m.id = newId;
        // Rename for copy UX
        try { if (m?.name) m.name = String(m.name) + ' (copy)'; } catch {}
        // Condition: avoid branch id collisions
        try {
          const tt = m?.templateObj?.type;
          if (tt === 'condition') {
            const field = m?.templateObj?.output_array_field || 'items';
            const arr = (m?.context && Array.isArray(m.context[field])) ? m.context[field] : [];
            const oldArr = (oldM?.context && Array.isArray(oldM.context[field])) ? oldM.context[field] : [];
            const map = new Map<string,string>();
            for (const it of arr) {
              if (it && typeof it === 'object') {
                let cid = '';
                do { cid = 'cid_' + Math.random().toString(36).slice(2); } while (usedCondIds.has(cid));
                const idx = arr.indexOf(it);
                const old = String(oldArr?.[idx]?._id || '');
                if (old) map.set(old, cid);
                it._id = cid; usedCondIds.add(cid);
              }
            }
            if (m?.context?.else && m.context.else._id) {
              let eid = '';
              do { eid = 'else_' + Math.random().toString(36).slice(2); } while (usedCondIds.has(eid));
              const oldElse = (oldM?.context?.else && oldM.context.else._id) ? String(oldM.context.else._id) : '';
              if (oldElse) map.set(oldElse, eid);
              m.context.else._id = eid; usedCondIds.add(eid);
            }
            condHandleMap.set(oldId, map);
          }
        } catch {}
        const p = n?.point || { x:0, y:0 };
        const vNode = { id: newId, point: { x: p.x + dx, y: p.y + dy }, type: n.type, data: { ...n.data, model: m } };
        newNodes.push(vNode);
      }
      if (newNodes.length) {
        this.nodes = [...this.nodes, ...newNodes];
      }
      // Clone internal edges
      const newEdges: any[] = [];
      for (const e of (this.edges || [])) {
        const s = String((e as any).source || '');
        const t = String((e as any).target || '');
        if (idSet.has(s) && idSet.has(t)) {
          const ns = idMap.get(s); const nt = idMap.get(t);
          if (ns && nt) {
            const ne = JSON.parse(JSON.stringify(e));
            ne.source = ns; ne.target = nt;
            // Remap condition handles on source side
            const map = condHandleMap.get(s);
            if (map && ne.sourceHandle && map.get(String(ne.sourceHandle))) ne.sourceHandle = map.get(String(ne.sourceHandle));
            try {
              const sh = String((ne as any).sourceHandle || '');
              const th = String((ne as any).targetHandle || '');
              ne.id = `${ns}->${nt}:${sh}:${th}`;
            } catch {}
            newEdges.push(ne);
          }
        }
      }
      if (newEdges.length) {
        this.edges = [...this.edges, ...newEdges];
      }
      // Select newly created nodes
      this.selectionList = newNodes;
      this.selection = newNodes[0] || null;
      try { this.cdr.detectChanges(); } catch {}
      try { this.selectIdsWithRetry(newNodes.map(n => n.id)); } catch {}
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      this.pushState('duplicate.group');
      this.recomputeValidation();
    } catch {}
  }

  ctxDeleteGroup() {
    this.closeCtxMenu();
    try { this.onDeleteMany(); } catch {}
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
        // Credentials and form validation + condition-specific checks
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
          // Condition-specific validation: array of items with name + expression/condition
          try {
            const ttype = String(model?.templateObj?.type || '').toLowerCase();
            if (ttype === 'condition') {
              const field = String(model?.templateObj?.output_array_field || 'items');
              const arr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
              if (!Array.isArray(arr) || arr.length === 0) {
                issues.push({ kind: 'node', nodeId: id, message: `Condition: aucune branche définie (ajoutez au moins une condition).` });
              } else {
                arr.forEach((it, idx) => {
                  const num = idx + 1;
                  if (!it || typeof it !== 'object') {
                    issues.push({ kind: 'node', nodeId: id, message: `Condition #${num}: élément invalide` });
                    return;
                  }
                  const name = String(it.name || '').trim();
                  const expr = String((it.expression ?? it.condition) || '').trim();
                  if (!name) issues.push({ kind: 'node', nodeId: id, message: `Condition #${num}: nom manquant` });
                  if (!expr) issues.push({ kind: 'node', nodeId: id, message: `Condition #${num}: expression manquante` });
                });
              }
              // Else optional: if present, must have an id
              const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : '');
              if (model?.context?.else || model?.context?.elseId) {
                if (!elseId) issues.push({ kind: 'node', nodeId: id, message: `Condition: "Else" activé sans identifiant (_id) — impossible de le relier.` });
              }
            }
          } catch {}
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
        const id = String((tgt as any).id || '');
        if (id) {
          // Play removal animation then actually remove
          this.scheduleRemove(new Set([id]), 'ctx.delete.node');
        }
      }
      // scheduleRemove handles selection clearing, recompute and history
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
  ctxCenterSelection() {
    this.closeCtxMenu();
    try { this.centerOnSelection(); } catch { }
  }

  ctxAlignSelection(dir: 'horizontal' | 'vertical') {
    try {
      this.closeCtxMenu();
      const listRaw = Array.isArray(this.selectionList) ? this.selectionList.slice() : [];
      if (listRaw.length < 2) return;
      // Resolve to our canonical nodes array, preserving the original order
      const byId = new Map((this.nodes || []).map(n => [String(n.id), n] as const));
      const list = listRaw.map(n => byId.get(String((n as any)?.id))!).filter(Boolean);
      if (list.length < 2) return;
      const anchor = list[0];
      if (!anchor || !anchor.point) return;

      // Build quick lookup for node sizes via Vflow models
      const sizes = new Map<string, { width: number; height: number }>();
      try {
        const models: any[] = this.flow?.nodeModels?.() || [];
        for (const m of models) {
          try {
            const id = String(m?.rawNode?.id ?? '');
            const sz = m?.size?.();
            if (id && sz && isFinite(Number(sz.width)) && isFinite(Number(sz.height))) {
              sizes.set(id, { width: Number(sz.width), height: Number(sz.height) });
            }
          } catch {}
        }
      } catch {}

      const getSize = (id: any) => {
        const sid = String(id);
        return sizes.get(sid) || { width: 180, height: 100 };
      };

      // Partition relative to anchor and compute a reasonable gap (average of positive gaps)
      const others = list.filter(n => String(n.id) !== String(anchor.id));
      const anchorSize = getSize(anchor.id);
      let rightOrBottom: any[] = [];
      let leftOrTop: any[] = [];
      if (dir === 'horizontal') {
        rightOrBottom = others.filter(n => Number(n?.point?.x ?? 0) >= Number(anchor?.point?.x ?? 0)).sort((a,b) => (a.point?.x||0) - (b.point?.x||0));
        leftOrTop = others.filter(n => Number(n?.point?.x ?? 0) < Number(anchor?.point?.x ?? 0)).sort((a,b) => (b.point?.x||0) - (a.point?.x||0));
      } else {
        rightOrBottom = others.filter(n => Number(n?.point?.y ?? 0) >= Number(anchor?.point?.y ?? 0)).sort((a,b) => (a.point?.y||0) - (b.point?.y||0));
        leftOrTop = others.filter(n => Number(n?.point?.y ?? 0) < Number(anchor?.point?.y ?? 0)).sort((a,b) => (b.point?.y||0) - (a.point?.y||0));
      }

      // Compute average positive gap from current layout
      const consecutive = (arr: any[], axis: 'x'|'y') => arr.map(n => ({ id: n.id, x: Number(n.point?.x||0), y: Number(n.point?.y||0), ...getSize(n.id) }));
      let gaps: number[] = [];
      if (dir === 'horizontal') {
        const seq = consecutive([anchor, ...rightOrBottom].sort((a,b) => a.point.x - b.point.x), 'x');
        for (let i=1;i<seq.length;i++) { const prev = seq[i-1]; const cur = seq[i]; const g = cur.x - (prev.x + prev.width); if (g>0) gaps.push(g); }
        const seqL = consecutive([anchor, ...leftOrTop].sort((a,b) => a.point.x - b.point.x), 'x');
        for (let i=1;i<seqL.length;i++) { const prev = seqL[i-1]; const cur = seqL[i]; const g = cur.x - (prev.x + prev.width); if (g>0) gaps.push(g); }
      } else {
        const seq = consecutive([anchor, ...rightOrBottom].sort((a,b) => a.point.y - b.point.y), 'y');
        for (let i=1;i<seq.length;i++) { const prev = seq[i-1]; const cur = seq[i]; const g = cur.y - (prev.y + prev.height); if (g>0) gaps.push(g); }
        const seqT = consecutive([anchor, ...leftOrTop].sort((a,b) => a.point.y - b.point.y), 'y');
        for (let i=1;i<seqT.length;i++) { const prev = seqT[i-1]; const cur = seqT[i]; const g = cur.y - (prev.y + prev.height); if (g>0) gaps.push(g); }
      }
      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
      let gap = avg(gaps);
      if (!isFinite(gap) || gap <= 0) gap = 60; // sensible default

      const newPos: Record<string, { x: number; y: number }> = {};
      const ax = Number(anchor?.point?.x || 0); const ay = Number(anchor?.point?.y || 0);
      newPos[String(anchor.id)] = { x: ax, y: ay };
      if (dir === 'horizontal') {
        // Place to the right
        let curX = ax + anchorSize.width + gap;
        for (const n of rightOrBottom) {
          const s = getSize(n.id);
          newPos[String(n.id)] = { x: curX, y: ay };
          curX += s.width + gap;
        }
        // Place to the left
        let curLeftX = ax - gap;
        for (const n of leftOrTop) {
          const s = getSize(n.id);
          const nx = curLeftX - s.width;
          newPos[String(n.id)] = { x: nx, y: ay };
          curLeftX = nx - gap;
        }
      } else {
        // Place below
        let curY = ay + anchorSize.height + gap;
        for (const n of rightOrBottom) {
          const s = getSize(n.id);
          newPos[String(n.id)] = { x: ax, y: curY };
          curY += s.height + gap;
        }
        // Place above
        let curTopY = ay - gap;
        for (const n of leftOrTop) {
          const s = getSize(n.id);
          const ny = curTopY - s.height;
          newPos[String(n.id)] = { x: ax, y: ny };
          curTopY = ny - gap;
        }
      }

      const idsSet = new Set(list.map(n => String(n.id)));
      let changed = false;
      const next = (this.nodes || []).map(n => {
        const id = String(n?.id ?? '');
        if (!idsSet.has(id)) return n;
        const p = newPos[id];
        if (!p) return n;
        const cx = Number(n?.point?.x ?? NaN);
        const cy = Number(n?.point?.y ?? NaN);
        const nx = Number.isFinite(p.x) ? p.x : cx;
        const ny = Number.isFinite(p.y) ? p.y : cy;
        if (!isFinite(cx) || !isFinite(cy) || nx !== cx || ny !== cy) { changed = true; return { ...n, point: { x: nx, y: ny } }; }
        return n;
      });
      if (changed) {
        // Prevent accidental node removal reactions during batch update
        try { this.suppressNodesRemovedUntil = Date.now() + 900; } catch {}
        this.nodes = next;
        try { this.cdr.detectChanges(); } catch {}
        try { this.setVflowSelectedIds(Array.from(idsSet)); } catch {}
        this.pushState('nodes.aligned.' + dir);
      }
    } catch {}
  }

  onSelected(ev: any) {
    // Vflow may emit single entity or array of entities
    const list = Array.isArray(ev) ? ev : (ev ? [ev] : []);
    this.selectionList = list;
    this.selection = list.length ? list[0] : null;
    try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
  }

  onComponentNodeEvent(ev: any) {
    try {
      const arr = (ev && (ev.selected || ev.selection || ev.nodes)) ? (ev.selected || ev.selection || ev.nodes) : null;
      if (Array.isArray(arr)) {
        this.selectionList = arr as any[];
        this.selection = this.selectionList[0] || null;
        try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      }
    } catch {}
  }

  selectItem(changes: any) {
    // Do not deselect on repeated click/press; only set when different
    if (!this.selection || this.selection.id !== changes.id) {
      this.selection = changes;
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
    }
  }

  onNodeClick(ev: MouseEvent, ctx: any) {
    try {
      const node = ctx?.node;
      if (!node) return;
      const id = String(node.id);
      const has = (this.selectionList || []).some(n => String(n?.id) === id);
      const shift = !!(ev.shiftKey);
      if (shift) {
        // Toggle selection in our app state
        if (has) {
          this.selectionList = (this.selectionList || []).filter(n => String(n?.id) !== id);
          if (this.selection && String(this.selection.id) === id) {
            this.selection = this.selectionList[0] || null;
          }
        } else {
          this.selectionList = [...(this.selectionList || []), node];
          this.selection = this.selection || node;
        }
      } else {
        // Single select
        this.selectionList = [node];
        this.selection = node;
      }
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      // Sync selection to vflow so multi-drag works and emits .many
      try { this.setVflowSelectedIds((this.selectionList || []).map(n => n.id)); } catch {}
      ev.stopPropagation();
    } catch {}
  }
  onCanvasClick(ev: MouseEvent) {
    try {
      const target = ev.target as HTMLElement;
      // Ignore clicks originating from node cards
      if (target && target.closest && target.closest('.node-card')) return;
      this.selectionList = [];
      this.selection = null;
      this.editJson = '';
    } catch {}
  }

  onDeleteMany() {
    try {
      const ids = new Set((this.selectionList || []).map(x => String(x?.id)).filter(Boolean));
      if (!ids.size) return;
      // Avoid deleting start nodes via batch
      const safeIds = new Set(Array.from(ids).filter(id => !this.isStartLike(this.nodes.find(n => String(n.id)===id)?.data?.model?.templateObj)));
      if (!safeIds.size) return;
      this.scheduleRemove(safeIds, 'nodes.removed.many');
    } catch {}
  }

    onInspectorOpenSingle(nodeId: string) {
    try {
      const sel = (this.nodes || []).find(n => String(n.id) === String(nodeId));
      if (!sel) return;
      this.selection = sel;
      this.selectionList = [sel];
      try { this.editJson = JSON.stringify(this.selectedModel, null, 2); } catch { this.editJson = ''; }
      try { this.setVflowSelectedIds([nodeId]); } catch {}
      this.openAdvancedEditor();
    } catch {}
  }

  openAdvancedEditor() {
    // Prefill input wing from previous node last result
    try {
      const nodeId = this.selectedModel?.id;
      const isStart = String(this.selectedModel?.templateObj?.type || '').toLowerCase() === 'start';
      const hasPrev = (this.edges || []).some(e => String(e.target) === String(nodeId));
      // If no predecessor, hide the 'Lancer les précédents' hint by providing empty input
      if (!hasPrev) {
        this.advancedInjectedInput = {};
      }
      // Prefer backend attempts if a live/snapshotted run is selected
      if (this.backendRunId && nodeId) {
        const arr = this.backendNodeAttempts.get(String(nodeId)) || [];
        const last = arr[arr.length - 1];
        if (last) {
          // Initialize selection: keep existing global exec if present, otherwise use last's exec
          if (this.advancedSelectedExec == null && last.exec != null) this.advancedSelectedExec = Number(last.exec);
          try {
            const sameExec = arr.filter(a => Number(a.exec) === Number(this.advancedSelectedExec ?? last.exec));
            const idx = sameExec.length ? (sameExec.length - 1) : 0;
            this.advancedOccurByNode.set(String(nodeId), idx);
          } catch {}
          this.recomputeAttemptExecOptionsFor(nodeId);
          this.recomputeAttemptOptionsFor(nodeId);
          this.recomputeExecCountAndOccIndex(nodeId);
          // Default selected attempt idx = last
          this.advancedSelectedAttemptIdx = arr.length - 1;
          this.refreshDialogIOFromSelection();
          // Set output loading according to selected attempt status
          try {
            const att = this.resolveAttemptForSelection(nodeId);
            this.outputLoading = att?.status === 'running';
          } catch { this.outputLoading = false; }
        } else {
          // No attempts yet for this node in current run
          this.advancedAttemptEvents = [];
          this.recomputeAttemptExecOptionsFor(nodeId);
          this.recomputeAttemptOptionsFor(nodeId);
          this.recomputeExecCountAndOccIndex(nodeId);
          this.refreshDialogIOFromSelection(); // will enable both spinners if run is running and no attempt
        }
      } else {
        this.advancedInjectedInput = isStart ? (this.getStartPayload().payload || {}) : this.computePrevPayload(nodeId);
        // Important: clear any stale output when opening on a non-start node (no attempt yet)
        this.advancedInjectedOutput = isStart ? (this.getStartPayload().payload || {}) : null;
        this.advancedAttemptEvents = [];
        this.advancedAttemptExecs = [];
        this.advancedExecCount = null;
        this.advancedOccurIndex = null;
        this.outputLoading = false;
      }
      this.advancedCtx = this.advancedInjectedInput || {};
    } catch { this.advancedInjectedInput = null; this.advancedCtx = {}; }
    this.advancedOpen = true;
  }
  onStartPayloadChange(v: any) {
    this.setStartPayload(v);
    const p = this.getStartPayload().payload;
    this.advancedInjectedInput = p || {};
    this.advancedInjectedOutput = p || {};
    this.advancedCtx = this.advancedInjectedInput || {};
    try { console.log('[builder][start] payloadChange', p); } catch {}
    try { this.cdr.detectChanges(); } catch {}
    // If we were waiting for the payload to start the run, close dialog and launch
    if (this.pendingRunAfterStartForm) {
      this.pendingRunAfterStartForm = false;
      try { this.closeAdvancedEditor(); } catch {}
      setTimeout(() => this.runFlow(), 0);
    }
  }
  closeAdvancedEditor() { this.advancedOpen = false; }
  onAdvancedModelChange(m: any) {
    // Ne pas muter le graph pendant l'édition pour éviter les boucles et suppressions d'edges.
    // Appliquer uniquement à la clôture (onAdvancedModelCommitted) ou via saveSelectedJson.
    if (!m?.id) return;
    try { this.advancedCtx = m?.context || this.advancedCtx; } catch {}
  }
  onAdvancedModelCommitted(m: any) {
    if (!m?.id) return;
    try { this.openedNodeConfig.add(String(m.id)); } catch { }
    // Normalize else_enabled and stabilize
    const oldModel = (this.nodes.find(n => n.id === m.id)?.data?.model) || null;
    try {
      const ty = String(m?.templateObj?.type || '').toLowerCase();
      if (ty === 'condition') {
        const en = !!(m?.context?.else_enabled);
        if (en) {
          const cur = (m.context || {});
          const has = cur.else && typeof cur.else === 'object' && cur.else._id;
          if (!has) { m.context = { ...cur, else: { _id: `else_${m.id}` } }; }
        } else { if (m?.context) { delete m.context.else; delete (m.context as any).elseId; } }
      }
    } catch {}
    const stable = this.fbUtils.ensureStableConditionIds(oldModel, m);
    // Persist stabilized model on node
    this.nodes = this.nodes.map(n => n.id === stable.id ? ({ ...n, data: { ...n.data, model: stable } }) : n);
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
      // Normalize else_enabled for conditions then stabilize
      try {
        const ty = String(parsed?.templateObj?.type || '').toLowerCase();
        if (ty === 'condition') {
          const en = !!(parsed?.context?.else_enabled);
          if (en) {
            const cur = (parsed.context || {});
            const has = cur.else && typeof cur.else === 'object' && cur.else._id;
            if (!has) { parsed.context = { ...cur, else: { _id: `else_${parsed.id}` } }; }
          } else { if (parsed?.context) { delete parsed.context.else; delete (parsed.context as any).elseId; } }
        }
      } catch {}
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
      const id = String(sel.id);
      this.scheduleRemove(new Set([id]), 'delete.node');
    }
  }

  private findBestTargetNodeForStart(wx: number, wy: number): any | null {
    try {
      let best: any = null; let bestD = Infinity;
      for (const n of this.nodes) {
        const tmpl = n?.data?.model?.templateObj || {};
        const ty = String(tmpl?.type || '').toLowerCase();
        // target must accept an input (not start-like/end)
        if (ty === 'start' || ty === 'start_form' || ty === 'event' || ty === 'endpoint' || ty === 'end') continue;
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
      const list = Array.isArray(this.selectionList) ? this.selectionList : (this.selection ? [this.selection] : []);
      const ids = list.filter(n => n && !(n as any).source && (n as any).id).map(n => String((n as any).id));
      if (!ids.length) return;
      if (ids.length === 1) { this.centerOnNodeId(ids[0]); return; }
      this.centerOnNodeIds(ids);
    } catch { }
  }
  private centerOnNodeIds(nodeIds: string[]) {
    try {
      if (!nodeIds || !nodeIds.length) return;
      const vp = this.flow?.viewportService?.readableViewport() || { zoom: 1 };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const nid of nodeIds) {
        const n = this.nodes.find(nn => String(nn.id) === String(nid)); if (!n) continue;
        const p = n?.point || { x: 0, y: 0 };
        let w = 180, h = 100;
        try {
          const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(String(nid))}\"]`) as HTMLElement | null;
          if (el) { const r = el.getBoundingClientRect(); if (r && r.width && r.height) { w = r.width / (vp.zoom || 1); h = r.height / (vp.zoom || 1); } }
        } catch {}
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
  saveForLeave(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        if (!this.currentFlowId) {
          try { this.message.warning('Aucun flow associé'); } catch { this.showToast('Aucun flow associé'); }
          resolve(false);
          return;
        }
        const doc = { id: this.currentFlowId, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: { ui: { portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper } } } as any;
        this.catalog.saveFlow(doc).subscribe({
          next: () => {
            try { this.message.success('Flow sauvegardé'); } catch { this.showToast('Flow sauvegardé'); }
            this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
            try {
              this.updateSharedGraph();
              this.saveDraft();
              this.persistHistory();
            } catch {}
            try { this.cdr.detectChanges(); } catch {}
            resolve(true);
          },
          error: (e) => {
            const apiErr = this.normalizeApiError(e);
            const code = String(apiErr?.code || '');
            if (code === 'flow_invalid') {
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
                nzOnOk: () => this.catalog.saveFlow({ ...(doc as any), meta: { ...(doc as any).meta, ui: { ...(doc as any)?.meta?.ui, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper } } }, true).subscribe({
                  next: () => {
                    try { this.message.warning('Flow forcé et désactivé'); } catch { this.showToast('Flow forcé et désactivé'); }
                    this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
                    try { this.updateSharedGraph(); this.saveDraft(); this.persistHistory(); } catch {}
                    resolve(true);
                  },
                  error: () => {
                    try { this.message.error('Échec de la sauvegarde'); } catch { this.showToast('Échec de la sauvegarde'); }
                    resolve(false);
                  }
                }),
                nzOnCancel: () => resolve(false)
              });
            } else {
              try { this.message.error(apiErr?.message || 'Échec de la sauvegarde'); } catch { this.showToast(apiErr?.message || 'Échec de la sauvegarde'); }
              resolve(false);
            }
          },
        });
      } catch {
        try { this.message.error('Échec de la sauvegarde'); } catch { this.showToast('Échec de la sauvegarde'); }
        resolve(false);
      }
    });
  }

  saveFlow() {
    try {
      if (this.currentFlowId) {
        this.catalog.saveFlow({ id: this.currentFlowId, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: { ui: { portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper } } } as any).subscribe({
          next: () => {
            try { this.message.success('Flow sauvegardé'); } catch { this.showToast('Flow sauvegardé'); }
            // Mettre à jour la référence serveur (checksum) pour refléter l’état sauvegardé
            this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
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
                nzOnOk: () => this.catalog.saveFlow({ id: this.currentFlowId!, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, nodes: this.nodes as any, edges: this.edges as any, meta: { ui: { portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper } } } as any, true).subscribe({ next: () => {
                  try { this.message.warning('Flow forcé et désactivé'); } catch { this.showToast('Flow forcé et désactivé'); }
              this.lastSavedChecksum = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
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
    if (!this.currentFlowEnabled) {
      try { this.message.error('Flow désactivé. Activez-le avant de lancer.'); } catch { this.showToast('Flow désactivé'); }
      return;
    }
    const snap = this.snapshot();
    // Always update the shared graph snapshot (used by the executions page)
    this.shared.setGraph({ nodes: snap.nodes, edges: snap.edges, id: this.currentFlowId || undefined, name: this.currentFlowName, description: this.currentFlowDesc });

    // Helper: detect Start Form node and schema from model.context/startFormSchema/template args
    const findStartForm = (): { nodeId: string; model: any; schema: any } | null => {
      try {
        const tyOf = (m: any) => String(m?.templateObj?.type || '').toLowerCase();
        const isStartLike = (m: any) => { const t = tyOf(m); return t === 'start' || t === 'start_form'; };
        const isStartForm = (m: any) => {
          try {
            const t = tyOf(m);
            if (t === 'start_form') return true;
            const tplId = String(m?.templateObj?.id || m?.template || '').toLowerCase();
            const tplName = String(m?.templateObj?.name || '').toLowerCase();
            return (tplId === 'start_form' || tplName === 'startform');
          } catch { return false; }
        };
        for (const n of (snap.nodes || [])) {
          const m = n?.data?.model; if (!m) continue;
          if (isStartForm(m)) {
            const ctx = m.context; const hasCtx = ctx && (ctx.fields || ctx.steps);
            const schema = hasCtx ? ctx : (m.startFormSchema || m.templateObj?.args || { title: 'Formulaire', fields: [] });
            return { nodeId: String(n.id), model: m, schema };
          }
        }
      } catch {}
      return null;
    };
    const startInfo = findStartForm();
    try { console.log('[builder][run] startInfo', startInfo); } catch {}
    // If flow starts with a Start Form, prompt with the same lightweight modal as Execution, then autostart
    if (startInfo) {
      if (this.skipStartFormPromptOnce) {
        // Skip the prompt once (we just collected values); reset flag and proceed to launch
        this.skipStartFormPromptOnce = false;
      } else {
        const openStartForm = () => {
          try {
            import('./start-form-modal.component').then(mod => {
              const ref = this.modal.create({ nzTitle: 'Remplir le formulaire de démarrage', nzContent: mod.StartFormModalComponent as any, nzFooter: null, nzWidth: 780 });
              const inst: any = ref.getContentComponent();
              try { inst.schema = startInfo.schema || { title: 'Formulaire', fields: [] }; inst.value = {}; } catch {}
              const sub = inst.submitted.subscribe((val: any) => {
                try { sub.unsubscribe(); } catch {}
                ref.close();
                try { this.setStartPayload(val || {}); } catch {}
                // On next call, continue without reopening the modal
                this.skipStartFormPromptOnce = true;
                this.runFlow();
              });
            });
          } catch {}
        };
        // Demander la sauvegarde avant d'ouvrir la dialog si backend actif
        if (environment.useBackend && this.currentFlowId && this.hasUnsavedChanges()) {
          this._saveIfNeededThen(() => openStartForm());
        } else {
          openStartForm();
        }
        return;
      }
    }

    // If backend is enabled, launch an ad-hoc run using the local (editor) graph without saving
    if (environment.useBackend && this.currentFlowId) {
      // Optional: ensure we have a start-like node to avoid ambiguous entrypoint
      if (!this.hasStartLikeNode()) {
        try { this.message.warning('Ajoutez un nœud de départ (Start) avant de lancer sur le backend'); } catch { this.showToast('Nœud Start requis pour lancer sur le backend'); }
        // Fallback: still allow local run to preview
        try { this.runner.run({ nodes: snap.nodes, edges: snap.edges }, this.builderMode, this.getStartPayload(), this.currentFlowId || 'adhoc'); } catch {}
        return;
      }
      const launch = () => {
        this.showExecBadges = true;
        const p = this.getStartPayload();
        this.runsApi.start(this.currentFlowId!, (p && (p as any).payload) ?? null).subscribe({
          next: (r: any) => {
            try { this.message.success('Exécution backend démarrée'); } catch { this.showToast('Exécution backend démarrée'); }
            try {
              const runId = r?.id || r?.data?.id || r?.runId;
              if (runId) {
                // Préselectionner l'exécution en cours dans "Exécutions récentes"
                try { this.recentRuns = [{ id: runId, status: 'running', startedAt: new Date().toISOString() }, ...(this.recentRuns || [])]; } catch {}
                // Ajoute ?run= dans l'URL sans relancer les chargements
                try {
                  const qp = this.route.snapshot.queryParamMap;
                  const q: any = { ...Object.fromEntries(qp.keys.map(k => [k, qp.get(k)]) as any), run: runId };
                  this.router.navigate([], { queryParams: q, replaceUrl: true });
                } catch {}
                this.openBackendStream(runId);
              }
            } catch {}
          },
          error: (e) => {
            const err = this.normalizeApiError(e);
            try { this.message.error(err?.message || 'Échec du démarrage backend'); } catch { this.showToast(err?.message || 'Échec du démarrage backend'); }
          }
        });
      };
      if (this.hasUnsavedChanges()) { this._saveIfNeededThen(launch); } else { launch(); }
      return;
    }

    // Local run fallback (dev playground)
    try { this.message.info(`Lancement local (${this.builderMode})…`); } catch { this.showToast(`Lancement local (${this.builderMode})…`); }
    try { this.showExecBadges = true; this.runner.run({ nodes: snap.nodes, edges: snap.edges }, this.builderMode, this.getStartPayload(), this.currentFlowId || 'adhoc'); } catch {}
  }

  private openBackendStream(runId: string) {
    // Reset per-run visual state
    this.backendRunId = runId;
    this.backendNodeStats = new Map();
    this.backendNodeAttempts = new Map();
    this.backendEdgesTaken.clear();
    this.backendLastNodeId = null;
    this.backendAttemptSeq = [];
    this.lastOverlayPairs = new Set();
    this.backendRunStatus = 'idle';
    // Reset dialog badge + logs for a fresh run
    this.testStatus = 'idle';
    this.testStartedAt = null;
    this.testDurationMs = null;
    this.advancedAttemptEvents = [];
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
      if (type === 'run.cancelled') {
        // Mark global run as done and update current running node badge as cancelled
        this.backendRunStatus = 'done';
        try {
          for (const [nid, arr] of this.backendNodeAttempts.entries()) {
            const last = arr[arr.length - 1];
            if (last && last.status === 'running') { last.status = 'cancelled'; this.updateNodeVisual(nid); }
          }
        } catch {}
        try { this.cdr.detectChanges(); } catch {}
        try { s.close(); } catch {}
        return;
      }
      if (type === 'run.status') {
        const st = ev?.run?.status || ev?.data?.status;
        const was = this.backendRunStatus;
        if (st === 'running') {
          if (was !== 'running') {
            this.backendNodeStats.clear();
            this.backendEdgesTaken.clear();
            this.lastOverlayPairs = new Set();
            this.backendLastNodeId = null; // legacy unused
            // Seed sequence with start node if identifiable to color first hop
            const startId = this.findStartNodeId();
            this.backendAttemptSeq = startId ? [startId] : [];
            this.applyBackendEdgeHighlights();
            this.refreshOverlayDiff('run.status:running');
            // Clear dialog I/O since a new run restarts attempts from zero
            if (this.advancedOpen) {
              this.advancedInjectedInput = null;
              this.advancedInjectedOutput = null;
              // Show centered spinners until the selected node actually starts
              this.previewLoading = true;
              this.outputLoading = true;
              this.advancedAttemptEvents = [];
              // Reset badge; will flip to running when node actually starts
              this.testStatus = 'idle';
              this.testStartedAt = null;
              this.testDurationMs = null;
            }
            try { this.cdr.detectChanges(); } catch {}
          }
          this.backendRunStatus = 'running';
        } else if (st === 'success' || st === 'error' || st === 'cancelled' || st === 'timed_out') {
          this.backendRunStatus = 'done';
          try { s.close(); } catch {}
          // Keep snapshot of attempts but stop further updates
          if (this.advancedOpen) {
            this.previewLoading = false; this.outputLoading = false;
            // Ensure dialog shows final I/O and latest attempt selection
            try {
              const nid = String(this.selectedModel?.id || '');
              if (nid) {
                this.recomputeAttemptExecOptionsFor(nid);
                this.recomputeExecCountAndOccIndex(nid);
                this.recomputeAttemptOptionsFor(nid);
                this.recomputeSelectedAttemptIdxForNode(nid);
                this.refreshDialogIOFromSelection();
              }
            } catch {}
          }
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
          // capture input/args/msg at start if provided
          if (ev.data) {
            if (ev.data.input !== undefined) at.input = ev.data.input;
            if (ev.data.argsPre !== undefined) at.argsPre = ev.data.argsPre;
            if (ev.data.argsPost !== undefined) at.argsPost = ev.data.argsPost;
            if (ev.data.msgIn !== undefined) at.msgIn = ev.data.msgIn;
          }
          // Append a normalized event for logs on this attempt
          try {
            at.events = Array.isArray(at.events) ? at.events : [];
            at.events.push({
              type: 'node.status',
              nodeId: nid,
              exec,
              status: st,
              createdAt: ev?.data?.createdAt || new Date().toISOString(),
              data: ev?.data || null,
            });
          } catch {}
          this.updateNodeVisual(nid);
          // Track path based on actual start sequence if no explicit edge.taken yet
          if (st === 'running') {
            if (this.selectedModel && String(this.selectedModel.id) === nid) {
              // Live update dialog input if open
              if (this.advancedOpen) {
                // Lock global exec selection if not set yet
                if (this.advancedSelectedExec == null && exec != null) this.advancedSelectedExec = Number(exec);
                // Only update I/O if matches selected exec
                if (exec == null || this.advancedSelectedExec == null || Number(exec) === Number(this.advancedSelectedExec)) {
                  this.advancedInjectedInput = (ev.data && (ev.data.msgIn ?? ev.data.input)) || this.advancedInjectedInput;
                  this.previewLoading = false;
                  try { this.advancedOccurByNode.set(nid, Math.max(0, (this.advancedOccurByNode.get(nid) ?? 0))); } catch {}
                }
                // Recompute selector data for current node
                this.recomputeAttemptExecOptionsFor(nid);
                this.recomputeExecCountAndOccIndex(nid);
                this.recomputeAttemptOptionsFor(nid);
                this.recomputeSelectedAttemptIdxForNode(nid);
              }
              this.outputLoading = true;
              // Update badge to reflect global execution for this node
              this.testStatus = 'running';
              this.testStartedAt = Date.now();
              this.testDurationMs = null;
              // Keep dialog logs list in sync
              try { this.advancedAttemptEvents = (at.events || []).slice().sort((a,b) => new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime()); } catch { this.advancedAttemptEvents = (at.events || []).slice(); }
            }
            const prev = this.backendAttemptSeq.length ? this.backendAttemptSeq[this.backendAttemptSeq.length - 1] : null;
            this.backendAttemptSeq.push(nid);
            if (prev && prev !== nid) {
              this.backendEdgesTaken.add(`${prev}->${nid}`);
              this.applyBackendEdgeHighlights();
              this.refreshOverlayDiff('node.status:running');
            }
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
          this.refreshOverlayDiff('edge.taken');
        }
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      if (type === 'node.result') {
        const nid = String(ev.nodeId || '');
        if (nid) {
          const exec = (ev as any)?.exec ?? ev?.data?.exec;
          const result = (ev?.data?.result ?? (ev as any)?.result) as any;
          const explicitStatus = String((ev as any)?.data?.status || (ev as any)?.status || '').toLowerCase();
          const nextStatus = explicitStatus === 'error'
            ? 'error'
            : (explicitStatus === 'success'
              ? 'success'
              : (result && typeof result === 'object' && (result.ok === false || result.error != null)) ? 'error' : 'success');
          // Update per-node attempt I/O and status for this exec
          let arr = this.backendNodeAttempts.get(nid) || [];
          let at = arr.find(a => a.exec === exec);
          if (!at) { at = { exec }; arr = [...arr, at]; this.backendNodeAttempts.set(nid, arr); }
          at.status = nextStatus;
          at.input = ev.data?.input ?? at.input;
          at.argsPre = ev.data?.argsPre ?? at.argsPre;
          at.argsPost = ev.data?.argsPost ?? at.argsPost;
          at.result = (ev.result ?? ev.data?.result) ?? at.result;
          at.msgIn = ev.data?.msgIn ?? at.msgIn;
          at.msgOut = ev.data?.msgOut ?? at.msgOut;
          at.durationMs = ev.data?.durationMs ?? at.durationMs;
          at.startedAt = ev.data?.startedAt ?? at.startedAt;
          at.finishedAt = ev.data?.finishedAt ?? at.finishedAt;
          // If duration missing but timestamps provided, compute it
          try {
            if ((at.durationMs == null) && at.startedAt && at.finishedAt) {
              const d = Date.parse(at.finishedAt as any) - Date.parse(at.startedAt as any);
              if (Number.isFinite(d)) at.durationMs = Math.max(0, d);
            }
          } catch {}
          // Append a normalized event for logs on this attempt
          try {
            at.events = Array.isArray(at.events) ? at.events : [];
            at.events.push({
              type: 'node.result',
              nodeId: nid,
              exec,
              status: nextStatus,
              createdAt: ev?.data?.finishedAt || new Date().toISOString(),
              data: { result: ev?.result ?? ev?.data?.result, msgOut: ev?.data?.msgOut, durationMs: ev?.data?.durationMs }
            });
          } catch {}
          // Update quick stats (count is attempts length)
          const cur = this.backendNodeStats.get(nid) || { count: 0 } as any;
          cur.count = (this.backendNodeAttempts.get(nid)?.length || 0);
          cur.lastStatus = nextStatus;
          this.backendNodeStats.set(nid, cur);
          this.updateNodeVisual(nid);
          if (this.selectedModel && String(this.selectedModel.id) === nid) {
            if (this.advancedOpen) {
              // Only update I/O if matches selected exec
              if (exec == null || this.advancedSelectedExec == null || Number(exec) === Number(this.advancedSelectedExec)) {
                this.advancedInjectedOutput = ev.data?.msgOut ?? ev.data?.result ?? (ev as any)?.result ?? this.advancedInjectedOutput;
                this.outputLoading = false;
                // Update dialog logs list
                try { this.advancedAttemptEvents = (at.events || []).slice().sort((a,b) => new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime()); } catch { this.advancedAttemptEvents = (at.events || []).slice(); }
              }
              // Recompute selector data for current node
              this.recomputeAttemptExecOptionsFor(nid);
              this.recomputeExecCountAndOccIndex(nid);
              this.recomputeAttemptOptionsFor(nid);
              this.recomputeSelectedAttemptIdxForNode(nid);
              this.refreshDialogIOFromSelection();
              // Update badge with duration if available
              const dur = Number(ev?.data?.durationMs);
              // Prefer attempt timestamps for badge
              try { this.testStartedAt = at?.startedAt ? Date.parse(at.startedAt as any) : this.testStartedAt; } catch {}
              this.testDurationMs = Number.isFinite(dur) ? dur : (at?.durationMs != null ? Number(at.durationMs) : (this.testStartedAt ? (Date.now() - this.testStartedAt) : null));
              this.testStatus = nextStatus as any;
            }
            // Regardless of exec filter, the node finished; ensure loader is off
            this.outputLoading = false;
          }
          // Edge path was updated on node.status running; nothing else to do here
        }
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      // Catch-all: append other node-scoped events to attempt logs in real-time
      try {
        const nid = String((ev as any)?.nodeId || (ev as any)?.data?.nodeId || '');
        const ex = (ev as any)?.exec ?? (ev as any)?.data?.exec;
        if (nid && ex != null) {
          const arr = this.backendNodeAttempts.get(nid) || [];
          const at = arr.find(a => a.exec === ex);
          if (at) {
            at.events = Array.isArray(at.events) ? at.events : [];
            at.events.push({
              type: (ev as any)?.type || 'event',
              nodeId: nid,
              exec: ex,
              status: (ev as any)?.data?.status,
              createdAt: (ev as any)?.createdAt || (ev as any)?.data?.createdAt || new Date().toISOString(),
              data: (ev as any)?.data || null,
            });
            if (this.selectedModel && String(this.selectedModel.id) === nid && this.advancedOpen) {
              // Only update if matches selected exec
              if (this.advancedSelectedExec == null || Number(ex) === Number(this.advancedSelectedExec)) {
                try { this.advancedAttemptEvents = (at.events || []).slice().sort((a,b) => new Date(a.createdAt||0).getTime() - new Date(b.createdAt||0).getTime()); } catch { this.advancedAttemptEvents = (at.events || []).slice(); }
                try { this.cdr.detectChanges(); } catch {}
              }
            }
          }
        }
      } catch {}
      // No extra fallback here; overlay getter will use backendAttemptSeq if needed
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
      // Keep base edges intact (no blue stored); recompute errors only
      this.recomputeErrorPropagation();
    } catch {}
    try { this.cdr.detectChanges(); } catch {}
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
    this.openingRunId = runId;
    this.backendRunId = runId; // allow dialogs to read attempts even without SSE
    this.backendRunStatus = 'idle';
    this.showExecBadges = true;
    // Load attempts + events snapshot (for historic runs) and open SSE if still running
    this.runsApi.getWith(runId, ['attempts','events']).subscribe({
      next: (r: any) => {
        this.currentRunMeta = { id: runId, status: (r?.status || 'idle'), startedAt: (r?.startedAt || r?.createdAt || null), finishedAt: (r?.finishedAt || null) } as any;
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
          arr.push({ exec, status: a.status, startedAt: a.startedAt, finishedAt: a.finishedAt, durationMs: a.durationMs, input: a.input, argsPre: a.argsPre, argsPost: a.argsPost, result: a.result, msgIn: a.msgIn, msgOut: a.msgOut, events: [] });
          this.backendNodeAttempts.set(nid, arr);
          this.updateNodeVisual(nid);
        });
        // Prefer exact path from persisted edge.taken events; fallback to attempts order
        try {
          this.backendEdgesTaken.clear();
          const events = (r?.events || []) as any[];
          const taken = events?.filter(ev => (ev?.type || ev?.eventType) === 'edge.taken') || [];
          if (taken.length) {
            for (const ev of taken) {
              const sId = String(ev?.data?.sourceId || ev?.sourceId || '');
              const tId = String(ev?.data?.targetId || ev?.targetId || '');
              if (sId && tId && sId !== tId) this.backendEdgesTaken.add(`${sId}->${tId}`);
            }
          } else {
            for (let i = 1; i < attempts.length; i++) {
              const prev = String(attempts[i - 1]?.nodeId || '');
              const cur = String(attempts[i]?.nodeId || '');
              if (prev && cur && prev !== cur) this.backendEdgesTaken.add(`${prev}->${cur}`);
            }
          }
          // Map events to attempt.events for Logs tab
          try {
            const evts = Array.isArray(events) ? events : [];
            for (const e of evts) {
              const t = (e?.type || e?.eventType || '').toString();
              const nid = (e?.nodeId || e?.data?.nodeId || '').toString();
              const ex = (e?.exec != null ? e.exec : (e?.data?.exec != null ? e.data.exec : null));
              if (!nid || ex == null) continue;
              const arr = this.backendNodeAttempts.get(nid) || [];
              const at = arr.find(a => a.exec === ex);
              if (!at) continue;
              at.events = Array.isArray(at.events) ? at.events : [];
              at.events.push({
                type: t || 'event',
                nodeId: nid,
                exec: ex,
                createdAt: e?.createdAt || e?.time || e?.timestamp || new Date().toISOString(),
                data: e?.data || null
              });
            }
          } catch {}
          this.applyBackendEdgeHighlights();
          this.refreshOverlayDiff('snapshot.load');
        } catch {}
        try { this.cdr.detectChanges(); } catch {}
        // Open live stream if still running
        const st = r?.status || 'success';
        if (st === 'running') this.openBackendStream(runId);
      },
      error: () => { this.openBackendStream(runId); }
    });
  }
  private fetchRuns(reset = false) {
    try {
      const fid = this.currentFlowId || '';
      if (!fid || this.runsLoading) return;
      if (reset) { this.runsPage = 1; this.recentRuns = []; this.runsHasMore = true; }
      this.runsLoading = true;
      this.runsApi.listByFlow(fid, { page: this.runsPage, limit: this.runsLimit, sort: '-startedAt' }).subscribe({
        next: (list) => this.zone.run(() => {
          const arr = Array.isArray(list) ? list : [];
          const mapped = arr.map(r => ({ id: (r as any).id, status: (r as any).status, startedAt: (r as any).startedAt, finishedAt: (r as any).finishedAt }));
          this.recentRuns = [...this.recentRuns, ...mapped];
          this.runsHasMore = arr.length >= this.runsLimit;
          if (arr.length >= this.runsLimit) this.runsPage += 1;
          this.runsLoading = false;
        }),
        error: () => this.zone.run(() => { this.runsLoading = false; })
      });
    } catch { this.runsLoading = false; }
  }
  onLoadMoreRuns() { this.fetchRuns(false); }
  // no search field per request
  stopLastRun() {
    try {
      // Prefer cancelling backend run if active
      if (this.backendRunId && this.backendRunStatus === 'running') {
        this.runsApi.cancel(this.backendRunId).subscribe({ next: () => {
          try { this.message.info('Arrêt demandé'); } catch { this.showToast('Arrêt demandé'); }
        }, error: () => {
          try { this.message.error("Échec de l'arrêt"); } catch { this.showToast("Échec de l'arrêt"); }
        } });
        return;
      }
    } catch {}
    if (this.lastRun) try { this.runner.cancel(this.lastRun.runId); } catch {}
  }


  private showToast(msg: string) {
    this.toastMsg = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 1800);
  }
  // Track whether pointer is over the canvas area to scope shortcuts
  canvasHot = false;
  shortcutsOpen = false;

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
    // When advanced editor modal is open, let browser/system shortcuts (copy/paste...) work normally
    if (this.advancedOpen) {
      if (ev.key === 'Escape') { ev.preventDefault(); this.closeAdvancedEditor(); }
      return;
    }
    const cmd = ev.metaKey || ev.ctrlKey;
    if (cmd) {
      const key = ev.key.toLowerCase();
      if (key === 'c') {
        if (this.hasSelection()) { ev.preventDefault(); this.copySelection(false); }
        return;
      }
      if (key === 'x') {
        if (this.hasSelection()) { ev.preventDefault(); this.copySelection(true); }
        return;
      }
      if (key === 'v') {
        ev.preventDefault(); this.pasteFromClipboard(); return;
      }
      if (key === 'z' && !ev.shiftKey) {
        ev.preventDefault();
        this.undo();
      } else if ((key === 'z' && ev.shiftKey) || key === 'y') {
        ev.preventDefault();
        this.redo();
      }
      return;
    }
    // Non-modifier shortcuts when canvas is hot/focused
    const k = ev.key.toLowerCase();
    if (this.canvasHot) {
      // Alignment shortcuts for multi-selection
      if ((this.selectionList?.length || 0) > 1) {
        if (k === 'h') { ev.preventDefault(); try { this.ctxAlignSelection('horizontal'); } catch {} return; }
        if (k === 'v') { ev.preventDefault(); try { this.ctxAlignSelection('vertical'); } catch {} return; }
      }
      if (k === 'p') {
        ev.preventDefault();
        try {
          if (this.isTabletOrBelow) { this.leftDrawer ? this.onLeftDrawerClose() : this.openMobilePanel('left'); }
          else { this.leftPanelOpen = !this.leftPanelOpen; }
        } catch {}
        return;
      }
      if (k === 'r') {
        ev.preventDefault();
        this.toggleAlignmentHelper();
        return;
      }
      if (k === 's') { ev.preventDefault(); this.saveFlow(); return; }
      if (k === 'd') { ev.preventDefault(); this.onClearRun(); return; }
    }
    if (ev.key === 'Escape') {
      if (this.advancedOpen) { ev.preventDefault(); this.closeAdvancedEditor(); return; }
    }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && (this.selection || (this.selectionList && this.selectionList.length))) {
      ev.preventDefault();
      if ((this.selectionList || []).length > 1) { this.onDeleteMany(); }
      else { this.deleteSelected(); }
    }
  }

  private hasSelection(): boolean {
    try { return !!(this.selection || (this.selectionList && this.selectionList.length)); } catch { return false; }
  }
  private selectionIds(): string[] {
    try {
      const list = Array.isArray(this.selectionList) && this.selectionList.length ? this.selectionList : (this.selection ? [this.selection] : []);
      return list.map(n => String(n?.id)).filter(Boolean);
    } catch { return []; }
  }
  private buildClipboardPayload(ids: string[]) {
    const idSet = new Set(ids);
    const nodes = (this.nodes || []).filter(n => idSet.has(String(n.id)));
    const edges = (this.edges || []).filter((e: any) => idSet.has(String(e.source)) && idSet.has(String(e.target)));
    // Normalize payload to be portable between flows
    const out = {
      kind: 'homeport.flow.selection',
      version: 1,
      createdAt: Date.now(),
      nodes: nodes.map(n => ({ id: String(n.id), point: { x: n.point?.x||0, y: n.point?.y||0 }, type: n.type, data: n.data })),
      edges: edges.map((e: any) => ({ id: String(e.id||''), source: String(e.source), target: String(e.target), sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
    } as any;
    return out;
  }
  private async writeClipboardText(text: string) {
    try { await navigator.clipboard.writeText(text); return true; } catch { try { localStorage.setItem('flow.clipboard', text); return true; } catch { return false; } }
  }
  private async readClipboardText(): Promise<string|null> {
    try { const t = await navigator.clipboard.readText(); if (t && t.trim()) return t; } catch {}
    try { const t = localStorage.getItem('flow.clipboard'); if (t && t.trim()) return t; } catch {}
    return null;
  }
  async copySelection(cut = false) {
    try {
      const ids = this.selectionIds(); if (!ids.length) return;
      const payload = this.buildClipboardPayload(ids);
      const ok = await this.writeClipboardText(JSON.stringify(payload));
      if (ok) {
        try { this.message.success(cut ? 'Sélection coupée' : 'Sélection copiée'); } catch { this.showToast(cut ? 'Coupé' : 'Copié'); }
        if (cut) {
          if (ids.length > 1) this.onDeleteMany(); else this.deleteSelected();
        }
      } else {
        try { this.message.error('Impossible de copier'); } catch { this.showToast('Copie impossible'); }
      }
    } catch {}
  }
  async pasteFromClipboard() {
    try {
      const text = await this.readClipboardText();
      if (!text) { try { this.message.warning('Presse-papiers vide'); } catch {} return; }
      let data: any = null; try { data = JSON.parse(text); } catch {}
      if (!data || data.kind !== 'homeport.flow.selection' || !Array.isArray(data.nodes)) { try { this.message.warning('Contenu presse-papiers non reconnu'); } catch {} return; }
      const srcNodes: any[] = data.nodes || [];
      const srcEdges: any[] = Array.isArray(data.edges) ? data.edges : [];
      // Compute offset: shift pasted selection by 60,60 or center if empty canvas
      const dx = 60, dy = 60;
      // Build id map and create nodes
      const idMap = new Map<string,string>();
      const usedCondIds = this.collectAllConditionHandleIds();
      const condHandleMap = new Map<string, Map<string,string>>();
      const newNodes: any[] = [];
      for (const n of srcNodes) {
        const tpl = n?.data?.model?.templateObj;
        if (this.isStartLike(tpl)) continue; // never paste start-like duplicates
        const newId = this.generateNodeId(tpl, n?.data?.model?.name || tpl?.name || tpl?.title);
        idMap.set(String(n.id), newId);
        const oldM = n?.data?.model || {};
        const m = JSON.parse(JSON.stringify(oldM || {}));
        m.id = newId;
        // Condition branch id remap
        try {
          const tt = m?.templateObj?.type;
          if (tt === 'condition') {
            const field = m?.templateObj?.output_array_field || 'items';
            const arr = (m?.context && Array.isArray(m.context[field])) ? m.context[field] : [];
            const oldArr = (oldM?.context && Array.isArray(oldM.context[field])) ? oldM.context[field] : [];
            const map = new Map<string,string>();
            for (const it of arr) {
              if (it && typeof it === 'object') {
                let cid = '';
                do { cid = 'cid_' + Math.random().toString(36).slice(2); } while (usedCondIds.has(cid));
                const idx = arr.indexOf(it);
                const old = String(oldArr?.[idx]?._id || ''); if (old) map.set(old, cid);
                it._id = cid; usedCondIds.add(cid);
              }
            }
            if (m?.context?.else && m.context.else._id) {
              let eid = '';
              do { eid = 'else_' + Math.random().toString(36).slice(2); } while (usedCondIds.has(eid));
              const oldElse = (oldM?.context?.else && oldM.context.else._id) ? String(oldM.context.else._id) : '';
              if (oldElse) map.set(oldElse, eid);
              m.context.else._id = eid; usedCondIds.add(eid);
            }
            condHandleMap.set(String(n.id), map);
          }
        } catch {}
        const p = n?.point || { x:0, y:0 };
        const vNode = { id: newId, point: { x: p.x + dx, y: p.y + dy }, type: n.type, data: { ...n.data, model: m } };
        newNodes.push(vNode);
      }
      if (newNodes.length) {
        this.nodes = [...this.nodes, ...newNodes];
        this.triggerSpawnForNodes(newNodes.map(n => String(n.id)));
      }
      // Edges
      const newEdges: any[] = [];
      for (const e of srcEdges) {
        const s = String(e.source||''); const t = String(e.target||'');
        const ns = idMap.get(s); const nt = idMap.get(t);
        if (!ns || !nt) continue;
        const ne = JSON.parse(JSON.stringify(e));
        ne.source = ns; ne.target = nt;
        const map = condHandleMap.get(s);
        if (map && ne.sourceHandle && map.get(String(ne.sourceHandle))) ne.sourceHandle = map.get(String(ne.sourceHandle));
        try { const sh = String(ne.sourceHandle||''); const th = String(ne.targetHandle||''); ne.id = `${ne.source}->${ne.target}:${sh}:${th}`; } catch {}
        newEdges.push(ne);
      }
      if (newEdges.length) this.edges = [...this.edges, ...newEdges];
      // Select pasted nodes and push history
      this.selectionList = newNodes; this.selection = newNodes[0] || null;
      try { this.cdr.detectChanges(); } catch {}
      try { this.selectIdsWithRetry(newNodes.map(n => n.id)); } catch {}
      this.pushState('paste.group');
      this.recomputeValidation();
      try { this.message.success(`Collé (${newNodes.length} nœuds)`); } catch { this.showToast('Collé'); }
    } catch {}
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
      const current = this.computeChecksum({ nodes: this.nodes, edges: this.edges, name: this.currentFlowName, desc: this.currentFlowDesc, status: this.currentFlowStatus, enabled: this.currentFlowEnabled, portOrientation: this.portOrientation, alignmentHelper: this.alignmentHelper, snapGrid: this.snapGrid });
      snap.currentChecksum = current;
      snap.serverChecksum = this.lastSavedChecksum;
    } catch {}
    return snap;
  }
  private updateSharedGraph() {
    try { this.shared.setGraph(this.snapshot() as any); } catch {}
  }
  private scheduleCenterIfRequested(centerActive: boolean, preservePanels = false) {
    try {
      if (!centerActive) return;
      const prev = { left: this.leftPanelOpen, right: this.rightPanelOpen };
      if (!preservePanels) {
        this.leftPanelOpen = false; this.rightPanelOpen = false;
        this.onLeftDrawerClose(); this.onRightDrawerClose();
        try { this.cdr.detectChanges(); } catch {}
      }
      setTimeout(() => {
        try { this.centerFlow(); } catch {}
        if (!preservePanels) { this.leftPanelOpen = prev.left; this.rightPanelOpen = prev.right; this.savePanelsState(); }
        try { this.cdr.detectChanges(); } catch {}
      }, 60);
    } catch {}
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

  // Invalid-connect overlay (ban) UX
  connectingEdge = false;
  private connectingSource: { nodeId: string; handleId: string } | null = null;
  banVisible = false;
  banX = 0;
  banY = 0;
  onConnectStartFrom(nodeId: string, handleId: string) {
    try { this.connectingEdge = true; this.connectingSource = { nodeId: String(nodeId), handleId: String(handleId) }; } catch {}
  }
  onConnectEnd() {
    try { this.connectingEdge = false; this.connectingSource = null; this.banVisible = false; } catch {}
  }
  onTargetEnter(ev: MouseEvent, isValid: boolean) {
    try { if (this.connectingEdge && !isValid) { this.banVisible = true; this.onTargetMove(ev, isValid); } } catch {}
  }
  onTargetMove(ev: MouseEvent, isValid: boolean) {
    try { if (this.connectingEdge && !isValid) { this.banX = ev.clientX + 12; this.banY = ev.clientY + 12; this.banVisible = true; } else { this.banVisible = false; } } catch {}
  }
  onTargetLeave() { try { this.banVisible = false; } catch {} }

  // Compute preview validity while dragging from a source handle
  canConnectPreview(targetNodeId: string, targetHandleId: string): boolean {
    try {
      if (!this.connectingEdge || !this.connectingSource) return false;
      const c: Connection = {
        source: this.connectingSource.nodeId,
        sourceHandle: this.connectingSource.handleId,
        target: String(targetNodeId),
        targetHandle: String(targetHandleId)
      } as any;
      return this.validateConnection(c);
    } catch { return false; }
  }

  // Change handlers from ngx-vflow
  private posDebounceTimer: any;
  private draggingNodes = new Set<string>();
  private pendingPositions: Record<string, { x: number; y: number }> = {};
  private zoomUpdateTimer: any;
  isSelected(id: any): boolean { try { const sid = String(id); return (this.selectionList || []).some(n => String(n?.id) === sid); } catch { return false; } }
  // Selection box UI state (viewport coords)
  selectionBoxStart: { x: number; y: number } | null = null;
  selectionBoxRect: { left: number; top: number; width: number; height: number } | null = null;
  // Canvas long-press to start marquee (mobile)
  private canvasLpTimer: any = null;
  private canvasLpStartX = 0;
  private canvasLpStartY = 0;
  private canvasLpCurX = 0;
  private canvasLpCurY = 0;
  private canvasLpFired = false;
  private readonly canvasLpDelay = 520; // ms
  private readonly canvasLpMoveThresh = 12; // px for long-press stability
  private readonly canvasDtMoveThresh = 24; // px tolerance between double-taps
  private canvasLastTapAt = 0;
  private canvasLastTapX = 0;
  private canvasLastTapY = 0;
  private readonly canvasDtThresh = 350; // ms
  private canvasTapCandidate = false;
  private marqueePrimed = false; // double-tap activated marquee awaiting drag
  private isEventOnNode(ev: Event): boolean {
    try {
      const target = ev.target as HTMLElement | null;
      if (!target) return false;
      if (target.closest && target.closest('.node-card')) return true;
      const anyEv: any = ev as any;
      const path: any[] = (anyEv.composedPath && anyEv.composedPath()) || [];
      return path.some(el => el && el.classList && el.classList.contains && el.classList.contains('node-card'));
    } catch { return false; }
  }
  private isEventOnUiControls(ev: Event): boolean {
    try {
      const anyEv: any = ev as any;
      const path: any[] = (anyEv.composedPath && anyEv.composedPath()) || [];
      const classes = ['panel-toggle-fab','bottom-bar','left-bar','ctx-menu','ai-chat-fab','ai-chat-popover','ant-drawer','ios-safe-drawer','right-panel','left-panel'];
      for (const el of path) {
        const he = el as HTMLElement;
        if (!he || !he.classList) continue;
        for (const cls of classes) { if (he.classList.contains(cls)) return true; }
        const tag = he.tagName?.toUpperCase?.() || '';
        if (['BUTTON','INPUT','SELECT','TEXTAREA','LABEL'].includes(tag)) { if (!he.closest('.canvas-host')) return true; }
      }
      return false;
    } catch { return false; }
  }
  // Press explosion feedback
  explosionVisible = false;
  explosionX = 0;
  explosionY = 0;
  private explosionTimer: any = null;
  private triggerExplosion(x: number, y: number) {
    try {
      this.explosionX = x; this.explosionY = y; this.explosionVisible = false;
      // next tick to restart animation
      setTimeout(() => {
        this.explosionVisible = true;
        try { this.cdr.detectChanges(); } catch {}
        if (this.explosionTimer) clearTimeout(this.explosionTimer);
        this.explosionTimer = setTimeout(() => { this.explosionVisible = false; try { this.cdr.detectChanges(); } catch {} }, 600);
      }, 0);
    } catch {}
  }

  // Global capture listeners to beat d3-zoom
  private canvasGlobalDown?: (ev: PointerEvent) => void;
  private canvasGlobalMove?: (ev: PointerEvent) => void;
  private canvasGlobalUp?: (ev: PointerEvent) => void;
  private globalTouchEndDetect?: (ev: TouchEvent) => void;
  private isCoarsePointer(): boolean {
    try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator as any)?.maxTouchPoints > 0; } catch { return false; }
  }
  // Force vflow to reflect our app-managed selection (so multi-drag works and emits .many)
  private setVflowSelectedIds(ids: string[]) {
    try {
      const flowAny: any = this.flow as any;
      const nodeModels = flowAny?.nodeModels?.();
      if (!Array.isArray(nodeModels)) return;
      const want = new Set((ids || []).map(id => String(id)));
      for (const m of nodeModels) {
        try {
          const id = String(m?.rawNode?.id ?? '');
          const sel = want.has(id);
          if (m?.selected && typeof m.selected.set === 'function') m.selected.set(sel);
        } catch {}
      }
    } catch {}
  }
  // Ensure Vflow reflects selection even if view updates are pending
  private selectIdsWithRetry(ids: string[], attempts = 4, delay = 50) {
    try { this.setVflowSelectedIds(ids); } catch {}
    let left = Math.max(0, attempts - 1);
    const tick = () => {
      try { this.setVflowSelectedIds(ids); } catch {}
      if (left-- > 0) setTimeout(tick, delay);
    };
    setTimeout(tick, delay);
  }
  toggleMarqueeMode() {
    try {
      this.marqueeMode = !this.marqueeMode;
      // Clear any pending long-press timer/state when toggling
      if (this.canvasLpTimer) { clearTimeout(this.canvasLpTimer); this.canvasLpTimer = null; }
      this.canvasLpFired = false;
      this.selectionBoxStart = null;
      this.selectionBoxRect = null;
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }
  
  onNodePositionChange(change: any) {
    if (this.isIgnoring()) { return; }
    const id = change?.id;
    const pt = change?.to?.point || change?.point || change?.to;
    if (!id || !pt) { return; }
    // Cache the last known point; do not mutate nodes during drag
    this.pendingPositions[String(id)] = { x: pt.x, y: pt.y };
    // Mark drag in progress; final apply happens on pointerup/cancel
    this.draggingNodes.add(String(id));
    // debug logs removed
  }

  // Many nodes moved at once (multi-select drag, helper alignment moves)
  onNodesPositionMany(changes: any[]) {
    if (this.isIgnoring()) { return; }
    if (!Array.isArray(changes) || !changes.length) return;
    for (const c of changes) {
      try {
        const id = String(c?.id || '');
        const pt = c?.to?.point || c?.point || c?.to;
        if (!id || !pt) continue;
        this.pendingPositions[id] = { x: pt.x, y: pt.y };
        this.draggingNodes.add(id);
      } catch {}
    }
    // debug logs removed
  }

  onWheel(_ev: WheelEvent) {
    try { if (this.zoomUpdateTimer) clearTimeout(this.zoomUpdateTimer); } catch { }
    this.zoomUpdateTimer = setTimeout(() => this.zone.run(() => this.updateZoomDisplay()), 80);
  }

  // Right-click drag selection box on canvas (outside nodes)
  onCanvasMouseDown(ev: MouseEvent) {
    try {
      if (this.ctxMenuVisible) return;
      if (this.isEventOnUiControls(ev)) return;
      // When explicit marquee mode is enabled, start immediately regardless of modifier/right button
      if (this.marqueeMode && !this.isEventOnNode(ev)) {
        ev.preventDefault(); ev.stopPropagation();
        this.selectionBoxStart = { x: ev.clientX, y: ev.clientY };
        this.selectionBoxRect = { left: ev.clientX, top: ev.clientY, width: 0, height: 0 };
        try { this.cdr.detectChanges(); } catch {}
        return;
      }
      // Only start marquee via mouse on desktop (ignore touch)
      const anyEv: any = ev as any; if (anyEv?.pointerType && anyEv.pointerType !== 'mouse') return;
      const ctrl = !!ev.ctrlKey;
      const isRight = ev.button === 2;
      if (!ctrl && !isRight) return;
      const target = ev.target as HTMLElement;
      if (!ctrl && target && target.closest && target.closest('.node-card')) return;
      ev.preventDefault(); ev.stopPropagation();
      this.selectionBoxStart = { x: ev.clientX, y: ev.clientY };
      this.selectionBoxRect = { left: ev.clientX, top: ev.clientY, width: 0, height: 0 };
    } catch {}
  }
  onCanvasMouseMove(ev: MouseEvent) {
    try {
      if (this.ctxMenuVisible) return;
      if (this.isEventOnUiControls(ev)) return;
      if (!this.selectionBoxStart) return;
      ev.preventDefault(); ev.stopPropagation();
      const sx = this.selectionBoxStart.x, sy = this.selectionBoxStart.y;
      const cx = ev.clientX, cy = ev.clientY;
      const left = Math.min(sx, cx), top = Math.min(sy, cy);
      const width = Math.abs(cx - sx), height = Math.abs(cy - sy);
      this.selectionBoxRect = { left, top, width, height };
      // Live selection for the local path as well
      try {
        if (width >= 2 && height >= 2) {
          const tl = this.flow?.documentPointToFlowPoint?.({ x: left, y: top });
          const br = this.flow?.documentPointToFlowPoint?.({ x: left + width, y: top + height });
          if (tl && br) {
            const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
            const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
            const models: any[] = this.flow?.nodeModels?.() || [];
            const ids: string[] = [];
            for (const m of models) {
              try {
                const gp = m?.globalPoint?.();
                const sz = m?.size?.();
                const id = String(m?.rawNode?.id ?? '');
                if (!gp || !sz || !id) continue;
                const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
                const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
                if (overlap) ids.push(id);
              } catch {}
            }
            const idsSet = new Set(ids);
            this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
            this.selection = this.selectionList[0] || null;
            try { this.setVflowSelectedIds(ids); } catch {}
          }
        }
      } catch {}
    } catch {}
  }
  onCanvasMouseUp(ev: MouseEvent) {
    try {
      if (this.ctxMenuVisible) return;
      if (this.isEventOnUiControls(ev)) return;
      if (!this.selectionBoxStart) return;
      ev.preventDefault(); ev.stopPropagation();
      const rect = this.selectionBoxRect;
      this.selectionBoxStart = null;
      this.selectionBoxRect = null;
      this.marqueePrimed = false;
      if (!rect || rect.width < 2 || rect.height < 2) { try { this.cdr.detectChanges(); } catch {}; return; }
      const tl = this.flow?.documentPointToFlowPoint?.({ x: rect.left, y: rect.top });
      const br = this.flow?.documentPointToFlowPoint?.({ x: rect.left + rect.width, y: rect.top + rect.height });
      if (!tl || !br) { try { this.cdr.detectChanges(); } catch {}; return; }
      const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
      const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
      const models: any[] = this.flow?.nodeModels?.() || [];
      const ids: string[] = [];
      for (const m of models) {
        try {
          const gp = m?.globalPoint?.();
          const sz = m?.size?.();
          const id = String(m?.rawNode?.id ?? '');
          if (!gp || !sz || !id) continue;
          const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
          const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
          if (overlap) ids.push(id);
        } catch {}
      }
      const idsSet = new Set(ids);
      this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
      this.selection = this.selectionList[0] || null;
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      try { this.setVflowSelectedIds(ids); } catch {}
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  // Use native contextmenu from long-press (mobile) to start marquee on canvas only
  onCanvasContextMenu(ev: MouseEvent) {
    try {
      this.dbg('onCanvasContextMenu', ev);
      // Ignore if a UI control or a node
      if (this.isEventOnUiControls(ev)) return;
      if (this.isEventOnNode(ev)) return;
      // Prefer mobile/coarse pointers; on desktop, right-click drag is handled elsewhere
      if (!this.isCoarsePointer()) return;
      // Only act when explicit marquee mode is enabled
      if (!this.marqueeMode) return;
      ev.preventDefault(); ev.stopPropagation();
      // Start marquee from press point and mark as fired so touchmove extends it
      const x = (ev as MouseEvent).clientX, y = (ev as MouseEvent).clientY;
      this.selectionBoxStart = { x, y };
      this.selectionBoxRect = { left: x, top: y, width: 0, height: 0 };
      this.canvasLpFired = true;
      this.triggerExplosion(x, y);
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  // Mobile: long-press on canvas to emulate right-click marquee (or explicit toggle marqueeMode)
  onCanvasTouchStart(ev: TouchEvent) {
    try {
      this.dbg('onCanvasTouchStart', ev);
      if (this.ctxMenuVisible) return;
      if (this.isEventOnUiControls(ev)) return;
      if (!ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      // Ignore touches starting inside a node to keep node long-press behavior
      if (this.isEventOnNode(ev)) return;
      // If marquee mode explicitly enabled, start immediately (mobile/tablet)
      if (this.marqueeMode && this.isCoarsePointer()) {
        ev.preventDefault(); ev.stopPropagation();
        this.canvasLpStartX = this.canvasLpCurX = t.clientX; this.canvasLpStartY = this.canvasLpCurY = t.clientY;
        this.selectionBoxStart = { x: this.canvasLpStartX, y: this.canvasLpStartY };
        this.selectionBoxRect = { left: this.canvasLpStartX, top: this.canvasLpStartY, width: 0, height: 0 };
        this.canvasLpFired = true;
        this.triggerExplosion(this.canvasLpStartX, this.canvasLpStartY);
        return;
      }
      this.canvasLpStartX = this.canvasLpCurX = t.clientX; this.canvasLpStartY = this.canvasLpCurY = t.clientY;
      this.canvasLpFired = false;
      this.canvasTapCandidate = false;
      if (this.canvasLpTimer) clearTimeout(this.canvasLpTimer);
      this.canvasLpTimer = setTimeout(() => {
        const dx = Math.abs(this.canvasLpCurX - this.canvasLpStartX);
        const dy = Math.abs(this.canvasLpCurY - this.canvasLpStartY);
        if (dx <= this.canvasLpMoveThresh && dy <= this.canvasLpMoveThresh) {
          // Start marquee selection like right-click drag
          this.selectionBoxStart = { x: this.canvasLpStartX, y: this.canvasLpStartY };
          this.selectionBoxRect = { left: this.canvasLpStartX, top: this.canvasLpStartY, width: 0, height: 0 };
          this.canvasLpFired = true;
          this.triggerExplosion(this.canvasLpStartX, this.canvasLpStartY);
        }
      }, this.canvasLpDelay);
    } catch {}
  }
  onCanvasTouchMove(ev: TouchEvent) {
    try {
      this.dbg('onCanvasTouchMove', ev);
      if (this.ctxMenuVisible) return;
      if (!ev.touches || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      this.canvasLpCurX = t.clientX; this.canvasLpCurY = t.clientY;
      const dx = Math.abs(this.canvasLpCurX - this.canvasLpStartX);
      const dy = Math.abs(this.canvasLpCurY - this.canvasLpStartY);
      if (!this.canvasLpFired) {
        if (dx > this.canvasLpMoveThresh || dy > this.canvasLpMoveThresh) { if (this.canvasLpTimer) { clearTimeout(this.canvasLpTimer); this.canvasLpTimer = null; } }
        return;
      }
      ev.preventDefault(); ev.stopPropagation();
      const sx = this.selectionBoxStart?.x ?? this.canvasLpStartX;
      const sy = this.selectionBoxStart?.y ?? this.canvasLpStartY;
      const cx = this.canvasLpCurX, cy = this.canvasLpCurY;
      const left = Math.min(sx, cx), top = Math.min(sy, cy);
      const width = Math.abs(cx - sx), height = Math.abs(cy - sy);
      this.selectionBoxRect = { left, top, width, height };
      // Live selection while dragging
      try {
        if (width >= 2 && height >= 2) {
          const tl = this.flow?.documentPointToFlowPoint?.({ x: left, y: top });
          const br = this.flow?.documentPointToFlowPoint?.({ x: left + width, y: top + height });
          if (tl && br) {
            const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
            const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
            const models: any[] = this.flow?.nodeModels?.() || [];
            const ids: string[] = [];
            for (const m of models) {
              try {
                const gp = m?.globalPoint?.();
                const sz = m?.size?.();
                const id = String(m?.rawNode?.id ?? '');
                if (!gp || !sz || !id) continue;
                const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
                const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
                if (overlap) ids.push(id);
              } catch {}
            }
            const idsSet = new Set(ids);
            this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
            this.selection = this.selectionList[0] || null;
            try { this.setVflowSelectedIds(ids); } catch {}
          }
        }
      } catch {}
    } catch {}
  }
  onCanvasTouchEnd(ev: TouchEvent) {
    try {
      this.dbg('onCanvasTouchEnd', ev);
      if (this.ctxMenuVisible) return;
      const wasFired = this.canvasLpFired;
      if (this.canvasLpTimer) { clearTimeout(this.canvasLpTimer); this.canvasLpTimer = null; }
      if (!wasFired) { this.canvasLpFired = false; this.canvasTapCandidate = false; return; }
      ev.preventDefault(); ev.stopPropagation();
      const rect = this.selectionBoxRect;
      this.canvasLpFired = false;
      // No double-tap mode: finalize only if we have a real rect
      this.canvasTapCandidate = false;
      this.selectionBoxStart = null;
      this.selectionBoxRect = null;
      if (!rect || rect.width < 2 || rect.height < 2) { try { this.cdr.detectChanges(); } catch {}; return; }
      const tl = this.flow?.documentPointToFlowPoint?.({ x: rect.left, y: rect.top });
      const br = this.flow?.documentPointToFlowPoint?.({ x: rect.left + rect.width, y: rect.top + rect.height });
      if (!tl || !br) { try { this.cdr.detectChanges(); } catch {}; return; }
      const minx = Math.min((tl as any).x, (br as any).x), maxx = Math.max((tl as any).x, (br as any).x);
      const miny = Math.min((tl as any).y, (br as any).y), maxy = Math.max((tl as any).y, (br as any).y);
      const models: any[] = this.flow?.nodeModels?.() || [];
      const ids: string[] = [];
      for (const m of models) {
        try {
          const gp = m?.globalPoint?.();
          const sz = m?.size?.();
          const id = String(m?.rawNode?.id ?? '');
          if (!gp || !sz || !id) continue;
          const nx1 = gp.x, ny1 = gp.y, nx2 = gp.x + Number(sz.width || 0), ny2 = gp.y + Number(sz.height || 0);
          const overlap = !(nx2 < minx || nx1 > maxx || ny2 < miny || ny1 > maxy);
          if (overlap) ids.push(id);
        } catch {}
      }
      const idsSet = new Set(ids);
      this.selectionList = (this.nodes || []).filter(n => idsSet.has(String(n.id)));
      this.selection = this.selectionList[0] || null;
      try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
      try { this.setVflowSelectedIds(ids); } catch {}
      try { this.cdr.detectChanges(); } catch {}
    } catch {}
  }

  // Desktop-style dblclick on canvas to start marquee (helps some Android browsers too)
  onCanvasDblClick(ev: MouseEvent) {
    try {
      this.dbg('onCanvasDblClick', ev);
      // Only if the dblclick occurred outside any node
      if (this.ctxMenuVisible) return;
      // Also bail if event path hits UI controls
      if (this.isEventOnUiControls(ev)) return;
      if (this.isEventOnNode(ev)) return;
      // On iPad/Safari dblclick exists: use it to toggle marquee mode and start selection
      this.marqueeMode = true;
      const x = ev.clientX, y = ev.clientY;
      this.selectionBoxStart = { x, y };
      this.selectionBoxRect = { left: x, top: y, width: 0, height: 0 };
      ev.preventDefault(); ev.stopPropagation();
    } catch {}
  }

  // Document-level: improve double-tap detection on mobile browsers
  @HostListener('document:touchend', ['$event'])
  onDocumentTouchEnd(ev: TouchEvent) {
    try {
      this.dbg('onDocumentTouchEnd', ev);
      if (this.ctxMenuVisible) return;
      const t = (ev.changedTouches && ev.changedTouches[0]) || null;
      if (!t) return;
      const x = t.clientX, y = t.clientY;
      // Only consider taps inside the canvas host bounds
      const host = this.flowHost?.nativeElement as HTMLElement | undefined;
      if (!host) return;
      const r = host.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      // Ignore if tap ended on a node
      if (this.isEventOnNode(ev)) return;
      const now = Date.now();
      // Double-tap mode disabled
    } catch {}
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onPointerUp() {
    if (this.isIgnoring()) return;
    if (!this.draggingNodes.size) return;
    const ids = Array.from(this.draggingNodes);
    // Delay a bit so Vflow can finalize helper adjustments before we read positions
    setTimeout(() => {
      const updated: Record<string, { x: number; y: number }> = {};
      for (const id of ids) {
        try {
          const node = this.flow?.getNode?.(id) || (isFinite(Number(id)) ? this.flow?.getNode?.(Number(id) as any) : null);
          if (node && node.point && typeof node.point.x === 'number' && typeof node.point.y === 'number') {
            updated[id] = { x: node.point.x, y: node.point.y };
          }
        } catch {}
      }
      // Fallback to pending cache for any id we couldn't read from Vflow
      for (const id of ids) {
        
        if (/* !updated[id] && */ this.pendingPositions[id]) {

          updated[id] = { ...this.pendingPositions[id] };
      
        }
        else {
          // debug logs removed
        }
      }
      // Apply only if there is an actual change to limit re-renders that may block clicks
      let changed = false;
      const next = this.nodes.map(n => {
        const u = updated[n.id];
        if (!u) return n;
        const cx = Number(n?.point?.x ?? NaN);
        const cy = Number(n?.point?.y ?? NaN);
        if (!isFinite(cx) || !isFinite(cy) || u.x !== cx || u.y !== cy) {
          changed = true;
          return { ...n, point: { x: u.x, y: u.y } };
        }
        return n;
      });
      if (changed) {
        this.nodes = next;
        try { this.cdr.detectChanges(); } catch {}
      }
      this.draggingNodes.clear();
      this.pendingPositions = {} as any;
      const reason = ids.length > 1 ? 'nodes.position.final' : 'node.position.final';
      this.pushState(reason);
      this.suppressNodesRemovedUntil = Date.now() + 400;
    }, 240);
  }

  

  onNodesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      if (Date.now() < (this.suppressGraphEventsUntil || 0)) { this.log('nodes.removed.suppressed', { until: this.suppressGraphEventsUntil }); return; }
      if (Date.now() < (this.suppressNodesRemovedUntil || 0)) { this.log('nodes.removed.suppressed.window', { until: this.suppressNodesRemovedUntil }); return; }
      const ids = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (Date.now() < this.suppressNodesRemovedUntil) { this.log('nodes.removed.ignored.window', { until: this.suppressNodesRemovedUntil }); return; }
      if (!ids.size) return;
      this.log('nodes.removed', { ids: Array.from(ids) });
      this.scheduleRemove(ids, 'nodes.removed');
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
      const now = Date.now();
      this.suppressGraphEventsUntil = now + 800;
      this.suppressNodesRemovedUntil = now + 1200;
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
      const now = Date.now();
      this.suppressGraphEventsUntil = now + 600;
      this.suppressNodesRemovedUntil = now + 900;
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
      const uiIndex = Math.max(0, Number(index) || 0);
      const origIndex = Math.max(0, (this.history.pastCount() - 1) - uiIndex);
      const snap = this.history.getPastAt(origIndex);
      if (!snap) return;
      this.nodes = snap.nodes; this.edges = snap.edges as any;
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
      try { this.history.pushRestore(this.snapshot(), 'restore'); } catch { }
      try { this.updateTimelineCaches(); } catch { }
      try {
        if (!loadedMsg) loadedMsg = uiIndex > 0 ? `Snapshot chargé (undo ×${uiIndex})` : 'Snapshot courant';
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
      const uiIndex = Math.max(0, Number(index) || 0);
      const snap = this.history.getFutureAt(uiIndex);
      if (!snap) return;
      this.nodes = snap.nodes; this.edges = snap.edges as any;
      this.recomputeErrorPropagation();
      try { this.cdr.detectChanges(); } catch { }
      try { this.history.pushRestore(this.snapshot(), 'restore'); } catch { }
      try { this.updateTimelineCaches(); } catch { }
      try {
        if (!loadedMsg) loadedMsg = `Snapshot chargé (redo ×${uiIndex + 1})`;
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
  // v2 typing — validate connections by handle types
  private getHandleType(nodeId: string, handleId: string, direction: 'source'|'target'): string | null {
    try {
      const n = this.nodes.find((nn: any) => String(nn.id) === String(nodeId));
      const tpl = (n?.data?.model?.templateObj) || (n?.data?.model) || {};
      const arr = direction === 'source' ? (tpl.outputHandles || []) : (tpl.inputHandles || []);
      const h = (arr as any[]).find((hh: any) => String(hh?.id) === String(handleId));
      // Fallbacks: default handles when none are declared in template
      if (!h) {
        // Default source handle (e.g., start/out): assume any
        if (direction === 'source') return 'any';
        // Default target handle 'in' when no inputHandles defined
        if (direction === 'target' && String(handleId) === 'in') return 'any';
      }
      return h?.type || 'any';
    } catch { return null; }
  }
  private getHandleDef(nodeId: string, handleId: string, direction: 'source'|'target'): any | null {
    try {
      const n = this.nodes.find((nn: any) => String(nn.id) === String(nodeId));
      const tpl = (n?.data?.model?.templateObj) || (n?.data?.model) || {};
      const arr = direction === 'source' ? (tpl.outputHandles || []) : (tpl.inputHandles || []);
      const h = (arr as any[]).find((hh: any) => String(hh?.id) === String(handleId));
      return h || null;
    } catch { return null; }
  }
  private validateConnection(c: Connection): boolean {
    try {
      const sourceId = String(c.source);
      const targetId = String(c.target);
      const sourceHandle = String(c.sourceHandle || '');
      const targetHandle = String(c.targetHandle || '');
      if (!sourceId || !targetId) return false;

      const sType = this.getHandleType(sourceId, sourceHandle, 'source') || 'any';

      // Resolve target template and kind
      const tNode = this.nodes.find((nn: any) => String(nn.id) === targetId);
      const tpl = (tNode?.data?.model?.templateObj) || (tNode?.data?.model) || {};
      const nodeKind = String(tpl?.type || tpl?.nodeKind || '').toLowerCase();

      // Triggers: never accept inputs (start / event / start_form / endpoint)
      if (nodeKind === 'start' || nodeKind === 'start_form' || nodeKind === 'event' || nodeKind === 'endpoint') return false;

      // Accepts list on input handle (primary path)
      let accepts: string[] = [];
      const ih = (tpl.inputHandles || []).find((hh: any) => String(hh?.id) === targetHandle);
      if (ih && Array.isArray((ih as any)?.accepts)) accepts = (ih as any).accepts;

      // If no explicit input accepts, check linkedHandles for a match
      if (!accepts.length) {
        const links = Array.isArray((tpl as any).linkedHandles) ? (tpl as any).linkedHandles : [];
        const lh = links.find((hh:any) => String(hh?.id) === targetHandle);
        if (lh && Array.isArray(lh.accepts)) accepts = lh.accepts;
      }

      // Default target 'in' with no explicit inputHandles: treat as accepts:any
      if (!accepts.length && targetHandle === 'in' && !(Array.isArray(tpl.inputHandles) && tpl.inputHandles.length)) {
        accepts = ['any'];
      }

      // Decision: allow if source is any OR target accepts any OR target accepts the source type
      if (sType === 'any' || accepts.includes('any') || accepts.includes(sType)) {
        // Enforce multiplicity (fan-out/fan-in)
        // Source multiplicity (outputHandles)
        let sMultiple = true;
        try { const sDef = this.getHandleDef(sourceId, sourceHandle, 'source'); sMultiple = (sDef?.multiple !== false); } catch {}
        if (!sMultiple) {
          const existingOut = (this.edges || []).filter((e: any) => String(e.source) === sourceId && String(e.sourceHandle || '') === sourceHandle).length;
          if (existingOut >= 1) return false;
        }
        // Target multiplicity (inputHandles or linkedHandles)
        let tMultiple = true;
        try {
          const tNode2 = this.nodes.find((nn: any) => String(nn.id) === targetId);
          const tpl2 = (tNode2?.data?.model?.templateObj) || (tNode2?.data?.model) || {};
          const ih2 = (tpl2.inputHandles || []).find((hh: any) => String(hh?.id) === targetHandle);
          const links2 = Array.isArray((tpl2 as any).linkedHandles) ? (tpl2 as any).linkedHandles : [];
          const lh2 = links2.find((hh:any) => String(hh?.id) === targetHandle);
          const def = ih2 || lh2;
          if (def && def.multiple === false) tMultiple = false;
        } catch {}
        if (!tMultiple) {
          const existingIn = (this.edges || []).filter((e: any) => String(e.target) === targetId && String(e.targetHandle || '') === targetHandle).length;
          if (existingIn >= 1) return false;
        }
        return true;
      }
      return false;
    } catch { return false; }
  }
}
