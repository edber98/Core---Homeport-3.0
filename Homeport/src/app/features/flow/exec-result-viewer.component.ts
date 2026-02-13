import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { FilesBackendService } from '../../services/files-backend.service';

interface ViewField {
  key: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: any }>;
}

interface ViewSection {
  title: string;
  mode?: string;
  fields: ViewField[];
}

interface ScalarEntry {
  field: ViewField;
  value: any;
}

interface ArraySection {
  title: string;
  fields: ViewField[];
  rows: any[];
}

interface NestedSection {
  key: string;
  label: string;
  data: any;
}

@Component({
  selector: 'exec-result-viewer',
  standalone: true,
  imports: [CommonModule, NzTagModule, NzCollapseModule],
  template: `
    <div class="rv-root" *ngIf="hasData; else emptyTpl">
      <!-- Schema-based rendering -->
      <ng-container *ngIf="schema; else fallbackTpl">
        <!-- Scalar fields table -->
        <table class="rv-table" *ngIf="scalarEntries.length">
          <tr *ngFor="let entry of scalarEntries">
            <td class="rv-label">{{ entry.field.label }}</td>
            <td class="rv-value">
              <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: entry.field, value: entry.value }"></ng-container>
            </td>
          </tr>
        </table>

        <!-- Array sections -->
        <div class="rv-array-section" *ngFor="let sec of arraySections">
          <div class="rv-array-title">{{ sec.title }}</div>
          <table class="rv-data-table" *ngIf="sec.rows.length; else emptyArrayTpl">
            <thead>
              <tr>
                <th *ngFor="let col of sec.fields">{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of sec.rows">
                <td *ngFor="let col of sec.fields">
                  <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: col, value: row[col.key] }"></ng-container>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyArrayTpl>
            <div class="rv-empty">Aucun élément</div>
          </ng-template>
        </div>
      </ng-container>

      <!-- Fallback: no schema -->
      <ng-template #fallbackTpl>
        <ng-container *ngIf="fallbackMode === 'scalar'">
          <div class="rv-value rv-scalar-only">
            <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: data }"></ng-container>
          </div>
        </ng-container>

        <ng-container *ngIf="fallbackMode === 'flat-object'">
          <table class="rv-table">
            <tr *ngFor="let entry of flatEntries">
              <td class="rv-label">{{ entry.key }}</td>
              <td class="rv-value">
                <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: entry.value }"></ng-container>
              </td>
            </tr>
          </table>
          <!-- Nested sub-objects -->
          <ng-container *ngFor="let sub of nestedSections">
            <nz-collapse [nzBordered]="false" class="rv-nested-collapse">
              <nz-collapse-panel [nzHeader]="sub.label" [nzActive]="false">
                <exec-result-viewer [data]="sub.data" [schema]="null"></exec-result-viewer>
              </nz-collapse-panel>
            </nz-collapse>
          </ng-container>
        </ng-container>

        <ng-container *ngIf="fallbackMode === 'array-objects'">
          <table class="rv-data-table">
            <thead>
              <tr>
                <th *ngFor="let col of autoColumns">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of data">
                <td *ngFor="let col of autoColumns">
                  <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: row[col] }"></ng-container>
                </td>
              </tr>
            </tbody>
          </table>
        </ng-container>

        <ng-container *ngIf="fallbackMode === 'array-scalars'">
          <ul class="rv-scalar-list">
            <li *ngFor="let item of data">
              <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: item }"></ng-container>
            </li>
          </ul>
        </ng-container>
      </ng-template>
    </div>

    <ng-template #emptyTpl>
      <div class="rv-empty">Aucun résultat disponible</div>
    </ng-template>

    <!-- Schema-aware cell template -->
    <ng-template #cellTpl let-field="field" let-value="value">
      <span *ngIf="isTextType(field.type)">{{ value ?? '—' }}</span>

      <span *ngIf="field.type === 'checkbox'" class="rv-bool">
        <i class="fa-solid" [ngClass]="value ? 'fa-circle-check rv-check-ok' : 'fa-circle-xmark rv-check-no'"></i>
        {{ value ? 'Oui' : 'Non' }}
      </span>

      <span *ngIf="field.type === 'date'">{{ formatDate(value) }}</span>

      <span *ngIf="field.type === 'select' || field.type === 'radio'">{{ optionLabel(field, value) }}</span>

      <span *ngIf="field.type === 'tags'" class="rv-tags">
        <nz-tag *ngFor="let t of asArray(value)">{{ t }}</nz-tag>
      </span>

      <ng-container *ngIf="field.type === 'file'">
        <ng-container *ngIf="isFileRef(value)">
          <img *ngIf="isImage(value)" [src]="fileUrl(value)" class="rv-img-preview" />
          <a *ngIf="!isImage(value)" [href]="fileUrl(value)" target="_blank" class="rv-file-link">
            <i class="fa-solid fa-file"></i> {{ value.name }} ({{ formatSize(value.size) }})
          </a>
        </ng-container>
        <div *ngIf="isFileArray(value)" class="rv-file-grid">
          <ng-container *ngFor="let f of value">
            <img *ngIf="isImage(f)" [src]="fileUrl(f)" class="rv-img-preview" />
            <a *ngIf="!isImage(f)" [href]="fileUrl(f)" target="_blank" class="rv-file-link">
              <i class="fa-solid fa-file"></i> {{ f.name }}
            </a>
          </ng-container>
        </div>
        <span *ngIf="!isFileRef(value) && !isFileArray(value)">{{ value ?? '—' }}</span>
      </ng-container>

      <!-- Fallback for unknown schema types -->
      <ng-container *ngIf="isUnknownType(field.type)">
        <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: value }"></ng-container>
      </ng-container>
    </ng-template>

    <!-- Auto-detection cell template (no schema) -->
    <ng-template #autoCellTpl let-value="value">
      <ng-container *ngIf="isFileRef(value)">
        <img *ngIf="isImage(value)" [src]="fileUrl(value)" class="rv-img-preview" />
        <a *ngIf="!isImage(value)" [href]="fileUrl(value)" target="_blank" class="rv-file-link">
          <i class="fa-solid fa-file"></i> {{ value.name }} ({{ formatSize(value.size) }})
        </a>
      </ng-container>
      <ng-container *ngIf="!isFileRef(value)">
        <span *ngIf="isBool(value)" class="rv-bool">
          <i class="fa-solid" [ngClass]="value ? 'fa-circle-check rv-check-ok' : 'fa-circle-xmark rv-check-no'"></i>
          {{ value ? 'Oui' : 'Non' }}
        </span>
        <span *ngIf="isImageUrl(value)"><img [src]="value" class="rv-img-preview" /></span>
        <span *ngIf="!isBool(value) && !isImageUrl(value)">{{ formatAuto(value) }}</span>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    .rv-root { font-size: 13px; }

    .rv-table { width: 100%; border-collapse: collapse; }
    .rv-table .rv-label { width: 35%; font-weight: 500; color: #374151; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; background: #fafafa; vertical-align: top; white-space: nowrap; }
    .rv-table .rv-value { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; word-break: break-word; }

    .rv-data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .rv-data-table th { background: #f9fafb; font-weight: 500; padding: 6px 10px; border: 1px solid #e5e7eb; text-align: left; }
    .rv-data-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
    .rv-data-table tr:hover { background: #f0f7ff; }

    .rv-array-title { font-weight: 600; margin: 12px 0 6px; font-size: 13px; color: #374151; }
    .rv-array-section + .rv-array-section { margin-top: 8px; }

    .rv-check-ok { color: #16a34a; }
    .rv-check-no { color: #9ca3af; }
    .rv-bool { display: inline-flex; align-items: center; gap: 5px; }

    .rv-tags { display: inline-flex; gap: 4px; flex-wrap: wrap; }

    .rv-img-preview { max-width: 120px; max-height: 80px; border-radius: 6px; object-fit: cover; cursor: pointer; }
    .rv-file-link { color: #1677ff; text-decoration: none; }
    .rv-file-link:hover { text-decoration: underline; }
    .rv-file-grid { display: flex; gap: 8px; flex-wrap: wrap; }

    .rv-section-title { font-weight: 600; margin: 10px 0 4px; padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
    .rv-empty { color: #9ca3af; font-style: italic; padding: 16px; text-align: center; }

    .rv-scalar-only { padding: 8px 10px; }
    .rv-scalar-list { list-style: disc; margin: 0; padding: 0 0 0 20px; }
    .rv-scalar-list li { padding: 2px 0; }

    .rv-nested-collapse { margin-top: 4px; }
    :host ::ng-deep .rv-nested-collapse .ant-collapse-header { padding: 6px 10px !important; font-weight: 500; font-size: 13px; background: #fafafa; }
    :host ::ng-deep .rv-nested-collapse .ant-collapse-content-box { padding: 4px 8px !important; }
  `]
})
export class ExecResultViewerComponent implements OnChanges {
  @Input() data: any;
  @Input() schema: any = null;

