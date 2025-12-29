import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FlowInspectorPanelComponent } from '../inspector/flow-inspector-panel.component';
import { FlowHistoryTimelineComponent } from '../history/flow-history-timeline.component';

@Component({
  selector: 'flow-right-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule, FlowInspectorPanelComponent, FlowHistoryTimelineComponent],
  template: `
    <div class="right-panel" [class.drawer-mode]="mode==='drawer'">
      <flow-inspector-panel [mode]="mode" [selected]="selected" [selectedList]="selectedList" [selectedModel]="selectedModel"
        [inspectorTab]="inspectorTab" (inspectorTabChange)="inspectorTabChange.emit($event)" [editJson]="editJson"
        (editJsonChange)="editJsonChange.emit($event)" (openAdvanced)="openAdvanced.emit()" (delete)="delete.emit()" (openSingle)="openSingle.emit($event)" (deleteMany)="deleteMany.emit()"
        (saveJson)="saveJson.emit()"></flow-inspector-panel>
      <div class="inspector-meta" style="padding: 8px; overflow: auto;">
        <form nz-form nzLayout="vertical" class="meta-form">
          <nz-form-item>
            <nz-form-label>En service</nz-form-label>
            <nz-form-control>
              <label class="enabled single-line">
                <input type="checkbox" [(ngModel)]="currentFlowEnabled" (ngModelChange)="metaChange.emit()" name="flowEnabledPanelTop" />
                <span>Activer ce flow</span>
              </label>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>Nom</nz-form-label>
            <nz-form-control>
              <input nz-input [(ngModel)]="currentFlowName" (ngModelChange)="metaChange.emit()" name="flowNamePanel" placeholder="Nom du flow" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Description</nz-form-label>
            <nz-form-control>
              <input nz-input [(ngModel)]="currentFlowDesc" (ngModelChange)="metaChange.emit()" name="flowDescPanel" placeholder="Description" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Exécution</nz-form-label>
            <nz-form-control>
              <div class="exec-row">
                <nz-select [(ngModel)]="builderMode" name="builderModePanel" nzPlaceHolder="Mode">
                  <nz-option nzValue="test" nzLabel="test"></nz-option>
                  <nz-option nzValue="prod" nzLabel="prod"></nz-option>
                </nz-select>
              </div>
            </nz-form-control>
          </nz-form-item>

          <!-- Sélecteur rapide toujours visible -->
          <nz-form-item>
            <nz-form-label>Exécutions récentes</nz-form-label>
            <nz-form-control>
              <div class="exec-select-row">
                <nz-select class="flex-1" [(ngModel)]="selectedRecentId" name="recentRunSelect" nzPlaceHolder="Choisir une exécution"
                           (nzScrollToBottom)="loadMoreRuns.emit()">
                  <nz-option *ngFor="let r of recentRuns" [nzValue]="r.id" [nzLabel]="(r.startedAt | date:'medium':'':'fr-FR') + ' — ' + (r.status || '—')"></nz-option>
                </nz-select>
                <button nz-button nzType="default" nzSize="small" class="load-btn" [disabled]="!selectedRecentId" (click)="selectedRecentId && selectRun.emit(selectedRecentId)" title="Charger">
                  <i class="fa-solid fa-download"></i>
                </button>
              </div>
              <div class="sel-status mono">
                <div class="row"><span class="k">Statut</span><span class="v">{{ currentOrSelected()?.status || '—' }}</span></div>
                <div class="row"><span class="k">Début</span><span class="v">{{ currentOrSelected()?.startedAt | date:'medium':'':'fr-FR' }}</span></div>
                <div class="row"><span class="k">Fin</span><span class="v">{{ currentOrSelected()?.finishedAt | date:'medium':'':'fr-FR' }}</span></div>
                <div class="actions-wrap">
                  <button nz-button nzSize="small" (click)="clearRun.emit()"><i class="fa-regular fa-trash-can"></i><span>Effacer</span></button>
                  <button nz-button nzType="primary" nzSize="small" (click)="restart.emit()"><i class="fa-solid fa-play"></i><span>Lancer</span></button>
                </div>
              </div>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Publication</nz-form-label>
            <nz-form-control>
              <div class="pub-row">
                <nz-select [(ngModel)]="currentFlowStatus" (ngModelChange)="metaChange.emit()" name="flowStatusPanel" nzPlaceHolder="Statut">
                  <nz-option nzValue="draft" nzLabel="brouillon"></nz-option>
                  <nz-option nzValue="test" nzLabel="test"></nz-option>
                  <nz-option nzValue="production" nzLabel="production"></nz-option>
                </nz-select>
                <button nz-button class="apple-btn btn-save black" nzType="default" type="button" (click)="save.emit()" [disabled]="!canSave" title="Enregistrer" aria-label="Enregistrer">
                  <i class="fa-solid fa-floppy-disk"></i><span class="lbl"></span>
                </button>
              </div>
            </nz-form-control>
          </nz-form-item>

          
          </form>
        <div class="recent">
          <div class="panel-heading">
            <div class="card-title left">
              <span class="t">Dernières exécutions</span>
              <span class="s">Statuts récents</span>
            </div>
          </div>
          <div class="recent-list">
            <div class="r" *ngFor="let r of recentRuns">
              <span class="time">{{ r.startedAt | date:'medium':'':'fr-FR' }}</span>
              <span class="status" [class.ok]="r.status==='success'" [class.err]="r.status==='error'" [class.run]="r.status==='running'">{{ r.status || '—' }}</span>
            </div>
          </div>
        </div>

        <flow-history-timeline [pastItems]="timelinePastItems" [futureItems]="timelineFutureItems"
          (hoverPast)="hoverPast.emit($event)" (hoverFuture)="hoverFuture.emit($event)"
          (leave)="leave.emit()" (clickPast)="clickPast.emit($event)"
          (clickFuture)="clickFuture.emit($event)"></flow-history-timeline>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .right-panel { min-height: 0; height: 100%; display:flex; flex-direction:column; }
    .inspector-meta .meta-form { font-size: 12px; padding: 0 8px; }
    .inspector-meta .meta-form .ant-form-item { margin-bottom: 10px; }
    ::ng-deep .meta-form .ant-form-item-label > label { font-weight: 600; font-size: 12px; }
    .exec-row { display:flex; gap: 8px; align-items:center; }
    .exec-row .apple-btn { display:inline-flex; align-items:center; gap:6px; border-radius:8px; }
    .exec-row .apple-btn.icon-only { width:34px; height:34px; justify-content:center; }
    .exec-row .apple-btn .lbl { display:none; }
    .s { font-size:12px; color:#64748b; }
    .exec-status { margin-top: 6px; }
    .exec-status .row { display:flex; justify-content:space-between; padding: 4px 0; }
    .exec-status .row .k { color:#6b7280; }
    .actions-wrap { display:flex; flex-wrap: wrap; gap:8px; justify-content:flex-end; margin-top:6px; }
    .actions-wrap button { display:inline-flex; align-items:center; gap:6px; }
    .pub-row { align-items:center; }
    .btn-save.black { background:#111; color:#fff; border-color:#111; }
    .pub-row { display:flex; gap:8px; align-items:center; }
    .recent .panel-heading { display:flex; align-items:flex-end; font-weight:600; font-size:13px; color:#111; padding:6px 0 8px; border-bottom:1px solid #E2E1E4; margin:6px 0 8px; }
    .recent .panel-heading .card-title { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
    .recent-list { display:flex; flex-direction:column; gap:8px; padding:8px 0; }
    .recent-list .r { display:flex; gap:8px; align-items:center; font-size:12px; }
    .recent-list .r .time { color:#6b7280; min-width: 160px; }
    .exec-select-row { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
    .exec-select-row .flex-1 { flex:1 1 auto; min-width: 0; }
    .exec-select-row .load-btn { display:inline-flex; align-items:center; justify-content:center; }
    .sel-status { margin-top: 4px; }
    .sel-status .row { display:flex; justify-content:space-between; padding: 2px 0; }
    .sel-status .row .k { color:#6b7280; }
    .recent-list .r .status.ok { color:#16a34a; }
    .recent-list .r .status.err { color:#ef4444; }
    .recent-list .r .status.run { color:#0ea5e9; }
    .load-more { margin-top: 6px; display:flex; justify-content:flex-end; }
  `]
})
export class FlowRightPanelComponent implements OnChanges {
  @Input() mode: 'drawer' | 'outside' = 'outside';
  @Input() selected: any;
  @Input() selectedList: any[] = [];
  @Input() selectedModel: any;
  @Input() inspectorTab: 'settings' | 'json' = 'settings';
  @Output() inspectorTabChange = new EventEmitter<'settings' | 'json'>();
  @Input() editJson = '';
  @Output() editJsonChange = new EventEmitter<string>();
  @Output() openAdvanced = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() openSingle = new EventEmitter<string>();
  @Output() deleteMany = new EventEmitter<void>();
  @Output() saveJson = new EventEmitter<void>();

  // Meta + actions
  @Input() currentFlowName = '';
  @Input() currentFlowDesc = '';
  @Input() currentFlowStatus: 'draft'|'test'|'production' = 'draft';
  @Input() currentFlowEnabled = false;
  @Input() builderMode: 'test'|'prod' = 'test';
  @Input() lastRun: any = null;
  @Input() currentRun: any = null;
  @Input() runInfo: { id?: string; status?: string; startedAt?: string; finishedAt?: string } | null = null;
  @Input() recentRuns: Array<{ id?: string; status?: string; startedAt?: string; finishedAt?: string }> = [];
  @Input() runsHasMore = false;
  @Input() selectedRunId: string | null = null;
  selectedRecentId: string | null = null;
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
  // helper to read currently selected recent run
  selectedRecent() { try { return (this.recentRuns || []).find(r => String(r.id||'') === String(this.selectedRecentId||'')) || null; } catch { return null; } }
  currentOrSelected() { return this.runInfo || this.selectedRecent(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRunId']) {
      const id = this.selectedRunId || null;
      if (id && this.selectedRecentId !== id) this.selectedRecentId = id;
    }
  }
}
