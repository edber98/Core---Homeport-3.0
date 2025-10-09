import { Component, Input, OnChanges, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mini-area-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap" (mouseleave)="hideTip()">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [attr.width]="width" [attr.height]="height" class="chart" (mousemove)="onMove($event)">
        <defs>
          <linearGradient [attr.id]="gid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" [attr.stop-color]="stroke" stop-opacity="0.25"></stop>
            <stop offset="100%" [attr.stop-color]="stroke" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <path [attr.d]="areaPath" [attr.fill]="'url(#' + gid + ')'"></path>
        <path [attr.d]="linePath" [attr.stroke]="stroke" fill="none" [attr.stroke-width]="strokeWidth" stroke-linecap="round" stroke-linejoin="round"></path>
        <ng-container *ngIf="hoverIndex>=0">
          <line [attr.x1]="points[hoverIndex].x" y1="0" [attr.x2]="points[hoverIndex].x" [attr.y2]="height" stroke="#9ca3af" stroke-dasharray="3 3" />
          <circle [attr.cx]="points[hoverIndex].x" [attr.cy]="points[hoverIndex].y" r="3" fill="#111" stroke="#fff" stroke-width="1" />
        </ng-container>
      </svg>
      <div class="tip" *ngIf="tipVisible" [style.left.px]="tipX" [style.top.px]="tipY">{{ tipText }}</div>
    </div>
  `,
  styles: [`
    .wrap { position: relative; display:block; }
    .chart { display:block; width:100%; height:auto; }
    .axis { font-size: 10px; fill: #9ca3af; }
    .tip { position:absolute; transform: translate(-50%, -100%); background:#111; color:#fff; border-radius:6px; padding:2px 6px; font-size:11px; pointer-events:none; box-shadow:0 6px 12px rgba(0,0,0,.15); white-space:nowrap; }
  `]
})
export class MiniAreaChartComponent implements OnInit, OnChanges {
  @Input() data: number[] = [];
  @Input() width = 200;
  @Input() height = 48;
  @Input() stroke = '#1677ff';
  @Input() strokeWidth = 2;
  @Input() showAxes = false;

  linePath = '';
  areaPath = '';
  points: { x: number; y: number; v: number }[] = [];
  minVal = 0; maxVal = 0;
  gid = '';

  tipVisible = false; tipX = 0; tipY = 0; tipText = '';
  hoverIndex = -1;

  private static nextId = 0;
  ngOnInit(): void { this.gid = 'grad-area-' + (++MiniAreaChartComponent.nextId); }

  ngOnChanges(): void { this.compute(); }

  private compute() {
    const n = this.data.length || 0;
    this.points = [];
    if (n === 0) { this.linePath = ''; this.areaPath = ''; this.minVal = 0; this.maxVal = 0; return; }
    const w = this.width; const h = this.height; const pad = 0;
    const max = Math.max(...this.data); const min = Math.min(...this.data);
    this.minVal = min; this.maxVal = max;
    const span = (max - min) || 1;
    const step = n <= 1 ? w : (w - pad * 2) / (n - 1);
    const points = this.data.map((v, i) => {
      const x = pad + i * step;
      const y = h - ((v - min) / span) * (h - pad * 2) - pad;
      return { x, y, v };
    });
    const line = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join('');
    const area = `${line} L${points[n - 1].x},${h} L${points[0].x},${h} Z`;
    this.linePath = line;
    this.areaPath = area;
    this.points = points;
    this.hoverIndex = -1; this.tipVisible = false;
  }

  onMove(ev: MouseEvent) {
    if (!this.points.length) return;
    const svg = ev.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    // find nearest index by x
    let idx = 0; let best = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const d = Math.abs(this.points[i].x - x);
      if (d < best) { best = d; idx = i; }
    }
    this.hoverIndex = idx;
    const p = this.points[idx];
    this.tipText = String(p.v);
    this.tipX = p.x; this.tipY = p.y;
    this.tipVisible = true;
  }
  hideTip() { this.tipVisible = false; this.hoverIndex = -1; }
}