  hasData = false;
  scalarEntries: ScalarEntry[] = [];
  arraySections: ArraySection[] = [];

  // Fallback (no schema)
  fallbackMode: 'scalar' | 'flat-object' | 'array-objects' | 'array-scalars' | null = null;
  flatEntries: Array<{ key: string; value: any }> = [];
  nestedSections: NestedSection[] = [];
  autoColumns: string[] = [];

  private textTypes = new Set(['text', 'textarea', 'number', 'email', 'url', 'tel', 'password', 'color', 'hidden', 'expression', 'code', 'json', 'html']);
  private knownTypes = new Set([...this.textTypes, 'checkbox', 'date', 'select', 'radio', 'tags', 'file']);

  constructor(private filesService: FilesBackendService) {}

  ngOnChanges(changes: SimpleChanges) {
    this.compute();
  }

  private compute() {
    const d = this.data;
    this.hasData = d != null && d !== '' && !(typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0);
    if (!this.hasData) return;

    if (this.schema && this.schema.fields) {
      this.computeWithSchema();
    } else if (this.schema && Array.isArray(this.schema)) {
      // Schema is directly an array of fields
      this.schema = { fields: this.schema };
      this.computeWithSchema();
    } else {
      this.computeFallback();
    }
  }

  private computeWithSchema() {
    const fields: any[] = this.schema.fields || [];
    const sections: ViewSection[] = this.schema.sections || [];
    const d = this.data || {};

    this.scalarEntries = [];
    this.arraySections = [];

    // Process sections (mode=array) first
    const sectionKeys = new Set<string>();
    for (const sec of sections) {
      if (sec.mode === 'array' && sec.fields) {
        const key = (sec as any).key || sec.title;
        const arrData = d[key] || d[(sec as any).dataKey] || [];
        sectionKeys.add(key);
        if ((sec as any).dataKey) sectionKeys.add((sec as any).dataKey);
        this.arraySections.push({
          title: sec.title || key,
          fields: sec.fields.map(f => ({ key: f.key, label: f.label || f.key, type: f.type || 'text', options: f.options })),
          rows: Array.isArray(arrData) ? arrData : []
        });
      }
    }

    // Process top-level fields as scalars
    for (const f of fields) {
      if (sectionKeys.has(f.key)) continue;
      // If field data is an array of objects and no section defined, auto-create array section
      const val = d[f.key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && !this.isFileRef(val[0])) {
        const cols = Object.keys(val[0]).map(k => ({ key: k, label: k, type: 'text' as string, options: undefined as any }));
        this.arraySections.push({ title: f.label || f.key, fields: cols, rows: val });
      } else {
        this.scalarEntries.push({
          field: { key: f.key, label: f.label || f.key, type: f.type || 'text', options: f.options },
          value: val
        });
      }
    }
  }

