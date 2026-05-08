import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FilesBackendService } from '../../services/files-backend.service';

interface ViewField {
  key: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: any }>;
  // File-specific
  accept?: string;
  multiple?: boolean;
  listType?: string;
  preview?: boolean;
  // Tags-specific
  tags?: { itemType?: string };
  // Secret
  secret?: boolean;
  // Cron-specific
  cron?: any;
  // Any extra field config
  [extra: string]: any;
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

interface SectionGroup {
  title: string;
  entries: ScalarEntry[];
  arraySections: ArraySection[];
}

@Component({
  selector: 'exec-result-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, NzTagModule, NzCollapseModule, NzSwitchModule, NzRateModule],
  template: `
    <div class="rv-root" *ngIf="hasData; else emptyTpl">
      <!-- Schema-based rendering -->
      <ng-container *ngIf="hasSchema">
        <!-- Scalar fields -->
        <ng-container *ngIf="!labelsOnTop">
          <table class="rv-table" *ngIf="scalarEntries.length">
            <tr *ngFor="let entry of scalarEntries">
              <td class="rv-label">{{ entry.field.label }}</td>
              <td class="rv-value">
                <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: entry.field, value: entry.value }"></ng-container>
              </td>
            </tr>
          </table>
        </ng-container>
        <ng-container *ngIf="labelsOnTop">
          <div class="rv-vertical" *ngFor="let entry of scalarEntries">
            <div class="rv-vlabel">{{ entry.field.label }}</div>
            <div class="rv-vvalue">
              <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: entry.field, value: entry.value }"></ng-container>
            </div>
          </div>
        </ng-container>

        <!-- Array sections -->
        <div class="rv-array-section" *ngFor="let sec of arraySections">
          <div class="rv-array-title">{{ sec.title }} <span class="rv-array-count">({{ sec.rows.length }})</span></div>
          <div class="rv-table-scroll">
            <table class="rv-data-table" *ngIf="sec.rows.length; else emptyArrayTpl">
              <thead>
                <tr><th *ngFor="let col of sec.fields">{{ col.label }}</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of sec.rows">
                  <td *ngFor="let col of sec.fields">
                    <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: col, value: row[col.key] }"></ng-container>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #emptyArrayTpl><div class="rv-empty">Aucun élément</div></ng-template>
        </div>

        <!-- Section groups (nested object sections) -->
        <ng-container *ngFor="let group of sectionGroups">
          <div class="rv-section-header">{{ group.title }}</div>
          <ng-container *ngIf="!labelsOnTop">
            <table class="rv-table" *ngIf="group.entries.length">
              <tr *ngFor="let entry of group.entries">
                <td class="rv-label">{{ entry.field.label }}</td>
                <td class="rv-value">
                  <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: entry.field, value: entry.value }"></ng-container>
                </td>
              </tr>
            </table>
          </ng-container>
          <ng-container *ngIf="labelsOnTop">
            <div class="rv-vertical" *ngFor="let entry of group.entries">
              <div class="rv-vlabel">{{ entry.field.label }}</div>
              <div class="rv-vvalue">
                <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: entry.field, value: entry.value }"></ng-container>
              </div>
            </div>
          </ng-container>
          <div class="rv-array-section" *ngFor="let sec of group.arraySections">
            <div class="rv-array-title">{{ sec.title }} <span class="rv-array-count">({{ sec.rows.length }})</span></div>
            <div class="rv-table-scroll">
              <table class="rv-data-table" *ngIf="sec.rows.length">
                <thead><tr><th *ngFor="let col of sec.fields">{{ col.label }}</th></tr></thead>
                <tbody><tr *ngFor="let row of sec.rows"><td *ngFor="let col of sec.fields">
                  <ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ field: col, value: row[col.key] }"></ng-container>
                </td></tr></tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <!-- Unknown fields (not in schema) -->
        <ng-container *ngIf="unknownEntries.length">
          <div class="rv-unknown-header">
            <span class="rv-unknown-label">Champs hors schéma ({{ unknownEntries.length }})</span>
            <nz-switch [(ngModel)]="showUnknown" nzSize="small"></nz-switch>
          </div>
          <ng-container *ngIf="showUnknown">
            <table class="rv-table rv-unknown-table">
              <tr *ngFor="let entry of unknownEntries">
                <td class="rv-label">{{ entry.key }}</td>
                <td class="rv-value">
                  <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: entry.value }"></ng-container>
                </td>
              </tr>
            </table>
          </ng-container>
        </ng-container>
      </ng-container>

      <!-- Fallback: no schema -->
      <ng-container *ngIf="!hasSchema">
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
          <ng-container *ngFor="let sub of nestedSections">
            <nz-collapse [nzBordered]="false" class="rv-nested-collapse">
              <nz-collapse-panel [nzHeader]="sub.label" [nzActive]="false">
                <exec-result-viewer [data]="sub.data" [schema]="null"></exec-result-viewer>
              </nz-collapse-panel>
            </nz-collapse>
          </ng-container>
        </ng-container>

        <ng-container *ngIf="fallbackMode === 'array-objects'">
          <div class="rv-table-scroll">
            <table class="rv-data-table">
              <thead>
                <tr><th *ngFor="let col of autoColumns">{{ col }}</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of data">
                  <td *ngFor="let col of autoColumns">
                    <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: row[col] }"></ng-container>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>

        <ng-container *ngIf="fallbackMode === 'array-scalars'">
          <ul class="rv-scalar-list">
            <li *ngFor="let item of data">
              <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: item }"></ng-container>
            </li>
          </ul>
        </ng-container>
      </ng-container>
    </div>

    <ng-template #emptyTpl>
      <div class="rv-empty">Aucun résultat disponible</div>
    </ng-template>

    <!-- Schema-aware cell template -->
    <ng-template #cellTpl let-field="field" let-value="value">
      <!-- Secret fields → masked -->
      <ng-container *ngIf="field.secret && value">
        <span class="rv-secret">••••••••</span>
      </ng-container>

      <ng-container *ngIf="!field.secret">
        <!-- Simple text types: text, number, tel, password, hidden -->
        <span *ngIf="isSimpleTextType(field.type)">{{ value ?? '—' }}</span>

        <!-- textarea → preserve whitespace -->
        <span *ngIf="field.type === 'textarea'" class="rv-prewrap">{{ value ?? '—' }}</span>

        <!-- url → clickable link -->
        <ng-container *ngIf="field.type === 'url'">
          <a *ngIf="value" [href]="value" target="_blank" rel="noopener" class="rv-link">{{ value }}</a>
          <span *ngIf="!value">—</span>
        </ng-container>

        <!-- resolver → texte / lien si URL -->
        <ng-container *ngIf="field.type === 'resolver'">
          <a *ngIf="value && (''+value).startsWith('http')" [href]="value" target="_blank" rel="noopener" class="rv-link">{{ value }}</a>
          <code *ngIf="value && !((''+value).startsWith('http'))" class="rv-code">{{ value }}</code>
          <span *ngIf="!value">—</span>
        </ng-container>

        <!-- email → mailto link -->
        <ng-container *ngIf="field.type === 'email'">
          <a *ngIf="value" [href]="'mailto:' + value" class="rv-link">{{ value }}</a>
          <span *ngIf="!value">—</span>
        </ng-container>

        <!-- color → swatch + hex -->
        <ng-container *ngIf="field.type === 'color'">
          <span *ngIf="value" class="rv-color">
            <span class="rv-color-swatch" [style.background]="value"></span>
            {{ value }}
          </span>
          <span *ngIf="!value">—</span>
        </ng-container>

        <ng-container *ngIf="field.type === 'rate'">
          <span *ngIf="value != null && value !== ''" class="rv-rate">
            <nz-rate
              [ngModel]="normalizeRateValue(value, field)"
              [ngModelOptions]="{ standalone: true }"
              [nzCount]="5"
              [nzAllowHalf]="field.rate?.allowHalf === true"
              [nzDisabled]="true">
            </nz-rate>
            <span class="rv-rate-value">{{ normalizeRateValue(value, field) }}/5</span>
          </span>
          <span *ngIf="value == null || value === ''">—</span>
        </ng-container>

        <!-- code / expression / cron → monospace -->
        <ng-container *ngIf="field.type === 'code' || field.type === 'expression' || field.type === 'cron'">
          <code *ngIf="value != null" class="rv-code">{{ value }}</code>
          <span *ngIf="value == null">—</span>
        </ng-container>

        <!-- json → formatted JSON block -->
        <ng-container *ngIf="field.type === 'json' || field.type === 'schema_builder'">
          <pre *ngIf="value != null" class="rv-json">{{ formatJson(value) }}</pre>
          <span *ngIf="value == null">—</span>
        </ng-container>

        <!-- html → rendered HTML -->
        <ng-container *ngIf="field.type === 'html'">
          <div *ngIf="value" class="rv-html" [innerHTML]="sanitizeHtml(value)"></div>
          <span *ngIf="!value">—</span>
        </ng-container>

        <!-- checkbox / boolean -->
        <span *ngIf="field.type === 'checkbox' || field.type === 'boolean'" class="rv-bool">
          <i class="fa-solid" [ngClass]="value ? 'fa-circle-check rv-check-ok' : 'fa-circle-xmark rv-check-no'"></i>
          {{ value ? 'Oui' : 'Non' }}
        </span>

        <!-- date -->
        <span *ngIf="field.type === 'date'">{{ formatDate(value, field) }}</span>

        <!-- select / radio → option label -->
        <span *ngIf="field.type === 'select' || field.type === 'radio'">{{ optionLabel(field, value) }}</span>

        <!-- tags / text_array -->
        <span *ngIf="field.type === 'tags' || field.type === 'text_array'" class="rv-tags">
          <nz-tag *ngFor="let t of asArray(value)" [nzColor]="field.tags?.itemType === 'number' ? 'blue' : ''">{{ t }}</nz-tag>
          <span *ngIf="!asArray(value).length">—</span>
        </span>

        <!-- file -->
        <ng-container *ngIf="field.type === 'file'">
          <!-- Single file ref -->
          <ng-container *ngIf="isFileRef(value)">
            <img *ngIf="isImageFile(value, field)" [src]="fileUrl(value)" class="rv-img-preview"
                 [class.rv-img-card]="field.listType === 'picture-card'" (click)="openLightbox(fileUrl(value))" />
            <a *ngIf="!isImageFile(value, field)" [href]="fileUrl(value)" target="_blank" class="rv-file-link">
              <i class="fa-solid fa-file"></i> {{ value.name }} ({{ formatSize(value.size) }})
            </a>
          </ng-container>
          <!-- Array of files -->
          <div *ngIf="isFileArray(value)" [class]="isImageAccept(field) ? 'rv-img-grid' : 'rv-file-list'">
            <ng-container *ngFor="let f of value">
              <img *ngIf="isImageFile(f, field)" [src]="fileUrl(f)" class="rv-img-preview"
                   [class.rv-img-card]="field.listType === 'picture-card'" (click)="openLightbox(fileUrl(f))" />
              <a *ngIf="!isImageFile(f, field)" [href]="fileUrl(f)" target="_blank" class="rv-file-link">
                <i class="fa-solid fa-file"></i> {{ f.name }} ({{ formatSize(f.size) }})
              </a>
            </ng-container>
          </div>
          <span *ngIf="!isFileRef(value) && !isFileArray(value)">{{ value ?? '—' }}</span>
        </ng-container>

        <!-- Fallback for any remaining unknown type -->
        <ng-container *ngIf="isUnknownType(field.type)">
          <ng-container [ngTemplateOutlet]="autoCellTpl" [ngTemplateOutletContext]="{ value: value }"></ng-container>
        </ng-container>
      </ng-container>
    </ng-template>

    <!-- Auto-detection cell template (no schema) -->
    <ng-template #autoCellTpl let-value="value">
      <ng-container *ngIf="isFileRef(value)">
        <img *ngIf="isImage(value)" [src]="fileUrl(value)" class="rv-img-preview" (click)="openLightbox(fileUrl(value))" />
        <a *ngIf="!isImage(value)" [href]="fileUrl(value)" target="_blank" class="rv-file-link">
          <i class="fa-solid fa-file"></i> {{ value.name }} ({{ formatSize(value.size) }})
        </a>
      </ng-container>
      <ng-container *ngIf="!isFileRef(value)">
        <span *ngIf="isBool(value)" class="rv-bool">
          <i class="fa-solid" [ngClass]="value ? 'fa-circle-check rv-check-ok' : 'fa-circle-xmark rv-check-no'"></i>
          {{ value ? 'Oui' : 'Non' }}
        </span>
        <span *ngIf="isDateValue(value)" class="rv-date-auto">{{ formatDate(value) }}</span>
        <span *ngIf="isImageUrl(value)"><img [src]="value" class="rv-img-preview" (click)="openLightbox(value)" /></span>
        <a *ngIf="isUrl(value)" [href]="value" target="_blank" rel="noopener" class="rv-link">{{ value }}</a>
        <span *ngIf="!isBool(value) && !isDateValue(value) && !isImageUrl(value) && !isUrl(value)">{{ formatAuto(value) }}</span>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    .rv-root { font-size: 13px; }

    .rv-table { width: 100%; border-collapse: collapse; }
    .rv-table .rv-label { width: 35%; font-weight: 500; font-style: italic; color: #374151; padding: 6px 10px; border-bottom: 1px solid #f0f0f0; background: #fafafa; vertical-align: top; white-space: nowrap; }
    .rv-table .rv-value { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; word-break: break-word; }
    @media (max-width: 600px) {
      .rv-table .rv-label { width: auto; display: block; border-bottom: none; padding-bottom: 2px; }
      .rv-table .rv-value { display: block; padding-top: 0; }
      .rv-table tr { display: block; border-bottom: 1px solid #f0f0f0; padding: 4px 0; }
    }

    .rv-vertical { margin-bottom: 10px; }
    .rv-vlabel { font-weight: 500; font-style: italic; color: #374151; font-size: 12px; margin-bottom: 2px; }
    .rv-vvalue { padding: 2px 0; word-break: break-word; }

    .rv-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .rv-data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .rv-data-table th { background: #f9fafb; font-weight: 500; padding: 6px 10px; border: 1px solid #e5e7eb; text-align: left; white-space: nowrap; }
    .rv-data-table td { padding: 6px 10px; border: 1px solid #e5e7eb; }
    .rv-data-table tr:hover td { background: #f0f7ff; }

    .rv-array-title { font-weight: 600; margin: 12px 0 6px; font-size: 13px; color: #374151; }
    .rv-array-count { font-weight: 400; color: #9ca3af; }
    .rv-array-section + .rv-array-section { margin-top: 8px; }

    .rv-check-ok { color: #16a34a; }
    .rv-check-no { color: #9ca3af; }
    .rv-bool { display: inline-flex; align-items: center; gap: 5px; }

    .rv-tags { display: inline-flex; gap: 4px; flex-wrap: wrap; }

    .rv-img-preview { max-width: 160px; max-height: 100px; border-radius: 6px; object-fit: cover; cursor: pointer; transition: opacity 0.15s; }
    .rv-img-preview:hover { opacity: 0.8; }
    .rv-file-link { color: #e61982; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
    .rv-file-link:hover { text-decoration: underline; }
    .rv-img-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .rv-file-list { display: flex; flex-direction: column; gap: 4px; }
    .rv-img-card { max-width: 140px; max-height: 140px; border-radius: 8px; border: 1px solid #e5e7eb; padding: 4px; }

    .rv-secret { color: #9ca3af; letter-spacing: 2px; }
    .rv-date-auto { font-variant-numeric: tabular-nums; }

    .rv-link { color: #e61982; text-decoration: none; word-break: break-all; }
    .rv-link:hover { text-decoration: underline; }

    .rv-color { display: inline-flex; align-items: center; gap: 6px; font-family: monospace; }
    .rv-color-swatch { display: inline-block; width: 18px; height: 18px; border-radius: 4px; border: 1px solid #d1d5db; flex-shrink: 0; }
    .rv-rate { display: inline-flex; align-items: center; gap: 8px; }
    .rv-rate-value { color: #6b7280; font-variant-numeric: tabular-nums; }

    .rv-code { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; word-break: break-all; }
    .rv-json { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; font-size: 12px; background: #f3f4f6; padding: 8px 10px; border-radius: 6px; margin: 0; overflow-x: auto; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    .rv-html { font-size: 13px; line-height: 1.5; }
    .rv-prewrap { white-space: pre-wrap; }

    .rv-empty { color: #9ca3af; font-style: italic; padding: 16px; text-align: center; }

    .rv-scalar-only { padding: 8px 10px; }
    .rv-scalar-list { list-style: disc; margin: 0; padding: 0 0 0 20px; }
    .rv-scalar-list li { padding: 2px 0; }

    .rv-nested-collapse { margin-top: 4px; }
    :host ::ng-deep .rv-nested-collapse .ant-collapse-header { padding: 6px 10px !important; font-weight: 500; font-size: 13px; background: #fafafa; }
    :host ::ng-deep .rv-nested-collapse .ant-collapse-content-box { padding: 4px 8px !important; }

    .rv-section-header { font-weight: 600; font-size: 13px; color: #374151; padding: 8px 10px 4px; margin-top: 8px; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    .rv-unknown-header { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 6px 10px; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; }
    .rv-unknown-label { font-size: 12px; color: #92400e; font-weight: 500; }
    .rv-unknown-table { margin-top: 6px; opacity: 0.85; }
    .rv-unknown-table .rv-label { background: #fffbeb; }
  `]
})
export class ExecResultViewerComponent implements OnChanges, OnDestroy {
  @Input() data: any;
  @Input() schema: any = null;
  @Output() hasTableContent = new EventEmitter<boolean>();

