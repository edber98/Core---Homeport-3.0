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
        <svg
          [attr.viewBox]="'0 0 ' + vw + ' ' + vh"
          [attr.width]="vw"
          [attr.height]="vh"
          class="heatmap-svg"
          preserveAspectRatio="xMinYMin meet"
        >
          <!-- Month labels -->
          <text *ngFor="let m of monthLabels" [attr.x]="m.x" [attr.y]="10" class="month-label">{{ m.text }}</text>
          <!-- Day labels (left side) -->
          <text *ngFor="let d of dayLabelsY" [attr.x]="0" [attr.y]="d.y" class="day-label">{{ d.text }}</text>
          <!-- Cells -->
          <rect *ngFor="let cell of cells; let i = index"
            [attr.x]="cell.x" [attr.y]="cell.y"
            [attr.width]="cellWidth" [attr.height]="cellHeight"
            [attr.rx]="2" [attr.ry]="2"
            [attr.fill]="cell.fill"
            class="cell"
            (mouseenter)="onCellEnter(i, $event)"
            (mouseleave)="onCellLeave()"
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
      <div
        class="tip"
        *ngIf="tipVisible"
        [class.tip-left]="tipAlign === 'left'"
        [class.tip-right]="tipAlign === 'right'"
        [style.left.px]="tipX"
        [style.top.px]="tipY"
      >
        <div class="tip-date">{{ tipDate }}</div>
        <div class="tip-val">{{ tipTotal }} exécution{{ tipTotal > 1 ? 's' : '' }}</div>
        <div class="tip-detail" *ngIf="tipTotal > 0">{{ tipSuccess }} succès · {{ tipError }} erreur{{ tipError > 1 ? 's' : '' }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .heatmap-wrap { position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; }
    .heatmap-scroll { flex: 1 1 auto; min-height: 0; overflow: hidden; }
    .heatmap-svg { display: block; max-width: 100%; }
    .cell { cursor: pointer; }
    .month-label { font-size: 9px; fill: #6b7280; font-family: inherit; }
    .day-label { font-size: 9px; fill: #94a3b8; font-family: inherit; dominant-baseline: middle; }
    .heatmap-legend { display: flex; align-items: center; gap: 3px; margin-top: 6px; justify-content: flex-end; flex: 0 0 auto; }
    .legend-label { font-size: 10px; color: #94a3b8; }
    .legend-box { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
    .tip { position: fixed; transform: translate(-50%, -110%); background: #0f172a; color: #fff; border-radius: 6px; padding: 4px 8px; font-size: 11px; pointer-events: none; box-shadow: 0 6px 12px rgba(0,0,0,.18); max-width: min(320px, calc(100vw - 24px)); white-space: normal; word-break: break-word; z-index: 2147483647; }
    .tip.tip-left { transform: translate(0, -110%); }
    .tip.tip-right { transform: translate(-100%, -110%); }
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

  cellWidth = 9;
  cellHeight = 9;
  colGap = 2;
  rowGap = 2;
  leftPad = 22; // space for day labels
  topPad = 16;  // space for month labels
  vw = 0;
  vh = 0;

  private resizeObs: ResizeObserver | null = null;
  private lastObservedWidth = 0;

  constructor(private elRef: ElementRef) {}

  tipVisible = false;
  tipX = 0;
  tipY = 0;
  tipAlign: 'left' | 'center' | 'right' = 'center';
  tipDate = '';
  tipTotal = 0;
  tipSuccess = 0;
  tipError = 0;

  palette = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

  private static MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  private static DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  ngAfterViewInit() {
    this.resizeObs = new ResizeObserver((entries) => {
      const rect = entries?.[0]?.contentRect;
      const width = Math.round(rect?.width || 0);
      if (!width) return;
      if (this.lastObservedWidth > 0 && Math.abs(width - this.lastObservedWidth) < 24) return;
      this.lastObservedWidth = width;
      this.compute();
    });
    this.resizeObs.observe(this.elRef.nativeElement);
    this.compute();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        this.compute();
        requestAnimationFrame(() => this.compute());
      });
    } else {
      setTimeout(() => this.compute(), 0);
    }
  }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
  }

  ngOnChanges(): void { this.compute(); }

  private compute() {
    // Auto-size: fill the available section without horizontal overflow.
    const host = this.elRef?.nativeElement as HTMLElement;
    const containerWidth = Math.max(320, host?.offsetWidth || 700);
    const containerHeight = Math.max(140, host?.offsetHeight || 220);
    const plotWidth = Math.max(120, containerWidth - this.leftPad);
    const legendReserve = 24;
    const plotHeight = Math.max(72, containerHeight - this.topPad - legendReserve);

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
        dayOfWeek: (d.getDay() + 6) % 7, // 0=Mon (ISO)
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    // GitHub layout: columns = weeks, rows = days (0=Mon at top, 6=Sun at bottom)
    // First day determines its row offset
    const firstDay = allDays[0];
    const startDow = firstDay.dayOfWeek;

    // Calculate number of weeks (columns)
    const totalSlots = startDow + allDays.length;
    const numWeeks = Math.ceil(totalSlots / 7);
    const stepX = plotWidth / Math.max(1, numWeeks);
    const stepY = plotHeight / 7;
    const minInnerGap = 1;
    const cellSize = Math.max(2, Math.min(stepX, stepY) - minInnerGap);
    this.cellWidth = cellSize;
    this.cellHeight = cellSize;
    this.colGap = Math.max(0.25, stepX - cellSize);
    this.rowGap = Math.max(0.25, stepY - cellSize);

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
        x: this.leftPad + col * stepX + this.colGap / 2,
        y: this.topPad + row * stepY + this.rowGap / 2,
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
          x: this.leftPad + col * stepX + this.colGap / 2,
          text: HeatmapChartComponent.MONTHS_FR[day.month],
        });
      }
    }

    // Day labels on left (show Mon, Wed, Fri only like GitHub)
    this.dayLabelsY = [0, 2, 4].map(dow => ({
      y: this.topPad + dow * stepY + stepY / 2,
      text: HeatmapChartComponent.DAYS_FR[dow],
    }));

    this.vw = this.leftPad + numWeeks * stepX;
    this.vh = this.topPad + 7 * stepY;
  }

  private colorForValue(val: number, max: number): string {
    if (val === 0 || max === 0) return this.palette[0];
    const ratio = val / max;
    if (ratio <= 0.25) return this.palette[1];
    if (ratio <= 0.5) return this.palette[2];
    if (ratio <= 0.75) return this.palette[3];
    return this.palette[4];
  }

  onCellEnter(i: number, ev: MouseEvent) {
    this.showTip(i, ev);
  }

  onCellLeave() {
    this.hideTip();
  }

  private showTip(i: number, ev: MouseEvent) {
    const cell = this.cells[i];
    if (!cell) return;
    const el = ev.currentTarget as SVGElement;
    const elRect = el.getBoundingClientRect();
    const centerX = elRect.left + elRect.width / 2;
    const viewportPadding = 12;
    const edgeThreshold = 170;
    if (centerX < edgeThreshold) {
      this.tipAlign = 'left';
      this.tipX = viewportPadding;
    } else if (centerX > window.innerWidth - edgeThreshold) {
      this.tipAlign = 'right';
      this.tipX = window.innerWidth - viewportPadding;
    } else {
      this.tipAlign = 'center';
      this.tipX = centerX;
    }
    this.tipY = Math.max(12, elRect.top - 8);
    const parts = cell.date.split('-');
    const monthNames = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    this.tipDate = `${parseInt(parts[2])} ${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`;
    this.tipTotal = cell.total;
    this.tipSuccess = cell.success;
    this.tipError = cell.error;
    this.tipVisible = true;
  }

  hideTip() {
    this.tipVisible = false;
  }
}
