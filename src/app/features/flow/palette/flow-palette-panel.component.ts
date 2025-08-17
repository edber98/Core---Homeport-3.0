import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'flow-palette-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzInputModule],
  template: `
    <aside class="palette" [class.drawer-mode]="mode==='drawer'">
      <div class="panel-heading">
        <div class="card-title left">
          <span class="t">Node</span>
          <span class="s">Palette & Contexte</span>
        </div>
      </div>
      <div class="palette-search">
        <input nz-input [ngModel]="query" (ngModelChange)="queryChange.emit($event)" placeholder="Rechercher un nœud (nom, catégorie)" />
      </div>
      <div class="groups">
        <div class="group" *ngFor="let g of groups; let gi = index; trackBy: trackGroupFn">
          <div class="group-title">
            <div class="card-title left">
              <span class="t">
                <span class="group-mini" *ngIf="g.appId" [style.background]="g.appColor || '#f3f4f6'">
                  <i *ngIf="g.appIconClass" [class]="g.appIconClass"></i>
                  <img *ngIf="!g.appIconClass && g.appIconUrl" [src]="g.appIconUrl" alt="icon" />
                  <img *ngIf="!g.appIconClass && !g.appIconUrl" [src]="simpleIconUrlFn?.(g.appId) || ''" alt="icon" />
                </span>
                {{ g.title }}
              </span>
            </div>
          </div>
          <div class="items" cdkDropList [id]="(mode === 'drawer' ? 'drawer_group_' : 'outside_group_') + gi"
               [cdkDropListData]="g.items" [cdkDropListSortingDisabled]="true" [cdkDropListDisabled]="dndDisabled"
               [cdkDropListConnectedTo]="(mode === 'drawer') ? [] : ['canvasList']"
               (cdkDropListDropped)="null">
            <div class="item" *ngFor="let it of g.items; trackBy: trackItemFn"
                 [class.dragging]="isDraggingFn?.(it)"
                 [class.disabled]="isItemDisabledFn?.(it)"
                 [attr.aria-disabled]="isItemDisabledFn?.(it) ? true : null"
                 (click)="itemClick.emit(it)">
              <div class="meta">
                <div class="title">
                  <span class="mini-icon" *ngIf="miniIconClassFn?.(it)">
                    <i class="mini" [class]="miniIconClassFn?.(it)"></i>
                  </span>
                  {{ it.label }}
                </div>
                <div class="subtitle" *ngIf="it.template?.subtitle">{{ it.template?.subtitle }}</div>
                <div class="desc" *ngIf="it.template?.description as d">{{ d }}</div>
              </div>
              <div class="drag-proxy" cdkDrag [cdkDragDisabled]="isMobile || isItemDisabledFn?.(it)"
                   [cdkDragData]="{ label: it.label, template: it.template }"
                   [cdkDragStartDelay]="(mode === 'drawer') ? 150 : 0"
                   [cdkDragBoundary]="(mode === 'drawer') ? '.ant-drawer' : ''"
                   [cdkDragRootElement]="(mode === 'drawer') ? '.ant-drawer' : ''"
                   (cdkDragStarted)="dragStart.emit({item: it, $event: $event})"
                   (cdkDragEnded)="dragEnd.emit({item: it, $event: $event})">
                <ng-template cdkDragPreview>
                  <div class="item" style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; box-shadow:0 10px 24px rgba(0,0,0,.18); display:inline-flex; align-items:center; gap:10px; width: 233px">
                    <div class="meta">
                      <div class="title" style=" font-weight:600 !important; font-size: 12px !important;">
                        <span class="mini-icon" *ngIf="miniIconClassFn?.(it)">
                          <i class="mini" [class]="miniIconClassFn?.(it)"></i>
                        </span>
                        {{ it.label }}
                      </div>
                      <div class="subtitle" style="color:#8c8c8c !important; font-size: 12px !important;" *ngIf="it.template?.subtitle">{{ it.template?.subtitle }}</div>
                      <div class="desc" style="color:#6b7280 !important; font-size: 12px !important; margin-top: 2px !important; overflow: hidden !important; text-overflow: ellipsis !important; display: -webkit-box !important; -webkit-line-clamp: 2 !important; -webkit-box-orient: vertical !important;" *ngIf="it.template?.description as d">{{ d }}</div>
                    </div>
                  </div>
                </ng-template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host { display:block; height: 100%; min-height: 0; }
    /* Always size to container and scroll inside when content exceeds */
    .palette { border: none; border-radius: 0; padding: 12px; padding-right: 9px; background: #ffffff; padding-top: 0 !important; height: 100%; overflow: auto; }
    .palette.drawer-mode { height: 100%; overflow: auto; }
    .palette .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; border-bottom:1px solid #E2E1E4; margin-top:0; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:13px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    .palette .palette-search { margin: 6px 0 10px; }
    .palette .groups { display:flex; flex-direction: column; gap: 10px; }
    .palette .group-title { font-weight: 600; font-size: 13px; color:#111; margin: 10px 0 8px; }
    .palette .group-title .group-mini { width: 14px; height: 14px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; margin-right:6px; vertical-align: text-bottom; }
    .palette .group-title .group-mini i { font-size: 10px; line-height: 1; color: #fff; }
    .palette .group-title .group-mini img { width: 10px; height: 10px; object-fit: contain; display:block; }
    .palette .items { display:flex; flex-direction:column; gap:8px; }
    .palette .item { display:flex; align-items:center; gap:10px; padding: 10px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,0.04); position: relative; }
    .palette .item.disabled { opacity: .5; cursor: not-allowed; }
    .palette .item.disabled .drag-proxy { pointer-events: none; }
    .palette .item:active { cursor: grabbing; }
    .palette .item .drag-proxy { position:absolute; inset:0; }
    .palette .mini-icon { width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; }
    .palette .mini-icon .mini { font-size: 14px; line-height: 1; color:#64748b; }
    .palette .item .meta .title { font-weight:600; font-size: 12px; }
    .palette .item .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .palette .item .meta .desc { color:#6b7280; font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .palette .item.dragging { opacity: .6; }
    :host ::ng-deep .cdk-drag-preview { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; box-shadow:0 10px 24px rgba(0,0,0,.18); display:inline-flex; align-items:center; gap:10px; }
    :host ::ng-deep .cdk-drag-preview .meta .title { font-weight:600; font-size: 12px; }
    :host ::ng-deep .cdk-drag-preview .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    :host ::ng-deep .cdk-drag-placeholder { opacity: .6; }
  `]
})
export class FlowPalettePanelComponent {
  @Input() mode: 'drawer' | 'outside' = 'outside';
  @Input() groups: any[] = [];
  @Input() query = '';
  @Input() isMobile = false;
  @Input() dndDisabled = false;

  // Function Inputs to keep parent logic
  @Input() trackGroupFn: (index: number, g: any) => any = (i, g) => g;
  @Input() trackItemFn: (index: number, it: any) => any = (i, it) => it;
  @Input() miniIconClassFn?: (it: any) => string;
  @Input() simpleIconUrlFn?: (id: string) => string;
  @Input() isItemDisabledFn?: (it: any) => boolean;
  @Input() isDraggingFn?: (it: any) => boolean;

  @Output() queryChange = new EventEmitter<string>();
  @Output() itemClick = new EventEmitter<any>();
  @Output() dragStart = new EventEmitter<any>();
  @Output() dragEnd = new EventEmitter<any>();
}
