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
    .table-wrap {
      max-width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      /* Scrollbar fine pour tables larges */
      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.2) transparent;
    }
    .table-wrap::-webkit-scrollbar { height: 6px; }
    .table-wrap::-webkit-scrollbar-track { background: transparent; }
    .table-wrap::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
    :host ::ng-deep .ant-table-small {
      /* table-layout auto pour adaptation naturelle aux contenus */
      table-layout: auto !important;
      width: 100%;
    }
    :host ::ng-deep .ant-table-small table { width: 100% !important; }
    :host ::ng-deep .ant-table-small .ant-table-thead > tr > th {
      background: #fafafa; font-weight: 600; font-size: 12px; color: #333;
      padding: 8px 10px !important;
      white-space: nowrap;
    }
    :host ::ng-deep .ant-table-small .ant-table-tbody > tr > td {
      font-size: 12px; color: #444;
      padding: 8px 10px !important;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      max-width: 320px;
    }
    .sticky-col {
      position: sticky; left: 0; z-index: 2;
      background: #fff !important;
      box-shadow: 2px 0 4px -2px rgba(0,0,0,0.06);
    }
    .sticky-head { position: sticky; top: 0; z-index: 3; }
    .sticky-col.sticky-head { z-index: 4; background: #fafafa !important; }
    .label-col { min-width: 140px; max-width: 200px; }
    .row-label {
      font-weight: 600; color: #333;
      min-width: 140px; max-width: 200px;
      word-break: break-word;
    }
    .cell { vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
    .mark { font-size: 14px; font-weight: 700; }
    .mark.yes { color: #52c41a; }
    .mark.no { color: #ff4d4f; opacity: 0.6; }
    /* Sur petits écrans, pas de sticky (gagne de la place) */
    @media (max-width: 640px) {
      .sticky-col { position: static; box-shadow: none; }
      :host ::ng-deep .ant-table-small .ant-table-tbody > tr > td { max-width: none; }
    }
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
    // Pour 2-3 colonnes, pas de scroll — le max-width: 100% fait le job.
    // Au-delà (4+), on active le scroll horizontal avec cellules dimensionnées.
    const cols = this.data?.columns?.length || 0;
    if (cols <= 3) return 'max-content';
    const totalPx = 160 + cols * 160;
    return totalPx + 'px';
  }
}
