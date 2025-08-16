import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 ' + size + ' ' + size" [attr.width]="size" [attr.height]="size" class="chart">
      <circle [attr.cx]="c" [attr.cy]="c" [attr.r]="r" stroke="#eef2f7" [attr.stroke-width]="thickness" fill="none" />
      <circle [attr.cx]="c" [attr.cy]="c" [attr.r]="r" [attr.stroke]="color" [attr.stroke-width]="thickness"
              [attr.stroke-dasharray]="dash" stroke-linecap="round" fill="none" [attr.transform]="'rotate(-90, ' + c + ', ' + c + ')'"></circle>
      <text [attr.x]="c" [attr.y]="c" dominant-baseline="middle" text-anchor="middle" class="lbl">{{ pct | number:'1.0-0' }}%</text>
    </svg>
  `,
  styles: [`
    .chart { display:block; }
    .lbl { font-size: 12px; fill: #0f172a; font-weight: 600; }
  `]
})
export class DonutChartComponent {
  @Input() value = 0;
  @Input() total = 100;
  @Input() size = 72;
  @Input() thickness = 8;
  @Input() color = '#22c55e';

  get c() { return this.size / 2; }
  get r() { return (this.size - this.thickness) / 2; }
  get circ() { return 2 * Math.PI * this.r; }
  get pct() { const t = this.total || 1; return Math.max(0, Math.min(100, (this.value / t) * 100)); }
  get dash() { const p = this.pct / 100; return `${this.circ * p} ${this.circ * (1 - p)}`; }
}
