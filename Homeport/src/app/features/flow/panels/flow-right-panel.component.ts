import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { MonacoJsonEditorComponent } from '../../dynamic-form/components/monaco-json-editor.component';
import { FlowHistoryTimelineComponent } from '../history/flow-history-timeline.component';
import { NodeInspectorItemComponent } from './node-inspector-item.component';

@Component({
  selector: 'flow-right-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, NzToolTipModule, NzModalModule, MonacoJsonEditorComponent, FlowHistoryTimelineComponent, NodeInspectorItemComponent],
  template: `
    <div class="right-panel" [class.drawer-mode]="mode==='drawer'">
      <div class="inspector-meta" style="padding: 12px; padding-top: 0px; overflow: auto;">
        <div class="panel-heading main-title">
          <div class="card-title">
            <span class="t">Navigation & Contrôles</span>
            <span class="s">Inspecteur</span>
          </div>
        </div>
        <form nz-form nzLayout="vertical" class="meta-form">
          <nz-form-item class="enabled-row">
            <nz-form-control>
              <label class="enabled single-line">
                <input type="checkbox" [(ngModel)]="currentFlowEnabled" (ngModelChange)="currentFlowEnabledChange.emit($event); metaChange.emit()" name="flowEnabledPanelTop" />
                <span>Activer ce flow</span>
              </label>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Nom</nz-form-label>
            <nz-form-control>
              <input nz-input [(ngModel)]="currentFlowName" (ngModelChange)="currentFlowNameChange.emit($event); metaChange.emit()" name="flowNamePanel" placeholder="Nom du flow" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Description</nz-form-label>
            <nz-form-control>
              <textarea nz-input [(ngModel)]="currentFlowDesc" (ngModelChange)="currentFlowDescChange.emit($event); metaChange.emit()" name="flowDescPanel" placeholder="Description" rows="3"></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Exécution</nz-form-label>
            <nz-form-control>
              <div class="exec-row">
                <ng-container *ngIf="useNativeSelect; else builderModeDesktopSelect">
                  <select class="wf-native-select" [(ngModel)]="builderMode" name="builderModePanelNative">
                    <option value="test">test</option>
                    <option value="prod">prod</option>
                  </select>
                </ng-container>
                <ng-template #builderModeDesktopSelect>
                  <nz-select [(ngModel)]="builderMode" name="builderModePanel" nzPlaceHolder="Mode">
                    <nz-option nzValue="test" nzLabel="test"></nz-option>
                    <nz-option nzValue="prod" nzLabel="prod"></nz-option>
                  </nz-select>
                </ng-template>
              </div>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Publication</nz-form-label>
            <nz-form-control>
              <div class="pub-row">
                <ng-container *ngIf="useNativeSelect; else flowStatusDesktopSelect">
                  <select class="wf-native-select"
                    [ngModel]="currentFlowStatus"
                    (ngModelChange)="currentFlowStatus = $event; currentFlowStatusChange.emit($event); metaChange.emit()"
                    name="flowStatusPanelNative">
                    <option value="draft">brouillon</option>
                    <option value="test">test</option>
                    <option value="production">production</option>
                  </select>
                </ng-container>
                <ng-template #flowStatusDesktopSelect>
                  <nz-select [(ngModel)]="currentFlowStatus" (ngModelChange)="currentFlowStatusChange.emit($event); metaChange.emit()" name="flowStatusPanel" nzPlaceHolder="Statut">
                    <nz-option nzValue="draft" nzLabel="brouillon"></nz-option>
                    <nz-option nzValue="test" nzLabel="test"></nz-option>
                    <nz-option nzValue="production" nzLabel="production"></nz-option>
                  </nz-select>
                </ng-template>
                <button nz-button class="apple-btn btn-save" nzType="default" type="button" (click)="save.emit()" [disabled]="!canSave" title="Enregistrer" aria-label="Enregistrer">
                  <i class="fa-solid fa-floppy-disk"></i><span class="lbl"></span>
                </button>
              </div>
            </nz-form-control>
          </nz-form-item>

          <!-- Sélecteur rapide toujours visible -->
          <nz-form-item>
            <nz-form-label>Exécutions récentes</nz-form-label>
            <nz-form-control>
              <div class="exec-select-row">
                <ng-container *ngIf="useNativeSelect; else recentRunsDesktopSelect">
                  <select class="wf-native-select flex-1"
                    [ngModel]="selectedRecentId || ''"
                    (ngModelChange)="selectedRecentId = $event || null"
                    name="recentRunSelectNative">
                    <option value="">Choisir une exécution</option>
                    <option *ngFor="let r of recentRuns" [value]="r.id || ''">
                      {{ (r.startedAt | date:'medium':'':'fr-FR') + ' — ' + (r.status || '—') }}
                    </option>
                  </select>
                </ng-container>
                <ng-template #recentRunsDesktopSelect>
                  <nz-select class="flex-1" [(ngModel)]="selectedRecentId" name="recentRunSelect" nzPlaceHolder="Choisir une exécution"
                             (nzScrollToBottom)="runsHasMore && loadMoreRuns.emit()">
                    <nz-option *ngFor="let r of recentRuns" [nzValue]="r.id" [nzLabel]="(r.startedAt | date:'medium':'':'fr-FR') + ' — ' + (r.status || '—')"></nz-option>
                  </nz-select>
                </ng-template>
                <button nz-button nzType="default" nzSize="small" class="apple-btn load-btn" [disabled]="!selectedRecentId" (click)="selectedRecentId && selectRun.emit(selectedRecentId)" title="Charger">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
              <div class="sel-status mono">
                <div class="sel-status-head">
                  <span class="k">Statut</span>
                  <span class="status-pill"
                    [ngClass]="{
                      ok: (currentOrSelected()?.status || '') === 'success',
                      err: (currentOrSelected()?.status || '') === 'error' || (currentOrSelected()?.status || '') === 'failed',
                      run: (currentOrSelected()?.status || '') === 'running',
                      warn: (currentOrSelected()?.status || '') === 'cancelled' || (currentOrSelected()?.status || '') === 'canceled' || (currentOrSelected()?.status || '') === 'skipped',
                      idle: !(currentOrSelected()?.status)
                    }">
                    <span class="dot"></span>
                    <span class="lbl">{{ currentOrSelected()?.status || '—' }}</span>
                  </span>
                </div>
                <div class="sel-status-grid">
                  <div class="cell">
                    <span class="k">Début</span>
                    <span class="v">{{ currentOrSelected()?.startedAt | date:'medium':'':'fr-FR' }}</span>
                  </div>
                  <div class="cell">
                    <span class="k">Fin</span>
                    <span class="v">{{ currentOrSelected()?.finishedAt | date:'medium':'':'fr-FR' }}</span>
                  </div>
                </div>
              </div>
              <div class="sel-actions">
                <button *ngIf="(currentOrSelected()?.status||'') !== 'running'" nz-button nzType="primary" nzSize="small" class="apple-btn run-btn" (click)="restart.emit()">
                  <i class="fa-solid fa-play"></i><span>Lancer</span>
                </button>
                <button *ngIf="(currentOrSelected()?.status||'') === 'running'" nz-button nzType="default" nzDanger nzSize="small" class="apple-btn run-btn" (click)="stop.emit()">
                  <i class="fa-solid fa-stop"></i><span>Stop</span>
                </button>
                <button nz-button nzSize="small" class="apple-btn clear-btn" (click)="clearRun.emit()"><i class="fa-regular fa-trash-can"></i><span>Effacer</span></button>
              </div>
            </nz-form-control>
          </nz-form-item>

          </form>

        <!-- Section Nœud / Paramètres - visible uniquement si un nœud est sélectionné -->
        <ng-container *ngIf="selected || (selectedList.length||0) > 1">
          <div class="node-panel">
            <div class="panel-heading node-heading">
              <div class="card-title left">
                <span class="t">{{ (selectedList.length||0) > 1 ? 'Nœuds' : 'Nœud' }}</span>
                <span class="s">Paramètres</span>
              </div>
            </div>
            <div class="inspector-node" (touchstart)="onTouchStart($event)" (touchmove)="onTouchMove($event)" (touchend)="onTouchEnd($event)">
            <div class="rows simple" *ngIf="(selectedList.length||0) <= 1; else multiSlides">
              <div *ngIf="(selectedList.length||0) <= 1; else multiMeta">
                <node-inspector-item [model]="selectedModel"
                  [filledArgs]="filledArgsAll()" [usedArgs]="usedArgsAll()"
                  [showJsonViewer]="showJsonViewer" [editJson]="editJson"
                  [nodeHasError]="nodeHasError" [nodeErrorText]="nodeErrorText"
                  (openFilledModal)="showFilledModal=true"
                  (openFilledJson)="showFilledJsonModal=true"
                  (openUsedModal)="showUsedModal=true"
                  (openUsedJson)="showUsedJsonModal=true">
                </node-inspector-item>
              </div>
              <ng-template #multiMeta>
                <ng-container *ngIf="selectedList && selectedList.length">
                  <ng-container *ngIf="selectedList[multiIndex] as it">
                    <div class="kv-list">
                      <div class="kv"><span class="label">ID</span><span class="value mono">{{ it?.data?.model?.id }}</span></div>
                      <div class="kv"><span class="label">Nom</span><span class="value mono">{{ it?.data?.model?.name }}</span></div>
                      <div class="kv"><span class="label">Type</span><span class="value mono">{{ it?.data?.model?.templateObj?.type }}</span></div>
                      <div class="kv"><span class="label">Template</span><span class="value mono">{{ it?.data?.model?.template }}</span></div>
                    </div>
                  </ng-container>
                </ng-container>
              </ng-template>
              <div class="actions-line icon-only end" *ngIf="(selectedList.length||0) <= 1">
                <button nz-button nzSize="small" class="apple-btn" (click)="openAdvanced.emit()" title="Ouvrir l’éditeur (v1)" aria-label="Ouvrir l’éditeur (v1)"><i class="fa-regular fa-pen-to-square"></i></button>
                <button nz-button nzSize="small" class="apple-btn" (click)="openAdvancedV2.emit()" title="Ouvrir l’éditeur avancé (v2)" aria-label="Ouvrir l’éditeur avancé (v2)"><i class="fa-solid fa-up-right-from-square"></i></button>
                <button nz-button nzSize="small" class="apple-btn" (click)="showJsonViewer = !showJsonViewer" [title]="showJsonViewer ? 'Masquer le JSON' : 'Voir le JSON'" aria-label="Voir le JSON"><i class="fa-solid fa-code"></i></button>
                <button nz-button nzSize="small" nzDanger class="apple-btn danger-btn" (click)="delete.emit()" title="Supprimer" aria-label="Supprimer"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </div>

            <!-- Multi selection: slides with swipe and dots -->
            <ng-template #multiSlides>
              <div class="carousel-shell">
                <div class="slides" [style.transform]="slidesTransform" [class.dragging]="dragging">
                  <div class="slide" *ngFor="let it of selectedList; let i = index">
                    <node-inspector-item [model]="it?.data?.model"
                      [filledArgs]="filledArgsAllFor(it?.data?.model)"
                      [usedArgs]="usedArgsAll()"
                      [showJsonViewer]="showJsonViewer && selected?.id===it?.data?.model?.id"
                      [editJson]="editJson"
                      [nodeHasError]="false"
                      [nodeErrorText]="null"
                      (openFilledModal)="onOpenFilledModalFor(it)"
                      (openFilledJson)="onOpenFilledJsonFor(it)"
                      (openUsedModal)="onOpenUsedModalFor(it)"
                      (openUsedJson)="onOpenUsedJsonFor(it)">
                    </node-inspector-item>
                  </div>
                </div>
                <div class="dots" role="tablist" aria-label="Sélection">
                  <button class="dot" type="button" *ngFor="let _ of selectedList; let i = index" [class.active]="i===multiIndex" (click)="go(i)"></button>
                </div>
              </div>
            </ng-template>
            </div>
          </div>
        </ng-container>

        <div class="recent" *ngIf="(recentRuns?.length || 0) > 0">
          <div class="panel-heading">
            <div class="card-title left">
              <span class="t">Dernières exécutions</span>
              <span class="s">Statuts récents</span>
            </div>
          </div>
          <div class="recent-list">
            <div class="r" *ngFor="let r of recentRuns" [class.active]="isCurrentRun(r)">
              <span class="time">{{ r.startedAt | date:'medium':'':'fr-FR' }}</span>
              <span class="status" [class.ok]="r.status==='success'" [class.err]="r.status==='error'" [class.run]="r.status==='running'">{{ r.status || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="history-wrap">
          <flow-history-timeline [pastItems]="timelinePastItems" [futureItems]="timelineFutureItems"
            (hoverPast)="hoverPast.emit($event)" (hoverFuture)="hoverFuture.emit($event)"
            (leave)="leave.emit()" (clickPast)="clickPast.emit($event)"
            (clickFuture)="clickFuture.emit($event)"></flow-history-timeline>
        </div>

        <!-- Modals: view large for each args block -->
        <nz-modal [(nzVisible)]="showFilledModal" nzTitle="Arguments renseignés" (nzOnCancel)="showFilledModal=false" (nzOnOk)="showFilledModal=false" [nzWidth]="860">
          <ng-container *nzModalContent>
            <div class="modal-args">
              <div class="arg" *ngFor="let a of filledArgsAll()">
                <span class="label" nz-tooltip [nzTooltipTitle]="labelTip(a.label, a.key)">{{ a.label }}</span>
                <span class="value mono" nz-tooltip [nzTooltipTitle]="valueTip(a.value)">{{ displayValue(a.value) }}</span>
              </div>
            </div>
          </ng-container>
        </nz-modal>

        <nz-modal [(nzVisible)]="showUsedModal" nzTitle="Arguments utilisés" (nzOnCancel)="showUsedModal=false" (nzOnOk)="showUsedModal=false" [nzWidth]="860">
          <ng-container *nzModalContent>
            <div class="modal-args">
              <div class="arg" *ngFor="let a of usedArgsAll()">
                <span class="label" nz-tooltip [nzTooltipTitle]="labelTip(a.label, a.key)">{{ a.label }}</span>
                <span class="value mono" nz-tooltip [nzTooltipTitle]="valueTip(a.value)">{{ displayValue(a.value) }}</span>
              </div>
            </div>
          </ng-container>
        </nz-modal>

        <nz-modal [(nzVisible)]="showFilledJsonModal" nzTitle="Arguments renseignés — JSON" (nzOnCancel)="showFilledJsonModal=false" (nzOnOk)="showFilledJsonModal=false" [nzWidth]="860">
          <ng-container *nzModalContent>
            <monaco-json-editor [value]="filledArgsObject() | json" [height]="420" [readonly]="true"></monaco-json-editor>
          </ng-container>
        </nz-modal>

        <nz-modal [(nzVisible)]="showUsedJsonModal" nzTitle="Arguments utilisés — JSON" (nzOnCancel)="showUsedJsonModal=false" (nzOnOk)="showUsedJsonModal=false" [nzWidth]="860">
          <ng-container *nzModalContent>
            <monaco-json-editor [value]="usedArgsObject() | json" [height]="420" [readonly]="true"></monaco-json-editor>
          </ng-container>
        </nz-modal>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; min-height:0; }
    .right-panel { min-height: 0; height: 100%; display:flex; flex-direction:column; background: transparent; }
    .panel-scroll { height: 100%; overflow: auto; padding: 8px; }
    .inspector-meta .meta-form { font-size: 12px; padding: 0; margin-top: 8px; }
    .inspector-meta .meta-form .ant-form-item { margin-bottom: 10px; }
    .inspector-meta .meta-form .enabled-row { margin-bottom: 0; }
    :host ::ng-deep .meta-form .ant-form-item { padding: 4px 6px; border-radius: 6px; transition: background-color .12s ease; }
    :host ::ng-deep .meta-form .ant-form-item-label > label { color: #6b7280; font-weight: 500; font-size: 12px; }
    :host ::ng-deep .meta-form .ant-input,
    :host ::ng-deep .meta-form .ant-select-selector,
    :host ::ng-deep .meta-form .ant-input-number,
    :host ::ng-deep .meta-form .ant-picker,
    :host ::ng-deep .meta-form .ant-switch {
      background: #fdf2f8;
      border-color: #fce7f3;
      transition: box-shadow .12s ease, border-color .12s ease;
    }
    :host ::ng-deep .meta-form .ant-input:hover,
    :host ::ng-deep .meta-form .ant-select-selector:hover,
    :host ::ng-deep .meta-form .ant-input-number:hover,
    :host ::ng-deep .meta-form .ant-picker:hover {
      border-color: #d1d5db;
    }
    :host ::ng-deep .meta-form .ant-input:focus,
    :host ::ng-deep .meta-form .ant-input-number-focused,
    :host ::ng-deep .meta-form .ant-picker-focused,
    :host ::ng-deep .meta-form .ant-switch-checked {
      box-shadow: 0 0 0 2px rgba(17,17,17,0.08);
    }
    :host ::ng-deep .meta-form .ant-select-focused .ant-select-selector,
    :host ::ng-deep .meta-form .ant-select.ant-select-focused:not(.ant-select-disabled):not(.ant-select-customize-input) .ant-select-selector {
      border-color: #e61982;
      box-shadow: 0 0 0 2px rgba(230,25,130,0.18);
    }
    :host ::ng-deep .meta-form .ant-switch.ant-switch-checked {
      background-color: #e61982;
      border-color: #e61982;
    }
    :host ::ng-deep .meta-form .ant-switch:not(.ant-switch-checked) {
      background-color: #fce7f3;
      border-color: #9dbdff;
    }
    :host ::ng-deep .meta-form .ant-checkbox-checked .ant-checkbox-inner {
      background-color: #e61982;
      border-color: #e61982;
    }
    :host ::ng-deep .meta-form .ant-checkbox:not(.ant-checkbox-checked) .ant-checkbox-inner {
      border: 1px solid #9dbdff !important;
      background-color: #e7f0ff;
    }
    .exec-row { display:flex; gap: 8px; align-items:center; }
    .wf-native-select {
      width: 100%;
      min-height: 32px;
      border: 1px solid #fce7f3;
      border-radius: 8px;
      background: #fdf2f8;
      color: #111827;
      font-size: 12px;
      padding: 6px 30px 6px 10px;
      outline: none;
      box-sizing: border-box;
      appearance: auto;
      -webkit-appearance: menulist;
    }
    .wf-native-select:hover { border-color: #d1d5db; }
    .wf-native-select:focus {
      border-color: #e61982;
      box-shadow: 0 0 0 2px rgba(230,25,130,0.18);
    }
    .exec-row .apple-btn { display:inline-flex; align-items:center; gap:6px; border-radius:8px; }
    .exec-row .apple-btn.icon-only { width:34px; height:34px; justify-content:center; }
    .exec-row .apple-btn .lbl { display:none; }
    .s { font-size:12px; color:#64748b; }
    .inspector-meta label.enabled { display:inline-flex; gap: 10px; }
    .exec-status { margin-top: 6px; }
    .exec-status .row { display:flex; justify-content:space-between; padding: 4px 0; }
    .exec-status .row .k { color:#6b7280; }
    .actions-wrap { display:flex; flex-wrap: wrap; gap:8px; justify-content:flex-end; margin-top:6px; }
    .actions-wrap button { display:inline-flex; align-items:center; gap:6px; }
    .actions-wrap .run-btn { background:#e61982 !important; color:#fff !important; border-color:#e61982 !important; }
    .actions-wrap .run-btn:hover { background:#d0167a !important; border-color:#d0167a !important; }
    :host ::ng-deep .inspector-meta .apple-btn:hover:not([disabled]) {
      background: #fdf2f8 !important;
      border-color: #f9a8d4 !important;
      color: #0b5ed7 !important;
      box-shadow: 0 6px 14px rgba(230,25,130,0.18);
      transform: translateY(-1px);
    }
    .pub-row { align-items:center; }
    .pub-row { display:flex; gap:8px; align-items:center; }
    .recent .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 6px 8px; border-bottom:0; margin:6px 0 8px; }
    .recent .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .recent-list { display:flex; flex-direction:column; gap:8px; padding:8px 6px; }
    .recent-list .r { display:flex; gap:8px; align-items:center; font-size:12px; padding:4px 6px; border-radius:6px; }
    .recent-list .r.active { background:#f1f5f9; }
    .recent-list .r .time { color:#6b7280; min-width: 160px; }
    .exec-select-row { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
    .exec-select-row .flex-1 { flex:1 1 auto; min-width: 0; }
    .exec-select-row .load-btn { display:inline-flex; align-items:center; justify-content:center; }
    .sel-status { margin-top: 18px; padding: 8px 10px; border-radius:10px; background: #fdf2f8; border: 1px solid #fdf2f8; }
    .sel-status .k { color:#6b7280; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    .sel-status .v { color:#111; font-size:12px; }
    .sel-status-head { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; }
    .sel-status-grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px 12px; }
    .sel-status-grid .cell { display:flex; flex-direction:column; gap:2px; padding:6px 8px; border-radius:8px; background:#fff; border:1px solid #f1f5f9; }
    .status-pill { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; letter-spacing:.02em; text-transform:uppercase; background:#fdf2f8; color:#64748b; border:1px solid #e2e8f0; }
    .status-pill .dot { width:6px; height:6px; border-radius:50%; background: currentColor; box-shadow: 0 0 0 2px rgba(0,0,0,0.04); }
    .status-pill.ok { color:#15803d; background:#ecfdf5; border-color:#bbf7d0; }
    .status-pill.err { color:#b42318; background:#fff1f2; border-color:#fecdd3; }
    .status-pill.run { color:#0369a1; background:#e0f2fe; border-color:#bae6fd; }
    .status-pill.warn { color:#a16207; background:#fef9c3; border-color:#fde68a; }
    .status-pill.idle { color:#6b7280; background:#f1f5f9; border-color:#e2e8f0; }
    .sel-actions { display:flex; justify-content:flex-start; align-items:center; gap:8px; margin-top:10px; }
    .sel-actions .apple-btn { display:inline-flex; align-items:center; gap:6px; }
    .sel-actions .clear-btn:hover:not([disabled]) {
      background:#fee2e2 !important;
      border-color:#fecaca !important;
      color:#b91c1c !important;
      box-shadow: 0 6px 14px rgba(239,68,68,0.18);
      transform: translateY(-1px);
    }
    .inspector-node .actions-line .danger-btn:hover:not([disabled]) {
      background:#fee2e2 !important;
      border-color:#fecaca !important;
      color:#b91c1c !important;
      box-shadow: 0 6px 14px rgba(239,68,68,0.18);
      transform: translateY(-1px);
    }
    .recent-list .r .status.ok { color:#16a34a; }
    .recent-list .r .status.err { color:#ef4444; }
    .recent-list .r .status.run { color:#0ea5e9; }
    .load-more { margin-top: 6px; display:flex; justify-content:flex-end; }

    /* Node inspector (inline) */
    .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 6px 8px; border-bottom: 0; }
    .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .panel-heading .card-title .t { font-weight:600; font-size:14px; }
    .panel-heading .card-title .s { font-size:12px; color:#64748b; }
    .panel-heading.main-title { justify-content:center; padding:10px 0; }
    .panel-heading.main-title .card-title { align-items:center; text-align:center; margin:0; width:100%; line-height:1.1; }
    .panel-heading.main-title .card-title .t { font-weight:700; font-size:14px; color:#000; }
    .panel-heading.main-title .card-title .s { font-size:13px; color:#64748b; }
    .node-panel { margin: 8px 6px 12px; padding: 0; border-radius: 0; background: transparent; border: 0; }
    .node-panel .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; border-bottom:0; margin:12px 0 8px; }
    .node-panel .panel-heading .card-title .s { font-size:12px; color:#64748b; text-transform:none; letter-spacing:normal; }
    .inspector-node { padding: 0 2px; }
    .history-wrap { padding: 0 6px 8px; }
    .inspector-node .rows { display:flex; flex-direction:column; gap:8px; }
    .inspector-node .rows.simple .row { display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #f2f2f2; padding: 6px 0; }
    .inspector-node .row .k { color:#6b7280; font-size:12px; font-weight:600; }
    .inspector-node .row .v { color:#111; font-size:12px; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align:right; }
    .inspector-node .row .v.err { color:#b42318; white-space:normal; }
    .inspector-node .args { margin-top: 8px; }
    .inspector-node .args-title-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; }
    .inspector-node .args-title { font-weight:600; font-size:12px; color:#111; }
    .inspector-node .args-list { display:flex; flex-direction:column; gap:6px; }
    .inspector-node .args-list .arg { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .inspector-node .args-list .label { color:#6b7280; font-size:12px; font-weight:600; }
    .inspector-node .args-list .value { color:#111; font-size:12px; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align:right; }
    .inspector-node .kv-list { display:flex; flex-direction:column; gap:6px; margin-top: 8px; }
    .inspector-node .kv-list { padding:8px; border-radius:10px; background:#ffffff; }
    .inspector-node .kv-list .kv { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
    .inspector-node .kv-list .label { color:#6b7280; font-size:12px; font-weight:600; }
    .inspector-node .kv-list .value { color:#111; font-size:12px; max-width: 60%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align:right; }
    .inspector-node .actions-line.end { justify-content:flex-end; }
    .inspector-node .row .v.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .inspector-node .hint { color:#8c8c8c; font-size:12px; margin-top:4px; }
    .inspector-node .json-box { border:0; border-radius:10px; padding:0; background:#fff; }
    .inspector-node .json-box.slim monaco-json-editor .editor { min-height: 180px; }
    .inspector-node .actions-line { display:flex; align-items:center; gap:8px; margin-top:8px; }
    .inspector-node .actions-line.right { justify-content:flex-end; }
    .inspector-node .actions-line.icon-only button { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; padding:0; }
    .inspector-node .icon-btn { width:26px; height:26px; padding:0; display:inline-flex; align-items:center; justify-content:center; }
    .inspector-node .title-actions { display:flex; align-items:center; gap:6px; }

    /* Carousel (mobile dialog-like) */
    .carousel-shell { position: relative; overflow: hidden; }
    .slides { display:flex; width:100%; transition: transform .28s ease; will-change: transform; }
    .slides.dragging { transition: none; }
    .slide { flex: 0 0 100%; padding-bottom: 8px; }
    .dots { display:flex; gap:8px; justify-content:center; align-items:center; margin-top:8px; }
    .dot { width:8px; height:8px; border-radius:50%; border:0; background:#d4d4d8; padding:0; cursor:pointer; }
    .dot.active { background:#111827; }

    /* Modal list styling */
    .modal-args { display:flex; flex-direction:column; gap:10px; }
    .modal-args .arg { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .modal-args .label { color:#6b7280; font-size:13px; font-weight:600; }
    .modal-args .value { color:#111; font-size:13px; max-width: 70%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align:right; }
    :host ::ng-deep .ant-modal-footer .ant-btn-primary {
      background:#e61982 !important;
      border-color:#e61982 !important;
    }
    :host ::ng-deep .ant-modal-footer .ant-btn-primary:hover {
      background:#d0167a !important;
      border-color:#d0167a !important;
    }
    :host ::ng-deep .ant-modal-footer .ant-btn:hover {
      border-color:#e61982 !important;
      color:#e61982 !important;
    }
  `]
})
export class FlowRightPanelComponent implements OnChanges {
  @Input() mode: 'drawer' | 'outside' = 'outside';
  @Input() selected: any;
  @Input() selectedList: any[] = [];
  @Input() selectedModel: any;
  @Input() nodeHasError: boolean = false;
  @Input() nodeErrorText: string | null = null;
  @Input() selectedAttempt: { argsPre?: any; argsPost?: any } | null = null;
  @Input() inspectorTab: 'settings' | 'json' = 'settings';
  @Output() inspectorTabChange = new EventEmitter<'settings' | 'json'>();
  @Input() editJson = '';
  @Output() editJsonChange = new EventEmitter<string>();
  @Output() openAdvanced = new EventEmitter<void>();
  @Output() openAdvancedV2 = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() openSingle = new EventEmitter<string>();
  @Output() deleteMany = new EventEmitter<void>();
  @Output() saveJson = new EventEmitter<void>();

