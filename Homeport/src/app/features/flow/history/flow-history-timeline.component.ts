import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

@Component({
  selector: 'flow-history-timeline',
  standalone: true,
  imports: [CommonModule, NzTimelineModule],
  template: `
    <div class="timeline-root" (mouseleave)="leave.emit()">
      <div class="panel-heading">
        <div class="card-title left">
          <span class="t">Historique</span>
          <span class="s">Snapshots</span>
        </div>
      </div>
      <div class="history-container" (click)="onContainerClick($event)">
        <nz-timeline>
          <nz-timeline-item *ngFor="let it of pastItems; let idx = index; trackBy: trackPast" [nzColor]="it.color">
            <div class="row" [attr.data-index]="idx" data-section="past"
                 (mouseenter)="hoverPast.emit(idx)">
              <span class="time">{{ it.time }}</span>
              <span class="type" [style.color]="it.color">{{ it.type }}</span>
              <span class="msg">{{ it.message }}</span>
            </div>
          </nz-timeline-item>
          <nz-timeline-item *ngFor="let it of futureItems; let idx = index; trackBy: trackFuture" [nzColor]="it.color">
            <div class="row" [attr.data-index]="idx" data-section="future"
                 (mouseenter)="hoverFuture.emit(idx)">
              <span class="time">{{ it.time }}</span>
              <span class="type" [style.color]="it.color">{{ it.type }}</span>
              <span class="msg">{{ it.message }}</span>
            </div>
          </nz-timeline-item>
        </nz-timeline>
      </div>
    </div>
  `,
  styles: [`
    .timeline-root { display:flex; flex-direction:column; gap:0px; margin-top:8px; }
    /* Panel heading matches other panels */
    .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    /* Content container: no borders, scroll only */
    .history-container { max-height: 540px; overflow:auto; background:#fff; padding:0 4px; padding-top: 11px; }
    .row { display:flex; gap:8px; align-items:center; font-size:12px; cursor: pointer; }
    .row:hover { cursor: pointer; }
    .row:active { cursor: progress; }
    .row .time { color:#6b7280; min-width: 56px; }
    .row .type { font-weight:600; }
    .row .msg { color:#111; }
  `]
})
export class FlowHistoryTimelineComponent {
  @Input() pastItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Input() futureItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Output() hoverPast = new EventEmitter<number>();
  @Output() hoverFuture = new EventEmitter<number>();
  @Output() leave = new EventEmitter<void>();
  @Output() clickPast = new EventEmitter<number>();
  @Output() clickFuture = new EventEmitter<number>();

  emitPast(idx: number) { this.clickPast.emit(idx); }
  emitFuture(idx: number) { this.clickFuture.emit(idx); }
  trackPast = (_: number, it: any) => it?.key || _;
  trackFuture = (_: number, it: any) => it?.key || _;

  onContainerClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement | null;
    if (!el) return;
    const row = el.closest('.row') as HTMLElement | null;
    if (!row) return;
    const idxAttr = row.getAttribute('data-index');
    const sec = row.getAttribute('data-section');
    const idx = Math.max(0, Number(idxAttr) || 0);
    if (sec === 'past') this.emitPast(idx);
    else if (sec === 'future') this.emitFuture(idx);
  }

}
