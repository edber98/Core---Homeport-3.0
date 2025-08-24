import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, EventEmitter, Output, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Vflow, Edge, ConnectionSettings } from 'ngx-vflow';
import { Subscription } from 'rxjs';

@Component({
  selector: 'flow-viewer',
  standalone: true,
  imports: [CommonModule, Vflow],
  template: `
  <div class="flow-viewer">
    <section class="canvas ro">
      <div class="canvas-host" #flowHost (wheel)="onWheel($event)" (pointerdown)="onPointerDown($event)">
        <vflow view="auto" background="#EEF0F4" [entitiesSelectable]="allowDrag && move" [minZoom]="0.05" [maxZoom]="3"
               [nodes]="vflowNodes" [edges]="edges" [connection]="connectionSettings" #flow (onNodesChange.position.single)="onNodePositionChange($event)"
               (selected)="selected.emit($event)" (onConnect)="connect.emit($event)">
          <ng-template let-ctx edge>
            <svg:g customTemplateEdge>
              <svg:path fill="none" [attr.d]="ctx.path()" [attr.stroke-width]="ctx.edge.data?.error ? 2 : (ctx.edge.data?.strokeWidth || 2)" [attr.stroke]="ctx.edge.data?.error ? '#f759ab' : (ctx.edge.data?.color || '#b1b1b7')" [attr.marker-end]="ctx.markerEnd()" />
            </svg:g>
          </ng-template>
          <ng-template let-ctx edgeLabelHtml>
            <div class="edge-labels" [ngClass]="{ error: (computeEdgeLabel(ctx.edge) || (ctx.label.data?.text || '')) === 'Error' }">
              <div class="badge label" *ngIf="computeEdgeLabel(ctx.edge) as txt" [ngClass]="{ error: txt === 'Error' }">{{ txt }}</div>
            </div>
          </ng-template>
          <ng-template let-ctx nodeHtml>
            <div class="node-card ro" [class.locked]="!(allowDrag && move)">
              <div class="header">
                <i [class]="ctx.node.data.model.templateObj?.icon" class="icon"></i>
                <div class="meta">
                  <div class="title">{{ ctx.node.data.model.templateObj?.title || ctx.node.data.model?.name }}</div>
                  <div class="subtitle">{{ ctx.node.data.model.templateObj?.subtitle }}</div>
                </div>
              </div>
              <ng-container *ngIf="inputId(ctx.node.data.model.templateObj) as inId">
                <handle position="top" type="target" [id]="inId"></handle>
              </ng-container>
              <div class="outputs" *ngIf="outputIds(ctx.node.data.model)?.length as outs">
                <div class="out" *ngFor="let out of outputIds(ctx.node.data.model)">
                  <ng-template #hTpl let-hctx>
                    <svg:g>
                      <svg:circle
                        [attr.cx]="hctx.point().x"
                        [attr.cy]="hctx.point().y"
                        [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                        [attr.fill]="(out === 'err') ? '#f759ab' : '#000000'"
                        [attr.stroke]="'#ffffff'"
                        stroke-width="1"
                        (mouseenter)="onHandleEnter($event, ctx.node.data.model, out)"
                        (mousemove)="onHandleMove($event)"
                        (mouseleave)="onHandleLeave()"
                      ></svg:circle>
                    </svg:g>
                  </ng-template>
                  <handle position="bottom" type="source" [id]="out" [template]="hTpl"></handle>
                </div>
              </div>
              <div class="exec-badge" *ngIf="ctx.node.data.execStatus as st">
                <i class="fa-solid" [ngClass]="st === 'success' ? 'fa-circle-check ok' : (st === 'error' ? 'fa-triangle-exclamation err' : 'fa-clock pending')"></i>
              </div>
            </div>
          </ng-template>
        </vflow>
        <div class="flow-tooltip" *ngIf="tipVisible" [style.left.px]="tipX" [style.top.px]="tipY" [ngClass]="{ error: tipError }">{{ tipText }}</div>
      </div>
    </section>
  </div>
  <div class="bottom-bar" *ngIf="showBottomBar">
    <div class="actions">
      <button class="icon-btn" *ngIf="showCenterFlow" (click)="onCenterFlow()" title="Centrer le flow">
        <i class="fa-regular fa-object-group"></i>
      </button>
      <button class="icon-btn" *ngIf="showCenterSelection" [disabled]="true" title="Centrer sur la sélection">
        <i class="fa-solid fa-crosshairs"></i>
      </button>
      <button class="icon-btn" *ngIf="showSave" (click)="onSave()" title="Sauvegarder">
        <i class="fa-regular fa-floppy-disk"></i>
      </button>
      <button class="icon-btn" *ngIf="showRun" (click)="onRun()" title="Lancer">
        <i class="fa-solid fa-play"></i>
      </button>
      <span class="zoom-indicator" *ngIf="showZoomIndicator">Zoom: {{ zoomPercent }}%</span>
    </div>
  </div>
  `,
  styles: [`
    .flow-viewer { position: relative; height:100%; }
    .canvas.ro { border: 1px solid #e5e7eb; border-radius: 0; overflow: hidden; height:100%; }
    .canvas-host { height: 100%; width: 100%; }
    .node-card.ro { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; min-width: 180px; }
    .node-card.ro.locked { pointer-events: none; }
    .node-card .header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .node-card .icon { width: 20px; height: 20px; display:inline-block; }
    .node-card .meta .title { font-weight: 600; }
    .node-card .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .node-card .outputs { display:flex; gap:10px; justify-content:center; margin-top: 0; }
    .node-card .exec-badge { position:absolute; right:8px; bottom:6px; display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:2px 6px; box-shadow:0 1px 2px rgba(0,0,0,.06); }
    .node-card .exec-badge .fa-circle-check.ok { color:#16a34a; }
    .node-card .exec-badge .fa-triangle-exclamation.err { color:#ef4444; }
    .node-card .exec-badge .fa-clock.pending { color:#6b7280; }
    .bottom-bar { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 20; display:flex; justify-content:center; pointer-events:none; }
    .bottom-bar .actions { pointer-events:auto; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 12px; box-shadow:0 8px 20px rgba(0,0,0,.08); }
    .bottom-bar button { background:#1677ff; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
    .bottom-bar .icon-btn { background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; }
    .bottom-bar .icon-btn i { font-size:16px; }
    .bottom-bar .icon-btn:disabled { color:#bbb; border-color:#eee; background:#fafafa; cursor:not-allowed; }
    .bottom-bar .zoom-indicator { color:#111; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px; font-size:12px; }
    .edge-labels { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .edge-labels .badge { background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; font-size:12px; color:#111; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .edge-labels .badge.label.error { border-color:#f759ab; color:#f759ab; }
    .flow-tooltip { position: fixed; z-index: 200; background:#111; color:#fff; border-radius:6px; padding:4px 8px; font-size:12px; box-shadow:0 8px 20px rgba(0,0,0,.18); pointer-events: none; white-space: nowrap; }
    .flow-tooltip.error { background:#f759ab; color:#fff; }
  `]
})
export class FlowViewerComponent implements AfterViewInit, OnDestroy {
  @Input() nodes: any[] = [];
  @Input() edges: Edge[] = [];
  @Input() connectionSettings: ConnectionSettings = {} as any;

