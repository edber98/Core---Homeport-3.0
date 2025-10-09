import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mini-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap" (mouseleave)="hideTip()">
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" [attr.width]="width" [attr.height]="height" class="chart">
        <ng-container *ngFor="let b of bars; let i = index">
          <rect [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h"
                [attr.fill]="i===hoverIdx ? '#d1d5db' : '#e5e7eb'" rx="2" ry="2"
                (mousemove)="showTip($event, i)" />
        </ng-container>
      </svg>
      <div class="tip" *ngIf="tipVisible" [style.left.px]="tipX" [style.top.px]="tipY">{{ tipText }}</div>
    </div>
  `,
  styles: [`
    .wrap { position: relative; display:block; }
    .chart { display:block; width:100%; height:auto; }
    .tip { position:absolute; transform: translate(-50%, -100%); background:#111; color:#fff; border-radius:6px; padding:2px 6px; font-size:11px; pointer-events:none; box-shadow:0 6px 12px rgba(0,0,0,.15); white-space:nowrap; }
  `]
})
export class MiniBarChartComponent implements OnInit {
  @Input() data: number[] = [];
  @Input() width = 200;
  @Input() height = 48;
  @Input() color = '#111';
  @Input() gap = 2;
  ngOnInit(): void {}

  get bars() {
    const n = this.data.length || 0; if (!n) return [] as any[];
    const max = Math.max(...this.data) || 1; const min = Math.min(...this.data);
    const pad = 0; const W = this.width; const H = this.height;
    const w = Math.max(2, (W - pad * 2 - this.gap * (n - 1)) / n);
    const scaleBase = Math.min(1, (H - 6) / H); // keep some negative space
    const items = this.data.map((v, i) => {
      const hRaw = ((v - Math.min(0, min)) / (max - Math.min(0, min) || 1)) * (H - 6);
      const h = Math.max(2, hRaw * scaleBase);
      let x = pad + i * (w + this.gap);
      const y = H - h - pad;
      return { x, y, w, h };
    });
    if (n === 1) { // center single bar to avoid full-block feel
      items[0].x = (W - items[0].w) / 2;
    }
    return items;
  }

  // tooltip
  tipVisible = false; tipX = 0; tipY = 0; tipText = ''; hoverIdx = -1;
  showTip(ev: MouseEvent, idx: number) {
    const svg = (ev.currentTarget as SVGElement).ownerSVGElement as SVGElement;
    const rect = svg.getBoundingClientRect();
    this.tipX = ev.clientX - rect.left; this.tipY = ev.clientY - rect.top - 4;
    const v = this.data[idx] ?? 0; this.tipText = String(v);
    this.tipVisible = true; this.hoverIdx = idx;
  }
  hideTip() { this.tipVisible = false; this.hoverIdx = -1; }
}