  hasData = false;
  hasSchema = false;
  labelsOnTop = false;
  showUnknown = false;
  private _lightboxEl: HTMLElement | null = null;
  scalarEntries: ScalarEntry[] = [];
  arraySections: ArraySection[] = [];
  sectionGroups: SectionGroup[] = [];
  unknownEntries: Array<{ key: string; value: any }> = [];

  // Fallback (no schema)
  fallbackMode: 'scalar' | 'flat-object' | 'array-objects' | 'array-scalars' | null = null;
  flatEntries: Array<{ key: string; value: any }> = [];
  nestedSections: NestedSection[] = [];
  autoColumns: string[] = [];

  // Simple text types (plain text rendering)
  private simpleTextTypes = new Set(['text', 'number', 'tel', 'password', 'hidden']);
  // All known types (anything not in here goes to auto-fallback)
  private knownTypes = new Set([
    'text', 'textarea', 'number', 'tel', 'password', 'hidden',
    'url', 'email', 'color', 'rate',
    'code', 'expression', 'cron', 'json', 'schema_builder', 'html',
    'checkbox', 'boolean', 'date', 'select', 'radio',
    'tags', 'text_array', 'file', 'resolver'
  ]);

  private htmlCache = new Map<string, SafeHtml>();

  constructor(private filesService: FilesBackendService, private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges) {
    this.htmlCache.clear();
    this.compute();
  }