  // Meta + actions
  @Input() currentFlowName = '';
  @Output() currentFlowNameChange = new EventEmitter<string>();
  @Input() currentFlowDesc = '';
  @Output() currentFlowDescChange = new EventEmitter<string>();
  @Input() currentFlowStatus: 'draft'|'test'|'production' = 'draft';
  @Output() currentFlowStatusChange = new EventEmitter<'draft'|'test'|'production'>();
  @Input() currentFlowEnabled = false;
  @Output() currentFlowEnabledChange = new EventEmitter<boolean>();
  @Input() builderMode: 'test'|'prod' = 'test';
  @Input() lastRun: any = null;
  @Input() currentRun: any = null;
  @Input() runInfo: { id?: string; status?: string; startedAt?: string; finishedAt?: string } | null = null;
  @Input() recentRuns: Array<{ id?: string; status?: string; startedAt?: string; finishedAt?: string }> = [];
  @Input() runsHasMore = false;
  @Input() selectedRunId: string | null = null;
  selectedRecentId: string | null = null;
  get useNativeSelect(): boolean { return this.mode === 'drawer'; }
  @Output() selectRun = new EventEmitter<string>();
  @Output() loadMoreRuns = new EventEmitter<void>();
  // no search field per request
  @Input() canSave = false;
  @Output() run = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() metaChange = new EventEmitter<void>();
  @Output() clearRun = new EventEmitter<void>();
  @Output() restart = new EventEmitter<void>();
  // removed reloadFlow button per request

