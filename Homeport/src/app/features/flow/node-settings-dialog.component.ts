import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FlowAdvancedEditorDialogComponent } from './advanced-editor/flow-advanced-editor-dialog.component';

// Thin alias around the advanced editor dialog, exposing the same API
@Component({
  selector: 'flow-node-settings-dialog',
  standalone: true,
  imports: [CommonModule, FlowAdvancedEditorDialogComponent],
  template: `
    <flow-advanced-editor-dialog
      [flowId]="flowId"
      [model]="model"
      [disableForChecksum]="disableForChecksum"
      [hasPrev]="hasPrev"
      [loadingInput]="loadingInput"
      [loadingOutput]="loadingOutput"
      [testStatus]="testStatus"
      [testStartedAt]="testStartedAt"
      [testDurationMs]="testDurationMs"
      [attemptEvents]="attemptEvents"
      [attemptOptions]="attemptOptions"
      [selectedAttemptIdx]="selectedAttemptIdx"
      (selectedAttemptIdxChange)="selectedAttemptIdxChange.emit($event)"
      [testDisabled]="testDisabled"
      [ctx]="ctx"
      [injectedInput]="injectedInput"
      [injectedOutput]="injectedOutput"
      (injectedInputChange)="injectedInputChange.emit($event)"
      (requestUpdateArgs)="requestUpdateArgs.emit()"
      (modelChange)="modelChange.emit($event)"
      (modelChangeCommitted)="modelChangeCommitted.emit($event)"
      (test)="test.emit()"
      (runPrev)="runPrev.emit()"
      (startPayloadChange)="startPayloadChange.emit($event)"
      [simScenarios]="simScenarios"
      [simSelectedIndex]="simSelectedIndex"
      (simSelectedIndexChange)="simSelectedIndexChange.emit($event)"
      (reloadSimulation)="reloadSimulation.emit()"
      (close)="close.emit()"
    ></flow-advanced-editor-dialog>
  `
})
export class FlowNodeSettingsDialogComponent {
  @Input() flowId: string | null = null;
  @Input() model: any;
  @Input() disableForChecksum = false;
  @Input() hasPrev: boolean = false;
  @Input() loadingInput: boolean = false;
  @Input() loadingOutput: boolean = false;
  @Input() testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  @Input() testStartedAt: number | null = null;
  @Input() testDurationMs: number | null = null;
  @Input() attemptEvents: any[] = [];
  @Input() attemptOptions: Array<{ idx: number; exec: number; occur: number; label: string }> = [];
  @Input() selectedAttemptIdx: number | null = null;
  @Output() selectedAttemptIdxChange = new EventEmitter<number>();
  @Input() testDisabled: boolean = false;
  @Input() ctx: any = {};
  @Input() injectedInput: any = null;
  @Input() injectedOutput: any = null;
  @Output() injectedInputChange = new EventEmitter<any>();
  @Output() requestUpdateArgs = new EventEmitter<void>();
  @Output() modelChange = new EventEmitter<any>();
  @Output() modelChangeCommitted = new EventEmitter<any>();
  @Output() test = new EventEmitter<void>();
  @Output() runPrev = new EventEmitter<void>();
  @Output() startPayloadChange = new EventEmitter<any>();
  @Input() simScenarios: Array<{ id: string; index: number; label: string; msgIn: any }> | null = null;
  @Input() simSelectedIndex: number = 0;
  @Output() simSelectedIndexChange = new EventEmitter<number>();
  @Output() reloadSimulation = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}

