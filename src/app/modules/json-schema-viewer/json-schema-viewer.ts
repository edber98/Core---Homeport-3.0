import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MonacoJsonEditorComponent } from '../../features/dynamic-form/components/monaco-json-editor.component';
import { FormsModule } from '@angular/forms';

type JsonType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unknown';

// Declare node component first so it can be imported below
@Component({
  standalone: true,
  selector: 'app-json-node',
  imports: [CommonModule, NzIconModule],
  template: `
  <div class="node" [style.paddingLeft.px]="depth * 16">
    <ng-container *ngIf="isExpandable; else spacer">
      <span class="toggle" (click)="toggle()">
        <span class="caret" [class.collapsed]="collapsed"></span>
      </span>
    </ng-container>
    <ng-template #spacer><span class="toggle-spacer"></span></ng-template>
    <span class="pill" draggable="true" (dragstart)="drag($event)" (click)="toggleIfExpandable($event)" [title]="fullPath">
      <span class="type-icon" [ngClass]="type" aria-hidden="true">
        <svg *ngIf="type==='object'" viewBox="0 0 24 24" width="12" height="12">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
          <rect x="11" y="6" width="7" height="2" fill="currentColor"/>
          <rect x="6" y="12" width="12" height="2" fill="currentColor"/>
          <rect x="6" y="16" width="9" height="2" fill="currentColor"/>
        </svg>
        <svg *ngIf="type==='array'" viewBox="0 0 24 24" width="12" height="12">
          <rect x="5" y="6" width="14" height="2" fill="currentColor"/>
          <rect x="5" y="11" width="14" height="2" fill="currentColor"/>
          <rect x="5" y="16" width="14" height="2" fill="currentColor"/>
        </svg>
        <svg *ngIf="type==='string'" viewBox="0 0 24 24" width="12" height="12">
          <rect x="6" y="6" width="3" height="8" rx="1" fill="currentColor"/>
          <rect x="13" y="6" width="3" height="8" rx="1" fill="currentColor"/>
        </svg>
        <svg *ngIf="type==='number'" viewBox="0 0 24 24" width="12" height="12">
          <line x1="8" y1="5" x2="8" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="5" x2="16" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg *ngIf="type==='boolean'" viewBox="0 0 24 24" width="12" height="12">
          <polyline points="5,13 9,17 19,7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg *ngIf="type==='null'" viewBox="0 0 24 24" width="12" height="12">
          <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
          <line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg *ngIf="type==='unknown'" viewBox="0 0 24 24" width="12" height="12">
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      </span>
      <strong class="label">{{ keyName }}</strong>
    </span>
    <span class="meta" *ngIf="type === 'array'">array [{{ arrLen }}]</span>
    <span class="meta" *ngIf="type === 'object'">object</span>
    <span class="meta" *ngIf="type !== 'array' && type !== 'object'">{{ type }}</span>
  </div>
  <ng-container *ngIf="!collapsed">
    <ng-container *ngFor="let child of children">
      <app-json-node
        [value]="child.value"
        [keyName]="child.key"
        [path]="child.path"
        [depth]="depth + 1"
        [rootAlias]="rootAlias"
        [expansion]="expansion"
      />
    </ng-container>
  </ng-container>
  `,
  styleUrls: ['./json-schema-viewer.scss']
})
export class JsonNodeComponent {
  @Input() value: any;
  @Input() keyName: string = '';
  @Input() path: string = '';
  @Input() rootAlias?: string;
  @Input() expansion?: Record<string, boolean>;
  @Input() depth = 0;

  collapsed = false;

  ngOnInit() {
    // Hydrate collapsed from shared expansion map if provided
    try {
      if (this.expansion) {
        const saved = this.expansion[this.fullPath];
        if (typeof saved === 'boolean') this.collapsed = saved;
      }
    } catch {}
  }
  ngOnChanges() {
    // Keep collapsed in sync with parent expansion state
    try {
      if (this.expansion) {
        const saved = this.expansion[this.fullPath];
        if (typeof saved === 'boolean') this.collapsed = saved;
      }
    } catch {}
  }

