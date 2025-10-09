import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { UiNode } from '../ui-model.service';

@Component({
  selector: 'ui-tree-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
  <div class="tree">
    <div class="panel-heading"><div class="card-title"><div class="t">Structure</div><div class="s">DOM virtuel</div></div></div>
    <ul class="tree-list" cdkDropList (cdkDropListDropped)="dropRoot($event)">
      <ng-container *ngIf="root as n">
        <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: n, parent: null }"></ng-container>
      </ng-container>
    </ul>
    <ng-template #nodeTpl let-n let-parent="parent">
      <li [class.sel]="n.id===selectedId" cdkDrag>
        <button class="node" (click)="select.emit(n.id)"><span class="tag">&lt;{{n.tag}}&gt;</span> <span class="id" *ngIf="n.attrs?.id">#{{n.attrs?.id}}</span></button>
        <ul *ngIf="n.children?.length" cdkDropList (cdkDropListDropped)="drop($event, n)">
          <ng-container *ngFor="let c of n.children">
            <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: c, parent: n }"></ng-container>
          </ng-container>
        </ul>
      </li>
    </ng-template>
  </div>
  `,
  styles: [`
  .tree { padding: 12px; }
  .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; margin:6px 0 8px; border-bottom:1px solid #E2E1E4; }
  .tree-list, .tree-list ul { list-style:none; margin:0; padding-left: 10px; }
  .node { appearance:none; background:transparent; border:none; padding:2px 4px; border-radius:6px; cursor:pointer; font-size:12px; }
  .sel > .node { background:#e6f4ff; }
  .tag { color:#111; }
  .id { color:#64748b; }
  `]
})
export class UiTreePanelComponent {
  @Input() root!: UiNode;
  @Input() selectedId: string | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() reorder = new EventEmitter<{ parentId: string | null; previousIndex: number; currentIndex: number }>();

  drop(event: CdkDragDrop<any>, parent: UiNode) {
    if (!parent?.children) return;
    this.reorder.emit({ parentId: parent.id, previousIndex: event.previousIndex, currentIndex: event.currentIndex });
  }
  dropRoot(event: CdkDragDrop<any>) {
    if (!this.root?.children) return;
    this.reorder.emit({ parentId: this.root.id, previousIndex: event.previousIndex, currentIndex: event.currentIndex });
  }
}