  private compute() {
    const d = this.data;
    this.hasData = d != null && d !== '' && !(typeof d === 'object' && !Array.isArray(d) && Object.keys(d).length === 0);
    if (!this.hasData) { this.hasSchema = false; this.hasTableContent.emit(false); return; }

    const sch = this.normalizeSchema(this.schema);
    this.hasSchema = !!(sch && sch.fields && sch.fields.length);
    this.labelsOnTop = !!(sch?.ui?.labelsOnTop);

    console.log('[exec-result-viewer] compute', {
      dataKeys: (typeof d === 'object' && !Array.isArray(d)) ? Object.keys(d) : (Array.isArray(d) ? `array[${d.length}]` : typeof d),
      hasSchema: this.hasSchema,
      labelsOnTop: this.labelsOnTop,
      schemaFields: sch?.fields?.map((f: any) => ({ key: f.key, label: f.label, title: f.title, type: f.type })),
    });

    if (this.hasSchema) {
      this.computeWithSchema(sch);
    } else {
      this.computeFallback();
    }

    // Signal whether we have table content (for dialog width adaptation)
    const hasTables = this.arraySections.length > 0 || this.sectionGroups.some(g => g.arraySections.length > 0) || this.fallbackMode === 'array-objects';
    this.hasTableContent.emit(hasTables);
  }

