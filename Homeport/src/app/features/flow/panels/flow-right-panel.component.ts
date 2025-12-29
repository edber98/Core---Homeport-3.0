import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FlowInspectorPanelComponent } from '../inspector/flow-inspector-panel.component';
import { FlowHistoryTimelineComponent } from '../history/flow-history-timeline.component';

@Component({
  selector: 'flow-right-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NzFormModule, NzInputModule, NzSelectModule, FlowInspectorPanelComponent, FlowHistoryTimelineComponent],
  template: `
    <div class="right-panel" [class.drawer-mode]="mode==='drawer'">
      <flow-inspector-panel [mode]="mode" [selected]="selected" [selectedList]="selectedList" [selectedModel]="selectedModel"
        [inspectorTab]="inspectorTab" (inspectorTabChange)="inspectorTabChange.emit($event)" [editJson]="editJson"
        (editJsonChange)="editJsonChange.emit($event)" (openAdvanced)="openAdvanced.emit()" (delete)="delete.emit()" (openSingle)="openSingle.emit($event)" (deleteMany)="deleteMany.emit()"
        (saveJson)="saveJson.emit()"></flow-inspector-panel>
      <div class="inspector-meta" style="padding: 8px; overflow: auto;">
        <form nz-form nzLayout="vertical" class="meta-form">
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
                <button nz-button class="apple-btn icon-only" nzType="primary" type="button" (click)="run.emit()" title="Lancer" aria-label="Lancer">
                  <i class="fa-solid fa-play"></i>
                </button>
                <button nz-button class="apple-btn icon-only" type="button" (click)="stop.emit()" title="Stop" aria-label="Stop">
                  <i class="fa-solid fa-stop"></i>
                </button>
              </div>
              <div class="status mono" title="Dernier / En cours">
                <div>Dernier: {{ lastRun?.status || '—' }}</div>
                <div>En cours: {{ currentRun?.status || '—' }}</div>
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
                <button nz-button class="apple-btn icon-only" nzType="default" type="button" (click)="save.emit()" [disabled]="!canSave" title="Enregistrer" aria-label="Enregistrer">
                  <i class="fa-solid fa-floppy-disk"></i>
                </button>
              </div>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>En service</nz-form-label>
            <nz-form-control>
              <label class="enabled single-line">
                <input type="checkbox" [(ngModel)]="currentFlowEnabled" (ngModelChange)="metaChange.emit()" name="flowEnabledPanel" />
                <span>Activer ce flow</span>
              </label>
            </nz-form-control>
          </nz-form-item>
        </form>

        <flow-history-timeline [pastItems]="timelinePastItems" [futureItems]="timelineFutureItems"
          (hoverPast)="hoverPast.emit($event)" (hoverFuture)="hoverFuture.emit($event)"
          (leave)="leave.emit()" (clickPast)="clickPast.emit($event)"
          (clickFuture)="clickFuture.emit($event)"></flow-history-timeline>
      </div>
    </div>
  `,
})
export class FlowRightPanelComponent {
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
  @Input() canSave = false;
  @Output() run = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() metaChange = new EventEmitter<void>();

  // Timeline data + events
  @Input() timelinePastItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Input() timelineFutureItems: Array<{ key: string; time: string; type: string; message: string; color: string }> = [];
  @Output() hoverPast = new EventEmitter<number>();
  @Output() hoverFuture = new EventEmitter<number>();
  @Output() leave = new EventEmitter<void>();
  @Output() clickPast = new EventEmitter<number>();
  @Output() clickFuture = new EventEmitter<number>();
}

