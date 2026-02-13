import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, EventEmitter, Output, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Vflow, Edge, ConnectionSettings } from 'ngx-vflow';
import { backAwareCurve } from './edge-curves';
import { NodeCardHeaderComponent } from '../../shared/node-card-header.component';
import { Subscription } from 'rxjs';
import { CatalogService, AppProvider } from '../../services/catalog.service';

@Component({
  selector: 'flow-viewer',
  standalone: true,
  imports: [CommonModule, Vflow, NodeCardHeaderComponent],
  template: `
  <div class="flow-viewer">
    <section class="canvas ro">
      <div class="canvas-host" #flowHost (wheel)="onWheel($event)" (pointerdown)="onPointerDown($event)">
        <vflow view="auto" [background]="background" [entitiesSelectable]="allowDrag && move" [minZoom]="0.05" [maxZoom]="3"
               [nodes]="vNodes" [edges]="vEdges" [connection]="internalConnection" #flow (onNodesChange.position.single)="onNodePositionChange($event)"
               (selected)="selected.emit($event)" (onConnect)="connect.emit($event)">
          <ng-template let-ctx edge>
            <svg:g customTemplateEdge>
              <svg:path fill="none" [attr.d]="ctx.path()" [attr.stroke-width]="ctx.edge.data?.error ? 2 : (ctx.edge.data?.strokeWidth || 2)"
                [attr.stroke]="edgeStrokeColor(ctx.edge)"
                [attr.stroke-opacity]="edgeStrokeOpacity(ctx.edge)"
                [attr.marker-end]="ctx.markerEnd()" />
            </svg:g>
          </ng-template>
          <ng-template let-ctx edgeLabelHtml>
            <div class="edge-labels" [ngClass]="{ error: (computeEdgeLabel(ctx.edge) || (ctx.label.data?.text || '')) === 'Error', muted: safariOrIOS && dimInactive && !isEdgeActive(ctx.edge) }" [style.opacity]="edgeLabelOpacity(ctx.edge)">
              <div class="badge label" *ngIf="computeEdgeLabel(ctx.edge) as txt" [ngClass]="{ error: txt === 'Error' }">{{ txt }}</div>
            </div>
          </ng-template>
          <ng-template let-ctx nodeHtml>
            <!-- IMPORTANT (WebKit/Safari constraint):
                 - Ne pas utiliser foreignObject ou position: absolute/relative au voisinage des handles.
                 - Garder uniquement du SVG pur dans les templates de handle.
                 - Tout wrapper CSS doit rester hors des groupes de handle pour éviter les bugs de bbox/anchor.
            -->
            <div class="node-card ro" [class.locked]="!(allowDrag && move)" [ngClass]="{ 'horizontal': portOrientation === 'horizontal', 'no-inputs': isTriggerTemplate(ctx.node.data.model.templateObj), 'dim': !safariOrIOS && dimInactive && !isNodeActive(ctx.node.id), 'dim-safari': safariOrIOS && dimInactive && !isNodeActive(ctx.node.id) }" [class.selected]="selectedNodeId && (ctx.node.id === selectedNodeId)">
              <div class="center-wrap">
                <node-card-header
                  [title]="ctx.node.data.model.templateObj?.title || ctx.node.data.model?.name"
                  [subtitle]="ctx.node.data.model.templateObj?.subtitle || ctx.node.data.model.templateObj?.category || ctx.node.data.model.templateObj?.type"
                  [typeIcon]="typeIconClass(ctx.node.data.model.templateObj)"
                  [app]="getAppById((ctx.node.data.model.templateObj?.app && ctx.node.data.model.templateObj?.app._id) ? ctx.node.data.model.templateObj?.app._id : ctx.node.data.model.templateObj?.appId)"
                  [appId]="(ctx.node.data.model.templateObj?.app && ctx.node.data.model.templateObj?.app._id) ? ctx.node.data.model.templateObj?.app._id : ctx.node.data.model.templateObj?.appId"
                  [iconClass]="ctx.node.data.model.templateObj?.icon"
                  [iconUrl]="ctx.node.data.model.templateObj?.iconUrl"
                ></node-card-header>
                <div class="desc" [ngClass]="{ clamp: (ctx.node.data.model?.expand_description !== true) }" *ngIf="showDescriptions && !simOutputPreview && (ctx.node.data.model?.hide_description !== true) && ctx.node.data.model?.description as d"
                     [ngStyle]="{ display: (portOrientation === 'vertical' && (linkHandlesForNode(ctx.node.id, ctx.node.data.model)?.length || 0) > 0) ? 'none' : '' }">
                  {{ d }}
                </div>
              </div>
              <!-- Simulation output preview rendered like linked handles -->
              <div class="links" *ngIf="simOutputPreview && simOutputPreview[ctx.node.id] as simLinks">
                <ng-container *ngFor="let lh of simLinks">
                  <!-- Parent link -->
                  <div class="link" draggable="true"
                       (dragstart)="onSimLinkDragStart($event, ctx.node.id, lh.name)"
                       (mousedown)="onSimLinkMouseDown($event, ctx.node.id, lh.name)"
                       (click)="onSimLinkClick($event, ctx.node.id, lh.name)"
                       (pointerdown)="onSimLinkPointerDown($event, ctx.node.id, lh.name)">
                    <div class="link-label" draggable="true"
                         (dragstart)="onSimLinkDragStart($event, ctx.node.id, lh.name)"
                         (mousedown)="onSimLinkMouseDown($event, ctx.node.id, lh.name)"
                         (click)="onSimLinkClick($event, ctx.node.id, lh.name)"
                         (pointerdown)="onSimLinkPointerDown($event, ctx.node.id, lh.name)">
                      <span class="link-chevron" *ngIf="lh.children?.length">&#9662;</span>
                      <span class="txt">{{ lh.name }}</span>
                      <span class="type" style="color:#94a3b8">({{ lh.type }})</span>
                    </div>
                    <ng-template #simLinkTpl let-hctx>
                      <svg:g>
                        <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                          [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                          [attr.fill]="handleFillColor(ctx.node.id, 'sim')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                          [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-opacity]="handleOpacity(ctx.node.id)" stroke-width="1"></svg:circle>
                      </svg:g>
                    </ng-template>
                    <ng-container *ngIf="portOrientation === 'vertical'; else simHorizLink">
                      <handle position="right" type="source" [id]="lh.id" [template]="simLinkTpl" />
                    </ng-container>
                    <ng-template #simHorizLink>
                      <handle position="bottom" type="source" [id]="lh.id" [template]="simLinkTpl" />
                    </ng-template>
                  </div>
                  <!-- Child links (each with own handle) -->
                  <ng-container *ngIf="lh.children?.length">
                    <div class="link link-child-row" *ngFor="let ch of lh.children" draggable="true"
                         (dragstart)="onSimLinkDragStart($event, ctx.node.id, lh.name + '.' + ch.name)"
                         (mousedown)="onSimLinkMouseDown($event, ctx.node.id, lh.name + '.' + ch.name)"
                         (click)="onSimLinkClick($event, ctx.node.id, lh.name + '.' + ch.name)"
                         (pointerdown)="onSimLinkPointerDown($event, ctx.node.id, lh.name + '.' + ch.name)">
                      <div class="link-label link-child-label" draggable="true"
                           (dragstart)="onSimLinkDragStart($event, ctx.node.id, lh.name + '.' + ch.name)"
                           (mousedown)="onSimLinkMouseDown($event, ctx.node.id, lh.name + '.' + ch.name)"
                           (click)="onSimLinkClick($event, ctx.node.id, lh.name + '.' + ch.name)"
                           (pointerdown)="onSimLinkPointerDown($event, ctx.node.id, lh.name + '.' + ch.name)">
                        <span class="txt">{{ ch.name }}</span>
                        <span class="type">({{ ch.type }})</span>
                      </div>
                      <ng-template #simChildTpl let-hctx>
                        <svg:g>
                          <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                            [attr.r]="hctx.state() === 'valid' ? 5 : 3"
                            [attr.fill]="handleFillColor(ctx.node.id, 'sim')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                            [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-opacity]="handleOpacity(ctx.node.id)" stroke-width="1"></svg:circle>
                        </svg:g>
                      </ng-template>
                      <ng-container *ngIf="portOrientation === 'vertical'; else simChildHoriz">
                        <handle position="right" type="source" [id]="ch.id" [template]="simChildTpl" />
                      </ng-container>
                      <ng-template #simChildHoriz>
                        <handle position="bottom" type="source" [id]="ch.id" [template]="simChildTpl" />
                      </ng-template>
                    </div>
                  </ng-container>
                </ng-container>
              </div>
              <ng-container *ngIf="!isTriggerTemplate(ctx.node.data.model.templateObj) && (ctx.node.data.model.templateObj?.inputHandles?.length || 0) > 0; else singleIn">
                <div class="inputs" *ngIf="ctx.node.data.model.templateObj.inputHandles as ins">
                  <div class="in" *ngFor="let ih of ins; let i = index">
                    <ng-template #ihTpl let-hctx>
                    <svg:g>
                      <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                        [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                        [attr.fill]="handleFillColor(ctx.node.id, 'in')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                        [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-width]="1" [attr.stroke-opacity]="handleOpacity(ctx.node.id)"
                        (mouseenter)="onInputEnter($event, ctx.node.data.model, ih.id)"
                        (mousemove)="onHandleMove($event)"
                        (mouseleave)="onHandleLeave()"
                      ></svg:circle>
                    </svg:g>
                    </ng-template>
                    <ng-container *ngIf="portOrientation === 'vertical'; else horizInputMulti">
                      <handle position="top" type="target" [id]="ih.id" [template]="ihTpl" />
                    </ng-container>
                    <ng-template #horizInputMulti>
                      <div style="position: absolute; left: 0;" [style.top.px]="horizHandleTop(i, ins.length)">
                        <handle position="left" type="target" [id]="ih.id" [template]="ihTpl" />
                      </div>
                    </ng-template>
                  </div>
                </div>
              </ng-container>
              <ng-template #singleIn>
                <ng-container *ngIf="!isTriggerTemplate(ctx.node.data.model.templateObj)">
                  <ng-container *ngIf="inputId(ctx.node.data.model.templateObj) as inId">
                  <ng-template #handleInTpl let-hctx>
                    <svg:g>
                      <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                        [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                        [attr.fill]="handleFillColor(ctx.node.id, 'in')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                        [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-width]="1" [attr.stroke-opacity]="handleOpacity(ctx.node.id)"
                        (mouseenter)="onInputEnter($event, ctx.node.data.model, inId)"
                        (mousemove)="onHandleMove($event)"
                        (mouseleave)="onHandleLeave()"
                      ></svg:circle>
                    </svg:g>
                  </ng-template>
                  <ng-container *ngIf="portOrientation === 'vertical'; else horizInputSingle">
                    <handle position="top" type="target" [id]="inId" [template]="handleInTpl" />
                  </ng-container>
                    <ng-template #horizInputSingle>
                      <!-- Laisser Vflow centrer verticalement le handle sans wrapper positionné -->
                      <handle position="left" type="target" [id]="inId" [template]="handleInTpl" />
                    </ng-template>
                  </ng-container>
                </ng-container>
              </ng-template>
              <div class="outputs" *ngIf="outputIds(ctx.node.data.model)?.length as outs">
                <div class="out" *ngFor="let out of outputIds(ctx.node.data.model); let i = index">
                  <ng-template #hTpl let-hctx>
                    <svg:g>
                      <svg:circle
                        [attr.cx]="hctx.point().x"
                        [attr.cy]="hctx.point().y"
                        [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                        [attr.fill]="handleFillColor(ctx.node.id, out)" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                        [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-opacity]="handleOpacity(ctx.node.id)"
                        stroke-width="1"
                        (mouseenter)="onHandleEnter($event, ctx.node.data.model, out)"
                        (mousemove)="onHandleMove($event)"
                        (mouseleave)="onHandleLeave()"
                      ></svg:circle>
                    </svg:g>
                  </ng-template>
                  <ng-container *ngIf="portOrientation === 'vertical'; else horizOutput">
                    <handle position="bottom" type="source" [id]="out" [template]="hTpl"></handle>
                  </ng-container>
                  <ng-template #horizOutput>
                    <div style="position: absolute; right: 0;" [style.top.px]="horizHandleTop(i, outs)">
                      <handle position="right" type="source" [id]="out" [template]="hTpl"></handle>
                    </div>
                  </ng-template>
                </div>
              </div>
              <!-- Linked handles and description combo -->
              <ng-container *ngIf="!simOutputPreview">
                <ng-container *ngIf="portOrientation === 'vertical'; else linksDefault">
                  <div class="desc-links" *ngIf="(linkHandlesForNode(ctx.node.id, ctx.node.data.model)?.length || 0) > 0">
                    <div class="desc" [ngClass]="{ clamp: (ctx.node.data.model?.expand_description !== true) }" *ngIf="showDescriptions && (ctx.node.data.model?.hide_description !== true) && ctx.node.data.model?.description as d">{{ d }}</div>
                    <div class="links">
                      <div class="link" *ngFor="let lh of linkHandlesForNode(ctx.node.id, ctx.node.data.model)">
                        <div class="link-label">{{ lh.name }}</div>
                        <ng-template #linkTpl let-hctx>
                          <svg:g>
                            <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                              [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                              [attr.fill]="handleFillColor(ctx.node.id, 'link')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                              [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-opacity]="handleOpacity(ctx.node.id)" stroke-width="1"></svg:circle>
                          </svg:g>
                        </ng-template>
                        <handle position="right" type="source" [id]="lh.id" [template]="linkTpl" />
                      </div>
                    </div>
                  </div>
                </ng-container>
                <ng-template #linksDefault>
                  <div class="links" *ngIf="linkHandlesForNode(ctx.node.id, ctx.node.data.model)?.length as links">
                    <div class="link" *ngFor="let lh of linkHandlesForNode(ctx.node.id, ctx.node.data.model)">
                      <div class="link-label">{{ lh.name }}</div>
                      <ng-template #linkTpl let-hctx>
                        <svg:g>
                          <svg:circle [attr.cx]="hctx.point().x" [attr.cy]="hctx.point().y"
                            [attr.r]="hctx.state() === 'valid' ? 6 : 4"
                            [attr.fill]="handleFillColor(ctx.node.id, 'link')" [attr.fill-opacity]="handleOpacity(ctx.node.id)"
                            [attr.stroke]="handleStrokeColor(ctx.node.id)" [attr.stroke-opacity]="handleOpacity(ctx.node.id)" stroke-width="1"></svg:circle>
                        </svg:g>
                      </ng-template>
                      <ng-container *ngIf="portOrientation === 'vertical'; else horizLink">
                        <handle position="right" type="source" [id]="lh.id" [template]="linkTpl" />
                      </ng-container>
                      <ng-template #horizLink>
                        <handle position="bottom" type="source" [id]="lh.id" [template]="linkTpl" />
                      </ng-template>
                    </div>
                  </div>
                </ng-template>
              </ng-container>
              <div class="exec-badge" *ngIf="showExecBadges && ctx.node.data.execStatus as st">
                <i class="fa-solid" [ngClass]="st === 'success' ? 'fa-circle-check ok' : (st === 'error' ? 'fa-triangle-exclamation err' : (st === 'cancelled' ? 'fa-stop stop' : 'fa-clock pending'))"></i>
                <span class="cnt" *ngIf="(ctx.node.data.execCount || 0) > 1">× {{ ctx.node.data.execCount }}</span>
              </div>
              <!-- Streaming log overlay via node-toolbar -->
              <node-toolbar *ngIf="nodeLogText?.get(ctx.node.id) as logText"
                [position]="portOrientation === 'vertical' ? 'right' : 'bottom'">
                <div class="node-log-bubble" [class.expanded]="nodeLogExpanded.has(ctx.node.id)"
                     [attr.data-node-id]="ctx.node.id"
                     (click)="nodeLogExpanded.has(ctx.node.id) ? nodeLogExpanded.delete(ctx.node.id) : nodeLogExpanded.add(ctx.node.id)"
                     (wheel)="nodeLogExpanded.has(ctx.node.id) ? onLogBubbleWheel($event, ctx.node.id) : null">
                  <span class="node-log-text">{{ logText }}</span>
                </div>
              </node-toolbar>
            </div>
          </ng-template>
        </vflow>
        <div class="flow-tooltip" *ngIf="tipVisible" [style.left.px]="tipX" [style.top.px]="tipY" [ngClass]="{ error: tipError }">{{ tipText }}</div>
      </div>
    </section>
    <div class="bottom-bar" *ngIf="showBottomBar">
      <div class="actions">
        <button class="icon-btn" *ngIf="showCenterFlow" (click)="onCenterFlow()" title="Centrer le flow">
          <i class="fa-regular fa-object-group"></i>
        </button>
        <button class="icon-btn" *ngIf="showCenterSelection" [disabled]="true" title="Centrer sur la sélection">
          <i class="fa-solid fa-crosshairs"></i>
        </button>
        <button class="icon-btn" *ngIf="showSave" (click)="onSave()" title="Sauvegarder">
          <i class="fa-regular fa-floppy-disk"></i>
        </button>
        <button class="icon-btn" *ngIf="showRun" (click)="onRun()" title="Lancer">
          <i class="fa-solid fa-play"></i>
        </button>
        <span class="zoom-indicator" *ngIf="showZoomIndicator">Zoom: {{ zoomPercent }}%</span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    /* IMPORTANT (WebKit/Safari):
       - AUCUNE utilisation de foreignObject ou de position: absolute/relative près des handles.
       - Les handles sont rendus en SVG pur; les wrappers HTML restent hors des groupes de handle.
    */
    :host { display:block; height:100%; }
    .flow-viewer { position: relative; height:100%; }
    .canvas.ro { border: 1px solid #e5e7eb; border-top: 0; border-radius: 0; overflow: hidden; height:100%; }
    :host(.panel-open) .canvas.ro { border-right: 0; }
    .canvas-host { height: 100%; width: 100%; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; touch-action: none; }
    .canvas-host vflow { touch-action: none; }
    /* Node layout (execution): align with builder grid */
    .node-card.ro { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding: 6px 0 0 0; width:223px; min-width: 223px; max-width:223px; min-height: 70px; display: grid; grid-template-columns: 1fr; align-items: center; column-gap: 6px; transition: border-color .15s ease, box-shadow .15s ease, opacity .15s ease; }
    .node-card.dim { opacity: .35; filter: saturate(0.6); }
    /* Safari/iOS: avoid opacity — render in grayscale instead */
    .node-card.dim-safari { background:#f8fafc; border-color:#e5e7eb; }
    .node-card.dim-safari .node-header .title { color:#9ca3af; }
    .node-card.dim-safari .node-header .subtitle { color:#cbd5e1; }
    .node-card.dim-safari .desc { color:#9ca3af; }
    .node-card.dim-safari .link-label { color:#9ca3af; }
    .node-card.ro.selected { border-color:#1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.25); }
   
    .node-card.ro.horizontal { min-height: 70px; }
    .node-card.ro.locked { pointer-events: none; }
    .center-wrap { grid-column: 1; grid-row: 1; display:flex; flex-direction: column; align-items: stretch; justify-content:flex-start; padding: 0 8px 2px; text-align: left; pointer-events: initial; }
    .center-wrap node-card-header { pointer-events:auto; }
    .node-card .desc { color:#6b7280; font-size:12px; white-space: pre-line; word-break: break-word; }
    .node-card .desc.clamp { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; white-space: normal; }
    .center-wrap .desc { margin: 6px 0; padding: 0; }
    .node-card .header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .node-card .icon { width: 20px; height: 20px; display:inline-block; }
    .node-card .meta .title { font-weight: 600; }
    .node-card .meta .subtitle { color:#8c8c8c; font-size: 12px; }
    .node-card .outputs { display:flex; gap:10px; justify-content:center; flex-direction: row; margin-top: 0; }
    .node-card .outputs .out { display:flex; align-items:center; justify-content:center; width:16px; }
    .node-card .inputs { display:flex; gap:16px; justify-content:center; flex-direction: row; margin-bottom: 0; }
    /* Align horizontal layout like builder */
    .node-card.ro.horizontal .outputs { position: absolute; top: -200px; display:flex; flex-direction: column; justify-content:center; gap: 17px; }
    /* Linked handles labels layout */
    .node-card .links { display:flex; gap:8px; margin-top: 4px; }
    .node-card .desc-links { display:flex; align-items:flex-start; justify-content:space-between; gap: 8px; padding: 0 8px; }
    .node-card .desc-links > .desc { flex: 1 1 auto; margin: 6px 0; padding: 0; }
    .node-card .desc-links > .links { flex: 0 0 auto; display:flex; flex-direction: column; align-items:flex-end; gap:8px; margin-top: 4px; }
    .node-card.horizontal .links { flex-direction: row; justify-content: center; align-items: center; flex-wrap: wrap; }
    .node-card:not(.horizontal) .links { flex-direction: column; align-items: flex-end; }
    .node-card .link { display: inline-flex; align-items: center; gap: 6px; }
    .node-card .link-label { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #6b7280; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
    .node-card .link-chevron { font-size: 9px; color: #94a3b8; line-height: 1; }
    .node-card .link-child-row { padding-right: 4px; }
    .node-card .link-child-label { font-size: 11px; color: #a1a8b8; padding-left: 10px; }
    .node-card .link-child-label .type { font-size: 10px; color: #bcc3d0; }
    .node-card .exec-badge { grid-column: 1; grid-row: 1; align-self: start; justify-self: end; display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:2px 6px; box-shadow:0 1px 2px rgba(0,0,0,.06); }
    .node-card .exec-badge .fa-circle-check.ok { color:#16a34a; }
    .node-card .exec-badge .fa-triangle-exclamation.err { color:#ef4444; }
    .node-card .exec-badge .fa-stop.stop { color:#111827; }
    .node-card .exec-badge .fa-clock.pending { color:#6b7280; }
    .node-card .exec-badge .cnt { font-size:11px; color:#374151; }
    /* Bottom bar and tooltips (unchanged) */
    .bottom-bar { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 20; display:flex; justify-content:center; pointer-events:none; }
    .bottom-bar .actions { pointer-events:auto; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:8px 12px; box-shadow:0 8px 20px rgba(0,0,0,.08); }
    .bottom-bar button { background:#1677ff; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; }
    .bottom-bar .icon-btn { background:#fff; color:#111; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; }
    .bottom-bar .icon-btn i { font-size:16px; }
    .bottom-bar .icon-btn:disabled { color:#bbb; border-color:#eee; background:#fafafa; cursor:not-allowed; }
    .bottom-bar .zoom-indicator { color:#111; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px; font-size:12px; }
    .edge-labels { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .edge-labels .badge { background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; font-size:12px; color:#111; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
    .edge-labels.muted .badge { background:#f8fafc; color:#9ca3af; border-color:#e5e7eb; }
    .edge-labels .badge.label.error { border-color:#f759ab; color:#f759ab; }
    .flow-tooltip { position: fixed; z-index: 200; background:#111; color:#fff; border-radius:6px; padding:4px 8px; font-size:12px; box-shadow:0 8px 20px rgba(0,0,0,.18); pointer-events: none; white-space: nowrap; }
    .flow-tooltip.error { background:#f759ab; color:#fff; }
    /* DnD logging enabled; keep layout intact (no position relative / z-index) */
    .node-card .links { pointer-events: auto; }
    .node-card .link, .node-card .link-label { cursor: grab; user-select: none; }
    .node-card .link:active, .node-card .link-label:active { cursor: grabbing; }

    /* Streaming log bubble (node-toolbar based) */
    .node-log-bubble {
      display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 6px;
      font-size: 11px; color: #475569;
      background: linear-gradient(90deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.15) 50%, rgba(99,102,241,0.06) 100%);
      background-size: 200% 100%; animation: log-shimmer 2s ease-in-out infinite;
      max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      cursor: pointer; transition: max-height .2s ease;
    }
    .node-log-bubble.expanded { white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
    .node-log-bubble .node-log-text { display: block; overflow: hidden; text-overflow: ellipsis; }
    .node-log-bubble.expanded .node-log-text { overflow: visible; text-overflow: unset; white-space: pre-wrap; word-break: break-word; }
    @keyframes log-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Mobile/tablet: mirror builder bottom bar behavior */
    @media (max-width: 1280px) {
      .bottom-bar { position: fixed; left: 6px; right: 6px; bottom: calc(6px + env(safe-area-inset-bottom)); z-index: 90; }
      .bottom-bar .actions { gap: 6px; padding: 6px 10px; border-radius: 9px; }
      .bottom-bar .icon-btn { width: 34px; height: 34px; }
      .bottom-bar .divider { height: 24px; margin: 0 2px; }
    }
  `]
})
export class FlowViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() selectedNodeId: string | null = null;
  @Input() background: any = '#EEF0F4';
  @Input() portOrientation: 'vertical'|'horizontal' = 'horizontal';
  @Input() nodes: any[] = [];
  @Input() edges: Edge[] = [];
  vEdges: Edge[] = [];
  @Input() connectionSettings: ConnectionSettings = { type: 'template', curve: backAwareCurve } as any;
  internalConnection: ConnectionSettings = { type: 'template', curve: (p: any) => backAwareCurve({ ...(p||{}), allNodes: this.vNodes, allEdges: this.edges }) } as any;

  @Input() defaultZoom = 0.5;
  @Input() storageKey = 'flow.viewer.viewport';
  @Input() useStorage = true; // allow callers (execution viewer) to disable localStorage persistence
  @Input() move = false;       // allow position change if true
  @Input() allowDrag = false;  // require true + move to drag nodes
  @Input() allowZoom = true;   // allow zooming if true
  // Cap the zoom used during automatic centering to avoid oversized nodes on tiny graphs
  maxCenterZoom = 0.85;
  @Input() showBottomBar = true;
  @Input() showZoomIndicator = true;
  @Input() showRun = false;
  @Input() showSave = false;
  @Input() showCenterFlow = true;
  // Programmatic center trigger: increments cause a center action
  @Input() centerRequest: number = 0;
  // Allow parent to disable initial auto-fit/center
  @Input() autoFitOnInit: boolean = true;
  @Input() showCenterSelection = false;
  @Input() demo = false; // load internal demo flow if true
  @Input() meta: any = null; // optional flow-level metadata
  @Input() showExecBadges = false; // render execution badges only when explicitly enabled
  @Input() dimInactive = false;
  // Aperçu (simulation) des sorties (1 niveau) par nœud, rendu comme des linked handles
  @Input() simOutputPreview: { [nodeId: string]: Array<{ id: string; name: string; type: string; children?: Array<{ id: string; name: string; type: string }> }> } | null = null;
  // Show node descriptions (hidden in node-settings/simulation)
  @Input() showDescriptions: boolean = true;
  // Streaming log text per node (passed from execution parent)
  @Input() nodeLogText: Map<string, string> | null = null;
  nodeLogExpanded = new Set<string>();
  nodeLogScrollLocked = new Set<string>();
  onLogBubbleWheel(ev: WheelEvent, nodeId: string) {
    ev.stopPropagation(); // prevent vflow zoom
    const bubble = ((ev.target as HTMLElement)?.closest?.('.node-log-bubble') || ev.target) as HTMLElement;
    if (!bubble) return;
    setTimeout(() => {
      try {
        const atBottom = bubble.scrollTop + bubble.clientHeight >= bubble.scrollHeight - 6;
        if (atBottom) this.nodeLogScrollLocked.delete(nodeId);
        else this.nodeLogScrollLocked.add(nodeId);
      } catch {}
    }, 30);
  }
  // Optional: list of node ids to focus when centering (fit only these)
  @Input() focusNodeIds: string[] | null = null;
  // Optional: extra padding ratio for fit (0..0.4 typical)
  @Input() fitPadding = 0.12;

  @Output() run = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() selected = new EventEmitter<any>();
  @Output() connect = new EventEmitter<any>();

  @ViewChild('flowHost', { static: false }) flowHost?: ElementRef<HTMLElement>;
  @ViewChild('flow', { static: false }) flow?: any;
  private viewportSub?: Subscription;
  zoomPercent = 50;
  // Tooltip state
  tipVisible = false; tipText = ''; tipX = 0; tipY = 0; tipError = false;

  private zoomUpdateTimer: any;
  private appsMap = new Map<string, AppProvider>();
  safariOrIOS = false;
  constructor(private route: ActivatedRoute, private zone: NgZone, private cdr: ChangeDetectorRef, private catalog: CatalogService) {
    this.safariOrIOS = this.detectSafariOrIOS();
  }
  private _portOrientationExplicit = false;

  private detectSafariOrIOS(): boolean {
    try {
      const nav: any = (typeof navigator !== 'undefined') ? navigator : {};
      const ua = String(nav.userAgent || nav.vendor || (typeof (window as any) !== 'undefined' && (window as any).opera) || '').toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua) || (nav.platform === 'MacIntel' && Number(nav.maxTouchPoints) > 1);
      const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
      return !!(isIOS || isSafari);
    } catch { return false; }
  }

  // Edge styling helpers: avoid opacity on Safari/iOS, use neutral grays instead
  edgeStrokeColor(e: any): string {
    try {
      if (e?.data?.error) return '#f759ab';
      const base = (e?.data?.color || '#b1b1b7');
      if (this.dimInactive && !this.isEdgeActive(e)) {
        return this.safariOrIOS ? '#cbd5e1' : base;
      }
      return base;
    } catch { return '#b1b1b7'; }
  }
  edgeStrokeOpacity(e: any): number { try { return (this.dimInactive && !this.isEdgeActive(e)) ? (this.safariOrIOS ? 1 : 0.28) : 1; } catch { return 1; } }
  edgeLabelOpacity(e: any): number { try { return (this.dimInactive && !this.isEdgeActive(e)) ? (this.safariOrIOS ? 1 : 0.35) : 1; } catch { return 1; } }

  // Handle styling helpers
  private isNodeDimmed(nodeId: string): boolean { try { return this.dimInactive && !this.isNodeActive(nodeId); } catch { return false; } }
  handleOpacity(nodeId: string): number { try { return this.isNodeDimmed(nodeId) ? (this.safariOrIOS ? 1 : 0.28) : 1; } catch { return 1; } }
  handleFillColor(nodeId: string, kindOrOut: any): string {
    try {
      if (this.safariOrIOS && this.isNodeDimmed(nodeId)) return '#9ca3af';
      // default colors preserved
      if (String(kindOrOut) === 'err') return '#f759ab';
      // sim/link use dark gray in original
      if (kindOrOut === 'sim' || kindOrOut === 'link') return '#111';
      return '#000000';
    } catch { return '#000000'; }
  }
  handleStrokeColor(nodeId: string): string { try { return (this.safariOrIOS && this.isNodeDimmed(nodeId)) ? '#e5e7eb' : '#ffffff'; } catch { return '#ffffff'; } }

  horizHandleTop(index: number, countOrArr: any): number {
    try {
      const count = Array.isArray(countOrArr) ? countOrArr.length : Number(countOrArr) || 1;
      const center = 35; // px (middle of ~70px height)
      const gap = 16;
      const start = center - ((count - 1) * gap) / 2;
      return Math.round(start + index * gap);
    } catch { return 23; }
  }

  onSimLinkDragStart(ev: DragEvent, nodeId: string, fieldName: string) {
    try {
      if (!ev?.dataTransfer) return;
      const name = String(fieldName || '').trim();
      const nid = String(nodeId || '').trim();
      const path = nid && name ? `${nid}.${name}` : (nid || name);
      const payload = JSON.stringify({ path, name });
      ev.dataTransfer.setData('application/x-expression-tag', payload);
      ev.dataTransfer.setData('text/plain', path);
      ev.dataTransfer.effectAllowed = 'copy';
      try { console.log('[settings-v2][dnd][flow-viewer] dragstart', { nodeId: nid, field: name, path }); } catch {}
      try { ev.stopPropagation(); } catch {}
    } catch {}
  }
  onSimLinkMouseDown(ev: MouseEvent, nodeId: string, fieldName: string) {
    try { console.log('[settings-v2][dnd][flow-viewer] mousedown', { nodeId, field: fieldName }); } catch {}
    try { ev.stopPropagation(); (ev as any).cancelBubble = true; } catch {}
  }
  onSimLinkPointerDown(ev: PointerEvent, nodeId: string, fieldName: string) {
    try { console.log('[settings-v2][dnd][flow-viewer] pointerdown', { nodeId, field: fieldName }); } catch {}
    try { ev.stopPropagation(); (ev as any).cancelBubble = true; } catch {}
  }
  onSimLinkClick(ev: MouseEvent, nodeId: string, fieldName: string) {
    try { console.log('[settings-v2][dnd][flow-viewer] click', { nodeId, field: fieldName }); } catch {}
  }

  ngOnInit() {
    // Override flags by query params if present
    try {
      const qp = this.route?.snapshot?.queryParamMap;
      if (qp) {
        const raw = qp.get('move') ?? qp.get('movable');
        if (raw != null) this.move = raw === 'true' || raw === '1';
        const drag = qp.get('drag');
        if (drag != null) this.allowDrag = drag === 'true' || drag === '1';
        const zoom = qp.get('zoom');
        if (zoom != null) this.allowZoom = (zoom === 'true' || zoom === '1');
      }
    } catch {}

    // Demo graph if requested
    // if (this.demo) this.loadDemo();
    try { this.catalog.listApps().subscribe(list => this.zone.run(() => { (list || []).forEach(a => this.appsMap.set(a.id, a)); try { this.cdr.detectChanges(); } catch {} })); } catch {}
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try { console.log('[viewer] afterViewInit', { useStorage: this.useStorage, storageKey: this.storageKey, portOrientation: this.portOrientation }); } catch {}
      if (this.autoFitOnInit) {
        if (!this.restoreViewport()) {
          this.fitAll(() => this.setZoomAndCenter(this.defaultZoom));
        }
      }
      try {
        const vs: any = this.flow?.viewportService;
        if (vs?.viewportChangeEnd$) {
          this.viewportSub = vs.viewportChangeEnd$.subscribe(() => {
            this.zone.run(() => { this.updateZoomDisplay(); this.saveViewport(); });
          });
        }
      } catch {}
      this.updateZoomDisplay();
    }, 20);
  }
  ngOnDestroy() { try { this.viewportSub?.unsubscribe(); } catch {} }

  // Cached nodes for Vflow to avoid getter recomputation on iOS Safari
  vNodes: any[] = [];
  private activeNodeSet: Set<string> = new Set();
  ngOnChanges(changes: SimpleChanges) {
    if (changes['centerRequest']) {
      try {
        const prev = Number(changes['centerRequest'].previousValue ?? 0);
        const cur = Number(changes['centerRequest'].currentValue ?? 0);
        if (Number.isFinite(cur) && cur > prev) {
          // Wait one frame so the DOM (including output previews) is fully rendered
          requestAnimationFrame(() => this.onCenterFlow());
        }
      } catch {}
    }
    let orientationChanged = false;
    if (changes['portOrientation']) {
      this._portOrientationExplicit = true;
      orientationChanged = true;
    }
    if (changes['nodes'] || changes['allowDrag'] || changes['move'] || changes['edges']) {
      try {
        const canDrag = !!(this.allowDrag && this.move);
        const src = Array.isArray(this.nodes) ? this.nodes : [];
        this.vNodes = src.map(n => ({ ...n, draggable: canDrag }));
      } catch { this.vNodes = this.nodes || []; }
      try {
        // Attach curve per-edge like execution to ensure custom router is used
        const srcEdges = Array.isArray(this.edges) ? this.edges : [];
        this.vEdges = srcEdges.map((e: any) => ({ ...e, curve: (backAwareCurve as any) }));
        try {
          this.activeNodeSet = new Set<string>();
          for (const e of this.vEdges || []) {
            const on = !!((e as any)?.data?.onPath) || ((e as any)?.data?.color === '#1677ff');
            if (on) {
              const s = String((e as any).source || (e as any).from || '');
              const t = String((e as any).target || (e as any).to || '');
              if (s) this.activeNodeSet.add(s);
              if (t) this.activeNodeSet.add(t);
            }
          }
        } catch {}
        this.cdr.detectChanges();
      } catch { this.vEdges = this.edges || []; }
    }
    // Meta-driven optional UI tweaks (non-breaking defaults)
    try {
      if (changes['meta'] && this.meta) {
        // TECH NOTE
        // - Orientation is primarily driven by meta.ui.portOrientation in read-only viewers.
        // - Do NOT override an explicit @Input() provided by a parent (eg. Executions);
        //   keep a flag of explicit inputs and only apply meta when none was set.
        // - After switching orientation from meta, a detectChanges/relayout is required so that
        //   Vflow repositions handle templates (Safari/WebKit can otherwise keep stale anchors).
        const ui = (this.meta.ui || this.meta.viewer || {}) as any;
        if (ui) {
          if (ui.portOrientation && !this._portOrientationExplicit) {
            const p = String(ui.portOrientation).toLowerCase();
            if (p === 'vertical' || p === 'horizontal') { this.portOrientation = p as any; orientationChanged = true; }
          }
          if (ui.background && !changes['background']) {
            this.background = ui.background;
          }
        }
      }
    } catch {}
    // Rebuild internal connection to inject current nodes/edges in curve params
    try {
      const base = this.connectionSettings || ({} as any);
      const type = (base as any).type || 'template';
      this.internalConnection = { ...base, type, curve: (p: any) => backAwareCurve({ ...(p||{}), allNodes: this.vNodes, allEdges: this.edges }) } as any;
    } catch {}
    try {
      if (changes['portOrientation']) {
        console.log('[viewer] portOrientation input changed', { value: this.portOrientation });
      }
      if (changes['useStorage']) {
        console.log('[viewer] useStorage input changed', { value: this.useStorage, storageKey: this.storageKey });
      }
    } catch {}

    // TECH NOTE (relayout):
    // Force a lightweight relayout when orientation toggles so that handle positions
    // recompute correctly (esp. on Safari/iOS). Re-cloning arrays + detectChanges is
    // sufficient; then nudge viewport listeners to flush pending measurements.
    if (orientationChanged) {
      try {
        this.vNodes = (this.vNodes || []).map(n => ({ ...n }));
        this.vEdges = (this.vEdges || []).map((e:any) => ({ ...e }));
        this.cdr.detectChanges();
        // Nudge viewport listeners so dependent layouts recompute
        const vs: any = this.flow?.viewportService; vs?.triggerViewportChangeEvent?.('end');
      } catch {}
    }
  }
  isEdgeActive(e: any): boolean { try { return !!(e?.data?.onPath) || (e?.data?.color === '#1677ff'); } catch { return false; } }
  isNodeActive(id: string): boolean { try { return this.activeNodeSet.has(String(id)); } catch { return false; } }

  inputId(tmpl: any): string | null {
    if (!tmpl) return null;
    if (tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') return null;
    if (Array.isArray(tmpl.inputHandles) && tmpl.inputHandles.length) return String(tmpl.inputHandles[0].id || 'in');
    return 'in';
  }
  outputIds(model: any): string[] {
    const tmpl = model?.templateObj || {};
    switch (tmpl.type) {
      case 'end': return [];
      case 'start':
      case 'start_form':
      case 'event':
      case 'endpoint':
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          return (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any)=>String(h.id));
        }
        return ['out'];
      case 'loop': {
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          return (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any)=>String(h.id));
        }
        // Fallback stable ids
        return ['after','each'];
      }
      case 'condition': {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && !ids.includes(elseId)) ids.push(elseId);
        } catch {}
        try {
          // Préserver les handles déjà connectés pour éviter les disparitions visuelles
          const connected = (this.edges || [])
            .filter((e:any) => String(e.source) === String(model.id))
            .map((e:any) => String(e.sourceHandle ?? ''))
            .filter((h:string) => !!h);
          return Array.from(new Set([...ids, ...connected]));
        } catch { return ids; }
      }
      case 'function':
      default: {
        // Dynamic outputs: function with output_array_field (like classify)
        const dynField = tmpl.output_array_field;
        if (dynField) {
          const arr = (model?.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
          const ids = arr.map((it: any, i: number) => (it && typeof it === 'object' && it._id) ? String(it._id) : String(i));
          try {
            const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
            if (elseId && !ids.includes(elseId)) ids.push(elseId);
          } catch {}
          const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
          const base = enableCatch ? ['err', ...ids] : ids;
          try {
            const connected = (this.edges || [])
              .filter((e:any) => String(e.source) === String(model.id))
              .map((e:any) => String(e.sourceHandle ?? ''))
              .filter((h:string) => !!h);
            return Array.from(new Set([...base, ...connected]));
          } catch { return base; }
        }
        if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
          const ids = (tmpl.outputHandles as any[])
            .filter((h:any) => !Array.isArray(h?.accepts) && !h?.arrayField)
            .map((h:any)=>String(h.id));
          const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
          return enableCatch ? ['err', ...ids] : ids;
        }
        const outs: string[] | undefined = Array.isArray(tmpl.output) ? tmpl.output : undefined;
        const n = (outs && outs.length) ? outs.length : 1;
        const base = Array.from({ length: n }, (_, i) => String(i));
        const enableCatch = !!tmpl.authorize_catch_error && !!model?.catch_error;
        return enableCatch ? ['err', ...base] : base;
      }
    }
  }

  // Linked handles resolution aligned with builder
  private _linkCache = new Map<string, { sig: string; links: Array<{ id: string; name: string; type: string }> }>();
  linkHandlesForNode(nodeId: string, model: any): Array<{ id: string; name: string; type: string }> {
    try {
      const tmpl = model?.templateObj || {};
      const linksArr: any[] = Array.isArray((tmpl as any).linkedHandles) ? (tmpl as any).linkedHandles : [];
      const arr: any[] = linksArr.length ? linksArr : (Array.isArray(tmpl.outputHandles) ? (tmpl.outputHandles as any[]).filter((h:any)=> Array.isArray(h?.accepts)) : []);
      const sig = JSON.stringify(arr);
      const key = String(nodeId);
      const cached = this._linkCache.get(key);
      if (cached && cached.sig === sig) return cached.links;
      const links = arr
        .filter((h:any) => Array.isArray(h?.accepts))
        .map((h:any) => ({ id: String(h.id), name: h.name || h.id, type: h.type || 'any' }));
      this._linkCache.set(key, { sig, links });
      return links;
    } catch { return []; }
  }

  private fitAll(cb?: () => void) {
    try {
      const vs = (this as any).flow?.viewportService;
      if (!vs) return;
      // Use a modest padding to avoid excessive empty space on small graphs
      vs.fitView({ duration: 150, padding: this.fitPadding });
      // Clamp zoom to avoid zooming in too much when there are few items
      try {
        const z = vs.readableViewport()?.zoom;
        if (typeof z === 'number' && z > this.maxCenterZoom) {
          this.setZoomAndCenter(this.maxCenterZoom);
        }
      } catch {}
      if (cb) setTimeout(cb, 180);
    } catch {}
  }

  // Fit only a subset of nodes (by ids), with padding and zoom clamp
  private fitSubset(ids?: string[] | null) {
    try {
      const targets = Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
      if (!targets.length) return this.fitAll();
      const host = this.flowHost?.nativeElement; const vs: any = this.flow?.viewportService;
      if (!host || !vs) return this.fitAll();
      const rect = host.getBoundingClientRect();
      const W = Math.max(1, rect.width); const H = Math.max(1, rect.height);
      // Approx node size aligned with layout service
      const NODE_W = 223; const NODE_H_BASE = 110; const PER_OUTPUT_H = 25;
      let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
      for (const n of (this.vNodes || [])) {
        const id = String((n as any).id || ''); if (!id || !targets.includes(id)) continue;
        const pt = (n as any).point || { x: 0, y: 0 };
        const x0 = Number(pt.x) || 0; const y0 = Number(pt.y) || 0;
        // Account for output preview items (parents + children) in node height
        const items = this.simOutputPreview?.[id] || [];
        const outputCount = items.reduce((sum: number, it: any) => sum + 1 + (it.children?.length || 0), 0);
        const nodeH = NODE_H_BASE + outputCount * PER_OUTPUT_H;
        const x1 = x0 + NODE_W; const y1 = y0 + nodeH;
        if (x0 < minX) minX = x0; if (y0 < minY) minY = y0;
        if (x1 > maxX) maxX = x1; if (y1 > maxY) maxY = y1;
      }
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return this.fitAll();
      // Ensure minimal bbox size to avoid extreme zoom when 1 tiny node
      if (maxX - minX < NODE_W * 0.6) maxX = minX + NODE_W * 0.6;
      if (maxY - minY < NODE_H_BASE * 0.6) maxY = minY + NODE_H_BASE * 0.6;
      const pad = Math.max(0, Math.min(0.4, this.fitPadding));
      const worldW = maxX - minX; const worldH = maxY - minY;
      const scaleX = (W * (1 - pad * 2)) / worldW;
      const scaleY = (H * (1 - pad * 2)) / worldH;
      let z = Math.max(0.02, Math.min(scaleX, scaleY));
      if (z > this.maxCenterZoom) z = this.maxCenterZoom;
      const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
      const centerScreenX = W / 2;
      // Shift center upward (~15% of viewport height) so content sits slightly above middle
      const centerScreenY = H * 0.42;
      const x = centerScreenX - (cx * z);
      const y = centerScreenY - (cy * z);
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: z, x, y }, duration: 150 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.updateZoomDisplay();
      this.saveViewport();
    } catch { this.fitAll(); }
  }

  private setZoomAndCenter(newZoom: number) {
    try {
      const vs: any = this.flow?.viewportService;
      if (!vs || !this.flowHost?.nativeElement) return;
      const vp = this.flow.viewportService.readableViewport();
      const rect = this.flowHost.nativeElement.getBoundingClientRect();
      const centerScreenX = rect.width / 2;
      const centerScreenY = rect.height / 2;
      const wx = (centerScreenX - vp.x) / (vp.zoom || 1);
      const wy = (centerScreenY - vp.y) / (vp.zoom || 1);
      const x = centerScreenX - (wx * newZoom);
      const y = centerScreenY - (wy * newZoom);
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: newZoom, x, y }, duration: 120 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.saveViewport();
      this.updateZoomDisplay();
    } catch {}
  }

  private saveViewport() {
    try {
      if (!this.useStorage || !this.storageKey) return;
      const vp = this.flow?.viewportService?.readableViewport();
      if (!vp) return;
      localStorage.setItem(this.storageKey, JSON.stringify({ zoom: vp.zoom, x: vp.x, y: vp.y }));
    } catch {}
  }
  private restoreViewport(): boolean {
    try {
      if (!this.useStorage || !this.storageKey) return false;
      const vs: any = this.flow?.viewportService;
      if (!vs) return false;
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const obj = JSON.parse(raw);
      if (typeof obj?.zoom !== 'number' || typeof obj?.x !== 'number' || typeof obj?.y !== 'number') return false;
      vs.writableViewport.set({ changeType: 'absolute', state: { zoom: obj.zoom, x: obj.x, y: obj.y }, duration: 0 });
      try { vs.triggerViewportChangeEvent?.('end'); } catch {}
      this.updateZoomDisplay();
      return true;
    } catch { return false; }
  }

  private updateZoomDisplay() {
    try {
      const z = this.flow?.viewportService?.readableViewport()?.zoom;
      if (typeof z === 'number' && z > 0) {
        this.zoomPercent = Math.round(z * 100);
        try { this.cdr.detectChanges(); } catch {}
      }
    } catch {}
  }

  private loadDemo() {
    const startT = { id: 'tmpl_start', name: 'Start', type: 'start', title: 'Start', subtitle: 'Trigger', icon: 'fa-solid fa-play', args: {} } as any;
    const fnT = { id: 'tmpl_sendmail', name: 'SendMail', type: 'function', icon: 'fa-solid fa-envelope', title: 'Send mail', subtitle: 'Send an email', authorize_catch_error: true, authorize_skip_error: true, output: ['Succes'], args: {} } as any;
    const condT = {
      id: 'tmpl_condition', name: 'Condition', type: 'condition', icon: 'fa-solid fa-code-branch', title: 'Condition', subtitle: 'Multi-branch', output_array_field: 'items',
      args: {
        title: 'Conditions', ui: { layout: 'vertical', labelsOnTop: true },
        fields: [
          { type: 'section', title: 'Branches', key: 'items', mode: 'array',
            array: { initialItems: 1, minItems: 0, controls: { add: { kind: 'text', text: 'Ajouter' }, remove: { kind: 'text', text: 'Supprimer' } } },
            fields: [
              { type: 'text', key: 'name', label: 'Nom', col: { xs: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] },
              { type: 'text', key: 'condition', label: 'Condition', col: { xs: 24 }, default: '', expression: { allow: true }, validators: [{ type: 'required' }] }
            ],
            col: { xs: 24 }, grid: { gutter: 16 }, ui: { layout: 'vertical' }
          },
          { type: 'checkbox', key: 'else_enabled', label: 'Activer Else', col: { xs: 24 }, default: false }
        ]
      }
    } as any;

    const startModel = { id: 'demo_start', name: startT.name, template: startT.id, templateObj: startT, context: {} };
    const fnModel = { id: 'demo_fn', name: fnT.name, template: fnT.id, templateObj: fnT, context: {}, catch_error: true } as any;
    const condModel = { id: 'demo_cond', name: condT.name, template: condT.id, templateObj: condT, context: { items: [ { _id: 'c-0', name: 'A' }, { _id: 'c-1', name: 'B' } ] } } as any;

    const startVNode = { id: startModel.id, point: { x: 380, y: 140 }, type: 'html-template', data: { model: startModel } } as any;
    const fnVNode = { id: fnModel.id, point: { x: 380, y: 320 }, type: 'html-template', data: { model: fnModel } } as any;
    const condVNode = { id: condModel.id, point: { x: 600, y: 320 }, type: 'html-template', data: { model: condModel } } as any;

    this.nodes = [startVNode, fnVNode, condVNode];
    this.edges = [
      { type: 'template', id: `${startModel.id}->${fnModel.id}:out:in`, source: startModel.id, target: fnModel.id, sourceHandle: 'out', targetHandle: 'in', data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } } as any,
      { type: 'template', id: `${fnModel.id}->${condModel.id}:0:in`, source: fnModel.id, target: condModel.id, sourceHandle: '0', targetHandle: 'in', data: { strokeWidth: 2, color: '#b1b1b7' }, markers: { end: { type: 'arrow-closed', color: '#b1b1b7' } } } as any,
    ];
  }

  onNodePositionChange(change: any) {

    console.log(change)
    if (!(this.allowDrag && this.move)) return;
    try {
      const id = change?.id;
      const pt = change?.to?.point || change?.point || change?.to;
      if (!id || !pt) return;
      this.nodes = this.nodes.map(n => n.id === id ? ({ ...n, point: { x: pt.x, y: pt.y } }) : n);
    } catch {}
  }

  onWheel(ev: WheelEvent) {
    if (!this.allowZoom) { try { ev.preventDefault(); ev.stopPropagation(); } catch {} }
    try { if (this.zoomUpdateTimer) clearTimeout(this.zoomUpdateTimer); } catch {}
    this.zoomUpdateTimer = setTimeout(() => this.zone.run(() => this.updateZoomDisplay()), 80);
  }

  onPointerDown(ev: PointerEvent) {
    if (!(this.allowZoom || (this.allowDrag && this.move))) {
      try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    }
  }

  // Bottom bar actions
  onRun() { this.run.emit(); }
  onSave() { this.save.emit(); }
  onCenterFlow() { this.fitSubset(this.focusNodeIds); }
  // Edge labels and tooltips (same mapping as builder)
  computeEdgeLabel(edge: any): string {
    try {
      const model = this.nodes.find(n => n.id === edge.source)?.data?.model;
      const txt = this.getOutputName(model, edge.sourceHandle);
      if (txt && txt.trim().length) return txt;
      const stored = edge?.edgeLabels?.center?.data?.text;
      return stored || '';
    } catch { return ''; }
  }
  getOutputName(model: any, idxOrId: number | string): string {
    try {
      const tmpl = model?.templateObj || {};
      if (typeof idxOrId === 'string' && idxOrId === 'err') return 'Error';
      if ((tmpl.type === 'start' || tmpl.type === 'start_form' || tmpl.type === 'event' || tmpl.type === 'endpoint') && String(idxOrId) === 'out') return 'Success';
      const idx = (typeof idxOrId === 'string' && /^\d+$/.test(idxOrId)) ? parseInt(idxOrId, 10) : (typeof idxOrId === 'number' ? idxOrId : NaN);
      if (tmpl.type === 'condition') {
        const field = tmpl.output_array_field || 'items';
        const arr = (model.context && Array.isArray(model.context[field])) ? model.context[field] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (!it) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        if (it) return (it.name ?? '');
        // Branche Else
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(idxOrId) === elseId) return 'Else';
        } catch {}
        return '';
      }
      // Dynamic outputs for functions with output_array_field (e.g., classify)
      const dynField = tmpl.output_array_field;
      if (dynField && tmpl.type !== 'condition') {
        const arr = (model.context && Array.isArray(model.context[dynField])) ? model.context[dynField] : [];
        if (Number.isFinite(idx)) {
          const it = arr[idx as number];
          if (!it) return '';
          if (typeof it === 'string') return it;
          if (typeof it === 'object') return (it.name ?? String(idx));
          return String(idx);
        }
        const it = arr.find((x: any) => x && typeof x === 'object' && String(x._id) === String(idxOrId));
        if (it) return (typeof it === 'object') ? (it.name ?? '') : String(it);
        try {
          const elseId = (model?.context?.else && (model as any).context.else._id) ? String((model as any).context.else._id) : (model?.context?.elseId ? String(model.context.elseId) : null);
          if (elseId && String(idxOrId) === elseId) return 'Else';
        } catch {}
        return '';
      }
      // v2 output handles
      if (Array.isArray(tmpl.outputHandles) && tmpl.outputHandles.length) {
        // Back-compat mapping for legacy loop ids
        if (tmpl.type === 'loop'){
          const legacy = String(idxOrId);
          if (legacy === 'loop_start') return 'Each';
          if (legacy === 'loop_end' || legacy === 'end') return 'After';
        }
        const h = (tmpl.outputHandles as any[])
          .filter((x:any) => !Array.isArray(x?.accepts) && !x?.arrayField)
          .find((hh:any) => String(hh.id) === String(idxOrId));
        return h?.name || '';
      }
      const outs: string[] = Array.isArray(tmpl.output) && tmpl.output.length ? tmpl.output : ['Succes'];
      if (Number.isFinite(idx) && idx >= 0 && idx < outs.length) return outs[idx];
      if (Array.isArray(outs) && outs.length === 1) return outs[0] || 'Succes';
      return '';
    } catch { return ''; }
  }
  // Helpers to mirror builder template conditions
  isTriggerTemplate(tpl: any): boolean {
    try { const t = String(tpl?.type || '').toLowerCase(); return t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint'; } catch { return false; }
  }
  getInputName(model: any, id: string): string {
    try {
      const arr: any[] = Array.isArray(model?.templateObj?.inputHandles) ? (model?.templateObj?.inputHandles as any[]) : [];
      if (arr.length){ const h = arr.find((hh:any) => String(hh.id) === String(id)); return h?.name || ''; }
      return String(id) === 'in' ? 'In' : '';
    } catch { return ''; }
  }
  onInputEnter(ev: MouseEvent, model: any, id: string) {
    const txt = this.getInputName(model, id) || '';
    this.tipText = txt; this.tipVisible = !!txt; this.tipError = false;
    this.onHandleMove(ev);
  }
  onHandleEnter(ev: MouseEvent, model: any, out: string) {
    const txt = this.getOutputName(model, out) || '';
    this.tipText = txt; this.tipVisible = !!txt; this.tipError = String(out) === 'err';
    this.onHandleMove(ev);
  }
  onHandleMove(ev: MouseEvent) { this.tipX = ev.clientX + 8; this.tipY = ev.clientY + 8; }
  onHandleLeave() { this.tipVisible = false; }

  typeIconClass(tpl: any): string {
    try {
      const type = String(tpl?.type || '').toLowerCase();
      switch (type) {
        case 'start':
        case 'start_form':
          return 'fa-solid fa-play';
        case 'event': return 'fa-solid fa-bell';
        case 'endpoint': return 'fa-solid fa-link';
        case 'function': return 'fa-solid fa-cog';
        case 'condition': return 'fa-solid fa-code-branch';
        case 'loop': return 'fa-solid fa-sync';
        case 'end': return 'fa-solid fa-stop';
        case 'flow': return 'fa-solid fa-diagram-project';
        default: return 'fa-regular fa-square';
      }
    } catch { return 'fa-regular fa-square'; }
  }
  appIdOf(tpl: any): string | null {
    try {
      const app = tpl?.app; const id = (app && app._id) ? String(app._id) : String(tpl?.appId || '');
      return id || null;
    } catch { return null; }
  }
  getAppById(id?: string|null): AppProvider | undefined { try { const key = String(id || '').trim(); return key ? this.appsMap.get(key) : undefined; } catch { return undefined; } }
}
