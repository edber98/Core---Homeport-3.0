import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Vflow, Edge, Connection, ConnectionSettings } from 'ngx-vflow';
import { MonacoJsonEditorComponent } from '../dynamic-form/components/monaco-json-editor.component';
import { FlowAdvancedEditorDialogComponent } from './advanced-editor/flow-advanced-editor-dialog.component';
import { FormsModule } from '@angular/forms';
import { FlowHistoryService } from './flow-history.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subscription } from 'rxjs';

@Component({
  selector: 'flow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzToolTipModule, Vflow, MonacoJsonEditorComponent, FlowAdvancedEditorDialogComponent],
  templateUrl: './flow-builder.component.html',
  styleUrl: './flow-builder.component.scss'
})
export class FlowBuilderComponent {
  // Palette configurable (peut évoluer vers un service)
  items = [
    { group: 'Core', label: 'Start', template: { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} } },
    { group: 'Logic', label: 'Condition', template: { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {"title":"Nouveau formulaire","fields":[{"type":"section","title":"Les conditions","mode":"array","key":"items","array":{"initialItems":1,"minItems":0,"controls":{"add":{"kind":"text","text":"Ajouter"},"remove":{"kind":"text","text":"Supprimer"}}},"fields":[{"type":"text","key":"name","label":"Name","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}},{"type":"text","key":"condtion","label":"Condtion","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}},{"type":"text","key":"_id","label":"Id invisible","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","visibleIf":{"==":[{"var":"name"},"admin_id_viewer"]}}],"col":{"xs":24,"sm":24,"md":24,"lg":24,"xl":24},"description":"Choisir les conditions","grid":{"gutter":16},"ui":{"layout":"vertical"}}]}, output_array_field: 'items' } },
    { group: 'Logic', label: 'Loop', template: { id: 'tmpl_loop', name: 'Loop', type: 'loop', icon: 'fa-solid fa-sync', title: 'Loop', subtitle: 'Iterate', args: {} } },
    { group: 'Functions', label: 'Action', template: { id: 'tmpl_action', name: 'Action', type: 'function', icon: 'fa-solid fa-bolt', title: 'Action', subtitle: 'Generic action', category: 'Core', authorize_catch_error: true, output: [], args: {} } },
    {
      group: 'Functions', label: 'Send Mail', template: {
        id: 'tmpl_sendmail', name: 'SendMail', type: 'function', icon: 'fa-solid fa-envelope', title: 'Send mail', subtitle: 'Send an email', category: 'Gmail', authorize_catch_error: true, output: [], args: {
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
    { group: 'Functions', label: 'HTTP Request', template: { id: 'tmpl_http', name: 'HTTP Request', type: 'function', icon: 'fa-solid fa-globe', title: 'HTTP Request', subtitle: 'Call API', category: 'HTTP', authorize_catch_error: true, output: [], args: {
      "title": "HTTP Request",
      "fields": [
        { "type": "text", "key": "url", "label": "URL", "col": {"xs":24}, "default": "https://api.example.com", "expression": {"allow": true} },
        { "type": "select", "key": "method", "label": "Method", "options": ["GET","POST","PUT","DELETE"], "col": {"xs":24}, "default": "GET" },
        { "type": "textarea", "key": "body", "label": "Body", "col": {"xs":24}, "default": "", "expression": {"allow": true} }
      ],
      "ui": {"layout": "vertical"}
    } } },
    { group: 'Functions', label: 'Slack: Post Message', template: { id: 'tmpl_slack_post', name: 'Slack Post', type: 'function', icon: 'fa-brands fa-slack', title: 'Slack', subtitle: 'Post message', category: 'Slack', authorize_catch_error: true, output: [], args: {
      "title": "Slack Message",
      "fields": [
        { "type": "text", "key": "channel", "label": "Channel", "col": {"xs":24}, "default": "#general" },
        { "type": "text", "key": "text", "label": "Text", "col": {"xs":24}, "default": "Hello", "expression": {"allow": true} }
      ],
      "ui": {"layout": "vertical"}
    } } },
    { group: 'Functions', label: 'Delay', template: { id: 'tmpl_delay', name: 'Delay', type: 'function', icon: 'fa-regular fa-clock', title: 'Delay', subtitle: 'Wait', category: 'Core', authorize_catch_error: true, output: [], args: {
      "title": "Delay",
      "fields": [ { "type": "number", "key": "ms", "label": "Milliseconds", "default": 1000, "col": {"xs":24} } ],
      "ui": {"layout": "vertical"}
    } } },
    { group: 'Functions', label: 'Math: Add', template: { id: 'tmpl_math_add', name: 'Math Add', type: 'function', icon: 'fa-solid fa-plus', title: 'Math', subtitle: 'Add numbers', category: 'Math', authorize_catch_error: true, output: [], args: {
      "title": "Add",
      "fields": [ { "type": "number", "key": "a", "label": "A", "default": 0 }, { "type": "number", "key": "b", "label": "B", "default": 0 } ],
      "ui": {"layout": "vertical"}
    } } },
    { group: 'Functions', label: 'Text: Uppercase', template: { id: 'tmpl_text_upper', name: 'Text Uppercase', type: 'function', icon: 'fa-solid fa-font', title: 'Text', subtitle: 'Uppercase', category: 'Text', authorize_catch_error: true, output: [], args: {
      "title": "Uppercase",
      "fields": [ { "type": "text", "key": "input", "label": "Input", "default": "" } ],
      "ui": {"layout": "vertical"}
    } } },
    { group: 'Functions', label: 'PDF', template: { id: 'tmpl_pdf', name: 'PDF', type: 'function', icon: 'fa-solid fa-file-pdf', title: 'PDF', subtitle: 'Generate PDF', category: 'Docs', authorize_catch_error: true, output: [], args: {} } },
  ];

  templates: any[] = [
    { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} },
    { id: 'tmpl_fn', name: 'Function', type: 'function', icon: 'fa-solid fa-cog', title: 'Function', subtitle: 'Generic step', authorize_catch_error: true, output: [], args: {} },
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
  @ViewChild('targetList', { static: false }) dropZone?: any;

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
  constructor(public history: FlowHistoryService, private message: NzMessageService, private zone: NgZone, private cdr: ChangeDetectorRef) {}
  isMobile = false;

  ngOnInit() {
    this.updateIsMobile();
    // Initialise un graphe par défaut à partir de this.items (pas this.templates)
    const findByType = (t: string) => (this.items.find(it => it?.template?.type === t)?.template);
    const startT = findByType('start') || { id: 'tmpl_start', name: 'Start', type: 'start', title: 'Start', subtitle: 'Trigger', icon: 'fa-solid fa-play', args: {} };
    const condT = findByType('condition') || { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {}, output_array_field: 'items' };
    // Choisir deux templates de type function depuis la palette (ex: Action, Mail)
    const functionItems = this.items.filter(it => it?.template?.type === 'function').map(it => it.template);
    const fnT1 = functionItems[0] || { id: 'tmpl_fn1', name: 'Function', type: 'function', icon: 'fa-solid fa-cog', title: 'Function', subtitle: 'Step', output: [], args: {} };
    const fnT2 = functionItems[1] || { id: 'tmpl_fn2', name: 'Function 2', type: 'function', icon: 'fa-solid fa-bolt', title: 'Function 2', subtitle: 'Step', output: [], args: {} };

    const startModel = { id: 'node_start', name: startT.name || 'Start', template: startT.id, templateObj: startT, context: {} };
    const fn1Model = { id: 'node_fn1', name: fnT1.name || 'Function', template: fnT1.id, templateObj: fnT1, context: {} };
    const fn2Model: any = { id: 'node_fn2', name: fnT2.name || 'Function', template: fnT2.id, templateObj: fnT2, context: {} };
    // Activer catch_error par défaut pour SendMail
    try {
      if (fnT2?.id === 'tmpl_sendmail' || /send\s*mail/i.test(String(fnT2?.name || fnT2?.title || ''))) {
        if (fnT2?.authorize_catch_error) fn2Model.catch_error = true;
      }
    } catch {}
    const condModel = { id: 'node_cond', name: condT.name || 'Condition', template: condT.id, templateObj: condT, context: { items: [
      { name: 'A', condition: '' },
      { name: 'B', condition: '' },
      { name: 'C', condition: '' }
    ] } };

    const startVNode = { id: startModel.id, point: { x: 380, y: 140 }, type: 'html-template', data: { model: startModel } };
    const fn1VNode = { id: fn1Model.id, point: { x: 180, y: 320 }, type: 'html-template', data: { model: fn1Model } };
    const fn2VNode = { id: fn2Model.id, point: { x: 380, y: 320 }, type: 'html-template', data: { model: fn2Model } };
    const condVNode = { id: condModel.id, point: { x: 600, y: 320 }, type: 'html-template', data: { model: condModel } };

    this.nodes = [startVNode, fn1VNode, fn2VNode, condVNode];
    this.edges = [
      {
        type: 'template',
        id: `${startModel.id}->${fn2Model.id}:out:in`,
        source: startModel.id,
        target: fn2Model.id,
        sourceHandle: 'out',
        targetHandle: 'in',
        edgeLabels: { center: { type: 'html-template', data: { text: this.computeEdgeLabel(startModel.id, 'out') } } },
        data: { strokeWidth: 2, color: '#b1b1b7' },
        markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } }
      },
      {
        type: 'template',
        id: `${startModel.id}->${fn1Model.id}:out:in`,
        source: startModel.id,
        target: fn1Model.id,
        sourceHandle: 'out',
        targetHandle: 'in',
        edgeLabels: { center: { type: 'html-template', data: { text: this.computeEdgeLabel(startModel.id, 'out') } } },
        data: { strokeWidth: 2, color: '#b1b1b7' },
        markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } }
      },
    ];
    this.history.reset(this.snapshot());
  }

  ngAfterViewInit() {
    // Subscribe to viewport change end events to update zoom indicator
    try {
      const vs: any = this.flow?.viewportService;
      if (vs?.viewportChangeEnd$) {
        this.viewportSub = vs.viewportChangeEnd$.subscribe(() => this.zone.run(() => this.updateZoomDisplay()));
      }
    } catch {}
    // Initial update
    this.updateZoomDisplay();
  }
  ngOnDestroy() { try { this.viewportSub?.unsubscribe(); } catch {} }

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
        try { localStorage.setItem('flow.zoom', String(z)); } catch {}
        
        // Force immediate change detection even si hors zone ou sans interaction
        try { this.cdr.detectChanges(); } catch {}
      }
    } catch {}
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
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.updateZoomDisplay();
    } catch {}
  }

  // No grouped palette; simple flat list used by template

  // No-op; change tracking handled via vflow outputs

  inputId(tmpl: any): string | null { if (!tmpl) return null; return tmpl.type === 'start' ? null : 'in'; }
  outputIds(model: any): string[] {
    const tmpl = model?.templateObj || {};
    switch (tmpl.type) {
      case 'end': return [];
      case 'start': return ['out'];
      case 'loop': return ['loop_start', 'loop_end', 'end'];
      case 'condition': {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        // IDs from current model items
        const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
        // Also include any currently connected handles so edges are preserved during edits
        try {
          const connected = this.edges
            .filter(e => String(e.source) === String(model.id))
            .map(e => String(e.sourceHandle ?? ''))
            .filter(h => !!h);
          const all = Array.from(new Set([ ...ids, ...connected ]));
          return all;
        } catch {
          return ids;
        }
      }
      case 'function':
      default: {
        const outs: string[] | undefined = Array.isArray(tmpl.output) ? tmpl.output : undefined;
        const n = (outs && outs.length) ? outs.length : 1; // défaut 1
        const base = Array.from({ length: n }, (_, i) => String(i));
        // catch error en première position si autorisé et activé dans le node
        const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
        return enableCatch ? ['err', ...base] : base;
      }
    }
  }

  getOutputName(model: any, idxOrId: number | string): string {
    try {
      const tmpl = model?.templateObj || {};
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      // Support id 'err'
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      // Start node: single handle 'out' → label 'Succes'
      if (tmpl.type === 'start' && String(idxOrId) === 'out') return 'Succes';
      // Index mapping when 'err' inserted at first position
      const idx = (typeof idxOrId === 'string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId, 10) : (typeof idxOrId === 'number' ? idxOrId : NaN);
      // Special case: condition node → name from context items
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        // Non numérique: tenter par _id
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        if (!it) return '';
        return (typeof it === 'object') ? (it.name ?? '') : String(it);
      }
      if (Number.isFinite(idx) && idx >= 0 && idx < outs.length) return outs[idx];
      return '';
    } catch { return ''; }
  }
  onExternalDrop(event: any) {
    if (this.isMobile) return; // Disable DnD on mobile
    
    // Écran -> coordonnées relatives -> viewport -> monde
    const dropHost = this.dropZone?.element?.nativeElement as HTMLElement | undefined;
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
    if (relX == null || relY == null) {  return; }
    const relative = { x: relX, y: relY };
    const viewport = this.flow.viewportService.readableViewport();
    const scale = viewport.zoom;
    const offsetX = viewport.x;
    const offsetY = viewport.y;
    const positionInFlow = { x: ((relative.x - offsetX) / scale) - (250 / 2), y: ((relative.y - offsetY) / scale) - 50 };
    

    const t = event?.item?.data?.template || event?.item?.data || event?.item?.data?.data;
    const templateObj = this.normalizeTemplate(t);
    
    const nodeModel = {
      id: 'node_' + Date.now(),
      name: templateObj?.name || templateObj?.title || templateObj?.type || 'Node',
      template: templateObj?.id || null,
      templateObj,
      context: {}
    };
    const vNode = { id: nodeModel.id, point: positionInFlow, type: 'html-template', data: { model: nodeModel } };
    this.nodes = [...this.nodes, vNode];
    this.pushState('drop.node');
  }
  private normalizeTemplate(t: any) { return t && typeof t === 'object' ? t : { id: String(t || ''), type: 'function', title: 'Node', output: [], args: {} }; }
  private computeDropPoint(ev: any) {
    const mouse = ev?.event as MouseEvent;
    const hostEl = this.dropZone?.element?.nativeElement as HTMLElement | undefined;
    if (!mouse || !hostEl || !this.flow?.viewportService) return { x: 400, y: 300 };
    const rect = hostEl.getBoundingClientRect();
    const rel = { x: mouse.clientX - rect.left, y: mouse.clientY - rect.top };
    const viewport = this.flow.viewportService.readableViewport();
    const scale = viewport.zoom;
    const offsetX = viewport.x;
    const offsetY = viewport.y;
    return { x: ((rel.x - offsetX) / scale) - 90, y: ((rel.y - offsetY) / scale) - 60 };
  }
  onConnect(c: Connection) {
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
  }

  deleteEdge(edge: Edge) {
    this.edges = this.edges.filter(e => e !== edge);
    // After edge deletion, recompute error branch propagation
    this.recomputeErrorPropagation();
    this.pushState('delete.edge');
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
  computeEdgeLabel(sourceId: string, sourceHandle: any): string {
    try {
      const src = this.nodes.find(n => n.id === sourceId);
      const model = src?.data?.model;
      // Pour function, utiliser template.output (sinon défaut ['Succes'])
      const tmpl = model?.templateObj || {};
      const outs = this.outputIds(model);
      const names: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      // handle spécial 'err' et 'start' out
      if (sourceHandle === 'err') return 'Error';
      if (tmpl.type === 'start') return 'Succes';
      const idx = sourceHandle != null && /^\d+$/.test(String(sourceHandle)) ? parseInt(String(sourceHandle), 10) : NaN;
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx];
          if (it == null) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? '');
          return '';
        }
        // Handle may be a stable id (string)
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(sourceHandle));
        if (!it) return '';
        return (typeof it === 'object') ? (it.name ?? '') : '';
      }
      if (Array.isArray(names) && Number.isFinite(idx) && idx >= 0 && idx < names.length) return names[idx];
      // Single-output nodes: prefer 'Succes'
      if (Array.isArray(names) && names.length === 1) return names[0] || 'Succes';
      return '';
    } catch { return ''; }
  }

  // Recompute error-branch propagation from current edges.
  // Seeds are targets of edges whose sourceHandle is 'err'. Propagation follows all outgoing edges.
  private recomputeErrorPropagation() {
    try {
      const adj = new Map<string, string[]>();
      for (const e of this.edges) {
        const s = String(e.source);
        const t = String(e.target);
        if (!adj.has(s)) adj.set(s, []);
        adj.get(s)!.push(t);
      }
      const next = new Set<string>();
      const queue: string[] = [];
      for (const e of this.edges) {
        if (String(e.sourceHandle) === 'err') {
          const t = String(e.target);
          if (!next.has(t)) { next.add(t); queue.push(t); }
        }
      }
      while (queue.length) {
        const n = queue.shift()!;
        const outs = adj.get(n) || [];
        for (const to of outs) {
          if (!next.has(to)) { next.add(to); queue.push(to); }
        }
      }
      // Replace current set
      this.errorNodes = next;
      // Update edge styling in-place to avoid triggering remove/add cycles
      for (const e of this.edges as any[]) {
        const isErr = String(e.sourceHandle) === 'err' || next.has(String(e.source));
        // Preserve base styles once
        const baseWidth = (e.data && typeof e.data.__baseWidth === 'number') ? e.data.__baseWidth : (e.data?.strokeWidth ?? 2);
        const baseColor = (e.data && typeof e.data.__baseColor === 'string') ? e.data.__baseColor : (e.data?.color ?? '#b1b1b7');
        const newData: any = { ...(e.data || {}) };
        if (typeof newData.__baseWidth !== 'number') newData.__baseWidth = baseWidth;
        if (typeof newData.__baseColor !== 'string') newData.__baseColor = baseColor;
        if (isErr) {
          newData.error = true;
          newData.strokeWidth = 1; // same as initial error edge
          newData.color = '#f759ab';
        } else {
          newData.error = false;
          newData.strokeWidth = baseWidth;
          newData.color = baseColor;
        }
        e.data = newData;
        // Keep existing arrow markers; do not replace to avoid template cache issues
      }
      // Trigger Angular change detection without changing edge identities
      this.edges = [...this.edges];
    } catch {}
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
  onDragEnter(e: any) {  }
  onDragLeave(e: any) {  }
  onDragOver(e: any) { if (this.isMobile) return; try { e.preventDefault(); } catch { } }
  onDragStart(item: any, ev: any) {
    if (this.isMobile) return;
    try { const key = String(item?.template?.id || item?.label || ''); if (key) this.draggingPalette.add(key); } catch {}
  }
  onDragEnd(item: any, ev: any) {
    if (this.isMobile) return;
    try { const key = String(item?.template?.id || item?.label || ''); if (key) this.draggingPalette.delete(key); } catch {}
  }
  isDragging(item: any): boolean { try { const key = String(item?.template?.id || item?.label || ''); return key ? this.draggingPalette.has(key) : false; } catch { return false; } }

  // Context menu actions for nodes
  onNodeContextMenu(ev: MouseEvent, node: any) {
    if (this.isMobile) return;
    try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    this.ctxMenuVisible = true;
    this.ctxMenuX = ev.clientX;
    this.ctxMenuY = ev.clientY;
    this.ctxMenuTarget = node;
    // Ensure inspector selection matches
    try { this.selectItem(node); } catch {}
  }
  closeCtxMenu() { this.ctxMenuVisible = false; this.ctxMenuTarget = null; }
  ctxOpenAdvancedAndInspector() {
    if (!this.ctxMenuTarget) return;
    try { this.selectItem(this.ctxMenuTarget); } catch {}
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
      const newId = this.generateNodeId();
      const newPoint = { x: (node.point?.x ?? 0) + 40, y: (node.point?.y ?? 0) + 40 };
      const model = JSON.parse(JSON.stringify(node.data?.model || {}));
      model.id = newId;
      // Adjust name to indicate duplication (non-bloquant)
      try { if (model?.name) model.name = String(model.name) + ' (copy)'; } catch {}
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
      } catch {}
      const vNode = { id: newId, point: newPoint, type: node.type, data: { ...node.data, model } };
      this.nodes = [...this.nodes, vNode];
      this.selection = vNode as any;
      this.history.push(this.snapshot());
    } catch {}
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
    } catch {}
    return s;
  }

  private generateNodeId(): string {
    let id = '';
    const used = new Set(this.nodes.map(n => String(n.id)));
    do { id = 'node_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); } while (used.has(id));
    return id;
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
    } catch {}
  }
  ctxCenterTarget() {
    const tgt = this.ctxMenuTarget;
    this.closeCtxMenu();
    try {
      const nodeId = (tgt && (tgt as any).id) ? String((tgt as any).id) : '';
      if (!nodeId) return;
      this.centerOnNodeId(nodeId);
    } catch {}
  }

  onSelected(ev: any) {
    // ngx-vflow peut renvoyer une entité ou une liste; on normalise
    const item = Array.isArray(ev) ? ev[0] : ev;
    this.selection = item || null;
    try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
  }
  selectItem(changes: any) {
    if (this.selection && this.selection.id === changes.id) this.selection = null; else this.selection = changes;
    try { this.editJson = this.selection ? JSON.stringify(this.selectedModel, null, 2) : ''; } catch { this.editJson = ''; }
  }

  openAdvancedEditor() { this.advancedOpen = true; }
  closeAdvancedEditor() { this.advancedOpen = false; }
  onAdvancedModelChange(m: any) {
    // Apply the model to the selected node and refresh
    if (!m?.id) return;
    const oldModel = (this.nodes.find(n => n.id === this.selection?.id)?.data?.model) || this.selectedModel;
    this.nodes = this.nodes.map(n => n.id === this.selection?.id ? ({ ...n, data: { ...n.data, model: m } }) : n);
    this.selection = this.nodes.find(n => n.id === m.id) || this.selection;
    // Reconcile edges whose source handles may have changed (e.g., condition item deleted or re-ordered)
    this.reconcileEdgesForNode(m, oldModel);
    // Ne pas pousser dans lhistorique ici; on attend lévénement "committed"
  }
  onAdvancedModelCommitted(m: any) {
    if (!m?.id) return;
    const oldModel = (this.nodes.find(n => n.id === m.id)?.data?.model) || null;
    this.reconcileEdgesForNode(m, oldModel);
    
    this.pushState('dialog.modelCommit.final');
  }

  saveSelectedJson() {
    if (!this.selection) return;
    try {
      const parsed = this.editJson && this.editJson.trim().length ? JSON.parse(this.editJson) : null;
      if (!parsed || !parsed.id) return;
      // Remplace le model du nœud dans la liste pour déclencher le re-render
      const oldModel = (this.nodes.find(n => n.id === this.selection!.id)?.data?.model) || this.selectedModel;
      this.nodes = this.nodes.map(n => n.id === this.selection!.id ? ({ ...n, data: { ...n.data, model: parsed } }) : n);
      // Met à jour la sélection en mémoire
      this.selection = this.nodes.find(n => n.id === parsed.id) || null;
      // Reconcile edges for this node after model update
      this.reconcileEdgesForNode(parsed, oldModel);
      this.pushState('inspector.saveJson');
    } catch { }
  }

  // Remove or remap edges that reference changed/removed handles after a node's outputs change
  private reconcileEdgesForNode(model: any, oldModel?: any) {
    try {
      const nodeId = model?.id;
      if (!nodeId) return;
      // Stabiliser les _id pour les items condition AVANT comparaisons
      this.ensureStableConditionIds(oldModel, model);
      const before = this.edges.length;

      // Special handling for condition nodes: remap/update labels precisely
      const type = model?.templateObj?.type;
      if (type === 'condition') {
        const oldItems = this.getConditionItems(oldModel);
        const newItems = this.getConditionItems(model);
        // Guard: if new items are empty but old had items (likely early init), do nothing
        if (oldItems.length > 0 && newItems.length === 0) return;
        // Build full maps with stable ids
        const oldFull = this.getConditionItemsFull(oldModel); // {id,name}
        const full = this.getConditionItemsFull(model);
        const idSet = new Set(full.map(it => it.id));
        const nameToId = new Map<string, string>();
        full.forEach(it => { if (it.name && !nameToId.has(it.name)) nameToId.set(it.name, it.id); });
        const oldIdToName = new Map<string, string>();
        oldFull.forEach(it => oldIdToName.set(it.id, it.name));
        const oldIdSet = new Set(oldFull.map(it => it.id));
        const deletedIds = new Set<string>([...oldIdSet].filter(id => !idSet.has(id)));

        const deletedEdgeIds: string[] = [];
        this.edges = this.edges.reduce((acc: Edge[], e) => {
          if (e.source !== nodeId) { acc.push(e); return acc; }
          const handle = String(e.sourceHandle ?? '');
          let newHandle: string | null = null;
          // Case 1: handle already an id and still exists
          if (handle && !/^\d+$/.test(handle)) {
            // If this handle was deleted, drop the edge
            if (deletedIds.has(handle)) {
              deletedEdgeIds.push(e.id as any);
              return acc;
            }
            if (idSet.has(handle)) newHandle = handle;
            else {
              // Try remap by old name
              const oldName = oldIdToName.get(handle) || '';
              if (oldName && nameToId.has(oldName)) newHandle = nameToId.get(oldName)!;
            }
          } else {
            // Case 2: legacy numeric index
            const oldIdx = /^\d+$/.test(handle) ? parseInt(handle, 10) : -1;
            if (oldIdx >= 0) {
              // Try remap by old name → new id
              const oldName = (oldFull[oldIdx]?.name) || (oldItems[oldIdx] || '');
              if (oldName && nameToId.has(oldName)) newHandle = nameToId.get(oldName)!;
              // Fallback: same index within bounds
              if (!newHandle && oldIdx < full.length) newHandle = full[oldIdx].id;
              // If still no remap, and the original old id at this index was deleted, drop
              if (!newHandle) {
                const oldIdAtIdx = oldFull[oldIdx]?.id;
                if (oldIdAtIdx && deletedIds.has(String(oldIdAtIdx))) {
                  deletedEdgeIds.push(e.id as any);
                  return acc;
                }
              }
            }
          }
          if (!newHandle) {
            // Keep the edge unchanged to preserve connections; label fallback will display stored text
            acc.push(e);
            return acc;
          }
          // Update edge with new stable handle and label
          const txt = this.computeEdgeLabel(nodeId, newHandle);
          const center = { type: 'html-template', data: { text: txt } } as any;
          const edgeLabels = { ...(e as any).edgeLabels, center } as any;
          const ne: Edge = { ...(e as any), sourceHandle: newHandle, id: `${e.source}->${e.target}:${newHandle}:${e.targetHandle}`, edgeLabels } as any;
          acc.push(ne);
          return acc;
        }, [] as Edge[]);

        // Prevent onEdgesRemoved from restoring edges we intentionally removed
        if (deletedEdgeIds.length) {
          deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.add(id));
          setTimeout(() => { deletedEdgeIds.forEach(id => this.allowedRemovedEdgeIds.delete(id)); }, 600);
        }
      }

      // Generic guard: for condition nodes, we keep all edges on modification.
      // For other node types, still remove edges to non-existent handles.
      const newOut = (this.outputIds(model) || []).map((x: any) => String(x));
      if (type !== 'condition') {
        const allowed = new Set(newOut);
        // Guard: if nothing allowed but previously there were outputs, skip (early init)
        if (!newOut.length && oldModel) {
          const oldOut = (this.outputIds(oldModel) || []).map((x: any) => String(x));
          if (oldOut.length) return;
        }
        // Remove only edges from this node that reference a non-existent handle
        this.edges = this.edges.filter(e => (e.source !== nodeId) || allowed.has(String(e.sourceHandle ?? '')));
      }

      // Recompute error propagation because edges may have been removed/remapped
      this.recomputeErrorPropagation();

      // Optionally, we could reconcile target handles too, but inputs are stable ('in')
      if (this.edges.length !== before) {
        // Edges changed; selection may reference a removed edge
        if (this.selection && (this.selection as any).source && (this.selection as any).target) {
          const exists = this.edges.some(e => (e as any).id === (this.selection as any).id);
          if (!exists) this.selection = null;
        }
      }
    } catch {}
  }

  private getConditionItems(model: any): string[] {
    try {
      const field = model?.templateObj?.output_array_field || 'items';
      const arr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      return arr.map((it, i) => (typeof it === 'object' && it && typeof it.name === 'string') ? it.name : (typeof it === 'string' ? it : String(i)));
    } catch { return []; }
  }
  private getConditionItemsFull(model: any): Array<{ id: string; name: string }> {
    try {
      const field = model?.templateObj?.output_array_field || 'items';
      const arr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      return arr.map((it, i) => {
        if (it && typeof it === 'object') {
          const id = String((it as any)._id || i);
          const name = typeof it.name === 'string' ? it.name : String(i);
          return { id, name };
        }
        return { id: String(i), name: typeof it === 'string' ? it : String(i) };
      });
    } catch { return []; }
  }

  // Stabilise les _id en préservant ceux de l'ancien modèle (par index puis par name);
  // génère un _id uniquement pour les nouveaux items sans id.
  private ensureStableConditionIds(oldModel: any | undefined | null, model: any | undefined | null) {
    try {
      const tmpl = model?.templateObj;
      if (!tmpl || tmpl.type !== 'condition') return;
      const field = tmpl.output_array_field || 'items';
      const newArr: any[] = (model?.context && Array.isArray(model.context[field])) ? model.context[field] : [];
      const oldArr: any[] = (oldModel?.context && Array.isArray(oldModel.context?.[field])) ? oldModel.context[field] : [];
      // Collect already present ids in new
      const used = new Set<string>(newArr.map(it => (it && typeof it === 'object' && it._id) ? String(it._id) : '').filter(Boolean));
      // 1) Preserve id by same index when id missing (even if name changed)
      for (let i = 0; i < Math.min(oldArr.length, newArr.length); i++) {
        const oldIt = oldArr[i];
        const newIt = newArr[i];
        if (!newIt || typeof newIt !== 'object') continue;
        if (newIt._id) continue;
        const oldId = oldIt && typeof oldIt === 'object' ? String(oldIt._id || '') : '';
        if (oldId && !used.has(oldId)) { newIt._id = oldId; used.add(oldId); }
      }
      // 2) Try to copy by name (first unused match) for remaining items
      const nameToIds = new Map<string, string[]>();
      for (let i = 0; i < oldArr.length; i++) {
        const it = oldArr[i];
        if (!(it && typeof it === 'object' && it._id)) continue;
        const name = it.name || (typeof it === 'string' ? it : '');
        const id = String(it._id);
        if (!nameToIds.has(name)) nameToIds.set(name, []);
        nameToIds.get(name)!.push(id);
      }
      for (const it of newArr) {
        if (!(it && typeof it === 'object') || it._id) continue;
        const name = it.name || '';
        const list = nameToIds.get(name) || [];
        while (list.length) {
          const candidate = list.shift()!;
          if (!used.has(candidate)) { it._id = candidate; used.add(candidate); break; }
        }
      }
      // 3) Generate for any remaining without _id
      for (const it of newArr) {
        if (!(it && typeof it === 'object')) continue;
        if (!it._id) {
          let id = '';
          do { id = 'cid_' + Math.random().toString(36).slice(2); } while (used.has(id));
          it._id = id; used.add(id);
        }
      }
    } catch {}
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
        } catch {}
        const x1 = p.x, y1 = p.y, x2 = p.x + w, y2 = p.y + h;
        if (x1 < minX) minX = x1; if (y1 < minY) minY = y1;
        if (x2 > maxX) maxX = x2; if (y2 > maxY) maxY = y2;
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      this.centerViewportOnWorldPoint(cx, cy, 250);
    } catch {}
  }
  centerOnSelection() {
    try {
      const sel = this.selection;
      const nodeId = (sel && !(sel as any).source && (sel as any).id) ? String((sel as any).id) : '';
      if (!nodeId) return; // only nodes supported
      this.centerOnNodeId(nodeId);
    } catch {}
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
    } catch {}
    const wx = p.x + (w / 2);
    const wy = p.y + (h / 2);
    this.centerViewportOnWorldPoint(wx, wy, 250);
  }

  private centerViewportOnWorldPoint(wx: number, wy: number, duration = 0) {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs || !this.flowHost?.nativeElement) return;
      const vp = this.flow.viewportService.readableViewport();
      const rect = this.flowHost.nativeElement.getBoundingClientRect();
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      const x = centerScreenX - (wx * vp.zoom);
      const y = centerScreenY - (wy * vp.zoom);
      // Use internal API to set viewport without changing zoom
      (vs as any).writableViewport.set({ changeType: 'absolute', state: { zoom: vp.zoom, x, y }, duration });
      // Ensure change event is emitted so UI (zoom display) updates
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
    } catch {}
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
    try { this.message.success('Flow sauvegardé'); } catch { this.showToast('Flow sauvegardé'); }
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
        
        this.history.push(this.snapshot());
      }, 60);
    } else {
      
      this.history.push(this.snapshot());
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
    } catch {}
  }
  onHandleLeave() { this.tipVisible = false; }

  // Change handlers from ngx-vflow
  private posDebounceTimer: any;
  private draggingNodes = new Set<string>();
  private pendingPositions: Record<string, { x: number; y: number }> = {};
  private zoomUpdateTimer: any;
  onNodePositionChange(change: any) {
    
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
    try { if (this.zoomUpdateTimer) clearTimeout(this.zoomUpdateTimer); } catch {}
    this.zoomUpdateTimer = setTimeout(() => this.zone.run(() => this.updateZoomDisplay()), 80);
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
   onPointerUp() {
    if (this.isIgnoring()) return;
    if (!this.draggingNodes.size) return;
    const ids = Array.from(this.draggingNodes);
    const posMap = this.pendingPositions;
    this.nodes = this.nodes.map(n => (posMap[n.id] ? ({ ...n, point: { x: posMap[n.id].x, y: posMap[n.id].y } }) : n));
    this.draggingNodes.clear();
    this.pendingPositions = {} as any;
    this.pushState('node.position.final');
  }

  onNodesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      const ids = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (!ids.size) return;
      this.nodes = this.nodes.filter(n => !ids.has(n.id));
      this.edges = this.edges.filter(e => !ids.has(String(e.source)) && !ids.has(String(e.target)));
      ids.forEach(id => this.errorNodes.delete(String(id)));
      // Removal can break error paths: recompute error propagation
      this.recomputeErrorPropagation();
      this.pushState('nodes.removed');
    } catch {}
  }
  onEdgesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      const removedIds = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (!removedIds.size) return;
      // Keep edges whose source is a condition node; allow others to be removed
      const toKeep = new Set<string>();
      const toRemove = new Set<string>();
      for (const e of this.edges) {
        if (!removedIds.has(e.id as any)) continue;
        const src = this.nodes.find(n => n.id === e.source);
        const isCond = !!src?.data?.model?.templateObj && src.data.model.templateObj.type === 'condition';
        const isAllowedDeletion = this.allowedRemovedEdgeIds.has(e.id as any);
        if (isCond && !isAllowedDeletion) toKeep.add(e.id as any); else toRemove.add(e.id as any);
        this.cdr.markForCheck();
      }
      if (toRemove.size) {
        this.edges = this.edges.filter(e => !toRemove.has(e.id as any));
      }
      if (toKeep.size) {
        // Force re-render to restore edges vflow tried to remove
        this.edges = [...this.edges];
      }
      // Any change in edges can affect error-branch propagation
      this.recomputeErrorPropagation();
      this.pushState('edges.removed');
    } catch {}
  }

  private pendingDetachTimers: Record<string, any> = {};
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
    } catch {}
  }

  // Import with loading feedback
  importFlow(ev: Event) {
    const input = ev.target as HTMLInputElement | null;
    const files = input?.files;
    if (!files || !files.length) return;
    const file = files[0];
    let loadingId: string | null = null;
    try { const m = this.message.loading('Import du flow…', { nzDuration: 0 }); loadingId = (m as any)?.messageId || null; } catch {}
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
            } catch {}
            return n;
          });
          this.edges = parsed.edges;
          // After import, reconcile edges for all nodes (in case formats changed)
          try { this.nodes.forEach(n => this.reconcileEdgesForNode(n?.data?.model)); } catch {}
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
      try { if (loadingId) this.message.remove(loadingId); } catch {}
      if (input) input.value = '';
    };
    reader.onerror = () => {
      try { if (loadingId) this.message.remove(loadingId); } catch {}
      try { this.message.error('Erreur de lecture du fichier'); } catch { this.showToast('Erreur de lecture du fichier'); }
      if (input) input.value = '';
    };
    reader.readAsText(file);
  }
}
