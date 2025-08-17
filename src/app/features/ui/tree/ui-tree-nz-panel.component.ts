import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { NzTreeModule, NzFormatEmitEvent, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { UiNode } from '../ui-model.service';

@Component({
  selector: 'ui-tree-nz-panel',
  standalone: true,
  imports: [CommonModule, NzTreeModule],
  template: `
  <div class="tree">
    <div class="panel-heading"><div class="card-title"><div class="t">Structure</div><div class="s">DOM virtuel</div></div></div>
    <nz-tree [nzData]="treeData" nzDraggable (nzClick)="onClick($event)" (nzOnDrop)="onDrop($event)"
      [nzSelectedKeys]="selectedId ? [selectedId] : []" [nzExpandedKeys]="expandedKeys" (nzExpandChange)="onExpand($event)"></nz-tree>
  </div>
  `,
  styles: [`
  .tree { padding: 12px; }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
  `]
})
export class UiTreeNzPanelComponent implements OnChanges {
  @Input() set root(v: UiNode | null) { this._root = v || { id: 'root', tag: 'div', children: [] } as any; this.treeData = [this.toNode(this._root)]; }
  @Input() selectedId: string | null = null;
  @Input() version: number | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() move = new EventEmitter<{ id: string; newParentId: string; index: number }>();

  _root!: UiNode;
  treeData: NzTreeNodeOptions[] = [];
  expandedKeys: string[] = [];

  private toNode(n: UiNode): NzTreeNodeOptions {
    return {
      key: n.id,
      title: this.labelOf(n),
      selected: this.selectedId === n.id,
      expanded: this.expandedKeys.includes(n.id),
      children: (n.children || []).map(c => this.toNode(c))
    } as NzTreeNodeOptions;
  }
  private labelOf(n: UiNode): string { const id = n.attrs && n.attrs['id'] ? `#${n.attrs['id']}` : ''; return `${n.tag}${id ? ' ' + id : ''}`; }
  ngOnChanges(ch: SimpleChanges) {
    if (ch['version']) { this.treeData = [this.toNode(this._root)]; }
  }

  onExpand(ev: NzFormatEmitEvent) {
    const key = String(ev?.node?.key || '');
    if (!key) return;
    const isExp = !!ev?.node?.isExpanded;
    const set = new Set(this.expandedKeys);
    if (isExp) set.add(key); else set.delete(key);
    this.expandedKeys = Array.from(set);
  }

  onClick(ev: NzFormatEmitEvent) { const k = ev?.node?.key; if (k) this.select.emit(String(k)); }

  onDrop(ev: NzFormatEmitEvent) {
    const dragId = String(ev?.dragNode?.key || '');
    const targetId = String(ev?.node?.key || '');
    if (!dragId || !targetId) return;
    const pos = (ev as any).pos || 0;
    // pos < 0: before target, pos === 0: inside target, pos > 0: after target
    if (pos === 0) {
      this.move.emit({ id: dragId, newParentId: targetId, index: (ev?.node?.children?.length || 0) });
    } else {
      const parent = ev?.node?.parentNode;
      const parentId = String(parent?.key || this._root.id);
      const siblings: any[] = parent ? (parent.children as any[]) : ((ev?.node as any)?.treeService?.rootNodes || []);
      let idx = siblings.findIndex((s: any) => s.key === ev.node?.key);
      if (pos > 0) idx = idx + 1;
      this.move.emit({ id: dragId, newParentId: parentId, index: idx });
    }
  }
}
