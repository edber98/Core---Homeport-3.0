import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface CardAction {
  label: string;
  payload?: any;
}

interface GridCard {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  actions?: CardAction[];
}

interface CardGridData {
  cards: GridCard[];
}

@Component({
  selector: 'ai-structured-card-grid',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzButtonModule, NzIconModule],
  template: `
    <div class="grid" *ngIf="data?.cards?.length">
      <nz-card
        *ngFor="let c of data.cards"
        class="card"
        [nzBordered]="true"
        [nzCover]="c.image ? coverTpl : undefined">
        <ng-template #coverTpl>
          <img class="card-img" [src]="c.image" [alt]="c.title" />
        </ng-template>
        <div class="card-body">
          <div class="card-title">{{ c.title }}</div>
          <div class="card-subtitle" *ngIf="c.subtitle">{{ c.subtitle }}</div>
          <div class="card-desc" *ngIf="c.description">{{ c.description }}</div>
          <div class="card-actions" *ngIf="c.actions?.length">
            <button
              *ngFor="let a of c.actions"
              nz-button
              nzSize="small"
              nzType="default"
              (click)="onAction(a, c)">
              {{ a.label }}
            </button>
          </div>
        </div>
      </nz-card>
    </div>
  `,
  styles: [`
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 10px;
    }
    :host ::ng-deep .card.ant-card {
      border-radius: 10px; overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    :host ::ng-deep .card.ant-card:hover {
      box-shadow: 0 4px 14px rgba(230, 25, 130, 0.12);
      transform: translateY(-1px);
    }
    :host ::ng-deep .card .ant-card-body { padding: 12px; }
    :host ::ng-deep .card .ant-card-cover { margin: 0; }
    .card-img {
      width: 100%; height: 130px; object-fit: cover; display: block;
    }
    .card-body { display: flex; flex-direction: column; gap: 4px; }
    .card-title {
      font-size: 13px; font-weight: 600; color: #333;
      line-height: 1.3;
    }
    .card-subtitle {
      font-size: 11px; color: #e61982;
      text-transform: uppercase; letter-spacing: 0.3px; font-weight: 500;
    }
    .card-desc {
      font-size: 12px; color: #666;
      line-height: 1.5;
      word-break: break-word;
    }
    .card-actions {
      display: flex; gap: 6px; flex-wrap: wrap;
      margin-top: 6px;
    }

    @media (max-width: 540px) {
      .grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AiStructuredCardGridComponent {
  @Input() data!: CardGridData;
  @Output() action = new EventEmitter<{ payload: any; card: GridCard }>();

  onAction(a: CardAction, card: GridCard): void {
    this.action.emit({ payload: a.payload, card });
  }
}
