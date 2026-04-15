import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { AiProjectKnowledgeEntry } from '../ai.service';

interface Node {
  id: string;
  key: string;
  label: string;
  type?: string;
  value?: any;
  description?: string;
  x: number; y: number; vx: number; vy: number;
  fx?: number; fy?: number; // position fixée (drag)
  degree: number;
}
interface Edge { source: Node; target: Node; weight: number; }

const TYPE_COLORS: Record<string, string> = {
  text: '#8c8c8c', number: '#1890ff', date: '#722ed1', email: '#13c2c2',
  url: '#2f54eb', list: '#fa8c16', boolean: '#52c41a', json: '#eb2f96', file: '#faad14',
};

/**
 * Memory graph visuel : force-directed SVG pur (pas de dep externe).
 * Nœuds = entries, arêtes = relations heuristiques (même namespace, tags communs,
 * référence cross-key). Interactif : hover, clic, drag, zoom/pan molette.
 */
@Component({
  selector: 'ai-knowledge-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzEmptyModule],
  template: `
    <div #host class="kg-host" (wheel)="onWheel($event)">
      <svg #svg class="kg-svg" (mousedown)="startPan($event)" (mousemove)="onMove($event)" (mouseup)="endDrag()" (mouseleave)="endDrag()">
        <g [attr.transform]="'translate(' + panX + ',' + panY + ') scale(' + zoom + ')'">
          <line *ngFor="let e of edges"
                [attr.x1]="e.source.x" [attr.y1]="e.source.y"
                [attr.x2]="e.target.x" [attr.y2]="e.target.y"
                [attr.stroke-width]="0.5 + e.weight * 0.6"
                stroke="#d9d9d9" stroke-opacity="0.6" />
          <g *ngFor="let n of nodes" [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
             class="kg-node" [class.kg-hover]="hovered === n"
             (mousedown)="startDragNode($event, n)"
             (click)="onNodeClick($event, n)"
             (mouseenter)="hovered = n" (mouseleave)="hovered = null">
            <circle [attr.r]="nodeRadius(n)"
                    [attr.fill]="colorFor(n.type)"
                    stroke="#fff" stroke-width="2" />
            <text [attr.y]="nodeRadius(n) + 12" text-anchor="middle"
                  font-size="10" fill="#262626">{{ shortLabel(n.key) }}</text>
          </g>
        </g>
      </svg>
      <div class="kg-popup" *ngIf="hovered as h" [style.left.px]="h.x * zoom + panX + 14" [style.top.px]="h.y * zoom + panY - 8">
        <div class="kg-popup-key">{{ h.key }}</div>
        <div class="kg-popup-value">{{ formatValue(h.value) }}</div>
        <div class="kg-popup-desc" *ngIf="h.description">{{ h.description }}</div>
      </div>
      <div class="kg-controls">
        <button (click)="reset()">Réinitialiser</button>
        <button (click)="zoomBy(1.2)">+</button>
        <button (click)="zoomBy(0.8)">−</button>
      </div>
      <div class="kg-empty" *ngIf="!nodes.length">
        <nz-empty nzNotFoundContent="Pas assez d'entrées pour construire le graphe (minimum 2 approuvées)."></nz-empty>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 520px; position: relative; }
    .kg-host { width: 100%; height: 100%; position: relative; background: linear-gradient(180deg, #fafafa, #fff); border: 1px solid #f0f0f0; border-radius: 10px; overflow: hidden; cursor: grab; }
    .kg-host:active { cursor: grabbing; }
    .kg-svg { width: 100%; height: 100%; display: block; }
    .kg-node { cursor: pointer; }
    .kg-node.kg-hover circle { stroke: #1890ff; stroke-width: 3; }
    .kg-popup {
      position: absolute; background: #fff; border: 1px solid #e8e8e8; border-radius: 8px;
      padding: 6px 10px; font-size: 12px; color: #262626; max-width: 280px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08); pointer-events: none; z-index: 10;
    }
    .kg-popup-key { font-weight: 600; font-family: ui-monospace, monospace; font-size: 11px; color: #1890ff; }
    .kg-popup-value { margin-top: 3px; word-break: break-word; }
    .kg-popup-desc { margin-top: 3px; font-size: 11px; color: #8c8c8c; font-style: italic; }
    .kg-controls { position: absolute; bottom: 10px; right: 10px; display: flex; gap: 4px; z-index: 5; }
    .kg-controls button {
      background: #fff; border: 1px solid #e8e8e8; border-radius: 6px; padding: 4px 10px;
      font-size: 11px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .kg-controls button:hover { border-color: #1890ff; color: #1890ff; }
    .kg-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  `],
})
export class AiKnowledgeGraphComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() entries: AiProjectKnowledgeEntry[] = [];
  @Output() selectEntry = new EventEmitter<string>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svg', { static: true }) svgRef!: ElementRef<SVGSVGElement>;

  nodes: Node[] = [];
  edges: Edge[] = [];
  hovered: Node | null = null;
  zoom = 1;
  panX = 0;
  panY = 0;
  private _panStart: { x: number; y: number; px: number; py: number } | null = null;
  private _dragNode: Node | null = null;
  private _animFrame = 0;
  private _stopSim = false;
  private _ro?: ResizeObserver;
  private zone = inject(NgZone);

  ngAfterViewInit() {
    this._ro = new ResizeObserver(() => this.centerView());
    this._ro.observe(this.hostRef.nativeElement);
    this.build();
  }

  ngOnChanges(ch: SimpleChanges) {
    if (ch['entries'] && !ch['entries'].firstChange) this.build();
  }

  ngOnDestroy() {
    this._stopSim = true;
    cancelAnimationFrame(this._animFrame);
    this._ro?.disconnect();
  }

  private build() {
    const host = this.hostRef?.nativeElement;
    const w = host?.clientWidth || 600;
    const h = host?.clientHeight || 520;
    const list = (this.entries || []).filter(e => (e.status || 'approved') === 'approved');
    this.nodes = list.map((e, i) => {
      const angle = (i / Math.max(1, list.length)) * Math.PI * 2;
      return {
        id: e._id || e.key, key: e.key, label: e.key, type: e.type,
        value: e.value, description: e.description,
        x: w / 2 + Math.cos(angle) * 160,
        y: h / 2 + Math.sin(angle) * 160,
        vx: 0, vy: 0, degree: 0,
      };
    });
    // Relations
    this.edges = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        let w = 0;
        // Même namespace
        const ns = (k: string) => k.split('.')[0] || '';
        if (ns(a.key) === ns(b.key) && ns(a.key)) w += 1;
        // Tags partagés
        const ea = list[i]; const eb = list[j];
        const tagsA = ea?.tags || []; const tagsB = eb?.tags || [];
        const common = tagsA.filter(t => tagsB.includes(t)).length;
        w += common;
        // Value référence l'autre key
        const avStr = String(ea?.value || '').toLowerCase();
        const bvStr = String(eb?.value || '').toLowerCase();
        if (avStr.includes(b.key.toLowerCase())) w += 2;
        if (bvStr.includes(a.key.toLowerCase())) w += 2;
        if (w > 0) {
          this.edges.push({ source: a, target: b, weight: w });
          a.degree++; b.degree++;
        }
      }
    }
    // Lance la sim
    this._stopSim = false;
    this.runSimulation();
  }

  private runSimulation() {
    const host = this.hostRef?.nativeElement;
    const w = host?.clientWidth || 600;
    const h = host?.clientHeight || 520;
    const K_REP = 2200;
    const K_ATT = 0.04;
    const REST = 120;
    const FRICTION = 0.82;
    let iter = 0;
    const TOTAL_WARMUP = 200;
    this.zone.runOutsideAngular(() => {
      const step = () => {
        if (this._stopSim) return;
        for (const n of this.nodes) {
          if (n.fx != null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
          // Répulsion
          for (const m of this.nodes) {
            if (m === n) continue;
            const dx = n.x - m.x, dy = n.y - m.y;
            const d2 = Math.max(dx * dx + dy * dy, 25);
            const f = K_REP / d2;
            n.vx += (dx / Math.sqrt(d2)) * f;
            n.vy += (dy / Math.sqrt(d2)) * f;
          }
          // Centrage léger
          n.vx += (w / 2 - n.x) * 0.001;
          n.vy += (h / 2 - n.y) * 0.001;
        }
        // Attraction sur arêtes
        for (const e of this.edges) {
          const dx = e.target.x - e.source.x;
          const dy = e.target.y - e.source.y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = (d - REST) * K_ATT * (0.5 + e.weight * 0.2);
          const ux = dx / d, uy = dy / d;
          if (e.source.fx == null) { e.source.vx += ux * f; e.source.vy += uy * f; }
          if (e.target.fx == null) { e.target.vx -= ux * f; e.target.vy -= uy * f; }
        }
        // Applique
        for (const n of this.nodes) {
          if (n.fx != null) continue;
          n.vx *= FRICTION; n.vy *= FRICTION;
          n.x += Math.max(-8, Math.min(8, n.vx));
          n.y += Math.max(-8, Math.min(8, n.vy));
        }
        iter++;
        if (iter < TOTAL_WARMUP || this.hovered || this._dragNode) {
          this._animFrame = requestAnimationFrame(step);
        }
        // Trigger render 10 fps pendant warmup
        if (iter % 2 === 0) this.zone.run(() => { /* CD */ });
      };
      step();
    });
  }

  nodeRadius(n: Node) { return 8 + Math.min(12, n.degree * 1.2); }
  colorFor(type?: string) { return TYPE_COLORS[type || 'text'] || '#8c8c8c'; }
  shortLabel(key: string) { const parts = key.split('.'); return parts[parts.length - 1] || key; }
  formatValue(v: any): string {
    if (v == null) return '—';
    if (Array.isArray(v)) return v.slice(0, 5).join(', ');
    if (typeof v === 'object') { try { return JSON.stringify(v).slice(0, 80); } catch { return String(v); } }
    return String(v).slice(0, 120);
  }

  // Interactions
  startPan(e: MouseEvent) {
    if (this._dragNode) return;
    this._panStart = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY };
  }
  startDragNode(e: MouseEvent, n: Node) {
    e.stopPropagation();
    this._dragNode = n;
    n.fx = n.x; n.fy = n.y;
  }
  onMove(e: MouseEvent) {
    if (this._dragNode) {
      const rect = this.svgRef.nativeElement.getBoundingClientRect();
      const px = (e.clientX - rect.left - this.panX) / this.zoom;
      const py = (e.clientY - rect.top - this.panY) / this.zoom;
      this._dragNode.fx = px; this._dragNode.fy = py;
      this._dragNode.x = px; this._dragNode.y = py;
      if (!this._animFrame) this.runSimulation();
    } else if (this._panStart) {
      this.panX = this._panStart.px + (e.clientX - this._panStart.x);
      this.panY = this._panStart.py + (e.clientY - this._panStart.y);
    }
  }
  endDrag() {
    if (this._dragNode) { this._dragNode.fx = undefined; this._dragNode.fy = undefined; }
    this._dragNode = null;
    this._panStart = null;
  }
  onNodeClick(e: MouseEvent, n: Node) {
    e.stopPropagation();
    if (this._dragNode) return;
    this.selectEntry.emit(n.id);
  }
  onWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomBy(delta);
  }
  zoomBy(f: number) { this.zoom = Math.max(0.3, Math.min(3, this.zoom * f)); }
  reset() { this.panX = 0; this.panY = 0; this.zoom = 1; this.build(); }
  centerView() { /* no-op pour simple recentrage */ }
}
