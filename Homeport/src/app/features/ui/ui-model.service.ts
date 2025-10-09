import { Injectable } from '@angular/core';

export type UiTag = string; // Allow any HTML tag, plus '#text' for text nodes
export interface UiNode {
  id: string;
  tag: UiTag;
  text?: string;
  classes?: string[];
  attrs?: Record<string, string>;
  style?: Record<string, string>;
  styleBp?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl', Record<string, string>>>;
  children?: UiNode[];
}

@Injectable({ providedIn: 'root' })
export class UiModelService {
  root: UiNode = { id: 'root', tag: 'div', classes: ['ui-root'], children: [] };
  selectedId: string = 'root';
  version = 0;

  private bump() { try { this.version++; } catch {} }

  private newId(prefix = 'el'): string { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }

  select(id: string) { this.selectedId = id; }
  get selected(): UiNode | null { return this.findById(this.selectedId) || null; }

  findById(id: string, node: UiNode = this.root): UiNode | null {
    if (!node) return null;
    if (node.id === id) return node;
    for (const c of node.children || []) { const f = this.findById(id, c); if (f) return f; }
    return null;
  }

  private findParentAndIndex(id: string, node: UiNode = this.root, parent: UiNode | null = null): { parent: UiNode | null; index: number } | null {
    if (node.id === id) { return { parent, index: parent ? (parent.children || []).findIndex(n => n.id === id) : -1 }; }
    for (const c of node.children || []) { const r = this.findParentAndIndex(id, c, node); if (r) return r; }
    return null;
  }

  addChild(parentId: string, tag: UiTag): UiNode {
    const p = this.findById(parentId) || this.root;
    const nodeId = this.newId(tag);
    const htmlId = this.generateUniqueAttrId(tag);
    const node: UiNode = { id: nodeId, tag, text: ['h1','h2','h3','p','span','label','button'].includes(tag) ? tag.toUpperCase() : '', classes: [], attrs: { id: htmlId }, children: [] };
    p.children = [...(p.children || []), node];
    this.bump();
    return node;
  }

  remove(id: string) {
    if (id === 'root') return;
    const loc = this.findParentAndIndex(id);
    if (loc && loc.parent && loc.index >= 0) {
      loc.parent.children = [...(loc.parent.children || []).slice(0, loc.index), ...(loc.parent.children || []).slice(loc.index + 1)];
      if (this.selectedId === id) this.selectedId = 'root';
    }
    this.bump();
  }

  moveUp(id: string) { this.move(id, -1); }
  moveDown(id: string) { this.move(id, +1); }
  private move(id: string, delta: number) {
    const loc = this.findParentAndIndex(id);
    if (!loc || !loc.parent) return;
    const arr = loc.parent.children || [];
    const i = loc.index;
    const j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    loc.parent.children = copy;
    this.bump();
  }

  update(id: string, patch: Partial<UiNode>) {
    const n = this.findById(id);
    if (!n) return;
    // Merge attrs with uniqueness for 'id'
    if (patch.attrs) {
      const mergedAttrs = { ...(n.attrs || {}), ...(patch.attrs || {}) } as Record<string, string>;
      if (mergedAttrs['id']) mergedAttrs['id'] = this.ensureUniqueAttrId(mergedAttrs['id'], n.id);
      n.attrs = mergedAttrs;
      // Remove attrs from patch to avoid overwrite
      const { attrs, ...rest } = patch as any;
      Object.assign(n, rest);
    } else {
      Object.assign(n, patch);
    }
    this.bump();
  }

  moveToParent(childId: string, newParentId: string, index: number) {
    if (childId === 'root') return;
    const loc = this.findParentAndIndex(childId);
    const child = this.findById(childId);
    const newParent = this.findById(newParentId) || this.root;
    if (!child || !newParent) return;
    if (!newParent.children) newParent.children = [];
    if (loc && loc.parent && loc.index >= 0) {
      loc.parent.children = [...(loc.parent.children || []).slice(0, loc.index), ...(loc.parent.children || []).slice(loc.index + 1)];
    }
    const arr = [...(newParent.children || [])];
    const clamped = Math.max(0, Math.min(index, arr.length));
    arr.splice(clamped, 0, child);
    newParent.children = arr;
  }

  export(): string { return JSON.stringify(this.root, null, 2); }
  import(json: string) {
    try {
      const obj = JSON.parse(json);
      if (obj && obj.id && obj.tag) { this.root = obj; this.normalizeUniqueAttrIds(); }
      this.bump();
    } catch {}
  }

  // === Unique HTML id helpers ===
  private generateUniqueAttrId(tag: string): string {
    const base = `${tag}-${Math.random().toString(36).slice(2, 7)}`;
    return this.ensureUniqueAttrId(base);
  }
  private collectAttrIds(map: Map<string, string>, node: UiNode = this.root) {
    if (!node) return;
    const aid = node.attrs?.['id'];
    if (aid) map.set(node.id, aid);
    (node.children || []).forEach(c => this.collectAttrIds(map, c));
  }
  ensureUniqueAttrId(desired: string, selfNodeId?: string): string {
    const used = new Set<string>();
    const add = (n: UiNode) => { const id = n.attrs?.['id']; if (id && (!selfNodeId || n.id !== selfNodeId)) used.add(id); (n.children || []).forEach(add); };
    add(this.root);
    let out = (desired || '').trim() || 'el';
    out = out.replace(/[^A-Za-z0-9\-_:.]/g, '-');
    let i = 1; let candidate = out;
    while (used.has(candidate)) { candidate = `${out}-${i++}`; }
    return candidate;
  }
  private normalizeUniqueAttrIds() {
    const seen = new Set<string>();
    const walk = (n: UiNode) => {
      if (n.attrs?.['id']) {
        const cur = n.attrs['id'];
        let candidate = cur;
        let i = 1;
        while (seen.has(candidate)) candidate = `${cur}-${i++}`;
        n.attrs['id'] = candidate; seen.add(candidate);
      }
      (n.children || []).forEach(walk);
    };
    walk(this.root);
  }
}