  private computeFallback() {
    const d = this.data;
    this.flatEntries = [];
    this.nestedSections = [];
    this.autoColumns = [];

    if (Array.isArray(d)) {
      if (d.length === 0) {
        this.fallbackMode = 'scalar';
      } else if (typeof d[0] === 'object' && d[0] !== null) {
        this.fallbackMode = 'array-objects';
        this.autoColumns = Object.keys(d[0]);
      } else {
        this.fallbackMode = 'array-scalars';
      }
    } else if (typeof d === 'object' && d !== null) {
      this.fallbackMode = 'flat-object';
      for (const key of Object.keys(d)) {
        const val = d[key];
        if (val != null && typeof val === 'object' && !Array.isArray(val) && !this.isFileRef(val)) {
          this.nestedSections.push({ key, label: key, data: val });
        } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && !this.isFileRef(val[0])) {
          this.nestedSections.push({ key, label: key, data: val });
        } else {
          this.flatEntries.push({ key, value: val });
        }
      }
    } else {
      this.fallbackMode = 'scalar';
    }
  }

  // Type checks
  isTextType(type: string): boolean { return this.textTypes.has(type); }
  isUnknownType(type: string): boolean { return !this.knownTypes.has(type); }

  isFileRef(v: any): boolean {
    return v && typeof v === 'object' && v._type === 'fileRef';
  }

  isFileArray(v: any): boolean {
    return Array.isArray(v) && v.length > 0 && this.isFileRef(v[0]);
  }

  isImage(ref: any): boolean {
    return /^image\//i.test(ref?.mimeType || '');
  }

  isBool(v: any): boolean {
    return typeof v === 'boolean';
  }

  isImageUrl(v: any): boolean {
    if (typeof v !== 'string') return false;
    return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(v);
  }

  fileUrl(ref: any): string {
    if (!ref?.fileId) return '';
    return this.filesService.downloadUrl(ref.fileId);
  }

  formatDate(v: any): string {
    try {
      return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return String(v); }
  }

  optionLabel(field: any, value: any): string {
    const opt = (field.options || []).find((o: any) => o.value === value);
    return opt?.label || String(value ?? '—');
  }

  formatSize(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1048576).toFixed(1) + ' Mo';
  }

  asArray(v: any): any[] {
    return Array.isArray(v) ? v : (v != null ? [v] : []);
  }

  formatAuto(v: any): string {
    if (v == null) return '—';
    if (typeof v === 'object') {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  }
}