  get type(): JsonType {
    if (Array.isArray(this.value)) return 'array';
    const t = typeof this.value;
    if (this.value === null) return 'null';
    if (t === 'object') return 'object';
    if (t === 'string') return 'string';
    if (t === 'number') return 'number';
    if (t === 'boolean') return 'boolean';
    return 'unknown';
  }
  get isExpandable(): boolean { return this.type === 'object' || this.type === 'array'; }
  get arrLen(): number { return Array.isArray(this.value) ? this.value.length : 0; }
  get fullPath(): string {
    const base = this.path.startsWith('.') ? this.path.slice(1) : this.path;
    return (this.rootAlias && this.rootAlias.length) ? `${this.rootAlias}.${base}` : base;
  }

  get children(): { key: string; value: any; path: string }[] {
    if (this.type === 'object') {
      const obj = this.value as Record<string, any>;
      const prefix = this.path ? this.path : '';
      return Object.keys(obj).map(k => ({ key: k, value: obj[k], path: `${prefix}.${k}` }));
    } else if (this.type === 'array') {
      const arr = this.value as any[];
      const prefix = this.path ? this.path : '';
      return arr.map((v, i) => ({ key: `[${i}]`, value: v, path: `${prefix}[${i}]` }));
    }
    return [];
  }

  toggle() {
    const before = this.collapsed;
    this.collapsed = !this.collapsed;
    try { if (this.expansion) this.expansion[this.fullPath] = this.collapsed; } catch {}
  }
  toggleIfExpandable(ev: MouseEvent) {
    if (this.isExpandable) {
      ev.preventDefault(); ev.stopPropagation();
      this.toggle();
    }
  }

  drag(ev: DragEvent) {
    if (!ev.dataTransfer) return;
    const tag = { path: this.fullPath, name: this.keyName };
    ev.dataTransfer.setData('application/x-expression-tag', JSON.stringify(tag));
    ev.dataTransfer.setData('text/plain', this.fullPath);
    ev.dataTransfer.effectAllowed = 'copy';
  }
}

@Component({
  standalone: true,
  selector: 'app-json-schema-viewer',
  imports: [CommonModule, FormsModule, NzSegmentedModule, NzIconModule, JsonNodeComponent, MonacoJsonEditorComponent],
  templateUrl: './json-schema-viewer.html',
  styleUrl: './json-schema-viewer.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => JsonSchemaViewerComponent), multi: true }
  ]
})
export class JsonSchemaViewerComponent implements ControlValueAccessor {
  @Input() data: any;
  @Input() rootAlias?: string;
  // Contrôle externe du mode (facultatif). Si non fourni, on utilise internalMode ('Schema' par défaut)
  @Input() mode?: 'JSON'|'Schema';
  @Output() modeChange = new EventEmitter<'JSON'|'Schema'>();
  @Input() initialMode: 'JSON'|'Schema' = 'Schema';
  // Edition JSON via Monaco (facultatif)
  @Input() editable = true;
  @Input() editMode = false;
  @Output() editModeChange = new EventEmitter<boolean>();
  @Output() dataChange = new EventEmitter<any>();
  // Titre et sous-titre (affichés à gauche, sur la même ligne)
  @Input() title?: string;
  @Input() subtitle?: string;

