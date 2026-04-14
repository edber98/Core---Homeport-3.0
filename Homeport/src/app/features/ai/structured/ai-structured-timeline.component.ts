import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface TimelineEvent {
  date: string | Date;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface TimelineData {
  events: TimelineEvent[];
}

@Component({
  selector: 'ai-structured-timeline',
  standalone: true,
  imports: [CommonModule, NzTimelineModule, NzIconModule, DatePipe],
  template: `
    <nz-timeline class="tl" *ngIf="data?.events?.length">
      <nz-timeline-item
        *ngFor="let e of data.events"
        [nzColor]="e.color || '#e61982'"
        [nzDot]="e.icon ? iconDotTpl : undefined">
        <ng-template #iconDotTpl>
          <span nz-icon [nzType]="e.icon || 'clock-circle'" nzTheme="outline" [style.color]="e.color || '#e61982'"></span>
        </ng-template>
        <div class="event">
          <div class="event-date">{{ formatDate(e.date) }}</div>
          <div class="event-title">{{ e.title }}</div>
          <div class="event-desc" *ngIf="e.description">{{ e.description }}</div>
        </div>
      </nz-timeline-item>
    </nz-timeline>
  `,
  styles: [`
    .tl { padding-left: 2px; }
    :host ::ng-deep .tl.ant-timeline {
      font-size: 12px;
    }
    :host ::ng-deep .tl .ant-timeline-item-tail {
      border-left-color: #eee;
    }
    .event { padding: 2px 0 8px; }
    .event-date {
      font-size: 11px; color: #999; text-transform: uppercase;
      letter-spacing: 0.3px; font-weight: 500;
    }
    .event-title {
      font-size: 13px; font-weight: 600; color: #333;
      margin-top: 2px;
    }
    .event-desc {
      font-size: 12px; color: #666;
      margin-top: 2px; line-height: 1.5;
      word-break: break-word;
    }
  `],
})
export class AiStructuredTimelineComponent {
  @Input() data!: TimelineData;

  formatDate(d: string | Date): string {
    if (!d) return '';
    try {
      const dt = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(dt.getTime())) return String(d);
      // French formatted date
      return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(d);
    }
  }
}
