import { Component, Input, OnChanges, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeatmapPoint { date: string; total: number; success: number; error: number; }

@Component({
  selector: 'heatmap-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="heatmap-wrap" (mouseleave)="hideTip()">
      <div class="heatmap-scroll">
        <svg [attr.viewBox]="'0 0 ' + vw + ' ' + vh" class="heatmap-svg" preserveAspectRatio="xMinYMin meet">
          <!-- Month labels -->
          <text *ngFor="let m of monthLabels" [attr.x]="m.x" [attr.y]="10" class="month-label">{{ m.text }}</text>
          <!-- Day labels (left side) -->
          <text *ngFor="let d of dayLabelsY" [attr.x]="0" [attr.y]="d.y" class="day-label">{{ d.text }}</text>
          <!-- Cells -->
          <rect *ngFor="let cell of cells; let i = index"
            [attr.x]="cell.x" [attr.y]="cell.y"
            [attr.width]="cellSize" [attr.height]="cellSize"
            [attr.rx]="2" [attr.ry]="2"
            [attr.fill]="cell.fill"
            class="cell"
            (mouseenter)="showTip(i, $event)"
            (mouseleave)="hideTip()"
          />
        </svg>
      </div>
      <!-- Legend -->
      <div class="heatmap-legend">
        <span class="legend-label">Moins</span>
        <span *ngFor="let c of palette" class="legend-box" [style.background]="c"></span>
        <span class="legend-label">Plus</span>
      </div>
      <!-- Tooltip -->
      <div class="tip" *ngIf="tipVisible" [style.left.px]="tipX" [style.top.px]="tipY">
        <div class="tip-date">{{ tipDate }}</div>
        <div class="tip-val">{{ tipTotal }} exécution{{ tipTotal > 1 ? 's' : '' }}</div>
        <div class="tip-detail" *ngIf="tipTotal > 0">{{ tipSuccess }} succès · {{ tipError }} erreur{{ tipError > 1 ? 's' : '' }}</div>
      </div>
    </div>
  `,
  styles: [`
    .heatmap-wrap { position: relative; }
    .heatmap-scroll { overflow-x: hidden; overflow-y: hidden; }
    .heatmap-svg { display: block; width: 100%; height: auto; }
    .cell { cursor: pointer; }
    .cell:hover { stroke: #0f172a; stroke-width: 1; }
    .month-label { font-size: 9px; fill: #6b7280; font-family: inherit; }
    .day-label { font-size: 9px; fill: #94a3b8; font-family: inherit; dominant-baseline: middle; }
    .heatmap-legend { display: flex; align-items: center; gap: 3px; margin-top: 6px; justify-content: flex-end; }
    .legend-label { font-size: 10px; color: #94a3b8; }
    .legend-box { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    .tip { position: absolute; transform: translate(-50%, -110%); background: #0f172a; color: #fff; border-radius: 6px; padding: 4px 8px; font-size: 11px; pointer-events: none; box-shadow: 0 6px 12px rgba(0,0,0,.18); white-space: nowrap; z-index: 10; }
    .tip-date { font-weight: 600; margin-bottom: 1px; }
    .tip-val { color: #e2e8f0; }
    .tip-detail { color: #94a3b8; font-size: 10px; }
  `]
})
export class HeatmapChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() data: HeatmapPoint[] = [];

  cells: { x: number; y: number; fill: string; date: string; total: number; success: number; error: number }[] = [];
  monthLabels: { x: number; text: string }[] = [];
  dayLabelsY: { y: number; text: string }[] = [];

  cellSize = 11;
  gap = 2;
  leftPad = 22; // space for day labels
  topPad = 16;  // space for month labels
  vw = 0;
  vh = 0;

  private resizeObs: ResizeObserver | null = null;

  constructor(private elRef: ElementRef) {}

  tipVisible = false;
  tipX = 0;
  tipY = 0;
  tipDate = '';
  tipTotal = 0;
  tipSuccess = 0;
  tipError = 0;

  palette = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

  private static MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  private static DAYS_FR = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  ngAfterViewInit() {
    this.resizeObs = new ResizeObserver(() => this.compute());
    this.resizeObs.observe(this.elRef.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
  }

  ngOnChanges(): void { this.compute(); }

  private compute() {
    // Auto-size: fit 53 columns within container width
    const containerWidth = (this.elRef?.nativeElement as HTMLElement)?.offsetWidth || 700;
    const numWeeksEstimate = 53;
    const availableWidth = containerWidth - this.leftPad - 4;
    const computedStep = Math.max(8, Math.floor(availableWidth / numWeeksEstimate));
    this.cellSize = computedStep - this.gap;
    const size = this.cellSize;
    const gap = this.gap;
    const step = size + gap;

    // Build date map
    const map = new Map<string, HeatmapPoint>();
    for (const p of this.data) map.set(p.date, p);

    // Build all days for the past year (ending today)
    const today = new Date();
    const totalDays = 365;
    const allDays: { dateStr: string; dayOfWeek: number; month: number; year: number }[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDays.push({
        dateStr: d.toISOString().slice(0, 10),
        dayOfWeek: d.getDay(), // 0=Sun
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    // GitHub layout: columns = weeks, rows = days (0=Sun at top, 6=Sat at bottom)
    // First day determines its row offset
    const firstDay = allDays[0];
    const startDow = firstDay.dayOfWeek;

    // Calculate number of weeks (columns)
    const totalSlots = startDow + allDays.length;
    const numWeeks = Math.ceil(totalSlots / 7);

    // Find max
    let maxVal = 0;
    for (const day of allDays) {
      const p = map.get(day.dateStr);
      if (p && p.total > maxVal) maxVal = p.total;
    }

    // Build cells
    this.cells = allDays.map((day, i) => {
      const slot = startDow + i;
      const col = Math.floor(slot / 7);
      const row = slot % 7;
      const p = map.get(day.dateStr);
      const total = p?.total || 0;
      return {
        x: this.leftPad + col * step,
        y: this.topPad + row * step,
        fill: this.colorForValue(total, maxVal),
        date: day.dateStr,
        total,
        success: p?.success || 0,
        error: p?.error || 0,
      };
    });

    // Month labels - place at the first week where month starts
    this.monthLabels = [];
    let lastMonth = -1;
    for (const day of allDays) {
      if (day.month !== lastMonth) {
        lastMonth = day.month;
        const idx = allDays.indexOf(day);
        const slot = startDow + idx;
        const col = Math.floor(slot / 7);
        this.monthLabels.push({
          x: this.leftPad + col * step,
          text: HeatmapChartComponent.MONTHS_FR[day.month],
        });
      }
    }

    // Day labels on left (show Mon, Wed, Fri only like GitHub)
    this.dayLabelsY = [1, 3, 5].map(dow => ({
      y: this.topPad + dow * step + size / 2,
      text: HeatmapChartComponent.DAYS_FR[dow],
    }));

    this.vw = this.leftPad + numWeeks * step;
    this.vh = this.topPad + 7 * step;
  }

  private colorForValue(val: number, max: number): string {
    if (val === 0 || max === 0) return this.palette[0];
    const ratio = val / max;
    if (ratio <= 0.25) return this.palette[1];
    if (ratio <= 0.5) return this.palette[2];
    if (ratio <= 0.75) return this.palette[3];
    return this.palette[4];
  }

  showTip(i: number, ev: MouseEvent) {
    const cell = this.cells[i];
    if (!cell) return;
    const el = ev.currentTarget as SVGElement;
    const wrap = el.closest('.heatmap-wrap') as HTMLElement;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    this.tipX = elRect.left - wrapRect.left + elRect.width / 2;
    this.tipY = elRect.top - wrapRect.top;
    const parts = cell.date.split('-');
    const monthNames = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    this.tipDate = `${parseInt(parts[2])} ${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    this.tipTotal = cell.total;
    this.tipSuccess = cell.success;
    this.tipError = cell.error;
    this.tipVisible = true;
  }

  hideTip() { this.tipVisible = false; }
}