  internalMode: 'JSON'|'Schema' = 'Schema';
  jsonHtml?: SafeHtml;
  expansion: Record<string, boolean> = {};
  currentData: any;
  editValue = '';
  @ViewChild(MonacoJsonEditorComponent) monaco?: MonacoJsonEditorComponent;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    // Sync data into currentData when input changes
    this.currentData = this.data;
    this.updateJsonHtml();
    // Sync external mode into internalMode if provided
    if (this.mode) this.internalMode = this.mode; else this.internalMode = this.initialMode || 'Schema';
  }
  ngOnInit(): void {
    this.currentData = this.data;
    this.internalMode = this.mode || this.initialMode || 'Schema';
    this.updateJsonHtml();
  }

  onDragStart(ev: DragEvent, path: string, name?: string) {
    if (!ev.dataTransfer) return;
    const payload = JSON.stringify({ path, name });
    ev.dataTransfer.setData('application/x-expression-tag', payload);
    ev.dataTransfer.setData('text/plain', path);
    ev.dataTransfer.effectAllowed = 'copy';
    try { ev.dataTransfer.setDragImage(this.mkGhost(name || path), 0, 0); } catch {}
  }

  private mkGhost(text: string): HTMLElement {
    const el = document.createElement('span');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    el.style.padding = '2px 8px';
    el.style.background = '#f5f5f5';
    el.style.border = '1px solid #d9d9d9';
    el.style.borderRadius = '12px';
    el.style.fontSize = '12px';
    document.body.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch {} }, 0);
    return el;
  }

  private updateJsonHtml() {
    try {
      const json = JSON.stringify(this.currentData, null, 2);
      const escaped = escapeHtml(json);
      const colored = escaped
        .replace(/(&quot;)([^&]*?)(&quot;)(\s*:\s*)/g, (_m, q1, key, q2, colon) => `<span class="k">${q1}${key}${q2}</span>${colon}`)
        .replace(/(&quot;)([^\n]*?)(&quot;)/g, (_m, q1, str, q2) => `<span class="s">${q1}${str}${q2}</span>`)
        .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="n">$1</span>')
        .replace(/\b(true|false)\b/g, '<span class="b">$1</span>')
        .replace(/\bnull\b/g, '<span class="nl">null</span>');
      this.jsonHtml = this.sanitizer.bypassSecurityTrustHtml(colored);
    } catch {
      this.jsonHtml = this.sanitizer.bypassSecurityTrustHtml('<em>Invalid JSON</em>');
    }
  }

  // Helpers for template
  isPlainObject(v: any): boolean { return v != null && typeof v === 'object' && !Array.isArray(v); }
  objectEntries(v: any): { key: string; value: any }[] {
    if (!this.isPlainObject(v)) return [];
    const obj = v as Record<string, any>;
    return Object.keys(obj).map(k => ({ key: k, value: obj[k] }));
  }

  // Mode switching helpers
  get viewMode(): 'JSON'|'Schema' { return this.mode ?? this.internalMode; }
  set viewMode(v: 'JSON'|'Schema') {
    if (this.modeChange.observed) this.modeChange.emit(v);
    this.internalMode = v;
    // Exit edit mode when leaving JSON
    if (v !== 'JSON' && this.editMode) this.toggleEdit(false);
  }

  toggleEdit(next?: boolean) {
    const target = next == null ? !this.editMode : next;
    this.editMode = target;
    this.editModeChange.emit(this.editMode);
    if (this.editMode) {
      // Initialize editor with pretty JSON of current data
      try { this.editValue = JSON.stringify(this.currentData, null, 2); } catch { this.editValue = ''; }
    }
  }

  saveEdit() {
    try {
      const parsed = this.editValue ? JSON.parse(this.editValue) : null;
      this.currentData = parsed;
      this.updateJsonHtml();
      this.dataChange.emit(parsed);
      // ngModel propagate
      this.onChange?.(parsed);
      this.onTouched?.();
      this.toggleEdit(false);
    } catch (e) {
      // keep editor open; Monaco shows invalid JSON indicator
    }
  }

  cancelEdit() {
    this.toggleEdit(false);
  }

  formatEditor() { try { this.monaco?.format(); } catch {} }
  minifyEditor() { try { this.monaco?.minify(); } catch {} }

  // ControlValueAccessor
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};
  writeValue(value: any): void {
    this.data = value;
    this.currentData = value;
    this.updateJsonHtml();
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {
    // viewer is read-only unless editMode; we could disable edit toggle here if needed
    this.editable = !isDisabled;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}
