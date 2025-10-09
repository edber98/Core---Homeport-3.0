import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { DynamicFormService, FieldConfig, FormSchema, isInputField } from '../../dynamic-form.service';

@Component({
  selector: 'df-records-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="df-records-table" *ngIf="columns.length; else noCols">
      <table class="rt">
        <thead>
          <tr>
            <th *ngFor="let col of columns">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of records">
            <td *ngFor="let col of columns">{{ display(row, col) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <ng-template #noCols>
      <div class="rt-empty">Aucune colonne disponible.</div>
    </ng-template>
  `,
  styles: [`
    .rt { width: 100%; border-collapse: collapse; }
    .rt th, .rt td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
    .rt th { font-weight: 600; color:#374151; background: #fafafa; }
    .rt-empty { color:#9ca3af; font-style: italic; }
  `]
})
export class RecordsTableComponent implements OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input({ required: true }) records: Array<Record<string, any>> = [];

  columns: Array<{ key: string; label: string; field: FieldConfig }> = [];

  constructor(private dfs: DynamicFormService) {}

  ngOnChanges(): void {
    this.columns = this.computeColumns(this.schema);
  }

  private computeColumns(schema: FormSchema) {
    // Use service to collect top-level input fields across steps/fields
    const all = this.dfs.collectFields(schema).filter(isInputField);
    const cols = all.map(f => ({ key: (f as any).key, label: f.label || (f as any).key || '', field: f }));
    // If records carry a name (prefer __name then name), add it as the first column
    const hasName = (this.records || []).some(r => r && (('__name' in r) || ('name' in r)));
    if (hasName) {
      (cols as any).unshift({ key: '__name', label: 'Nom', field: { type: 'text', label: 'Nom', key: '__name' } as any });
    }
    return cols;
  }

  display(row: Record<string, any>, col: { key: string; field: FieldConfig }) {
    try {
      if (col.key === '__name') return (row?.['__name'] ?? row?.['name'] ?? '');
      return this.dfs.displayValue(col.field, row ? row[col.key] : undefined, this.schema);
    } catch { return ''; }
  }
}
