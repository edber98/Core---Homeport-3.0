import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Vflow, Edge, ConnectionSettings } from 'ngx-vflow';
import { Subscription } from 'rxjs';

@Component({
  selector: 'flow-viewer',
  standalone: true,
  imports: [CommonModule, Vflow],
  template: `
  <div class="flow-exec">
    <aside class="side executions">
      <h4>Executions</h4>
      <div class="panel">
        <p>Aucune exécution récente.</p>
      </div>
    </aside>
    <section class="canvas ro">
      <div class="canvas-host" #flowHost (wheel)="onWheel($event)">
        <vflow view="auto" background="#EEF0F4" [entitiesSelectable]="allowDrag && move" [minZoom]="0.05" [maxZoom]="3"
               [nodes]="nodes" [edges]="edges" [connection]="connectionSettings" #flow (onNodesChange.position.single)="onNodePositionChange($event)">
          <ng-template let-ctx edge>
            <svg:g customTemplateEdge>
              <svg:path fill="none" [attr.d]="ctx.path()" [attr.stroke-width]="ctx.edge.data?.error ? 2 : (ctx.edge.data?.strokeWidth || 2)" [attr.stroke]="ctx.edge.data?.error ? '#f759ab' : (ctx.edge.data?.color || '#b1b1b7')" [attr.marker-end]="ctx.markerEnd()" />
            </svg:g>
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
                <handle position="bottom" type="source" *ngFor="let out of outputIds(ctx.node.data.model)" [id]="out"></handle>
              </div>
            </div>
          </ng-template>
        </vflow>
      </div>
    </section>
  </div>
  <div class="bottom-bar">
    <div class="actions">
      <span class="zoom-indicator">Zoom: {{ zoomPercent }}%</span>
    </div>
  </div>
  `,
  styles: [`
    .flow-exec { position: relative; display:grid; grid-template-columns: 320px 1fr; gap: 0; height:100%; }
    .canvas.ro { border: 1px solid #e5e7eb; border-radius: 0; overflow: hidden; height:100%; }
    .canvas-host { height: 100%; width: 100%; }
    .node-card.ro { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:8px; min-width: 180px; }
    .node-card.ro.locked { pointer-events: none; }
    .node-card .header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .node-card .icon { width: 20px; height: 20px; display:inline-block; }
    .node-card .meta .title { font-weight: 600; }
    .node-card .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .node-card .outputs { display:flex; gap:10px; justify-content:center; margin-top: 0; }
    .side.executions { border: none; border-radius: 0; padding: 12px; background: #ffffff; overflow: auto; }
    .side.executions h4 { margin: 0 0 8px; font-weight: 600; }
    .side.executions .panel { background:#fff; border:1px solid #e5e7eb; border-radius: 10px; padding:10px 12px; }
    .bottom-bar { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 20; display:flex; justify-content:center; pointer-events:none; }
    .bottom-bar .actions { pointer-events:auto; display:flex; gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 12px; box-shadow:0 8px 20px rgba(0,0,0,.08); }
    .bottom-bar .zoom-indicator { color:#111; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px; font-size:12px; }
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

  @ViewChild('flowHost', { static: false }) flowHost?: ElementRef<HTMLElement>;
  @ViewChild('flow', { static: false }) flow?: any;
  private viewportSub?: Subscription;
  zoomPercent = 50;

  constructor(private route: ActivatedRoute) {}

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
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.restoreViewport()) {
        this.fitAll(() => this.setZoomAndCenter(this.defaultZoom));
      }
      try {
        const vs: any = this.flow?.viewportService;
        if (vs?.viewportChangeEnd$) {
          this.viewportSub = vs.viewportChangeEnd$.subscribe(() => { this.updateZoomDisplay(); this.saveViewport(); });
        }
      } catch {}
      this.updateZoomDisplay();
    }, 20);
  }
  ngOnDestroy() { try { this.viewportSub?.unsubscribe(); } catch {} }

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
      }
    } catch {}
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
  }
}