  private normalizeSchema(raw: any): any {
    if (!raw) return null;
    if (Array.isArray(raw)) return { fields: raw };
    if (raw.fields) return raw;
    return null;
  }

  private fieldLabel(f: any): string {
    return f.title || f.label || f.name || f.key || '—';
  }

  private computeWithSchema(sch: any) {
    const fields: any[] = sch.fields || [];
    const sections: any[] = sch.sections || [];
    const d = this.data || {};

    this.scalarEntries = [];
    this.arraySections = [];
    this.sectionGroups = [];
    this.unknownEntries = [];

    const schemaKeys = new Set<string>();
    const metaKeys = new Set(['ok', 'error', '_output', '_type']);

    // Process top-level sections (mode=array) first
    for (const sec of sections) {
      if (sec.mode === 'array' && sec.fields) {
        const key = sec.key || sec.title;
        const arrData = d[key] || d[sec.dataKey] || [];
        schemaKeys.add(key);
        if (sec.dataKey) schemaKeys.add(sec.dataKey);
        this.arraySections.push({
          title: sec.title || key,
          fields: sec.fields.map((f: any) => ({ ...f, label: this.fieldLabel(f), type: f.type || 'text' })),
          rows: Array.isArray(arrData) ? arrData : []
        });
      }
    }

    // Process fields
    for (const f of fields) {
      if (f.type === 'textblock') continue;

      // section_array → array table
      if (f.type === 'section_array') {
        schemaKeys.add(f.key);
        const arrData = d[f.key] || d[f.dataKey] || [];
        if (f.dataKey) schemaKeys.add(f.dataKey);
        const subFields = (f.fields || []).filter((sf: any) => sf.key && sf.type !== 'textblock' && sf.type !== 'section');
        if (subFields.length) {
          this.arraySections.push({
            title: this.fieldLabel(f),
            fields: subFields.map((sf: any) => ({ ...sf, label: this.fieldLabel(sf), type: sf.type || 'text' })),
            rows: Array.isArray(arrData) ? arrData : []
          });
        }
        continue;
      }

      // section (mode=array)
      if (f.type === 'section' && f.mode === 'array' && f.fields) {
        schemaKeys.add(f.key);
        const arrData = d[f.key] || d[f.dataKey] || [];
        if (f.dataKey) schemaKeys.add(f.dataKey);
        const subFields = (f.fields || []).filter((sf: any) => sf.key && sf.type !== 'textblock');
        if (subFields.length) {
          this.arraySections.push({
            title: this.fieldLabel(f),
            fields: subFields.map((sf: any) => ({ ...sf, label: this.fieldLabel(sf), type: sf.type || 'text' })),
            rows: Array.isArray(arrData) ? arrData : []
          });
        }
        continue;
      }

      // Regular section (non-array) → render sub-fields from d[section.key]
      if (f.type === 'section') {
        schemaKeys.add(f.key);
        const sectionData = d[f.key];
        if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
          const group: SectionGroup = { title: this.fieldLabel(f), entries: [], arraySections: [] };
          for (const sf of (f.fields || [])) {
            if (!sf.key || sf.type === 'textblock') continue;
            if (sf.type === 'section_array' || (sf.type === 'section' && sf.mode === 'array')) {
              const arrData = sectionData[sf.key] || [];
              const subFields = (sf.fields || []).filter((ssf: any) => ssf.key && ssf.type !== 'textblock');
              if (subFields.length) {
                group.arraySections.push({
                  title: this.fieldLabel(sf),
                  fields: subFields.map((ssf: any) => ({ ...ssf, label: this.fieldLabel(ssf), type: ssf.type || 'text' })),
                  rows: Array.isArray(arrData) ? arrData : []
                });
              }
              continue;
            }
            const val = sectionData[sf.key];
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && !this.isFileRef(val[0])) {
              const cols = Object.keys(val[0]).map(k => ({ key: k, label: k, type: 'text' as string, options: undefined as any }));
              group.arraySections.push({ title: this.fieldLabel(sf), fields: cols, rows: val });
            } else {
              group.entries.push({
                field: { ...sf, label: this.fieldLabel(sf), type: sf.type || 'text' },
                value: val
              });
            }
          }
          if (group.entries.length || group.arraySections.length) {
            this.sectionGroups.push(group);
          }
        }
        continue;
      }

