import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Vflow, Edge, Connection, ConnectionSettings } from 'ngx-vflow';
import { MonacoJsonEditorComponent } from '../dynamic-form/components/monaco-json-editor.component';
import { FlowAdvancedEditorDialogComponent } from './advanced-editor/flow-advanced-editor-dialog.component';
import { FormsModule } from '@angular/forms';
import { FlowHistoryService } from './flow-history.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'flow-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, Vflow, MonacoJsonEditorComponent, FlowAdvancedEditorDialogComponent],
  templateUrl: './flow-builder.component.html',
  styleUrl: './flow-builder.component.scss'
})
export class FlowBuilderComponent {
  // Palette configurable (peut évoluer vers un service)
  items = [
    { label: 'Start', template: { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} } },
    { label: 'Condition', template: { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {"title":"Nouveau formulaire","fields":[{"type":"section","title":"Les conditions","mode":"array","key":"items","array":{"initialItems":1,"minItems":0,"controls":{"add":{"kind":"text","text":"Ajouter"},"remove":{"kind":"text","text":"Supprimer"}}},"fields":[{"type":"text","key":"name","label":"Name","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}},{"type":"text","key":"condtion","label":"Condtion","col":{"xs":24,"sm":24,"md":12,"lg":12,"xl":12},"default":"","expression":{"allow":true}}],"col":{"xs":24,"sm":24,"md":24,"lg":24,"xl":24},"description":"Choisir les conditions","grid":{"gutter":16},"ui":{"layout":"vertical"}}]}, output_array_field: 'items' } },
    { label: 'Action', template: { id: 'tmpl_action', name: 'Action', type: 'function', icon: 'fa-solid fa-bolt', title: 'Action', subtitle: 'Generic action', output: [], args: {} } },
    {
      label: 'Mail', template: {
        id: 'tmpl_sendmail', name: 'SendMail', type: 'function', icon: 'fa-solid fa-envelope', title: 'Send mail', subtitle: 'Exemple', output: [], args: {
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
    { label: 'PDF', template: { id: 'tmpl_pdf', name: 'PDF', type: 'function', icon: 'fa-solid fa-file-pdf', title: 'PDF', subtitle: 'Generate PDF', output: [], args: {} } },
    { label: 'Loop', template: { id: 'tmpl_loop', name: 'Loop', type: 'loop', icon: 'fa-solid fa-sync', title: 'Loop', subtitle: 'Iterate', args: {} } },
  ];

  templates: any[] = [
    { id: 'tmpl_start', name: 'Start', type: 'start', icon: 'fa-solid fa-play', title: 'Start', subtitle: 'Trigger', args: {} },
    { id: 'tmpl_fn', name: 'Function', type: 'function', icon: 'fa-solid fa-cog', title: 'Function', subtitle: 'Generic step', output: [], args: {} },
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
  /* private applyingHistory = false; */
  constructor(public history: FlowHistoryService, private message: NzMessageService) {}

  ngOnInit() {
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
    const fn2Model = { id: 'node_fn2', name: fnT2.name || 'Function', template: fnT2.id, templateObj: fnT2, context: {} };
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
        // IDs = index de position: "0", "1", ...
        return arr.map((_: any, i: number) => String(i));
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
      const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      // Support id 'err'
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      // Index mapping when 'err' inserted at first position
      const idx = typeof idxOrId === 'string' ? parseInt(idxOrId, 10) : idxOrId;
      // Special case: condition node → name from context items
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const it = arr[idx];
        if (it == null) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return (it.name ?? String(idx));
        return String(idx);
      }
      const baseIndex = enableCatch ? idx - 1 : idx;
      if (baseIndex >= 0 && baseIndex < outs.length) return outs[baseIndex];
      return '';
    } catch { return ''; }
  }
  onExternalDrop(event: any) {
    // Reprise exacte de la méthode flow: écran -> coordonnées relatives -> viewport -> monde
    const mouseEvent = event.event as MouseEvent;
    const dropHost = this.dropZone?.element?.nativeElement as HTMLElement | undefined;
    if (!mouseEvent || !dropHost || !this.flow?.viewportService) return;
    const rect = dropHost.getBoundingClientRect();
    const relative = { x: mouseEvent.clientX - rect.left, y: mouseEvent.clientY - rect.top };
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
    this.pushState('connect.edge');
  }

  deleteEdge(edge: Edge) {
    this.edges = this.edges.filter(e => e !== edge);
    this.pushState('delete.edge');
  }

  getEdgeLabel(edge: Edge): string { return this.computeEdgeLabel(edge.source as any, edge.sourceHandle as any); }
  computeEdgeLabel(sourceId: string, sourceHandle: any): string {
    try {
      const src = this.nodes.find(n => n.id === sourceId);
      const model = src?.data?.model;
      // Pour function, utiliser template.output (sinon défaut ['Succes'])
      const tmpl = model?.templateObj || {};
      const outs = this.outputIds(model);
      const names: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      // handle spécial 'err'
      if (sourceHandle === 'err') return 'Error';
      const idx = sourceHandle != null ? parseInt(String(sourceHandle), 10) : NaN;
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const it = arr[idx];
        if (it == null) return '';
        if (typeof it === 'string') return it;
        if (typeof it === 'object') return (it.name ?? String(idx));
        return String(idx);
      }
      if (Array.isArray(names) && Number.isFinite(idx) && idx >= 0 && idx < names.length) return names[idx];
      if (Array.isArray(outs) && outs.length > 1 && Number.isFinite(idx)) return String(idx);
      return '';
    } catch { return ''; }
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

  // DnD events (debug/no-ops)
  onDragEnter(_e: any) { }
  onDragLeave(_e: any) { }
  onDragOver(e: any) { try { e.preventDefault(); } catch { } }

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
    this.nodes = this.nodes.map(n => n.id === this.selection?.id ? ({ ...n, data: { ...n.data, model: m } }) : n);
    this.selection = this.nodes.find(n => n.id === m.id) || this.selection;
    this.pushState('dialog.modelChange');
  }

  saveSelectedJson() {
    if (!this.selection) return;
    try {
      const parsed = this.editJson && this.editJson.trim().length ? JSON.parse(this.editJson) : null;
      if (!parsed || !parsed.id) return;
      // Remplace le model du nœud dans la liste pour déclencher le re-render
      this.nodes = this.nodes.map(n => n.id === this.selection.id ? ({ ...n, data: { ...n.data, model: parsed } }) : n);
      // Met à jour la sélection en mémoire
      this.selection = this.nodes.find(n => n.id === parsed.id) || null;
      this.pushState('inspector.saveJson');
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
    this.history.push(this.snapshot());
  }

  undo() {
    
    this.beginApplyingHistory(500);
    const prev = this.history.undo(this.snapshot());
    if (!prev) return;
    this.nodes = prev.nodes;
    this.edges = prev.edges as any;
    
  }
  redo() {
    
    this.beginApplyingHistory(500);
    const next = this.history.redo(this.snapshot());
    if (!next) return;
    this.nodes = next.nodes;
    this.edges = next.edges as any;
    
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

  // Change handlers from ngx-vflow
  private posDebounceTimer: any;
  private draggingNodes = new Set<string>();
  private pendingPositions: Record<string, { x: number; y: number }> = {};
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
      this.pushState('nodes.removed');
    } catch {}
  }
  onEdgesRemoved(changes: any[]) {
    if (this.isIgnoring()) { return; }
    try {
      const ids = new Set((changes || []).map(c => c?.id).filter(Boolean));
      if (!ids.size) return;
      this.edges = this.edges.filter(e => !ids.has(e.id as any));
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
          this.selection = null;
          this.errorNodes.clear();
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
