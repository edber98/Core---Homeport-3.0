import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

type LabelInfo = { label?: string; description?: string };

@Component({
  selector: 'app-json-schema-viewer-v2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer">
      <ng-container *ngIf="groupKeys().length; else empty">
        <ng-container *ngFor="let k of groupKeys()">
          <div class="group-title" (click)="toggleGroup(k)" [class.collapsed]="isCollapsed(k)">
            <span class="caret" [class.collapsed]="isCollapsed(k)"></span>
            <span class="gtxt">{{ displayGroupTitle(k) }}</span>
          </div>
          <div class="tree collapsible" [class.open]="!isCollapsed(k)">
            <ng-container [ngTemplateOutlet]="renderNode" [ngTemplateOutletContext]="{ $implicit: groupValue(k), path: groupPath(k), depth: 0 }"></ng-container>
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
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14" (click)="toggleNode(ent.fullPath)">
                  <div class="meta">
                    <div class="label">
                      <span class="caret" [class.collapsed]="isNodeCollapsed(ent.fullPath)"></span>
                      {{ cleanLabel(fieldLabel(ent.fullPath)?.label, ent.key, ent.fullPath) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, ent.fullPath)">{{ dragText(ent.fullPath) }}</span>
                    </div>
                    <div class="desc" *ngIf="fieldLabel(ent.fullPath)?.description as d">{{ d }}</div>
                  </div>
                </div>
                <div class="collapsible" [class.open]="!isNodeCollapsed(ent.fullPath)">
                  <ng-container [ngTemplateOutlet]="renderNode" [ngTemplateOutletContext]="{ $implicit: ent.value, path: ent.fullPath, depth: depth + 1 }"></ng-container>
                </div>
              </ng-container>
              <ng-container *ngSwitchCase="'array'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14" (click)="toggleNode(ent.fullPath)">
                  <div class="meta">
                    <div class="label">
                      <span class="caret" [class.collapsed]="isNodeCollapsed(ent.fullPath)"></span>
                      {{ cleanLabel(fieldLabel(ent.fullPath)?.label, ent.key, ent.fullPath) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, ent.fullPath)">{{ dragText(ent.fullPath) }}</span>
                    </div>
                    <div class="desc" *ngIf="fieldLabel(ent.fullPath)?.description as d">{{ d }}</div>
                  </div>
                </div>
                <div class="collapsible" [class.open]="!isNodeCollapsed(ent.fullPath)">
                  <ng-container [ngTemplateOutlet]="renderNode" [ngTemplateOutletContext]="{ $implicit: ent.value, path: ent.fullPath, depth: depth + 1 }"></ng-container>
                </div>
              </ng-container>
              <!-- Scalar child → single leaf row (no extra child block) -->
              <ng-container *ngSwitchDefault>
                <div class="row leaf" [style.paddingLeft.px]="(depth+1) * 14">
                  <div class="meta">
                    <div class="label">
                      {{ cleanLabel(fieldLabel(ent.fullPath)?.label, ent.key, ent.fullPath) }}
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
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14" (click)="toggleNode(it.fullPath)">
                  <div class="meta">
                    <div class="label"><span class="caret" [class.collapsed]="isNodeCollapsed(it.fullPath)"></span>{{ arrayItemLabel(path, i, it.value) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, it.fullPath)">{{ dragText(it.fullPath) }}</span>
                    </div>
                  </div>
                </div>
                <div class="collapsible" [class.open]="!isNodeCollapsed(it.fullPath)">
                  <ng-container [ngTemplateOutlet]="renderNode" [ngTemplateOutletContext]="{ $implicit: it.value, path: it.fullPath, depth: depth + 1 }"></ng-container>
                </div>
              </ng-container>
              <ng-container *ngSwitchCase="'array'">
                <div class="row" [style.paddingLeft.px]="(depth+1) * 14" (click)="toggleNode(it.fullPath)">
                  <div class="meta">
                    <div class="label"><span class="caret" [class.collapsed]="isNodeCollapsed(it.fullPath)"></span>{{ arrayItemLabel(path, i, it.value) }}
                      <span class="mono" draggable="true" (dragstart)="onDragStart($event, it.fullPath)">{{ dragText(it.fullPath) }}</span>
                    </div>
                  </div>
                </div>
                <div class="collapsible" [class.open]="!isNodeCollapsed(it.fullPath)">
                  <ng-container [ngTemplateOutlet]="renderNode" [ngTemplateOutletContext]="{ $implicit: it.value, path: it.fullPath, depth: depth + 1 }"></ng-container>
                </div>
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
    .group-title { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#6b7280; padding: 8px 6px; border-top:1px solid #F0F0F2; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
    .group-title:first-child { border-top:0; }
    .group-title .caret { width:10px; height:10px; border-right:2px solid #9ca3af; border-bottom:2px solid #9ca3af; transform: rotate(45deg); display:inline-block; transition: transform .2s ease; }
    .group-title .caret.collapsed { transform: rotate(-45deg); }
    .tree { display:block; }
    .row { display:block; padding: 6px 6px; border-radius: 10px; margin: 2px 0; }
    .row.leaf { background:#F9FAFB; }
    .row .label .caret { width:10px; height:10px; border-right:2px solid #9ca3af; border-bottom:2px solid #9ca3af; transform: rotate(45deg); display:inline-block; transition: transform .2s ease; margin-right:6px; }
    .row .label .caret.collapsed { transform: rotate(-45deg); }
    .collapsible { overflow:hidden; max-height: 0; opacity: 0; transition: max-height .24s ease, opacity .24s ease; }
    .collapsible.open { max-height: 1200px; opacity: 1; }
    .meta { display:block; }
    .label { font-weight:600; color:#111827; display:flex; align-items:center; gap:8px; }
    .desc { font-size:12px; color:#6b7280; line-height:1.35; margin-top: 2px; }
    .val { font-size:12px; color:#374151; margin-top: 2px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; font-size:11px; color:#6b7280; background:#fff; border:1px solid #E5E7EB; border-radius: 9px; padding: 1px 6px; cursor:grab; }
    .mono:active { cursor:grabbing; }
  `]
})
export class JsonSchemaViewerV2Component implements OnChanges {
  @Input() data: any;
  // Optional: map of full paths to label/description; caller can merge schema into this.
  @Input() labels: Record<string, LabelInfo> = {};
  // Optional: overrides for top-level node names (fallback to data._nodes[name])
  @Input() nodeNames: Record<string, string> = {};
  // Optional: per-node metadata (template title etc.)
  @Input() nodeMeta: Record<string, { name?: string; templateTitle?: string }> = {};
  // Optional: enforce specific top-level order
  @Input() order: string[] | null = null;

  private collapsed: Record<string, boolean> = {};
  private nodeCollapsed: Record<string, boolean> = {};

  toggleGroup(k: string) { this.collapsed[k] = !this.collapsed[k]; }
  isCollapsed(k: string): boolean { return !!this.collapsed[k]; }
  toggleNode(p: string) { if (!p) return; this.nodeCollapsed[p] = !this.nodeCollapsed[p]; }
  isNodeCollapsed(p: string): boolean { return !!this.nodeCollapsed[p]; }

  private orderedTopKeys(): string[] {
    const d = this.data || {};
    // Keep original order, exclude only internal metadata key
    const keys = Object.keys(d).filter(k => k !== '_nodes');
    const movePayloadFirst = (arr: string[]) => {
      try { const i = arr.indexOf('payload'); if (i > 0) { arr.splice(i, 1); arr.unshift('payload'); } } catch {}
      return arr;
    };
    if (this.order && this.order.length) {
      const set = new Set(keys);
      const pref = this.order.filter(k => set.has(k));
      const rest = keys.filter(k => !pref.includes(k));
      const merged = [...pref, ...rest];
      return movePayloadFirst(merged);
    }
    try {
      const nodesMeta = (d._nodes && typeof d._nodes === 'object') ? d._nodes : null;
      const path = Array.isArray((nodesMeta as any)?.__path) ? (nodesMeta as any).__path.map(String) : null;
      if (path && path.length) {
        const set = new Set(keys);
        const pref = path.filter((k: string) => set.has(k));
        const rest = keys.filter(k => !pref.includes(k));
        const merged = [...pref, ...rest];
        return movePayloadFirst(merged);
      }
    } catch {}
    // Default: respecter l'ordre original, mais placer 'payload' en premier
    const list = keys.slice();
    return movePayloadFirst(list);
  }

  groupKeys(): string[] {
    const keys = this.orderedTopKeys();
    const known = new Set([...Object.keys(this.nodeNames||{}), ...Object.keys(this.data?._nodes||{})]);
    const out: string[] = [];
    for (const k of keys) {
      if (known.has(k)) out.push(k);
      else out.push(`__k__${k}`);
    }
    return out;
  }
  groupValue(k: string): any {
    if (k.startsWith('__k__')) {
      const top = k.slice(5);
      try { return (this.data as any)?.[top]; } catch { return null; }
    }
    try { return (this.data as any)?.[k]; } catch { return null; }
  }
  groupPath(k: string): string { return k.startsWith('__k__') ? k.slice(5) : k; }

  ngOnChanges(changes?: SimpleChanges) {
    try {
      if (changes && (changes['data'] || changes['labels'] || changes['nodeMeta'] || changes['nodeNames'] || changes['order'])) {
        // Par défaut: tout collapse sauf le premier groupe (souvent 'payload')
        const groups = this.groupKeys();
        const next: Record<string, boolean> = {};
        groups.forEach((g, i) => { if (i > 0) next[g] = true; });
        this.collapsed = next;
      }
    } catch {}
  }
  displayGroupTitle(k: string): string {
    if (k.startsWith('__k__')) { const top = k.slice(5); return top; }
    const id = k;
    const tpl = (this.nodeMeta && this.nodeMeta[id]?.templateTitle) || (this.data?._nodes?.[id]?.templateTitle) || '';
    if (tpl && String(tpl).trim().length) return `${tpl} (${id})`;
    const name = (this.nodeNames && this.nodeNames[id]) || (this.data?._nodes?.[id]?.name) || '';
    return (name && String(name).trim().length) ? `${name} (${id})` : id;
  }

  fieldLabel(fullPath: string): LabelInfo | undefined {
    if (!this.labels) return undefined;
    const variants = this.pathVariants(fullPath);
    for (const v of variants) { const li = this.labels[v]; if (li) return li; }
    return undefined;
  }
  keyLabel(k: string): string | undefined {
    // For raw keys, allow mapping without full path if provided
    const v = this.labels && (this.labels[k] as any);
    return v && (v.label || (v as any).title);
  }
  scalarLabel(path: string): string {
    const li = this.fieldLabel(path);
    if (li?.label && !this.isBland(li.label)) return li.label;
    const seg = path.split('.').slice(-1)[0] || path;
    const fb = this.keyLabel(seg) || seg;
    this.logUnmapped(path);
    return fb;
  }
  cleanLabel(lbl?: string, fallbackKey?: string, fullPath?: string): string {
    if (lbl && !this.isBland(lbl)) return lbl;
    if (fullPath) this.logUnmapped(fullPath);
    return fallbackKey || (lbl || '');
  }
  private normalizeArrayPath(p: string): string { if (!p) return p; return p.replace(/\[(\d+)\]/g, '[]'); }
  private stripArrayPath(p: string): string { if (!p) return p; return p.replace(/\[(\d+)\]/g, '').replace(/\[\]/g, ''); }
  private pathVariants(p: string): string[] {
    const out: string[] = [];
    const add = (x?: string) => { if (x && !out.includes(x)) out.push(x); };
    add(p);
    add(this.normalizeArrayPath(p));
    add(this.stripArrayPath(p));
    // Parent chain variants
    let cur = p;
    for (let i=0; i<3; i++) {
      cur = cur.replace(/\.[^.\[]+$/, ''); if (!cur || cur === p) break;
      add(cur); add(this.normalizeArrayPath(cur)); add(this.stripArrayPath(cur));
    }
    return out;
  }
  private _unmapped: Set<string> = new Set();
  private logUnmapped(path: string) {
    try {
      if (!path) return;
      if (this._unmapped.has(path)) return;
      const li = this.fieldLabel(path);
      if (!li || !li.label) {
        this._unmapped.add(path);
        try { console.info('[json-viewer-v2] Unmapped path:', path); } catch {}
      }
    } catch {}
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
    const base = this.cleanLabel(baseLi?.label, parentPath.split('.').slice(-1)[0] || `[${i}]`);
    const itemNameRaw = this.firstOf(value, ['title','name','label','id']);
    const itemName = itemNameRaw && !this.isBland(itemNameRaw) ? itemNameRaw : '';
    return itemName ? `${base} [${i}] — ${itemName}` : `${base} [${i}]`;
  }
  private firstOf(obj: any, keys: string[]): string | null {
    try { if (!obj || typeof obj !== 'object') return null; for (const k of keys) { const v = obj[k]; if (v != null && String(v).trim().length) return String(v); } return null; } catch { return null; }
  }
  private isBland(s: string): boolean { try { return /^(sample|exemple|item|élément)$/i.test(String(s).trim()); } catch { return false; } }
  onDragStart(ev: DragEvent, path: string) {
    if (!ev.dataTransfer) return;
    const payload = JSON.stringify({ path, name: path.split('.').slice(-1)[0] });
    ev.dataTransfer.setData('application/x-expression-tag', payload);
    ev.dataTransfer.setData('text/plain', path);
    ev.dataTransfer.effectAllowed = 'copy';
    try { console.log('[settings-v2][dnd][json-viewer] dragstart', { path }); } catch {}
    try { ev.stopPropagation(); } catch {}
  }
}
