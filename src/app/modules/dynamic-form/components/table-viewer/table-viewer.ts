import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DynamicFormService, FormSchema } from '../../dynamic-form.service';

@Component({
  selector: 'df-table-viewer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="df-table-viewer" *ngIf="schema">
      <ng-container *ngIf="summary?.length; else emptySchema">
        <div class="tv-step" *ngFor="let st of summary">
          <div class="tv-step-title" *ngIf="st.title">{{ st.title }}</div>
          <div class="tv-section" *ngFor="let sec of st.sections">
            <div class="tv-sec-title" *ngIf="sec.title">{{ sec.title }}</div>
            <table class="tv-table">
              <tbody>
                <tr *ngFor="let r of sec.rows">
                  <td class="k">{{ r.label }}</td>
                  <td class="v">{{ r.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
      <ng-template #emptySchema>
        <div class="tv-empty">Aucun champ à afficher.</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .tv-step { margin-bottom: 8px; }
    .tv-step-title { font-weight: 600; margin: 4px 0; }
    .tv-sec-title { color:#6b7280; margin: 6px 0 2px; font-size: 12px; }
    .tv-table { width: 100%; border-collapse: collapse; }
    .tv-table .k { width: 40%; color:#374151; padding: 4px 6px; border-bottom: 1px solid #f0f0f0; }
    .tv-table .v { color:#111827; padding: 4px 6px; border-bottom: 1px solid #f0f0f0; }
    .tv-empty { color:#9ca3af; font-style: italic; }
  `]
})
export class FormTableViewerComponent implements OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input() value: Record<string, any> = {};
  @Input() includeHidden = false;

  form!: FormGroup;
  summary: Array<{ title: string; sections: Array<{ title?: string; rows: Array<{ key: string; label: string; value: string }> }> }> = [];

  constructor(public dfs: DynamicFormService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.schema) { this.summary = []; return; }
    // Build a transient form to leverage visibility and display rules
    try {
      this.form = this.dfs.buildForm(this.schema, this.value || {});
      this.summary = this.dfs.buildSummaryModel(this.schema, this.form, this.includeHidden) as any;
    } catch { this.summary = []; }
  }
}

