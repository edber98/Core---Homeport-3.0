import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
      <div class="palette-search" [class.searching]="hasQuery()">
        <input
          nz-input
          [ngModel]="internalQuery"
          (ngModelChange)="onQueryInput($event)"
          [disabled]="loading"
          placeholder="Rechercher un nœud (nom, catégorie)"
        />
      </div>
      <div class="palette-scroll" #providersScroll [class.overlay-open]="!!activeGroup" (scroll)="onProvidersScroll()">
        <div class="palette-loading" *ngIf="loading" role="status" aria-live="polite">
          <span class="palette-loading-spinner" aria-hidden="true"></span>
          <span class="palette-loading-text">Chargement des connecteurs…</span>
        </div>
        <ng-container *ngIf="!loading">
          <div class="search-results" *ngIf="hasQuery() && !activeGroup; else browseMode">
            <div class="palette-loading search-loading" *ngIf="searchLoading && displayedSearchGroups().length === 0" role="status" aria-live="polite">
              <span class="palette-loading-spinner" aria-hidden="true"></span>
              <span class="palette-loading-text">Recherche des nœuds…</span>
            </div>
            <ng-container *ngFor="let g of displayedSearchGroups(); let gi = index; trackBy: trackGroupFn">
              <button type="button" class="group-title search-group-title" [class.searching]="hasQuery()" (click)="openGroupFromSearch(g.group, g.index)" [attr.aria-label]="'Ouvrir ' + (g.group?.title || 'provider')">
                <span class="group-mini" *ngIf="g.group?.appId" [style.background]="g.group?.appColor || '#f3f4f6'">
                  <img *ngIf="isOpenAiGroup(g.group)" [src]="openAiIconUrl" alt="icon" />
                  <img *ngIf="!isOpenAiGroup(g.group) && g.group?.appIconUrl" [src]="g.group?.appIconUrl" alt="icon" />
                  <i *ngIf="!isOpenAiGroup(g.group) && !g.group?.appIconUrl && g.group?.appIconClass" [class]="g.group?.appIconClass" [style.color]="fgColor(g.group?.appColor)"></i>
                  <img *ngIf="!isOpenAiGroup(g.group) && !g.group?.appIconUrl && !g.group?.appIconClass" [src]="simpleIconUrlFn?.(g.group?.appId) || ''" alt="icon" />
                </span>
                <span class="group-name">{{ g.group?.title }}</span>
                <span class="group-spacer" *ngIf="g.group?.appId"></span>
              </button>
              <ng-container *ngIf="groupItemsByTitleFor(g.items) as groupedItems">
                <ng-container *ngFor="let section of groupedItems; let sgi = index; trackBy: trackSubGroupFn">
                  <div class="subgroup-title" *ngIf="section.title">{{ section.title }}</div>
                  <div class="items" cdkDropList [id]="(mode === 'drawer' ? 'drawer_search_group_' : 'outside_search_group_') + gi + '_sub_' + sgi"
                       [cdkDropListData]="section.items" [cdkDropListSortingDisabled]="true" [cdkDropListDisabled]="dndDisabled"
                       [cdkDropListConnectedTo]="(mode === 'drawer') ? [] : ['canvasList']"
                       (cdkDropListDropped)="null">
                    <div class="item flat" *ngFor="let it of section.items; trackBy: trackItemFn"
                         [class.dragging]="isDraggingFn?.(it)"
                         [class.disabled]="isItemDisabledFn?.(it)"
                         [attr.aria-disabled]="isItemDisabledFn?.(it) ? true : null"
                         (click)="itemClick.emit(it)">
                      <div class="meta">
                        <div class="title-row">
                          <span class="mini-icon" *ngIf="isTplIconUrl(it)">
                            <img [src]="tplIconUrl(it)" alt="icon" style="width:14px;height:14px;" />
                          </span>
                          <span class="mini-icon" *ngIf="!isTplIconUrl(it) && tplIconClass(it)">
                            <i class="mini" [class]="tplIconClass(it)"></i>
                          </span>
                          <span class="mini-icon" *ngIf="!isTplIconUrl(it) && !tplIconClass(it) && typeIconClassFn?.(it.template)">
                            <i class="mini" [class]="typeIconClassFn?.(it.template)"></i>
                          </span>
                          <span class="title-pack">
                            <span class="label">{{ it.label }}</span>
                            <span class="start-dot" *ngIf="isStartLikeTpl(it.template)" nz-tooltip [nzTooltipTitle]="startLikeTooltip(it.template)"></span>
                          </span>
                          <span class="info" *ngIf="it.template?.description as d" nz-tooltip [nzTooltipTitle]="d">
                            <i class="fa-solid fa-circle-question"></i>
                          </span>
                        </div>
                      </div>
                      <div class="drag-proxy" cdkDrag [cdkDragDisabled]="isMobile || isItemDisabledFn?.(it)"
                           [cdkDragData]="{ label: it.label, template: it.template }"
                           [cdkDragStartDelay]="(mode === 'drawer') ? 150 : 0"
                           [cdkDragBoundary]="(mode === 'drawer') ? '.ant-drawer' : ''"
                           [cdkDragRootElement]="(mode === 'drawer') ? '.ant-drawer' : ''"
                           (cdkDragStarted)="dragStart.emit({item: it, $event: $event})"
                           (cdkDragEnded)="dragEnd.emit({item: it, $event: $event})">
                        <ng-template cdkDragPreview>
                          <div class="item flat" style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; box-shadow:0 10px 24px rgba(0,0,0,.18); display:inline-flex; align-items:center; gap:10px; width: 233px">
                            <div class="meta">
                              <div class="title-row" style=" font-weight:600 !important; font-size: 12px !important;">
                                <span class="mini-icon" *ngIf="miniIconClassFn?.(it)">
                                  <i class="mini" [class]="miniIconClassFn?.(it)"></i>
                                </span>
                                <span class="label">{{ it.label }}</span>
                              </div>
                            </div>
                          </div>
                        </ng-template>
                      </div>
                    </div>
                  </div>
                </ng-container>
              </ng-container>
            </ng-container>
            <div class="empty" *ngIf="!searchLoading && displayedSearchGroups().length === 0">Aucun nœud trouvé.</div>
            <div class="palette-loading more-loading" *ngIf="searchLoadingMore" role="status" aria-live="polite">
              <span class="palette-loading-spinner" aria-hidden="true"></span>
              <span class="palette-loading-text">Chargement des résultats suivants…</span>
            </div>
            <div class="empty load-more-hint" *ngIf="!searchLoading && !searchLoadingMore && searchHasMore">Continuez à défiler pour charger plus de résultats.</div>
          </div>
          <ng-template #browseMode>
            <div class="groups">
              <button class="group-row" type="button" *ngFor="let g of groups; let gi = index; trackBy: trackGroupFn" (click)="openGroup(g, gi)">
              <span class="group-mini" *ngIf="g.appId" [style.background]="g.appColor || '#f3f4f6'">
                <img *ngIf="isOpenAiGroup(g)" [src]="openAiIconUrl" alt="icon" />
                <img *ngIf="!isOpenAiGroup(g) && g.appIconUrl" [src]="g.appIconUrl" alt="icon" />
                <i *ngIf="!isOpenAiGroup(g) && !g.appIconUrl && g.appIconClass" [class]="g.appIconClass" [style.color]="fgColor(g.appColor)"></i>
                <img *ngIf="!isOpenAiGroup(g) && !g.appIconUrl && !g.appIconClass" [src]="simpleIconUrlFn?.(g.appId) || ''" alt="icon" />
              </span>
                <span class="group-name">{{ g.title }}</span>
                <span class="group-count" *ngIf="groupCount(g) !== null">{{ groupCount(g) }}</span>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </ng-template>
        </ng-container>
      </div>

        <div class="group-overlay" *ngIf="activeGroup && !loading"
          #groupOverlay
          [class.swipe-animating]="overlaySwipeAnimating"
          [class.swiping]="overlaySwipeX > 0"
          [style.transform]="'translate3d(' + overlaySwipeX + 'px, 0, 0)'"
          (touchstart)="onGroupOverlayTouchStart($event)"
          (touchmove)="onGroupOverlayTouchMove($event)"
          (touchend)="onGroupOverlayTouchEnd($event)"
          (touchcancel)="onGroupOverlayTouchCancel()">
          <div class="palette-topbar group-topbar">
            <button type="button" class="back-btn" (click)="closeGroup()" aria-label="Retour aux groupes">
              <i class="fa-solid fa-arrow-left"></i>
            </button>
            <span class="group-heading">
              <span class="group-mini" *ngIf="activeGroup?.appId" [style.background]="activeGroup?.appColor || '#f3f4f6'">
                <img *ngIf="isOpenAiGroup(activeGroup)" [src]="openAiIconUrl" alt="icon" />
                <img *ngIf="!isOpenAiGroup(activeGroup) && activeGroup?.appIconUrl" [src]="activeGroup?.appIconUrl" alt="icon" />
                <i *ngIf="!isOpenAiGroup(activeGroup) && !activeGroup?.appIconUrl && activeGroup?.appIconClass" [class]="activeGroup?.appIconClass" [style.color]="fgColor(activeGroup?.appColor)"></i>
                <img *ngIf="!isOpenAiGroup(activeGroup) && !activeGroup?.appIconUrl && !activeGroup?.appIconClass" [src]="simpleIconUrlFn?.(activeGroup?.appId) || ''" alt="icon" />
              </span>
              <span class="group-name">{{ activeGroup?.title }}</span>
            </span>
          </div>
          <div class="palette-search" [class.searching]="hasQuery()">
            <input nz-input [ngModel]="internalQuery" (ngModelChange)="onQueryInput($event)" placeholder="Rechercher un nœud (nom, catégorie)" />
          </div>
          <div class="group-overlay-scroll" (scroll)="onGroupOverlayScroll()">
          <div class="palette-loading group-loading" *ngIf="activeGroupLoading && activeGroupItems().length === 0" role="status" aria-live="polite">
            <span class="palette-loading-spinner" aria-hidden="true"></span>
            <span class="palette-loading-text">Chargement des nœuds…</span>
          </div>
          <ng-container *ngIf="activeGroupItemGroups() as groupedItems">
            <ng-container *ngIf="groupedItems.length > 0; else emptyGroupTpl">
              <ng-container *ngFor="let section of groupedItems; let sgi = index; trackBy: trackSubGroupFn">
                <div class="subgroup-title" *ngIf="section.title">{{ section.title }}</div>
                <div class="items"
                     cdkDropList [id]="(mode === 'drawer' ? 'drawer_group_' : 'outside_group_') + activeGroupIndex + '_sub_' + sgi"
                     [cdkDropListData]="section.items" [cdkDropListSortingDisabled]="true" [cdkDropListDisabled]="dndDisabled"
                     [cdkDropListConnectedTo]="(mode === 'drawer') ? [] : ['canvasList']"
                     (cdkDropListDropped)="null">
                  <div class="item flat" *ngFor="let it of section.items; trackBy: trackItemFn"
                       [class.dragging]="isDraggingFn?.(it)"
                       [class.disabled]="isItemDisabledFn?.(it)"
                       [attr.aria-disabled]="isItemDisabledFn?.(it) ? true : null"
                       (click)="itemClick.emit(it)">
                    <div class="meta">
                      <div class="title-row">
                        <span class="mini-icon" *ngIf="isTplIconUrl(it)">
                          <img [src]="tplIconUrl(it)" alt="icon" style="width:14px;height:14px;" />
                        </span>
                        <span class="mini-icon" *ngIf="!isTplIconUrl(it) && tplIconClass(it)">
                          <i class="mini" [class]="tplIconClass(it)"></i>
                        </span>
                        <span class="mini-icon" *ngIf="!isTplIconUrl(it) && !tplIconClass(it) && typeIconClassFn?.(it.template)">
                          <i class="mini" [class]="typeIconClassFn?.(it.template)"></i>
                        </span>
                        <span class="title-pack">
                          <span class="label">{{ it.label }}</span>
                          <span class="start-dot" *ngIf="isStartLikeTpl(it.template)" nz-tooltip [nzTooltipTitle]="startLikeTooltip(it.template)"></span>
                        </span>
                        <span class="info" *ngIf="it.template?.description as d" nz-tooltip [nzTooltipTitle]="d">
                          <i class="fa-solid fa-circle-question"></i>
                        </span>
                      </div>
                    </div>
                    <div class="drag-proxy" cdkDrag [cdkDragDisabled]="isMobile || isItemDisabledFn?.(it)"
                         [cdkDragData]="{ label: it.label, template: it.template }"
                         [cdkDragStartDelay]="(mode === 'drawer') ? 150 : 0"
                         [cdkDragBoundary]="(mode === 'drawer') ? '.ant-drawer' : ''"
                         [cdkDragRootElement]="(mode === 'drawer') ? '.ant-drawer' : ''"
                         (cdkDragStarted)="dragStart.emit({item: it, $event: $event})"
                         (cdkDragEnded)="dragEnd.emit({item: it, $event: $event})">
                      <ng-template cdkDragPreview>
                        <div class="item flat" style="background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; box-shadow:0 10px 24px rgba(0,0,0,.18); display:inline-flex; align-items:center; gap:10px; width: 233px">
                          <div class="meta">
                            <div class="title-row" style=" font-weight:600 !important; font-size: 12px !important;">
                              <span class="mini-icon" *ngIf="miniIconClassFn?.(it)">
                                <i class="mini" [class]="miniIconClassFn?.(it)"></i>
                              </span>
                              <span class="label">{{ it.label }}</span>
                            </div>
                          </div>
                        </div>
                      </ng-template>
                    </div>
                  </div>
                </div>
              </ng-container>
            </ng-container>
          </ng-container>
          <div class="palette-loading more-loading" *ngIf="activeGroupLoadingMore" role="status" aria-live="polite">
            <span class="palette-loading-spinner" aria-hidden="true"></span>
            <span class="palette-loading-text">Chargement des nœuds suivants…</span>
          </div>
          <div class="empty load-more-hint" *ngIf="!activeGroupLoading && !activeGroupLoadingMore && activeGroupHasMore && activeGroupItems().length > 0">
            Continuez à défiler pour charger plus de nœuds.
          </div>
          <ng-template #emptyGroupTpl>
            <div class="empty" *ngIf="!activeGroupLoading">
              <div>Aucun nœud trouvé dans ce groupe.</div>
              <button *ngIf="hasQuery()" type="button" class="apple-btn" (click)="searchGlobal()" aria-label="Rechercher dans tous les groupes">
                Rechercher dans tous les groupes
              </button>
            </div>
          </ng-template>
          </div>
        </div>
    </aside>
  `,
  styles: [`
    :host { display:block; height: 100%; min-height: 0; }
    /* Always size to container and scroll inside when content exceeds */
    .palette { border: none; border-radius: 0; padding: 0 0 12px; background: #ffffff; padding-top: 0 !important; height: 100%; overflow: auto; position: relative; }
    .palette { display:flex; flex-direction:column; }
    .palette.drawer-mode { height: 100%; overflow: auto; }
    @media (max-width: 768px) {
      .palette { padding: 0; padding-right: 0; }
    }
    .palette .palette-topbar { width: 100%; margin: 0; background:#fff; padding:10px 12px; font-weight:700; font-size:18px; color:#111; display:flex; align-items:center; gap:0; border-bottom: 0; flex-direction:column; }
    .palette .palette-topbar.centered { justify-content:center; }
    .palette .palette-topbar .t { font-weight:700; font-size:14px; color:#111; line-height:1.1; }
    .palette .palette-topbar .s { font-size:13px; color:#64748b; line-height:1.2; }
    .palette .palette-search { margin: 6px 0 14px; padding: 0 12px; }
    .palette .palette-search.searching { margin-bottom: 0; }
    :host ::ng-deep .palette .palette-search .ant-input:focus,
    :host ::ng-deep .palette .palette-search .ant-input-focused {
      border-color: #1677ff;
      box-shadow: none;
    }
    .palette .palette-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding-right: 1px; }
    .palette .palette-scroll.overlay-open { pointer-events: none; }
    .palette .palette-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .palette .palette-scroll::-webkit-scrollbar { width: 0; height: 0; }
    .palette .palette-loading { min-height: 200px; height: 100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#64748b; }
    .palette .palette-loading.search-loading,
    .palette .palette-loading.more-loading,
    .palette .palette-loading.group-loading { min-height: 0; height: auto; padding: 14px 12px; }
    .palette .palette-loading-spinner { width: 24px; height: 24px; border-radius: 50%; border: 3px solid #dbe4ef; border-top-color: #1677ff; animation: palette-spin .75s linear infinite; }
    .palette .palette-loading-text { font-size: 12px; font-weight: 500; color:#475569; }
    @keyframes palette-spin { to { transform: rotate(360deg); } }
    .palette .groups { display:flex; flex-direction: column; gap: 0; margin: 0; }
    .palette .group-title { font-weight: 600; font-size: 13px; color:#111; margin: 10px 0 8px; }
    .palette .group-title .group-mini { width: 18px; height: 18px; display:inline-flex; align-items:center; justify-content:center; border-radius:5px; margin-right:6px; vertical-align: text-bottom; }
    .palette .group-title .group-mini i { font-size: 12px; line-height: 1; color: #fff; }
    .palette .group-title .group-mini img { width: 12px; height: 12px; object-fit: contain; display:block; }
    .palette .subgroup-title { font-weight: 600; font-size: 13px; color:#6b7280; margin: 8px 0 0px; letter-spacing: .02em; text-transform: none; padding: 0 20px; }
    .palette .group-overlay .subgroup-title { margin-top: 12px; }
    .palette .group-topbar { justify-content:center; position: relative; }
    .palette .group-topbar .back-btn { position:absolute; left:22px; top:50%; transform: translateY(-50%); }
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
    .palette .group-overlay { position:absolute; inset:0; background:#fff; padding:0; overflow:hidden; z-index: 2; display:flex; flex-direction:column; touch-action: pan-y; will-change: transform; }
    .palette .group-overlay.swipe-animating { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease; }
    .palette .group-overlay.swiping { box-shadow: -12px 0 24px rgba(15, 23, 42, 0.12); }
    .palette .group-overlay .palette-search { margin: 6px 12px 16px; }
    .palette .group-overlay-scroll { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 0 12px; }
    .palette .group-overlay-scroll { scrollbar-width: none; -ms-overflow-style: none; }
    .palette .group-overlay-scroll::-webkit-scrollbar { width: 0; height: 0; }
    .palette .search-results { margin-top: 6px; }
    .palette .search-group-title { display:flex; align-items:center; justify-content:center; gap:0; margin: 16px 0 16px; text-align: center; padding: 0 12px; width: 100%; background: transparent; border: 0; cursor: pointer; }
    .palette .search-group-title.searching { border-top: 0.5px solid #f1f5f9; padding-top: 16px; }
    .palette .search-group-title .group-mini { width: 20px; height: 20px; display:inline-flex; align-items:center; justify-content:center; border-radius:5px; margin-right: 10px; }
    .palette .search-group-title .group-mini i { font-size: 12px; line-height: 1; color: #fff; }
    .palette .search-group-title .group-mini img { width: 12px; height: 12px; object-fit: contain; display:block; }
    .palette .search-group-title .group-name { font-weight:700; font-size: 14px; color:#111; }
    .palette .search-group-title .group-spacer { width: 20px; height: 20px; margin-left: 10px; display:inline-block; }
    .palette .mini-icon { width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; margin-right:6px; }
    .palette .mini-icon .mini { font-size: 15px; line-height: 1; color:#64748b; }
    .palette .empty { color:#94a3b8; font-size: 12px; padding: 6px 2px; display:flex; flex-direction:column; gap:8px; }
    .palette .items { display:flex; flex-direction:column; gap:0; }
    .palette .item { display:flex; align-items:center; gap:10px; padding: 14px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: grab; box-shadow: 0 1px 2px rgba(0,0,0,0.04); position: relative; z-index: 0; transition: border-color .3s ease; user-select: none; -webkit-user-select: none; }
    .palette .item * { user-select: none; -webkit-user-select: none; }
    .palette .group-title,
    .palette .group-row,
    .palette .group-topbar,
    .palette .group-heading,
    .palette .search-group-title,
    .palette .subgroup-title { user-select: none; -webkit-user-select: none; }
    .palette .item.flat { padding: 6px 22px; border: none; background: transparent; box-shadow: none; border-radius: 0; }
    .palette .item.flat:hover:not(.disabled) { background: #f8fafc; border-color: transparent; border-width: 0; }
    .palette .item.flat .meta { flex: 1 1 auto; min-width: 0; }
    .palette .item.flat .title-row { display:flex; align-items:center; gap:6px; font-weight: 600; font-size: 13px; }
    .palette .item.flat .title-pack { display:inline-flex; align-items:center; gap:10px; flex: 1 1 auto; min-width: 0; }
    .palette .item.flat .title-row .label { flex: 0 1 auto; white-space: nowrap; color:#111; font-weight: 400; }
    .palette .item.flat .info { color:#94a3b8; cursor: help; display:inline-flex; align-items:center; justify-content:center; padding-right: 8px; position: relative; z-index: 2; }
    .palette .item.flat .info i { font-size: 14px; }
    .palette .item.disabled { opacity: .5; cursor: not-allowed; }
    .palette .item.disabled .drag-proxy { pointer-events: none; }
    .palette .item:active { cursor: grabbing; }
    .palette .item:hover:not(.disabled) { border-color:#1677ff; border-width:2px; }
    /* Leave space for the info tooltip icon to receive hover events */
    .palette .item .drag-proxy { position:absolute; inset:0; right:32px; z-index: 1; }
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
export class FlowPalettePanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() mode: 'drawer' | 'outside' = 'outside';
  @Input() groups: any[] = [];
  @Input() loading = false;
  @Input() query = '';
  @Input() searchGroups: Array<{ group: any; items: any[]; index: number }> = [];
  @Input() searchLoading = false;
  @Input() searchLoadingMore = false;
  @Input() searchHasMore = false;
  @Input() activeGroupLoading = false;
  @Input() activeGroupLoadingMore = false;
  @Input() activeGroupHasMore = false;
  @Input() isMobile = false;
  @Input() dndDisabled = false;
  activeGroup: any | null = null;
  activeGroupIndex = -1;
  internalQuery = '';
  private providersScrollTop = 0;
  private restoreProvidersScrollPending = false;
  private providersScrollEl?: ElementRef<HTMLDivElement>;
  private groupOverlayEl?: ElementRef<HTMLDivElement>;
  private overlayTouchActive = false;
  private overlayTouchFromEdge = false;
  private overlayTouchAxisLock: 'none' | 'x' | 'y' = 'none';
  private overlayTouchStartX = 0;
  private overlayTouchStartY = 0;
  private overlayTouchLastX = 0;
  private overlayTouchLastY = 0;
  private overlayTouchStartAt = 0;
  overlaySwipeX = 0;
  overlaySwipeAnimating = false;
  private overlayCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private queryInput$ = new Subject<string>();
  private querySub?: Subscription;
  private readonly queryDebounceMs = 400;

  @ViewChild('providersScroll')
  set providersScrollRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.providersScrollEl = ref;
    this.restoreProvidersScrollIfNeeded();
  }

  @ViewChild('groupOverlay')
  set groupOverlayRef(ref: ElementRef<HTMLDivElement> | undefined) {
    this.groupOverlayEl = ref;
  }

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
  @Output() groupOpenRequest = new EventEmitter<any>();
  @Output() groupCloseRequest = new EventEmitter<void>();
  @Output() searchLoadMore = new EventEmitter<void>();
  @Output() groupLoadMore = new EventEmitter<any>();
  ngOnInit(): void {
    this.internalQuery = this.query || '';
    this.querySub = this.queryInput$
      .pipe(debounceTime(this.queryDebounceMs), distinctUntilChanged())
      .subscribe((val) => this.queryChange.emit(val));
  }
  ngOnDestroy(): void {
    if (this.overlayCloseTimer) {
      clearTimeout(this.overlayCloseTimer);
      this.overlayCloseTimer = null;
    }
    this.querySub?.unsubscribe();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['query']) {
      const next = this.query || '';
      if (next !== this.internalQuery) {
        this.internalQuery = next;
      }
    }
    if (changes['groups'] && this.activeGroup) {
      const refreshed = this.findGroupMatch(this.activeGroup);
      if (refreshed) {
        this.activeGroup = refreshed.group;
        this.activeGroupIndex = refreshed.index;
      }
    }
  }
  onQueryInput(value: string): void {
    this.internalQuery = value;
    this.queryInput$.next(value);
  }
  hasQuery(): boolean {
    return !!(this.query || '').trim().length;
  }
  filteredGroups(): Array<{ group: any; items: any[]; index: number }> {
    if (!this.hasQuery()) return [];
    const q = (this.query || '').toLowerCase();
    const out: Array<{ group: any; items: any[]; index: number }> = [];
    (this.groups || []).forEach((g, index) => {
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
      if (items.length) out.push({ group: g, items, index });
    });
    return out;
  }
  displayedSearchGroups(): Array<{ group: any; items: any[]; index: number }> {
    if (Array.isArray(this.searchGroups)) return this.searchGroups;
    return this.filteredGroups();
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
  activeGroupItemGroups(): Array<{ key: string; title: string; items: any[] }> {
    const items = this.activeGroupItems();
    return this.groupItemsByTitle(items);
  }
  openGroup(g: any, index: number): void {
    this.providersScrollTop = this.providersScrollEl?.nativeElement?.scrollTop || 0;
    this.activeGroup = g;
    this.activeGroupIndex = index;
    this.groupOpenRequest.emit(g);
  }
  openGroupFromSearch(g: any, index: number): void {
    const target = this.findGroupMatch(g);
    this.query = '';
    this.internalQuery = '';
    this.queryInput$.next('');
    this.queryChange.emit('');
    this.openGroup(target?.group || g, target?.index ?? index);
  }
  closeGroup(): void {
    if (this.overlayCloseTimer) {
      clearTimeout(this.overlayCloseTimer);
      this.overlayCloseTimer = null;
    }
    this.activeGroup = null;
    this.activeGroupIndex = -1;
    this.restoreProvidersScrollPending = true;
    this.restoreProvidersScrollIfNeeded();
    this.onGroupOverlayTouchCancel(false);
    this.groupCloseRequest.emit();
  }
  searchGlobal(): void {
    this.closeGroup();
  }
  onProvidersScroll(): void {
    if (!this.hasQuery() || !!this.activeGroup || this.searchLoading || this.searchLoadingMore || !this.searchHasMore) return;
    const el = this.providersScrollEl?.nativeElement;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 120) this.searchLoadMore.emit();
  }
  onGroupOverlayScroll(): void {
    if (!this.activeGroup || this.activeGroupLoading || this.activeGroupLoadingMore || !this.activeGroupHasMore) return;
    const el = this.groupOverlayEl?.nativeElement?.querySelector('.group-overlay-scroll') as HTMLDivElement | null;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 120) this.groupLoadMore.emit(this.activeGroup);
  }

  onGroupOverlayTouchStart(event: TouchEvent): void {
    if (!this.isMobile || !this.activeGroup) return;
    if (!event.touches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const overlayWidth = Math.max(280, this.groupOverlayEl?.nativeElement?.clientWidth || 320);
    const swipeStartMaxX = overlayWidth * 0.5; // allow swipe-start anywhere on the left half
    this.overlaySwipeAnimating = false;
    this.overlayTouchActive = true;
    this.overlayTouchFromEdge = touch.clientX <= swipeStartMaxX;
    this.overlayTouchAxisLock = 'none';
    this.overlayTouchStartX = touch.clientX;
    this.overlayTouchStartY = touch.clientY;
    this.overlayTouchLastX = touch.clientX;
    this.overlayTouchLastY = touch.clientY;
    this.overlayTouchStartAt = Date.now();
  }

  onGroupOverlayTouchMove(event: TouchEvent): void {
    if (!this.overlayTouchActive || !event.touches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.overlayTouchLastX = touch.clientX;
    this.overlayTouchLastY = touch.clientY;
    const dx = this.overlayTouchLastX - this.overlayTouchStartX;
    const dy = this.overlayTouchLastY - this.overlayTouchStartY;

    if (this.overlayTouchAxisLock === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (!this.overlayTouchFromEdge) {
        this.overlayTouchAxisLock = 'y';
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) * 1.2 && dx > 0) {
        this.overlayTouchAxisLock = 'x';
      } else if (Math.abs(dy) > Math.abs(dx)) {
        this.overlayTouchAxisLock = 'y';
      } else {
        return;
      }
    }

    if (this.overlayTouchAxisLock !== 'x') return;
    event.preventDefault();
    const overlayWidth = Math.max(280, this.groupOverlayEl?.nativeElement?.clientWidth || 320);
    const maxTranslate = Math.round(overlayWidth * 0.92);
    this.overlaySwipeX = Math.max(0, Math.min(maxTranslate, dx));
  }

  onGroupOverlayTouchEnd(event: TouchEvent): void {
    if (!this.overlayTouchActive || !this.isMobile || !this.activeGroup) {
      this.onGroupOverlayTouchCancel(false);
      return;
    }

    const minSwipeDistance = 72;
    const maxVerticalDrift = 56;
    const maxSwipeDurationMs = 900;

    const changed = event.changedTouches?.[0];
    const endX = changed?.clientX ?? this.overlayTouchLastX;
    const endY = changed?.clientY ?? this.overlayTouchLastY;
    const dx = endX - this.overlayTouchStartX;
    const dy = endY - this.overlayTouchStartY;
    const elapsed = Date.now() - this.overlayTouchStartAt;

    const overlayWidth = Math.max(280, this.groupOverlayEl?.nativeElement?.clientWidth || 320);
    const dynamicTrigger = Math.round(overlayWidth * 0.26);
    const validDistance = dx >= minSwipeDistance;
    const passedDynamicTrigger = dx >= dynamicTrigger;
    const validVerticalDrift = Math.abs(dy) <= maxVerticalDrift;
    const validDuration = elapsed <= maxSwipeDurationMs;
    const horizontalGesture = this.overlayTouchAxisLock === 'x';

    const shouldClose = this.overlayTouchFromEdge && horizontalGesture && (validDistance || passedDynamicTrigger) && validVerticalDrift && validDuration;
    if (shouldClose) {
      this.overlaySwipeAnimating = true;
      this.overlaySwipeX = overlayWidth;
      this.clearOverlayTouchState();
      if (this.overlayCloseTimer) clearTimeout(this.overlayCloseTimer);
      this.overlayCloseTimer = setTimeout(() => {
        this.overlayCloseTimer = null;
        this.closeGroup();
      }, 170);
      return;
    }
    this.onGroupOverlayTouchCancel(true);
  }

  onGroupOverlayTouchCancel(animateBack = true): void {
    if (animateBack && this.overlaySwipeX > 0) {
      this.overlaySwipeAnimating = true;
    } else {
      this.overlaySwipeAnimating = false;
    }
    this.overlaySwipeX = 0;
    this.clearOverlayTouchState();
  }

  private clearOverlayTouchState(): void {
    this.overlayTouchActive = false;
    this.overlayTouchFromEdge = false;
    this.overlayTouchAxisLock = 'none';
    this.overlayTouchStartX = 0;
    this.overlayTouchStartY = 0;
    this.overlayTouchLastX = 0;
    this.overlayTouchLastY = 0;
    this.overlayTouchStartAt = 0;
  }

  private restoreProvidersScrollIfNeeded(): void {
    const el = this.providersScrollEl?.nativeElement;
    if (!el || !this.restoreProvidersScrollPending) return;
    el.scrollTop = this.providersScrollTop;
    this.restoreProvidersScrollPending = false;
  }
  private findGroupMatch(group: any): { group: any; index: number } | null {
    const appId = String(group?.appId || '').trim();
    const title = String(group?.title || '').trim();
    const index = (this.groups || []).findIndex((candidate) => {
      const candidateAppId = String(candidate?.appId || '').trim();
      const candidateTitle = String(candidate?.title || '').trim();
      if (appId && candidateAppId) return candidateAppId === appId;
      return !!title && candidateTitle === title;
    });
    if (index < 0) return null;
    return { group: this.groups[index], index };
  }
  groupCount(g: any): number | null {
    if (typeof g?.itemCount === 'number') return Math.max(0, Number(g.itemCount) || 0);
    if (Array.isArray(g?.items)) return g.items.length;
    return null;
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

  trackSubGroupFn = (_: number, g: any) => g?.key || g?.title || _;

  groupItemsByTitleFor(items: any[]): Array<{ key: string; title: string; items: any[] }> {
    return this.groupItemsByTitle(items);
  }

  private groupItemsByTitle(items: any[]): Array<{ key: string; title: string; items: any[] }> {
    const groups: Array<{ key: string; title: string; items: any[] }> = [];
    const byKey = new Map<string, { key: string; title: string; items: any[] }>();
    let ungrouped: { key: string; title: string; items: any[] } | null = null;
    for (const it of (items || [])) {
      const raw = String(it?.template?.group || '').trim();
      if (!raw) {
        if (!ungrouped) ungrouped = { key: '__ungrouped__', title: 'Autres', items: [] };
        ungrouped.items.push(it);
        continue;
      }
      let group = byKey.get(raw);
      if (!group) {
        group = { key: raw, title: raw, items: [] };
        byKey.set(raw, group);
        groups.push(group);
      }
      group.items.push(it);
    }
    if (ungrouped && ungrouped.items.length) {
      if (groups.length === 0) ungrouped.title = '';
      groups.push(ungrouped);
    }
    return groups;
  }

}