  // Timeline data + events
  @Input() timelinePastItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Input() timelineFutureItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Output() hoverPast = new EventEmitter<number>();
  @Output() hoverFuture = new EventEmitter<number>();
  @Output() leave = new EventEmitter<void>();
  @Output() clickPast = new EventEmitter<number>();
  @Output() clickFuture = new EventEmitter<number>();
  showJsonViewer = false;
  showFilledModal = false;
  showUsedModal = false;
  showFilledJsonModal = false;
  showUsedJsonModal = false;
  // Bottom carousel styles
  staticStyles = `
    .carousel-shell { position: relative; overflow:hidden; }
    .slides { display:flex; width:100%; transition: transform .28s ease; will-change: transform; }
    .slides.dragging { transition: none; }
    .slide { flex: 0 0 100%; padding-bottom: 8px; }
    .dots { display:flex; gap:8px; justify-content:center; align-items:center; margin-top:8px; }
    .dot { width:8px; height:8px; border-radius:50%; border:0; background:#d4d4d8; padding:0; cursor:pointer; }
    .dot.active { background:#111827; }
  `;
  // helper to read currently selected recent run
  selectedRecent() { try { return (this.recentRuns || []).find(r => String(r.id||'') === String(this.selectedRecentId||'')) || null; } catch { return null; } }
  currentOrSelected() { return this.runInfo || this.selectedRecent(); }
  isCurrentRun(r: any): boolean {
    try {
      const cur = String((this.runInfo && (this.runInfo as any).id) || this.selectedRunId || '');
      const id = String((r && (r as any).id) || '');
      return !!cur && !!id && cur === id;
    } catch { return false; }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRunId']) {
      const id = this.selectedRunId || null;
      if (id && this.selectedRecentId !== id) this.selectedRecentId = id;
    }
    if (changes['selectedList']) {
      const len = Array.isArray(this.selectedList) ? this.selectedList.length : 0;
      if (this.multiIndex >= len) this.multiIndex = Math.max(0, len - 1);
      this.resetSlidesTransform(true);
    }
  }
  multiIndex = 0;
  private swipeX = 0; private swipeY = 0; private swiping = false;
  onTouchStart(ev: TouchEvent) { try { const t = ev.touches && ev.touches[0]; if (!t) return; this.swipeX = t.clientX; this.swipeY = t.clientY; this.swiping = true; } catch {} }
  onTouchMove(ev: TouchEvent) {
    try {
      if (!this.swiping) return;
      const t = ev.touches && ev.touches[0]; if (!t) return;
      const dx = t.clientX - this.swipeX;
      const container = (ev.target as HTMLElement)?.closest('.carousel-shell') as HTMLElement | null;
      const w = container?.getBoundingClientRect()?.width || 1;
      const base = -(this.multiIndex * 100);
      const pct = (dx / w) * 100;
      this.slidesTransform = `translateX(${base + pct}%)`;
      this.dragging = true;
    } catch {}
  }
  onTouchEnd(ev: TouchEvent) {
    try {
      if (!this.swiping) return; this.swiping = false;
      const t = ev.changedTouches && ev.changedTouches[0]; if (!t) { this.resetSlidesTransform(); return; }
      const dx = t.clientX - this.swipeX; const dy = t.clientY - this.swipeY;
      const thresh = 40; // px
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > thresh) { if (dx < 0) this.next(); else this.prev(); }
      this.resetSlidesTransform();
    } catch {}
  }
  prev() { if (this.selectedList && this.selectedList.length > 1) { this.multiIndex = (this.multiIndex - 1 + this.selectedList.length) % this.selectedList.length; this.resetSlidesTransform(true); } }
  next() { if (this.selectedList && this.selectedList.length > 1) { this.multiIndex = (this.multiIndex + 1) % this.selectedList.length; this.resetSlidesTransform(true); } }
  go(i: number) { if (!this.selectedList || i < 0 || i >= this.selectedList.length) return; this.multiIndex = i; this.resetSlidesTransform(true); }
  slidesTransform = 'translateX(0%)';
  dragging = false;
  private resetSlidesTransform(animate = false) {
    try {
      const base = -(this.multiIndex * 100);
      this.slidesTransform = `translateX(${base}%)`;
      this.dragging = false;
    } catch {}
  }
  // No selection change on slide change — stays informational only
  onOpenAdvancedFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) { this.openSingle.emit(id); setTimeout(() => this.openAdvanced.emit(), 0); } } catch {} }
  onToggleJsonFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) this.openSingle.emit(id); this.showJsonViewer = !this.showJsonViewer; } catch {} }
  onOpenFilledModalFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) this.openSingle.emit(id); this.showFilledModal = true; } catch {} }
  onOpenFilledJsonFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) this.openSingle.emit(id); this.showFilledJsonModal = true; } catch {} }
  onOpenUsedModalFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) this.openSingle.emit(id); this.showUsedModal = true; } catch {} }
  onOpenUsedJsonFor(it: any) { try { const id = String(it?.data?.model?.id || ''); if (id) this.openSingle.emit(id); this.showUsedJsonModal = true; } catch {} }

  // Parametrized helpers for carousel nodes
  private schemaKeysAndLabelsForModel(model: any): Array<{ key: string; label: string }> {
    try {
      const schema: any = model?.templateObj?.args || null;
      const out: Array<{ key: string; label: string }> = [];
      const seen = new Set<string>();
      const walk = (arr?: any[]) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          const key = String(it?.key || '');
          const label = String(it?.label || key);
          if (key && !seen.has(key)) { out.push({ key, label }); seen.add(key); }
          walk(it?.fields);
          if (Array.isArray(it?.steps)) for (const s of it.steps as any[]) walk(s?.fields);
        }
      };
      if (schema) { walk(schema.fields); if (Array.isArray(schema.steps)) for (const st of schema.steps as any[]) walk(st?.fields); }
      return out;
    } catch { return []; }
  }
  filledArgsAllFor(model: any): Array<{ key: string; label: string; value: any }> {
    try {
      const ctx = (model?.context && typeof model.context === 'object') ? model.context : {};
      const entries = Object.entries(ctx).filter(([_, v]) => v != null && !(typeof v === 'string' && v.trim() === ''));
      if (!entries.length) return [];
      const labels = this.schemaKeysAndLabelsForModel(model).reduce((acc, it) => { acc[it.key] = it.label; return acc; }, {} as Record<string,string>);
      return entries.map(([k, v]) => ({ key: k, label: labels[k] || k, value: v }));
    } catch { return []; }
  }

  // Helpers: extract filled args with best-effort labels
  private flattenFields(arr: any[] | undefined | null, out: Record<string,string>) {
    if (!Array.isArray(arr)) return;
    for (const it of arr) {
      const key = String(it?.key || '');
      const label = String(it?.label || '');
      if (key) out[key] = label || key;
      this.flattenFields(it?.fields, out);
      this.flattenFields(it?.items, out as any);
      if (Array.isArray(it?.steps)) {
        for (const s of (it.steps as any[])) this.flattenFields(s?.fields, out);
      }
    }
  }
  private schemaKeysAndLabels(): Array<{ key: string; label: string }> {
    try {
      const model: any = this.selectedModel || {};
      const schema: any = model?.templateObj?.args || null;
      const out: Array<{ key: string; label: string }> = [];
      const seen = new Set<string>();
      const walk = (arr?: any[]) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          const key = String(it?.key || '');
          const label = String(it?.label || key);
          if (key && !seen.has(key)) { out.push({ key, label }); seen.add(key); }
          walk(it?.fields);
          if (Array.isArray(it?.steps)) for (const s of it.steps as any[]) walk(s?.fields);
        }
      };
      if (schema) {
        walk(schema.fields);
        if (Array.isArray(schema.steps)) for (const st of schema.steps as any[]) walk(st?.fields);
      }
      return out;
    } catch { return []; }
  }
  filledArgs(): Array<{ key: string; label: string; value: any }> {
    try {
      const model: any = this.selectedModel || {};
      const ctx = (model?.context && typeof model.context === 'object') ? model.context : {};
      const entries = Object.entries(ctx).filter(([_, v]) => v != null && !(typeof v === 'string' && v.trim() === ''));
      if (!entries.length) return [];
      const schema: any = model?.templateObj?.args || null;
      const map: Record<string,string> = {};
      if (schema) {
        if (Array.isArray(schema.fields)) this.flattenFields(schema.fields, map);
        if (Array.isArray(schema.steps)) {
          for (const st of schema.steps as any[]) this.flattenFields(st?.fields, map);
        }
      }
      return entries.map(([k, v]) => ({ key: k, label: map[k] || k, value: v }));
    } catch { return []; }
  }
  filledArgsAll(): Array<{ key: string; label: string; value: any }> {
    try {
      const model: any = this.selectedModel || {};
      const ctx = (model?.context && typeof model.context === 'object') ? model.context : {};
      const fields = this.schemaKeysAndLabels();
      if (fields.length) return fields.map(f => ({ key: f.key, label: f.label, value: (ctx as any)[f.key] }));
      return Object.keys(ctx).map(k => ({ key: k, label: k, value: (ctx as any)[k] }));
    } catch { return []; }
  }
  filledArgsObject(): any { try { const obj: any = {}; for (const a of this.filledArgsAll()) obj[a.label || a.key] = a.value; return obj; } catch { return {}; } }
  usedArgs(): Array<{ key: string; label: string; value: any }> {
    try {
      const att = this.selectedAttempt || null;
      if (!att) return [];
      const src = (att.argsPost != null && typeof att.argsPost === 'object' && Object.keys(att.argsPost).length) ? att.argsPost
               : (att.argsPre != null ? att.argsPre : null);
      if (!src || typeof src !== 'object') return [];
      const entries = Object.entries(src).filter(([_, v]) => v != null && !(typeof v === 'string' && v.trim() === ''));
      if (!entries.length) return [];
      const model: any = this.selectedModel || {};
      const schema: any = model?.templateObj?.args || null;
      const map: Record<string,string> = {};
      if (schema) {
        if (Array.isArray(schema.fields)) this.flattenFields(schema.fields, map);
        if (Array.isArray(schema.steps)) {
          for (const st of schema.steps as any[]) this.flattenFields(st?.fields, map);
        }
      }
      return entries.map(([k, v]) => ({ key: k, label: map[k] || k, value: v }));
    } catch { return []; }
  }
  usedArgsAll(): Array<{ key: string; label: string; value: any }> {
    try {
      const att = this.selectedAttempt || null;
      const fields = this.schemaKeysAndLabels();
      const src = (att && att.argsPost && typeof att.argsPost === 'object') ? att.argsPost
               : (att && att.argsPre && typeof att.argsPre === 'object' ? att.argsPre : {});
      const obj = src || {};
      if (fields.length) return fields.map(f => ({ key: f.key, label: f.label, value: (obj as any)[f.key] }));
      return Object.keys(obj).map(k => ({ key: k, label: k, value: (obj as any)[k] }));
    } catch { return []; }
  }
  usedArgsObject(): any { try { const obj: any = {}; for (const a of this.usedArgsAll()) obj[a.label || a.key] = a.value; return obj; } catch { return {}; } }

  displayValue(v: any): string {
    try {
      if (v == null) return '—';
      if (typeof v === 'string') return v.trim().length ? v : '—';
      return JSON.stringify(v);
    } catch { return '—'; }
  }

  labelTip(label?: string, key?: string): string | null {
    try { const s = String(label || key || ''); return s && s.length > 24 ? s : null; } catch { return null; }
  }
  valueTip(v: any): string | null {
    try {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return s && s.length > 36 ? s : null;
    } catch { return null; }
  }
}
