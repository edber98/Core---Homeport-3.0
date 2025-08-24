import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
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
import { FlowHistoryTimelineComponent } from './history/flow-history-timeline.component';

@Component({
  selector: 'flow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzToolTipModule, NzPopoverModule, NzDrawerModule, NzButtonModule, NzInputModule, Vflow, MonacoJsonEditorComponent, FlowAdvancedEditorDialogComponent, FlowPalettePanelComponent, FlowInspectorPanelComponent, FlowHistoryTimelineComponent],
  templateUrl: './flow-builder.component.html',
  styleUrl: './flow-builder.component.scss'
})
export class FlowBuilderComponent {
  // Palette configurable (peut évoluer vers un service)
  items = [
    { group: 'Core', label: 'Start', template: { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} } },
    { group: 'Logic', label: 'Condition', template: { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: { "title": "Nouveau formulaire", "fields": [{ "type": "section", "title": "Les conditions", "mode": "array", "key": "items", "array": { "initialItems": 1, "minItems": 0, "controls": { "add": { "kind": "text", "text": "Ajouter" }, "remove": { "kind": "text", "text": "Supprimer" } } }, "fields": [{ "type": "text", "key": "name", "label": "Name", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "expression": { "allow": true } }, { "type": "text", "key": "condtion", "label": "Condtion", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "expression": { "allow": true } }, { "type": "text", "key": "_id", "label": "Id invisible", "col": { "xs": 24, "sm": 24, "md": 12, "lg": 12, "xl": 12 }, "default": "", "visibleIf": { "==": [{ "var": "name" }, "admin_id_viewer"] } }], "col": { "xs": 24, "sm": 24, "md": 24, "lg": 24, "xl": 24 }, "description": "Choisir les conditions", "grid": { "gutter": 16 }, "ui": { "layout": "vertical" } }] }, output_array_field: 'items' } },
    { group: 'Logic', label: 'Loop', template: { id: 'tmpl_loop', name: 'Loop', type: 'loop', icon: 'fa-solid fa-sync', title: 'Loop', subtitle: 'Iterate', args: {} } },
    { group: 'Functions', label: 'Action', template: { id: 'tmpl_action', name: 'Action', type: 'function', icon: 'fa-solid fa-bolt', title: 'Action', subtitle: 'Generic action', category: 'Core', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {} } },
    {
      group: 'Functions', label: 'Send Mail', template: {
        id: 'tmpl_sendmail', name: 'SendMail', type: 'function', icon: 'fa-solid fa-envelope', title: 'Send mail', subtitle: 'Send an email', category: 'Gmail', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "Nouveau formulaire",
          "fields": [
            {
              "type": "section",
              "title": "Information système",
              "fields": [
                {
                  "type": "text",
                  "key": "event_id",
                  "label": "Event ID",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                }
              ],
              "col": {
                "xs": 24,
                "sm": 24,
                "md": 24,
                "lg": 24,
                "xl": 24
              },
              "description": "Les ID à renseigner.",
              "grid": {
                "gutter": 16
              },
              "mode": "normal"
            },
            {
              "type": "text",
              "key": "user_id",
              "label": "User ID",
              "col": {
                "xs": 24,
                "sm": 24,
                "md": 24,
                "lg": 24,
                "xl": 24
              },
              "default": "",
              "expression": {
                "allow": true
              }
            },
            {
              "type": "section",
              "title": "Contenu",
              "fields": [
                {
                  "type": "checkbox",
                  "key": "acr",
                  "label": "Accusé de reception",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": false,
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "text",
                  "key": "message",
                  "label": "Message",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "text",
                  "key": "subject",
                  "label": "Sujet",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "text",
                  "key": "dest",
                  "label": "Dest",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                }
              ],
              "col": {
                "xs": 24,
                "sm": 24,
                "md": 24,
                "lg": 24,
                "xl": 24
              },
              "description": "Le contenu et destinaire du mail",
              "grid": {
                "gutter": 16
              },
              "mode": "normal"
            },
            {
              "type": "section",
              "title": "Dossier",
              "fields": [
                {
                  "type": "text",
                  "key": "file",
                  "label": "Fichier à envoyer",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "text",
                  "key": "path",
                  "label": "Chemin",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                },
                {
                  "type": "text",
                  "key": "value",
                  "label": "Valeur",
                  "col": {
                    "xs": 24,
                    "sm": 24,
                    "md": 24,
                    "lg": 24,
                    "xl": 24
                  },
                  "default": "",
                  "expression": {
                    "allow": true
                  }
                }
              ],
              "col": {
                "xs": 24,
                "sm": 24,
                "md": 24,
                "lg": 24,
                "xl": 24
              },
              "grid": {
                "gutter": 16
              },
              "mode": "normal"
            }
          ],
          "ui": {
            "layout": "vertical",
            "labelAlign": "left",
            "labelsOnTop": true,
            "labelCol": {
              "span": 8
            },
            "controlCol": {
              "span": 16
            },
            "widthPx": 1040,
            "actions": {
              "showReset": false,
              "showCancel": false
            }
          },
          "summary": {
            "enabled": false,
            "includeHidden": false,
            "dateFormat": "dd/MM/yyyy"
          }
        }
      }
    },
    {
      group: 'Functions', label: 'HTTP Request', template: {
        id: 'tmpl_http', name: 'HTTP Request', type: 'function', icon: 'fa-solid fa-globe', title: 'HTTP Request', subtitle: 'Call API', category: 'HTTP', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "HTTP Request",
          "fields": [
            { "type": "text", "key": "url", "label": "URL", "col": { "xs": 24 }, "default": "https://api.example.com", "expression": { "allow": true } },
            { "type": "select", "key": "method", "label": "Method", "options": ["GET", "POST", "PUT", "DELETE"], "col": { "xs": 24 }, "default": "GET" },
            { "type": "textarea", "key": "body", "label": "Body", "col": { "xs": 24 }, "default": "", "expression": { "allow": true } }
          ],
          "ui": { "layout": "vertical" }
        }
      }
    },
    {
      group: 'Functions', label: 'Slack: Post Message', template: {
        id: 'tmpl_slack_post', name: 'Slack Post', type: 'function', icon: 'fa-brands fa-slack', title: 'Slack', subtitle: 'Post message', category: 'Slack', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "Slack Message",
          "fields": [
            { "type": "text", "key": "channel", "label": "Channel", "col": { "xs": 24 }, "default": "#general" },
            { "type": "text", "key": "text", "label": "Text", "col": { "xs": 24 }, "default": "Hello", "expression": { "allow": true } }
          ],
          "ui": { "layout": "vertical" }
        }
      }
    },
    {
      group: 'Functions', label: 'Delay', template: {
        id: 'tmpl_delay', name: 'Delay', type: 'function', icon: 'fa-regular fa-clock', title: 'Delay', subtitle: 'Wait', category: 'Core', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "Delay",
          "fields": [{ "type": "number", "key": "ms", "label": "Milliseconds", "default": 1000, "col": { "xs": 24 } }],
          "ui": { "layout": "vertical" }
        }
      }
    },
    {
      group: 'Functions', label: 'Math: Add', template: {
        id: 'tmpl_math_add', name: 'Math Add', type: 'function', icon: 'fa-solid fa-plus', title: 'Math', subtitle: 'Add numbers', category: 'Math', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "Add",
          "fields": [{ "type": "number", "key": "a", "label": "A", "default": 0 }, { "type": "number", "key": "b", "label": "B", "default": 0 }],
          "ui": { "layout": "vertical" }
        }
      }
    },
    {
      group: 'Functions', label: 'Text: Uppercase', template: {
        id: 'tmpl_text_upper', name: 'Text Uppercase', type: 'function', icon: 'fa-solid fa-font', title: 'Text', subtitle: 'Uppercase', category: 'Text', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {
          "title": "Uppercase",
          "fields": [{ "type": "text", "key": "input", "label": "Input", "default": "" }],
          "ui": { "layout": "vertical" }
        }
      }
    },
    { group: 'Functions', label: 'PDF', template: { id: 'tmpl_pdf', name: 'PDF', type: 'function', icon: 'fa-solid fa-file-pdf', title: 'PDF', subtitle: 'Generate PDF', category: 'Docs', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {} } },
  ];

  templates: any[] = [
    { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} },
    { id: 'tmpl_fn', name: 'Function', type: 'function', icon: 'fa-solid fa-cog', title: 'Function', subtitle: 'Generic step', authorize_catch_error: true, authorize_skip_error: true, output: [], args: {} },
    { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {}, output_array_field: 'items' },
    { id: 'tmpl_loop', name: 'Loop', type: 'loop', icon: 'fa-solid fa-sync', title: 'Loop', subtitle: 'Iterate', args: {} },
    { id: 'tmpl_end', name: 'End', type: 'end', icon: 'fa-solid fa-stop', title: 'End', subtitle: 'Terminate', args: {} },
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
  private currentFlowName: string = '';
  private currentFlowDesc: string = '';

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
  validationIssues: Array<{ kind: 'node'|'flow'; nodeId?: string; message: string }> = [];
  private openedNodeConfig = new Set<string>();

  // Removed event interceptors to align with working dev playground

  ngOnInit() {
    // Debug helpers removed
    this.updateIsMobile();
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
      // Recompute palette when workspace changes
      try {
        this.acl.changes$.pipe(auditTime(50)).subscribe(() => this.zone.run(() => this.applyWorkspaceTemplateFilter()));
      } catch {}
    } catch { }
    // Load flow by id if provided
    try {
      const flowId = this.route.snapshot.queryParamMap.get('flow');
      if (flowId) {
        this.currentFlowId = flowId;
        this.catalog.getFlow(flowId).subscribe(doc => this.zone.run(() => {
          if (doc) {
            this.currentFlowName = doc.name || '';
            this.currentFlowDesc = doc.description || '';
            this.nodes = (doc.nodes || []) as any[];
            this.edges = (doc.edges || []) as any;
            this.history.reset(this.snapshot());
            try { this.cdr.detectChanges(); } catch {}
            return;
          }
        }));
      }
    } catch {}
    if (!this.nodes || this.nodes.length === 0) {
      // Initialise un graphe par défaut à partir de la palette
      const seed = this.fbUtils.buildDefaultGraphFromPalette(this.items);
      this.nodes = seed.nodes;
      this.edges = seed.edges as any;
      this.history.reset(this.snapshot());
    }
    this.updateTimelineCaches();
    this.recomputeValidation();
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
        try { this.cdr.detectChanges(); } catch {}
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
  ngOnDestroy() { try { this.viewportSub?.unsubscribe(); } catch { } }

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
    this.paletteGroups = this.paletteSvc.buildGroups(this.items, this.paletteQuery, this.appsMap);
  }

  trackGroup = (_: number, g: any) => (g && (g.appId || g.title)) || _;
  trackItem = (_: number, it: any) => (it && (it.template?.id || it.label)) || _;

  // No-op; change tracking handled via vflow outputs

  inputId(tmpl: any): string | null { if (!tmpl) return null; return tmpl.type === 'start' ? null : 'in'; }
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
    const nodeModel = {
      id: newId,
      name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node',
      template: templateObj?.id || null,
      templateObj,
      context: {},
      templateChecksum: this.fbUtils.argsChecksum(templateObj?.args || {}),
      templateFeatureSig: this.fbUtils.featureChecksum(templateObj)
    };
    const vNode = { id: newId, point: positionInFlow, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    this.pushState('drop.node');
    // Immediately reflect required-field issues for the new node
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
    try { this.suppressRemoveUntil = Date.now() + 300; } catch {}
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
  private formatTime(ts: number) { try { const d = new Date(ts); const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0'); const ss = String(d.getSeconds()).padStart(2,'0'); return `${hh}:${mm}:${ss}`; } catch { return ''; } }
  private describeReason(r: string): { type: string; color: string; message: string } {
    const map: Record<string, { type: string; color: string }> = {
      'init': { type: 'Init', color: '#64748b' },
      'restore': { type: 'Restore', color: '#0ea5e9' },
      'palette.click.add': { type: 'Add', color: '#10b981' },
      'drop.node': { type: 'Add', color: '#10b981' },
      'connect.edge': { type: 'Connect', color: '#1677ff' },
      'delete.edge': { type: 'Delete', color: '#b91c1c' },
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
    if (this.errorNodes.has(String(id))) return true;
    try {
      const n = this.nodes.find(nn => nn.id === id);
      return !!n?.data?.model?.invalid;
    } catch { return false; }
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
    // Do not auto-connect a 'start' node; just place it
    const wantsConnect = templateObj?.type !== 'start';
    const newId = this.generateNodeId(templateObj, templateObj?.name || templateObj?.title);
    const worldCenter = this.viewportCenterWorld();
    // Find best source near center with a free output
    const source = wantsConnect ? this.findBestSourceNode(worldCenter.x, worldCenter.y) : null;
    const pos = this.computeNewNodePosition(source, worldCenter);
    const nodeModel: any = {
      id: newId,
      name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node',
      template: templateObj?.id || null,
      templateObj,
      context: {},
      templateChecksum: this.fbUtils.argsChecksum(templateObj?.args || {})
    };
    const vNode = { id: newId, point: pos, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    // Auto-connect from best output handle if found
    if (wantsConnect && source) {
      const handle = this.findFreeOutputHandle(source, true, worldCenter.x);
      if (handle) {
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
        try { this.suppressRemoveUntil = Date.now() + 300; } catch {}
      }
    }
    this.pushState('palette.click.add');
    // Immediately reflect required-field issues for the new node
    this.recomputeValidation();
  }

  // (removed) delegation handler

  private viewportCenterWorld(): { x: number; y: number } {
    try {
      const vp = this.flow?.viewportService?.readableViewport();
      const rect = this.flowHost?.nativeElement?.getBoundingClientRect();
      if (!vp || !rect) return { x: 400, y: 300 };
      return this.fbUtils.viewportCenterWorld(vp, rect);
    } catch { return { x: 400, y: 300 }; }
  }
  private findBestSourceNode(wx: number, wy: number): any | null {
    try {
      // Prefer node whose bbox center is closest to (wx, wy) and has at least one free, non-error output
      let best: any = null; let bestD = Infinity;
      for (const n of this.nodes) {
        const model = n?.data?.model; const tmpl = model?.templateObj || {};
        const outs = this.outputIds(model) || [];
        if (outs.length === 0) continue; // cannot source from end nodes
        const free = this.findFreeOutputHandle(n, true /*onlyNonError*/);
        if (!free) continue;
        // Estimate bbox center from DOM (scaled by zoom) or fallback to point + rough size
        let cx = n.point?.x || 0; let cy = (n.point?.y || 0);
        try {
          const el = this.flowHost?.nativeElement?.querySelector(`.node-card[data-node-id=\"${CSS.escape(n.id)}\"]`) as HTMLElement | null;
          const vp = this.flow?.viewportService?.readableViewport();
          if (el && vp) {
            const r = el.getBoundingClientRect();
            const w = r.width / (vp.zoom || 1); const h = r.height / (vp.zoom || 1);
            cx = (n.point?.x || 0) + w / 2; cy = (n.point?.y || 0) + h / 2;
          } else {
            cx = (n.point?.x || 0) + 90; cy = (n.point?.y || 0) + 60;
          }
        } catch { cx = (n.point?.x || 0) + 90; cy = (n.point?.y || 0) + 60; }
        const dx = cx - wx; const dy = cy - wy; const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; best = n; }
      }
      return best;
    } catch { return null; }
  }
  private isStartLike(tmpl: any): boolean {
    try { const ty = String(tmpl?.type || '').toLowerCase(); return ty === 'start' || ty === 'trigger'; } catch { return false; }
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
    } catch {}
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
      } catch {}
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
        } catch {}
        if (schema) {
          const fields: FieldConfig[] = this.dfs.flattenAllInputFields(schema) as any;
          const missing = fields.filter((f: any) => Array.isArray(f?.validators) && f.validators.some((v: any) => v?.type === 'required'))
            .filter((f: any) => {
              const v = (m?.context || {})[f.key];
              return v == null || v === '';
            });
          if (missing.length) return true;
        }
      } catch {}
      return false;
    } catch { return false; }
  }
  private recomputeValidation() {
    const issues: Array<{ kind: 'node'|'flow'; nodeId?: string; message: string }> = [];
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
        } catch {}
        // Form invalid or missing required fields
        try {
          const model: any = n?.data?.model || {};
          if (model?.invalid === true) {
            issues.push({ kind: 'node', nodeId: id, message: `Formulaire du nœud invalide.` });
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
        } catch {}
        // TODO: required-fields validation, only after node dialog opened at least once
        // if (this.openedNodeConfig.has(id)) { ... }
      }
    } catch { }
    this.validationIssues = issues;
    try { this.cdr.detectChanges(); } catch {}
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
      } else {
        const id = (tgt as any).id;
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
        this.errorNodes.delete(String(id));
      }
      this.selection = null;
      // Context deletions may affect error branches
      this.recomputeErrorPropagation();
      this.history.push(this.snapshot());
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

  openAdvancedEditor() { this.advancedOpen = true; }
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
    try { this.openedNodeConfig.add(String(m.id)); } catch {}
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
    } else {
      // selected a node
      const id = sel.id;
      this.nodes = this.nodes.filter(n => n.id !== id);
      this.edges = this.edges.filter(e => e.source !== id && e.target !== id);
      this.errorNodes.delete(String(id));
    }
    this.selection = null;
    // Deletion may change error-branch reachability
    this.recomputeErrorPropagation();
    this.history.push(this.snapshot());
    this.recomputeValidation();
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

  onIssueClick(it: { kind: 'node'|'flow'; nodeId?: string; message: string }) {
    try {
      if (it && it.nodeId) {
        const node = this.nodes.find(n => String(n.id) === String(it.nodeId));
        if (node) {
          this.selectItem(node);
          this.centerOnNodeId(String(it.nodeId));
        }
      }
    } catch {}
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
        this.catalog.saveFlow({ id: this.currentFlowId, name: this.currentFlowName || 'Flow', description: this.currentFlowDesc, nodes: this.nodes as any, edges: this.edges as any, meta: {} } as any).subscribe({
          next: () => { try { this.message.success('Flow sauvegardé'); } catch { this.showToast('Flow sauvegardé'); } },
          error: () => { try { this.message.error('Échec de la sauvegarde'); } catch { this.showToast('Échec de la sauvegarde'); } },
        });
      } else {
        try { this.message.warning('Aucun flow associé'); } catch { this.showToast('Aucun flow associé'); }
      }
    } catch { try { this.message.error('Échec de la sauvegarde'); } catch { this.showToast('Échec de la sauvegarde'); } }
  }
  runFlow() {
    try { this.message.info('Lancement du flow…'); } catch { this.showToast('Lancement du flow…'); }
  }


  private showToast(msg: string) {
    this.toastMsg = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 1800);
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

  private snapshot() { return { nodes: JSON.parse(JSON.stringify(this.nodes)), edges: JSON.parse(JSON.stringify(this.edges)) }; }
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
            this.updateTimelineCaches();
            try { this.cdr.detectChanges(); } catch { }
          });
        } catch {
          this.history.push(this.snapshot(), reason);
          this.updateTimelineCaches();
          try { this.cdr.detectChanges(); } catch { }
        }
      }, 60);
    } else {
      try {
        this.zone.run(() => {
          this.history.push(this.snapshot(), reason);
          this.updateTimelineCaches();
          try { this.cdr.detectChanges(); } catch { }
        });
      } catch {
        this.history.push(this.snapshot(), reason);
        this.updateTimelineCaches();
        try { this.cdr.detectChanges(); } catch { }
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
      if (Date.now() < (this.suppressGraphEventsUntil || 0)) return;
      const ids = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (Date.now() < this.suppressNodesRemovedUntil) return;
      if (!ids.size) return;
      const beforeNodes = this.nodes.length;
      const beforeEdges = this.edges.length;
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
      if (Date.now() < (this.suppressGraphEventsUntil || 0)) return;
      const removedIds = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (Date.now() < this.suppressRemoveUntil) return;
      if (!removedIds.size) return;
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
  private log(_evt: string, _data?: any) { /* logs disabled */ }
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
      } catch {}
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
      try { this.history.push(this.snapshot(), 'restore', true); } catch {}
      try { this.updateTimelineCaches(); } catch {}
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
      } catch {}
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
      try { this.history.push(this.snapshot(), 'restore', true); } catch {}
      try { this.updateTimelineCaches(); } catch {}
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
