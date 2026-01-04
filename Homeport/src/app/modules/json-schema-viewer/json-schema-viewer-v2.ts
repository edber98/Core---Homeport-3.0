import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type LabelInfo = { label?: string; description?: string };

@Component({
  selector: 'app-json-schema-viewer-v2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer">
      <ng-container *ngIf="orderedTopKeys().length; else empty">
        <ng-container *ngFor="let k of orderedTopKeys()">
          <div class="group-title">{{ nodeDisplayName(k) }}</div>
          <div class="tree">
            <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: data[k], path: k, depth: 0 }"></ng-container>
          </div>
        </ng-container>
      </ng-container>
      <ng-template #empty>
        <div class="empty">Aucune donnée</div>
      </ng-template>
    </div>

    <ng-template #renderNode let-val let-path="path" let-depth="depth">
      <ng-container [ngSwitch]="kindOf(val)">
        <!-- Object: group row only for non-scalar children; direct leaf for scalars -->
        <ng-container *ngSwitchCase="'object'">
          <ng-container *ngFor="let ent of objectEntries(val, path)">
            <ng-container [ngSwitch]="kindOf(ent.value)">
              <!-- Non-scalar child → group row + recurse -->
              <ng-container *ngSwitchCase="'object'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">
                      {{ fieldLabel(ent.fullPath)?.label || keyLabel(ent.key) || ent.key }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, ent.fullPath)">{{ dragText(ent.fullPath) }}</span>
                    </div>
                    <div class="desc" *ngIf="fieldLabel(ent.fullPath)?.description as d">{{ d }}</div>
                  </div>
                </div>
                <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: ent.value, path: ent.fullPath, depth: depth + 1 }"></ng-container>
              </ng-container>
              <ng-container *ngSwitchCase="'array'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">
                      {{ fieldLabel(ent.fullPath)?.label || keyLabel(ent.key) || ent.key }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, ent.fullPath)">{{ dragText(ent.fullPath) }}</span>
                    </div>
                    <div class="desc" *ngIf="fieldLabel(ent.fullPath)?.description as d">{{ d }}</div>
                  </div>
                </div>
                <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: ent.value, path: ent.fullPath, depth: depth + 1 }"></ng-container>
              </ng-container>
              <!-- Scalar child → single leaf row (no extra child block) -->
              <ng-container *ngSwitchDefault>
                <div class="row leaf" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">
                      {{ fieldLabel(ent.fullPath)?.label || keyLabel(ent.key) || ent.key }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, ent.fullPath)">{{ dragText(ent.fullPath) }}</span>
                    </div>
                    <div class="desc" *ngIf="fieldLabel(ent.fullPath)?.description as d">{{ d }}</div>
                    <div class="val">{{ preview(ent.value) }}</div>
                  </div>
                </div>
              </ng-container>
            </ng-container>
          </ng-container>
        </ng-container>

        <!-- Array: group row when item non-scalar; single row for scalars -->
        <ng-container *ngSwitchCase="'array'">
          <ng-container *ngFor="let it of arrayEntries(val, path); let i = index">
            <ng-container [ngSwitch]="kindOf(it.value)">
              <ng-container *ngSwitchDefault>
                <div class="row leaf" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">{{ arrayItemLabel(path, i, it.value) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, it.fullPath)">{{ dragText(it.fullPath) }}</span>
                    </div>
                    <div class="val">{{ preview(it.value) }}</div>
                  </div>
                </div>
              </ng-container>
              <ng-container *ngSwitchCase="'object'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">{{ arrayItemLabel(path, i, it.value) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, it.fullPath)">{{ dragText(it.fullPath) }}</span>
                    </div>
                  </div>
                </div>
                <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: it.value, path: it.fullPath, depth: depth + 1 }"></ng-container>
              </ng-container>
              <ng-container *ngSwitchCase="'array'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">{{ arrayItemLabel(path, i, it.value) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, it.fullPath)">{{ dragText(it.fullPath) }}</span>
                    </div>
                  </div>
                </div>
                <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: it.value, path: it.fullPath, depth: depth + 1 }"></ng-container>
              </ng-container>
            </ng-container>
          </ng-container>
        </ng-container>

        <!-- Scalar root -->
        <ng-container *ngSwitchDefault>
          <div class="row leaf" [style.paddingLeft.px]="(depth+1) * 14">
            <div class="meta">
              <div class="label">
                {{ scalarLabel(path) }}
                <span class="mono" draggable="true" (dragstart)="onDragStart($event, path)">{{ dragText(path) }}</span>
              </div>
              <div class="val">{{ preview(val) }}</div>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </ng-template>
  `,
  styles: [`
    .viewer { display:block; }
    .empty { color:#6b7280; font-size:12px; padding: 8px; }
    .group-title { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#6b7280; padding: 8px 6px; border-top:1px solid #F0F0F2; }
    .group-title:first-child { border-top:0; }
    .tree { display:block; }
    .row { display:block; padding: 6px 6px; border-radius: 10px; margin: 2px 0; }
    .row.leaf { background:#F9FAFB; }
    .meta { display:block; }
    .label { font-weight:600; color:#111827; display:flex; align-items:center; gap:8px; }
    .desc { font-size:12px; color:#6b7280; line-height:1.35; margin-top: 2px; }
    .val { font-size:12px; color:#374151; margin-top: 2px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:11px; color:#6b7280; background:#fff; border:1px solid #E5E7EB; border-radius: 9px; padding: 1px 6px; cursor:grab; }
    .mono:active { cursor:grabbing; }
  `]
})
export class JsonSchemaViewerV2Component {
  @Input() data: any;
  // Optional: map of full paths to label/description; caller can merge schema into this.
  @Input() labels: Record<string, LabelInfo> = {};
  // Optional: overrides for top-level node names (fallback to data._nodes[name])
  @Input() nodeNames: Record<string, string> = {};
  // Optional: enforce specific top-level order
  @Input() order: string[] | null = null;

  orderedTopKeys(): string[] {
    const d = this.data || {};
    const keys = Object.keys(d).filter(k => k !== '_nodes' && k !== 'payload' && k !== 'loop');
    if (this.order && this.order.length) {
      const set = new Set(keys);
      const pref = this.order.filter(k => set.has(k));
      const rest = keys.filter(k => !pref.includes(k));
      return [...pref, ...rest];
    }
    try {
      const nodesMeta = (d._nodes && typeof d._nodes === 'object') ? d._nodes : null;
      const path = Array.isArray((nodesMeta as any)?.__path) ? (nodesMeta as any).__path.map(String) : null;
      if (path && path.length) {
        const set = new Set(keys);
        const pref = path.filter((k: string) => set.has(k));
        const rest = keys.filter(k => !pref.includes(k));
        return [...pref, ...rest];
      }
    } catch {}
    return keys;
  }

  nodeDisplayName(k: string): string {
    if (this.nodeNames && this.nodeNames[k]) return this.nodeNames[k];
    try { const n = this.data?._nodes?.[k]?.name || this.data?._nodes?.[k]?.title; if (n) return String(n); } catch {}
    return k;
  }

  fieldLabel(fullPath: string): LabelInfo | undefined {
    if (!this.labels) return undefined;
    const direct = this.labels[fullPath];
    if (direct) return direct;
    const norm = this.normalizeArrayPath(fullPath);
    if (norm !== fullPath && this.labels[norm]) return this.labels[norm];
    const parent = fullPath.replace(/\.[^.\[]+$/,'');
    if (parent && this.labels[parent]) return this.labels[parent];
    const parentNorm = this.normalizeArrayPath(parent);
    if (parentNorm && this.labels[parentNorm]) return this.labels[parentNorm];
    return undefined;
  }
  keyLabel(k: string): string | undefined {
    // For raw keys, allow mapping without full path if provided
    const v = this.labels && (this.labels[k] as any);
    return v && (v.label || (v as any).title);
  }
  scalarLabel(path: string): string {
    const li = this.fieldLabel(path);
    if (li?.label) return li.label;
    const seg = path.split('.').slice(-1)[0] || path;
    return this.keyLabel(seg) || seg;
  }
  private normalizeArrayPath(p: string): string {
    if (!p) return p;
    return p.replace(/\[(\d+)\]/g, '[]');
  }

  kindOf(v: any): 'object'|'array'|'scalar' {
    if (Array.isArray(v)) return 'array';
    if (v != null && typeof v === 'object') return 'object';
    return 'scalar';
  }
  objectEntries(v: any, basePath: string): Array<{ key: string; value: any; fullPath: string }> {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return [];
    const obj = v as Record<string, any>;
    return Object.keys(obj).map(key => ({ key, value: obj[key], fullPath: `${basePath}.${key}` }));
  }
  arrayEntries(v: any, basePath: string): Array<{ value: any; fullPath: string }> {
    if (!Array.isArray(v)) return [];
    return v.map((it, i) => ({ value: it, fullPath: `${basePath}[${i}]` }));
  }
  preview(v: any): string {
    try {
      if (v == null) return 'null';
      if (typeof v === 'string') return v.length > 80 ? v.slice(0, 77) + '…' : v;
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      return JSON.stringify(v);
    } catch { return String(v); }
  }
  dragText(path: string): string { return path; }
  arrayItemLabel(parentPath: string, i: number, value: any): string {
    const baseLi = this.fieldLabel(parentPath);
    const base = (baseLi?.label) || (parentPath.split('.').slice(-1)[0] || `[${i}]`);
    const itemName = this.firstOf(value, ['title','name','label','id']);
    return itemName ? `${base} [${i}] — ${itemName}` : `${base} [${i}]`;
  }
  private firstOf(obj: any, keys: string[]): string | null {
    try { if (!obj || typeof obj !== 'object') return null; for (const k of keys) { const v = obj[k]; if (v != null && String(v).trim().length) return String(v); } return null; } catch { return null; }
  }
  onDragStart(ev: DragEvent, path: string) {
    if (!ev.dataTransfer) return;
    const payload = JSON.stringify({ path, name: path.split('.').slice(-1)[0] });
    ev.dataTransfer.setData('application/x-expression-tag', payload);
    ev.dataTransfer.setData('text/plain', path);
    ev.dataTransfer.effectAllowed = 'copy';
  }
}