  @Input() defaultZoom = 0.5;
  @Input() storageKey = 'flow.viewer.viewport';
  @Input() move = false;       // allow position change if true
  @Input() allowDrag = false;  // require true + move to drag nodes
  @Input() allowZoom = true;   // allow zooming if true
  @Input() showBottomBar = true;
  @Input() showZoomIndicator = true;
  @Input() showRun = false;
  @Input() showSave = false;
  @Input() showCenterFlow = true;
  @Input() showCenterSelection = false;
  @Input() demo = false; // load internal demo flow if true

  @Output() run = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() selected = new EventEmitter<any>();
  @Output() connect = new EventEmitter<any>();

  @ViewChild('flowHost', { static: false }) flowHost?: ElementRef<HTMLElement>;
  @ViewChild('flow', { static: false }) flow?: any;
  private viewportSub?: Subscription;
  zoomPercent = 50;
  // Tooltip state
  tipVisible = false; tipText = ''; tipX = 0; tipY = 0; tipError = false;

  private zoomUpdateTimer: any;
  constructor(private route: ActivatedRoute, private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Override flags by query params if present
    try {
      const qp = this.route?.snapshot?.queryParamMap;
      if (qp) {
        const raw = qp.get('move') ?? qp.get('movable');
        if (raw != null) this.move = raw === 'true' || raw === '1';
        const drag = qp.get('drag');
        if (drag != null) this.allowDrag = drag === 'true' || drag === '1';
        const zoom = qp.get('zoom');
        if (zoom != null) this.allowZoom = (zoom === 'true' || zoom === '1');
      }
    } catch {}

    // Demo graph if requested
    if (this.demo) this.loadDemo();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.restoreViewport()) {
        this.fitAll(() => this.setZoomAndCenter(this.defaultZoom));
      }
      try {
        const vs: any = this.flow?.viewportService;
        if (vs?.viewportChangeEnd$) {
          this.viewportSub = vs.viewportChangeEnd$.subscribe(() => {
            this.zone.run(() => { this.updateZoomDisplay(); this.saveViewport(); });
          });
        }
      } catch {}
      this.updateZoomDisplay();
    }, 20);
  }
  ngOnDestroy() { try { this.viewportSub?.unsubscribe(); } catch {} }

  // Provide nodes to Vflow with draggable flag according to inputs
  get vflowNodes(): any[] {
    try {
      const canDrag = !!(this.allowDrag && this.move);
      return (this.nodes || []).map(n => ({ ...n, draggable: canDrag }));
    } catch { return this.nodes || []; }
  }

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
        return arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
      }
      case 'function':
      default: {
        const outs: string[] | undefined = Array.isArray(tmpl.output) ? tmpl.output : undefined;
        const n = (outs && outs.length) ? outs.length : 1;
        const base = Array.from({ length: n }, (_, i) => String(i));
        const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
        return enableCatch ? ['err', ...base] : base;
      }
    }
  }

  private fitAll(cb?: () => void) {
    try {
      const vs = (this as any).flow?.viewportService;
      if (!vs) return;
      vs.fitView({ duration: 150, padding: 0.25 });
      if (cb) setTimeout(cb, 180);
    } catch {}
  }

  private setZoomAndCenter(newZoom: number) {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs || !this.flowHost?.nativeElement) return;
      const vp = this.flow.viewportService.readableViewport();
      const rect = this.flowHost.nativeElement.getBoundingClientRect();
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      const wx = (centerScreenX - vp.x) / (vp.zoom || 1);
      const wy = (centerScreenY - vp.y) / (vp.zoom || 1);
      const x = centerScreenX - (wx * newZoom);
      const y = centerScreenY - (wy * newZoom);
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: newZoom, x, y }, duration: 120 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.saveViewport();
      this.updateZoomDisplay();
    } catch {}
  }

  private saveViewport() {
    try {
      const vp = this.flow?.viewportService?.readableViewport();
      if (!vp) return;
      localStorage.setItem(this.storageKey, JSON.stringify({ zoom: vp.zoom, x: vp.x, y: vp.y }));
    } catch {}
  }
  private restoreViewport(): boolean {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs) return false;
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (typeof obj?.zoom !== 'number' || typeof obj?.x !== 'number' || typeof obj?.y !== 'number') return false;
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: obj.zoom, x: obj.x, y: obj.y }, duration: 0 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.updateZoomDisplay();
      return true;
    } catch { return false; }
  }

  private updateZoomDisplay() {
    try {
      const z = this.flow?.viewportService?.readableViewport()?.zoom;
      if (typeof z === 'number' && z > 0) {
        this.zoomPercent = Math.round(z * 100);
        try { this.cdr.detectChanges(); } catch {}
      }
    } catch {}
  }

  private loadDemo() {
    const startT = { id: 'tmpl_start', name: 'Start', type: 'start', title: 'Start', subtitle: 'Trigger', icon: 'fa-solid fa-play', args: {} } as any;
    const fnT = { id: 'tmpl_sendmail', name: 'SendMail', type: 'function', icon: 'fa-solid fa-envelope', title: 'Send mail', subtitle: 'Send an email', authorize_catch_error: true, authorize_skip_error: true, output: ['Succes'], args: {} } as any;
    const condT = { id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', args: {}, output_array_field: 'items' } as any;

    const startModel = { id: 'demo_start', name: startT.name, template: startT.id, templateObj: startT, context: {} };
    const fnModel = { id: 'demo_fn', name: fnT.name, template: fnT.id, templateObj: fnT, context: {}, catch_error: true } as any;
    const condModel = { id: 'demo_cond', name: condT.name, template: condT.id, templateObj: condT, context: { items: [ { _id: 'c-0', name: 'A' }, { _id: 'c-1', name: 'B' } ] } } as any;

    const startVNode = { id: startModel.id, point: { x: 380, y: 140 }, type: 'html-template', data: { model: startModel } } as any;
    const fnVNode = { id: fnModel.id, point: { x: 380, y: 320 }, type: 'html-template', data: { model: fnModel } } as any;
    const condVNode = { id: condModel.id, point: { x: 600, y: 320 }, type: 'html-template', data: { model: condModel } } as any;

    this.nodes = [startVNode, fnVNode, condVNode];
    this.edges = [
      { type: 'template', id: `${startModel.id}->${fnModel.id}:out:in`, source: startModel.id, target: fnModel.id, sourceHandle: 'out', targetHandle: 'in', data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } } as any,
      { type: 'template', id: `${fnModel.id}->${condModel.id}:0:in`, source: fnModel.id, target: condModel.id, sourceHandle: '0', targetHandle: 'in', data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } } as any,
    ];
  }

  onNodePositionChange(change: any) {
    if (!(this.allowDrag && this.move)) return;
    try {
      const id = change?.id;
      const pt = change?.to?.point || change?.point || change?.to;
      if (!id || !pt) return;
      this.nodes = this.nodes.map(n => n.id === id ? ({ ...n, point: { x: pt.x, y: pt.y } }) : n);
    } catch {}
  }

  onWheel(ev: WheelEvent) {
    if (!this.allowZoom) { try { ev.preventDefault(); ev.stopPropagation(); } catch {} }
    try { if (this.zoomUpdateTimer) clearTimeout(this.zoomUpdateTimer); } catch {}
    this.zoomUpdateTimer = setTimeout(() => this.zone.run(() => this.updateZoomDisplay()), 80);
  }

  onPointerDown(ev: PointerEvent) {
    if (!(this.allowZoom || (this.allowDrag && this.move))) {
      try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    }
  }

  // Bottom bar actions
  onRun() { this.run.emit(); }
  onSave() { this.save.emit(); }
  onCenterFlow() { this.fitAll(); }
  // Edge labels and tooltips (same mapping as builder)
  computeEdgeLabel(edge: any): string {
    try {
      const model = this.nodes.find(n => n.id === edge.source)?.data?.model;
      const txt = this.getOutputName(model, edge.sourceHandle);
      if (txt && txt.trim().length) return txt;
      const stored = edge?.edgeLabels?.center?.data?.text;
      return stored || '';
    } catch { return ''; }
  }
  getOutputName(model: any, idxOrId: number | string): string {
    try {
      const tmpl = model?.templateObj || {};
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      if (tmpl.type === 'start' && String(idxOrId) === 'out') return 'Succes';
      const idx = (typeof idxOrId === 'string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId, 10) : (typeof idxOrId === 'number' ? idxOrId : NaN);
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (!it) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        return it ? (it.name ?? '') : '';
      }
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      if (Number.isFinite(idx) && idx >= 0 && idx < outs.length) return outs[idx];
      if (Array.isArray(outs) && outs.length === 1) return outs[0] || 'Succes';
      return '';
    } catch { return ''; }
  }
  onHandleEnter(ev: MouseEvent, model: any, out: string) {
    const txt = this.getOutputName(model, out) || '';
    this.tipText = txt; this.tipVisible = !!txt; this.tipError = String(out) === 'err';
    this.onHandleMove(ev);
  }
  onHandleMove(ev: MouseEvent) { this.tipX = ev.clientX + 8; this.tipY = ev.clientY + 8; }
  onHandleLeave() { this.tipVisible = false; }
}
