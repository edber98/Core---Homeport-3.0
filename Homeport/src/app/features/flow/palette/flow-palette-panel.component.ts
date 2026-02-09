import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'flow-palette-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, NzInputModule, NzToolTipModule],
  template: `
    <aside class="palette" [class.drawer-mode]="mode==='drawer'">
      <div class="palette-topbar centered">
        <span class="t">Nouveau noeud</span>
        <span class="s">Groupes & Templates</span>
      </div>
      <div class="palette-search">
        <input nz-input [ngModel]="query" (ngModelChange)="queryChange.emit($event)" placeholder="Rechercher un nœud (nom, catégorie)" />
      </div>
      <div class="palette-scroll" *ngIf="!activeGroup">
      <div class="search-results" *ngIf="hasQuery(); else browseMode">
        <ng-container *ngFor="let g of filteredGroups(); let gi = index; trackBy: trackGroupFn">
          <div class="group-title search-group-title">
            <span class="group-mini" *ngIf="g.group?.appId" [style.background]="g.group?.appColor || '#f3f4f6'">
              <img *ngIf="isOpenAiGroup(g.group)" [src]="openAiIconUrl" alt="icon" />
              <i *ngIf="!isOpenAiGroup(g.group) && g.group?.appIconClass" [class]="g.group?.appIconClass" [style.color]="fgColor(g.group?.appColor)"></i>
              <img *ngIf="!isOpenAiGroup(g.group) && !g.group?.appIconClass && g.group?.appIconUrl" [src]="g.group?.appIconUrl" alt="icon" />
              <img *ngIf="!isOpenAiGroup(g.group) && !g.group?.appIconClass && !g.group?.appIconUrl" [src]="simpleIconUrlFn?.(g.group?.appId) || ''" alt="icon" />
            </span>
            <span class="group-name">{{ g.group?.title }}</span>
          </div>
          <div class="items" cdkDropList [id]="(mode === 'drawer' ? 'drawer_search_group_' : 'outside_search_group_') + gi"
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
                  <span class="mini-icon" *ngIf="isTplIconUrl(it)">
                    <img [src]="tplIconUrl(it)" alt="icon" style="width:14px;height:14px;" />
                  </span>
                  <span class="mini-icon" *ngIf="!isTplIconUrl(it) && tplIconClass(it)">
                    <i class="mini" [class]="tplIconClass(it)"></i>
                  </span>
                  <span class="mini-icon" *ngIf="!isTplIconUrl(it) && !tplIconClass(it) && typeIconClassFn?.(it.template)">
                    <i class="mini" [class]="typeIconClassFn?.(it.template)"></i>
                  </span>
                  {{ it.label }}
                  <span class="start-dot" *ngIf="isStartLikeTpl(it.template)" nz-tooltip [nzTooltipTitle]="startLikeTooltip(it.template)"></span>
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
        </ng-container>
        <div class="empty" *ngIf="filteredGroups().length === 0">Aucun nœud trouvé.</div>
      </div>
      <ng-template #browseMode>
        <div class="groups" *ngIf="!activeGroup">
          <button class="group-row" type="button" *ngFor="let g of groups; let gi = index; trackBy: trackGroupFn" (click)="openGroup(g, gi)">
          <span class="group-mini" *ngIf="g.appId" [style.background]="g.appColor || '#f3f4f6'">
            <img *ngIf="isOpenAiGroup(g)" [src]="openAiIconUrl" alt="icon" />
            <i *ngIf="!isOpenAiGroup(g) && g.appIconClass" [class]="g.appIconClass" [style.color]="fgColor(g.appColor)"></i>
            <img *ngIf="!isOpenAiGroup(g) && !g.appIconClass && g.appIconUrl" [src]="g.appIconUrl" alt="icon" />
            <img *ngIf="!isOpenAiGroup(g) && !g.appIconClass && !g.appIconUrl" [src]="simpleIconUrlFn?.(g.appId) || ''" alt="icon" />
          </span>
            <span class="group-name">{{ g.title }}</span>
            <span class="group-count">{{ g.items?.length || 0 }}</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </ng-template>
      </div>

        <div class="group-overlay" *ngIf="activeGroup">
          <div class="palette-topbar group-topbar">
            <button type="button" class="back-btn" (click)="closeGroup()" aria-label="Retour aux groupes">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <span class="group-heading">
              <span class="group-mini" *ngIf="activeGroup?.appId" [style.background]="activeGroup?.appColor || '#f3f4f6'">
                <img *ngIf="isOpenAiGroup(activeGroup)" [src]="openAiIconUrl" alt="icon" />
                <i *ngIf="!isOpenAiGroup(activeGroup) && activeGroup?.appIconClass" [class]="activeGroup?.appIconClass" [style.color]="fgColor(activeGroup?.appColor)"></i>
                <img *ngIf="!isOpenAiGroup(activeGroup) && !activeGroup?.appIconClass && activeGroup?.appIconUrl" [src]="activeGroup?.appIconUrl" alt="icon" />
                <img *ngIf="!isOpenAiGroup(activeGroup) && !activeGroup?.appIconClass && !activeGroup?.appIconUrl" [src]="simpleIconUrlFn?.(activeGroup?.appId) || ''" alt="icon" />
              </span>
              <span class="group-name">{{ activeGroup?.title }}</span>
            </span>
          </div>
          <div class="palette-search">
            <input nz-input [ngModel]="query" (ngModelChange)="queryChange.emit($event)" placeholder="Rechercher un nœud (nom, catégorie)" />
          </div>
          <div class="group-overlay-scroll">
          <div class="items" *ngIf="activeGroupItems().length > 0"
               cdkDropList [id]="(mode === 'drawer' ? 'drawer_group_' : 'outside_group_') + activeGroupIndex"
               [cdkDropListData]="activeGroupItems()" [cdkDropListSortingDisabled]="true" [cdkDropListDisabled]="dndDisabled"
               [cdkDropListConnectedTo]="(mode === 'drawer') ? [] : ['canvasList']"
               (cdkDropListDropped)="null">
            <div class="item" *ngFor="let it of activeGroupItems(); trackBy: trackItemFn"
                 [class.dragging]="isDraggingFn?.(it)"
                 [class.disabled]="isItemDisabledFn?.(it)"
                 [attr.aria-disabled]="isItemDisabledFn?.(it) ? true : null"
                 (click)="itemClick.emit(it)">
              <div class="meta">
                <div class="title">
                  <span class="mini-icon" *ngIf="isTplIconUrl(it)">
                    <img [src]="tplIconUrl(it)" alt="icon" style="width:14px;height:14px;" />
                  </span>
                  <span class="mini-icon" *ngIf="!isTplIconUrl(it) && tplIconClass(it)">
                    <i class="mini" [class]="tplIconClass(it)"></i>
                  </span>
                  <span class="mini-icon" *ngIf="!isTplIconUrl(it) && !tplIconClass(it) && typeIconClassFn?.(it.template)">
                    <i class="mini" [class]="typeIconClassFn?.(it.template)"></i>
                  </span>
                  {{ it.label }}
                  <span class="start-dot" *ngIf="isStartLikeTpl(it.template)" nz-tooltip [nzTooltipTitle]="startLikeTooltip(it.template)"></span>
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
          <div class="empty" *ngIf="activeGroupItems().length === 0">
            <div>Aucun nœud trouvé dans ce groupe.</div>
            <button *ngIf="hasQuery()" type="button" class="apple-btn" (click)="searchGlobal()" aria-label="Rechercher dans tous les groupes">
              Rechercher dans tous les groupes
            </button>
          </div>
          </div>
        </div>
    </aside>
  `,
  styles: [`
    :host { display:block; height: 100%; min-height: 0; }
    /* Always size to container and scroll inside when content exceeds */
    .palette { border: none; border-radius: 0; padding: 12px; padding-right: 9px; background: #ffffff; padding-top: 0 !important; height: 100%; overflow: auto; position: relative; }
    .palette { display:flex; flex-direction:column; }
    .palette.drawer-mode { height: 100%; overflow: auto; }
    .palette .palette-topbar { width: calc(100% + 21px); margin: 0 -9px 0 -12px; background:#fff; padding:10px 12px; font-weight:700; font-size:18px; color:#111; display:flex; align-items:center; gap:0; border-bottom: 0; flex-direction:column; }
    .palette .palette-topbar.centered { justify-content:center; }
    .palette .palette-topbar .t { font-weight:700; font-size:14px; color:#111; line-height:1.1; }
    .palette .palette-topbar .s { font-size:13px; color:#64748b; line-height:1.2; }
    .palette .palette-search { margin: 6px 0 14px; }
    :host ::ng-deep .palette .palette-search .ant-input:focus,
    :host ::ng-deep .palette .palette-search .ant-input-focused {
      border-color: #1677ff;
      box-shadow: none;
    }
    .palette .palette-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding-right: 1px; }
    .palette .palette-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .palette .palette-scroll::-webkit-scrollbar { width: 0; height: 0; }
    .palette .groups { display:flex; flex-direction: column; gap: 0; margin: 0; }
    .palette .group-title { font-weight: 600; font-size: 13px; color:#111; margin: 10px 0 8px; }
    .palette .group-title .group-mini { width: 18px; height: 18px; display:inline-flex; align-items:center; justify-content:center; border-radius:5px; margin-right:6px; vertical-align: text-bottom; }
    .palette .group-title .group-mini i { font-size: 12px; line-height: 1; color: #fff; }
    .palette .group-title .group-mini img { width: 12px; height: 12px; object-fit: contain; display:block; }
    .palette .group-topbar { justify-content:center; position: relative; }
    .palette .group-topbar .back-btn { position:absolute; left:12px; top:50%; transform: translateY(-50%); }
    .palette .group-heading { display:inline-flex; align-items:center; gap:10px; }
    .palette .group-topbar .group-mini { width: 22px; height: 22px; display:inline-flex; align-items:center; justify-content:center; border-radius:5px; }
    .palette .group-topbar .group-mini i { font-size: 13px; line-height: 1; color: #fff; }
    .palette .group-topbar .group-mini img { width: 13px; height: 13px; object-fit: contain; display:block; }
    .palette .group-topbar .group-name { font-weight:700; font-size: 14px; color:#111; }
    .palette .group-row {
      width: 100%;
      display:flex;
      align-items:center;
      gap:10px;
      padding: 16px 12px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-left: 0;
      border-right: 0;
      border-top: 0;
      border-radius: 0;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      text-align: left;
      margin: 0;
    }
    .palette .group-row:hover { border-color:#c7dbff; background:#e8f1ff; color:#0b5ed7; }
    .palette .group-row .group-mini { width: 26px; height: 26px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; }
    .palette .group-row .group-mini i { font-size: 16px; line-height: 1; color: #fff; }
    .palette .group-row .group-mini img { width: 16px; height: 16px; object-fit: contain; display:block; }
    .palette .group-row .group-name { font-weight:700; font-size: 14px; color:#111; flex: 1 1 auto; }
    .palette .group-row .group-count { font-size: 11px; color:#6b7280; background:#f1f5f9; border-radius:999px; padding:2px 6px; }
    .palette .group-row i.fa-chevron-right { color:#94a3b8; font-size: 12px; }
    .palette .back-btn { width: 28px; height: 28px; padding: 0; border:0; background: transparent; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .palette .back-btn i { color:#6b7280; font-size:16px; }
    .palette .group-overlay { position:absolute; inset:0; background:#fff; padding:0; overflow:hidden; z-index: 2; display:flex; flex-direction:column; }
    .palette .group-overlay .palette-search { margin: 6px 12px 16px; }
    .palette .group-overlay-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 9px 12px 12px; }
    .palette .group-overlay-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .palette .group-overlay-scroll::-webkit-scrollbar { width: 0; height: 0; }
    .palette .search-results { margin-top: 6px; }
    .palette .search-group-title { display:flex; align-items:center; gap:10px; margin: 18px 0 10px; }
    .palette .search-group-title .group-mini { width: 20px; height: 20px; display:inline-flex; align-items:center; justify-content:center; border-radius:5px; }
    .palette .search-group-title .group-mini i { font-size: 12px; line-height: 1; color: #fff; }
    .palette .search-group-title .group-mini img { width: 12px; height: 12px; object-fit: contain; display:block; }
    .palette .search-group-title .group-name { font-weight:700; font-size: 14px; color:#111; }
    .palette .mini-icon { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; }
    .palette .mini-icon .mini { font-size: 15px; line-height: 1; color:#64748b; }
    .palette .empty { color:#94a3b8; font-size: 12px; padding: 6px 2px; display:flex; flex-direction:column; gap:8px; }
    .palette .items { display:flex; flex-direction:column; gap:8px; }
    .palette .item { display:flex; align-items:center; gap:10px; padding: 14px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,0.04); position: relative; transition: border-color .3s ease; }
    .palette .item.disabled { opacity: .5; cursor: not-allowed; }
    .palette .item.disabled .drag-proxy { pointer-events: none; }
    .palette .item:active { cursor: grabbing; }
    .palette .item:hover:not(.disabled) { border-color:#1677ff; border-width:2px; }
    .palette .item .drag-proxy { position:absolute; inset:0; }
    .palette .item .title .start-dot { width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block; margin-left:6px; box-shadow: 0 0 0 1px rgba(0,0,0,0.06); vertical-align: middle; }
    .palette .item .meta .title { font-weight:600; font-size: 14px; }
    .palette .item .meta .subtitle { color:#8c8c8c; font-size: 13px; }
    .palette .item .meta .desc { color:#6b7280; font-size: 13px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
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
  activeGroup: any | null = null;
  activeGroupIndex = -1;

  // Function Inputs to keep parent logic
  @Input() trackGroupFn: (index: number, g: any) => any = (i, g) => g;
  @Input() trackItemFn: (index: number, it: any) => any = (i, it) => it;
  @Input() miniIconClassFn?: (it: any) => string;
  @Input() simpleIconUrlFn?: (id: string) => string;
  @Input() isItemDisabledFn?: (it: any) => boolean;
  @Input() isDraggingFn?: (it: any) => boolean;
  @Input() typeIconClassFn?: (tpl: any) => string;

  @Output() queryChange = new EventEmitter<string>();
  @Output() itemClick = new EventEmitter<any>();
  @Output() dragStart = new EventEmitter<any>();
  @Output() dragEnd = new EventEmitter<any>();
  hasQuery(): boolean {
    return !!(this.query || '').trim().length;
  }
  filteredGroups(): Array<{ group: any; items: any[] }> {
    if (!this.hasQuery()) return [];
    const q = (this.query || '').toLowerCase();
    const out: Array<{ group: any; items: any[] }> = [];
    (this.groups || []).forEach((g) => {
      const groupTitle = String(g?.title || '');
      const items = (g?.items || []).filter((it: any) => {
        const label = String(it?.label || '');
        const tpl = it?.template || {};
        const hay = [
          label,
          tpl?.name,
          tpl?.type,
          tpl?.subtitle,
          tpl?.description,
          groupTitle
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
      if (items.length) out.push({ group: g, items });
    });
    return out;
  }
  activeGroupItems(): any[] {
    if (!this.activeGroup) return [];
    const items = this.activeGroup?.items || [];
    if (!this.hasQuery()) return items;
    const q = (this.query || '').toLowerCase();
    return items.filter((it: any) => {
      const label = String(it?.label || '');
      const tpl = it?.template || {};
      const hay = [
        label,
        tpl?.name,
        tpl?.type,
        tpl?.subtitle,
        tpl?.description
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  openGroup(g: any, index: number): void {
    this.activeGroup = g;
    this.activeGroupIndex = index;
  }
  closeGroup(): void {
    this.activeGroup = null;
    this.activeGroupIndex = -1;
  }
  searchGlobal(): void {
    this.closeGroup();
  }
  openAiIconUrl = 'https://assets.streamlinehq.com/image/private/w_240,h_240,ar_1/f_auto/v1/icons/technology/openai_1-moa3pqsiii7l4dkheifi8.png/openai_1-gv7rd0u7lcncyfalyjodt.png?_a=DATAg1AAZAA0';
  isOpenAiGroup(g: any): boolean {
    const appId = String(g?.appId || '').toLowerCase();
    return appId.includes('openai');
  }
  fgColor(bg?: string|null): string {
    const b = String(bg || '#1677ff');
    try {
      const { r, g, b: bb } = this.hexToRgb(b);
      const yiq = (r * 299 + g * 587 + bb * 114) / 1000;
      return yiq >= 140 ? '#111' : '#fff';
    } catch { return '#111'; }
  }
  simpleIconUrlWithColor(id: string, color?: string) {
    const hex = (color || '#111').replace('#', '');
    return id ? `https://cdn.simpleicons.org/${encodeURIComponent(id)}/${hex}` : '';
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let s = hex.trim();
    if (s.startsWith('#')) s = s.slice(1);
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const num = parseInt(s, 16);
    return { r: (num>>16)&255, g: (num>>8)&255, b: num&255 };
  }

  isStartLikeTpl(t: any): boolean {
    try { const ty = String(t?.type || '').toLowerCase(); return ty === 'start' || ty === 'start_form' || ty === 'event' || ty === 'endpoint'; } catch { return false; }
  }
  startLikeTooltip(t: any): string {
    try {
      const ty = String(t?.type || '').toLowerCase();
      if (ty === 'start' || ty === 'start_form') return 'Début de flow (manuel)';
      if (ty === 'event') return 'Déclencheur (événement externe)';
      if (ty === 'endpoint') return 'Déclencheur (HTTP endpoint)';
      return 'Déclencheur';
    } catch { return 'Déclencheur'; }
  }

  // Helpers to decide which icon to render for a template item
  isTplIconUrl(it: any): boolean {
    try {
      const tpl = it?.template || {};
      if (tpl?.iconUrl && String(tpl.iconUrl).trim()) return true;
      const ic = tpl?.icon;
      return !!(ic && typeof ic === 'string' && (/^https?:\/\//i).test(ic));
    } catch { return false; }
  }
  tplIconUrl(it: any): string {
    try {
      const tpl = it?.template || {};
      const url = tpl?.iconUrl || tpl?.icon || '';
      return String(url || '');
    } catch { return ''; }
  }
  tplIconClass(it: any): string {
    try { return this.miniIconClassFn?.(it) || ''; } catch { return ''; }
  }
}