      schemaKeys.add(f.key);
      const val = d[f.key];
      // Array of objects → auto array section
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && !this.isFileRef(val[0])) {
        const cols = Object.keys(val[0]).map(k => ({ key: k, label: k, type: 'text' as string, options: undefined as any }));
        this.arraySections.push({ title: this.fieldLabel(f), fields: cols, rows: val });
      } else {
        this.scalarEntries.push({
          field: { ...f, label: this.fieldLabel(f), type: f.type || 'text' },
          value: val
        });
      }
    }

    // Detect unknown keys
    if (typeof d === 'object' && !Array.isArray(d)) {
      for (const key of Object.keys(d)) {
        if (schemaKeys.has(key) || metaKeys.has(key)) continue;
        this.unknownEntries.push({ key, value: d[key] });
      }
    }
  }

  private computeFallback() {
    const d = this.data;
    this.flatEntries = [];
    this.nestedSections = [];
    this.autoColumns = [];
    this.unknownEntries = [];

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
  isSimpleTextType(type: string): boolean { return this.simpleTextTypes.has(type); }
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

  /** Check if file should display as image based on mimeType + field.accept */
  isImageFile(ref: any, field?: any): boolean {
    if (this.isImage(ref)) return true;
    if (field?.accept && /image/i.test(field.accept)) return true;
    if (field?.listType === 'picture' || field?.listType === 'picture-card') return true;
    return false;
  }

  /** Check if field accepts images */
  isImageAccept(field: any): boolean {
    return field?.accept && /image/i.test(field.accept);
  }

  isBool(v: any): boolean {
    return typeof v === 'boolean';
  }

  /** Auto-detect ISO date strings (2024-01-15, 2024-01-15T14:30:00Z, etc.) */
  isDateValue(v: any): boolean {
    if (typeof v !== 'string' || v.length < 10 || v.length > 30) return false;
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(v);
  }

  isImageUrl(v: any): boolean {
    if (typeof v !== 'string') return false;
    return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(v);
  }

  isUrl(v: any): boolean {
    if (typeof v !== 'string' || this.isImageUrl(v)) return false;
    return /^https?:\/\/.+/i.test(v);
  }

  fileUrl(ref: any): string {
    if (!ref?.fileId) return '';
    return this.filesService.downloadUrl(ref.fileId);
  }

  openLightbox(url: string) {
    if (!url) return;
    this.closeLightbox();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;animation:rvFadeIn .15s ease';
    overlay.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.8)" data-rv-close></div>
      <div style="position:relative;max-width:92vw;max-height:92vh;display:flex;align-items:center;justify-content:center">
        <img src="${url}" style="max-width:92vw;max-height:92vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5)" />
        <div style="position:absolute;top:-44px;right:0;display:flex;gap:8px">
          <a href="${url}" target="_blank" download style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:16px;cursor:pointer;border:none" title="Télécharger"><i class="fa-solid fa-download"></i></a>
          <button style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;border:none" data-rv-close title="Fermer"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `;
    // Inject keyframe once
    if (!document.getElementById('rv-lightbox-style')) {
      const style = document.createElement('style');
      style.id = 'rv-lightbox-style';
      style.textContent = '@keyframes rvFadeIn{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(style);
    }
    overlay.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-rv-close]')) this.closeLightbox();
    });
    this._onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.closeLightbox(); };
    document.addEventListener('keydown', this._onEsc);
    document.body.appendChild(overlay);
    this._lightboxEl = overlay;
  }

  private _onEsc: ((e: KeyboardEvent) => void) | null = null;

  closeLightbox() {
    if (this._lightboxEl) {
      this._lightboxEl.remove();
      this._lightboxEl = null;
    }
    if (this._onEsc) {
      document.removeEventListener('keydown', this._onEsc);
      this._onEsc = null;
    }
  }

  ngOnDestroy() {
    this.closeLightbox();
  }

  formatDate(v: any, field?: any): string {
    if (v == null) return '—';
    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      const s = String(v);
      // Date-only (no time part) → show just date
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(s);
      if (isDateOnly) {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
      // Full datetime
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return String(v); }
  }

  optionLabel(field: any, value: any): string {
    const opt = (field.options || []).find((o: any) => o.value === value);
    return opt?.label || String(value ?? '—');
  }

  normalizeRateValue(value: any, field?: any): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    const clamped = Math.max(0, Math.min(5, parsed));
    return field?.rate?.allowHalf ? Math.round(clamped * 2) / 2 : Math.round(clamped);
  }

  formatSize(bytes: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1048576).toFixed(1) + ' Mo';
  }

  formatJson(v: any): string {
    if (v == null) return '—';
    if (typeof v === 'string') {
      try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
    }
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  sanitizeHtml(v: any): SafeHtml {
    const s = String(v || '');
    if (this.htmlCache.has(s)) return this.htmlCache.get(s)!;
    const safe = this.sanitizer.bypassSecurityTrustHtml(s);
    this.htmlCache.set(s, safe);
    return safe;
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
