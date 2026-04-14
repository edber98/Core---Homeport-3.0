import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';

interface ComparisonColumn {
  key: string;
  header: string;
}

interface ComparisonRow {
  label: string;
  [cellKey: string]: any;
}

interface ComparisonTableData {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

@Component({
  selector: 'ai-structured-comparison-table',
  standalone: true,
  imports: [CommonModule, NzTableModule],
  template: `
    <div class="table-wrap" *ngIf="data?.columns?.length">
      <nz-table
        [nzData]="data.rows"
        [nzShowPagination]="false"
        [nzFrontPagination]="false"
        [nzSize]="'small'"
        [nzBordered]="true"
        [nzScroll]="{ x: scrollX() }">
        <thead>
          <tr>
            <th class="sticky-col sticky-head label-col">&nbsp;</th>
            <th class="sticky-head" *ngFor="let c of data.columns">{{ c.header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of data.rows">
            <td class="sticky-col row-label">{{ r.label }}</td>
            <td *ngFor="let c of data.columns" class="cell">
              <ng-container *ngIf="isBool(r[c.key]); else textCell">
                <span *ngIf="r[c.key] === true" class="mark yes">&#10003;</span>
                <span *ngIf="r[c.key] === false" class="mark no">&#10007;</span>
              </ng-container>
              <ng-template #textCell>{{ renderCell(r[c.key]) }}</ng-template>
            </td>
          </tr>
        </tbody>
      </nz-table>
    </div>
  `,
  styles: [`
    .table-wrap { max-width: 100%; overflow: hidden; border-radius: 8px; }
    :host ::ng-deep .ant-table-small .ant-table-thead > tr > th {
      background: #fafafa; font-weight: 600; font-size: 12px; color: #333;
    }
    :host ::ng-deep .ant-table-small .ant-table-tbody > tr > td {
      font-size: 12px; color: #444;
    }
    .sticky-col {
      position: sticky; left: 0; z-index: 2;
      background: #fff !important;
    }
    .sticky-head {
      position: sticky; top: 0; z-index: 3;
    }
    .sticky-col.sticky-head { z-index: 4; background: #fafafa !important; }
    .label-col { min-width: 120px; }
    .row-label { font-weight: 600; color: #333; }
    .cell { vertical-align: top; word-break: break-word; }
    .mark { font-size: 14px; font-weight: 700; }
    .mark.yes { color: #52c41a; }
    .mark.no { color: #ff4d4f; opacity: 0.6; }
  `],
})
export class AiStructuredComparisonTableComponent {
  @Input() data!: ComparisonTableData;

  isBool(v: any): boolean {
    return typeof v === 'boolean';
  }

  renderCell(v: any): string {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  }

  scrollX(): string {
    const cols = this.data?.columns?.length || 0;
    const totalPx = 120 + cols * 140;
    return totalPx + 'px';
  }
}
