import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, ChangeDetectorRef, NgZone, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, Renderer2 } from '@angular/core';
import { FlowAdvancedCenterPanelComponent } from './advanced-editor/flow-advanced-center-panel.component';
import { JsonSchemaViewerV2Component } from '../../modules/json-schema-viewer/json-schema-viewer-v2';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { FlowViewerSettingsNodeComponent } from './flow-viewer-settings-node.component';
import { FlowPathHighlightService } from '../../services/flow-path-highlight.service';
import { LayoutBackendService } from '../../services/layout-backend.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'flow-node-settings-v2-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FlowAdvancedCenterPanelComponent, JsonSchemaViewerV2Component, DynamicForm, FlowViewerSettingsNodeComponent, NzSelectModule],
  template: `
    <div class="overlay" (click)="close.emit()"></div>
    <!-- Desktop/tablet layout -->
    <div class="dialog" *ngIf="!isMobile" (click)="$event.stopPropagation()" (dragover)="swallowDrag($event)" (drop)="swallowDrop($event)">
      <div class="header"></div>
      <div class="body">
        <!-- Left column: Scenario + View mode (top), then viewer -->
        <div class="col left" *ngIf="hasInput(model)">
          <div class="top-bar">
            <nz-select class="scenario-select" [ngModel]="simSelectedIndex" (ngModelChange)="onSelectScenario($event)" nzPlaceHolder="Scénario">
              <nz-option *ngFor="let sc of simScenarios; let i=index" [nzValue]="i"
                [nzLabel]="(sc?.label || ('Cas ' + (i+1))) + (sc?.match?.exec ? (' • Exécution' + (sc?.match?.handleLabel ? ' (' + (sc?.match?.handleLabel) + ')' : '')) : '')"></nz-option>
            </nz-select>
            <div class="seg">
              <button class="seg-btn" [class.active]="viewMode==='flow'" (click)="setView('flow')">Flow</button>
              <button class="seg-btn" [class.active]="viewMode==='json'" (click)="setView('json')">JSON</button>
            </div>
          </div>
          <div class="exec-times" *ngIf="isSelectedScenarioExec() && testStartedAt">
            <span>Début: {{ formatTime(testStartedAt!) }}</span>
            <span class="sep">—</span>
            <span>Fin: {{ formatTime((testStartedAt || 0) + (testDurationMs || 0)) }}</span>
          </div>
          <div *ngIf="loadingInput" class="loading">Chargement…</div>
          <!-- Simulation Flow view inside Input column -->
          <div class="sim-wrap" *ngIf="viewMode==='flow' && ((viewNodes?.length || 0) > 0)">
            <div class="viewer-box">
              <div class="loading" *ngIf="(!hadFirstLayout) || (isScenarioSwitching && layoutBusy)">Chargement…</div>
              <flow-viewer-settings-node [hidden]="(!hadFirstLayout) || (isScenarioSwitching && layoutBusy)" [centerRequest]="centerRequestTick"
                [nodes]="$any(viewNodes)" [edges]="$any(displayEdges)" [meta]="$any(simMeta)"
                [background]="$any('#EEF0F4')" [useStorage]="false" [showBottomBar]="true"
                [showRun]="false" [showSave]="false" [showCenterFlow]="true" [selectedNodeId]="model?.id" [autoFitOnInit]="false"
                [simOutputPreview]="$any(simOutputPreview)" [focusNodeIds]="$any(focusNodeIds)">
              </flow-viewer-settings-node>
            </div>
          </div>
          <!-- JSON Input view -->
          <div class="json-pad" *ngIf="viewMode==='json' && injectedInput != null && !isStart(model)">
            <app-json-schema-viewer-v2
              [data]="$any(inputForViewer || {})" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
            </app-json-schema-viewer-v2>
          </div>
        </div>

        <!-- Center column: Settings (args) -->
        <div class="col center" (pointerup)="onFormReleased()">
          <flow-advanced-center-panel [model]="model" [ctx]="mergedCtx" [flowId]="flowId" [bare]="true"
            [disabled]="disableForChecksum" [disableReason]="'Mise à jour du format requise'"
            (updateArgs)="requestUpdateArgs.emit()" (test)="test.emit()"
            (modelChange)="modelChange.emit($event)" (committed)="modelChangeCommitted.emit($event)" (submitted)="onFormSubmitted($event)"
            [testStatus]="testStatus" [testStartedAt]="testStartedAt" [testDurationMs]="testDurationMs" [testDisabled]="testDisabled"
            [attemptEvents]="attemptEvents" [attemptOptions]="attemptOptions" [selectedAttemptIdx]="selectedAttemptIdx"
            [simScenarios]="simScenarios" [simSelectedIndex]="simSelectedIndex"
            (selectedAttemptIdxChange)="selectedAttemptIdxChange.emit($event)">
          </flow-advanced-center-panel>
        </div>

        <!-- Right column: Output (unchanged) -->
        <div class="col right" *ngIf="hasOutput(model)">
          <div class="top-bar small">
            <span>Output</span>
            <span class="spacer"></span>
            <ng-container *ngIf="execScenarioIndex() as ei">
              <span class="badge real">Scénario Exec: {{ (ei || 0) + 1 }}</span>
            </ng-container>
            <span class="sep" *ngIf="testStartedAt">•</span>
            <span class="ts" *ngIf="testStartedAt as ts">{{ formatTime(ts) }}<ng-container *ngIf="testDurationMs as d"> • {{ formatDuration(d) }}</ng-container></span>
          </div>
          <div class="no-output" *ngIf="!isStart(model) && !isStartForm(model) && hasNoOutput()">
            Aucune exécution — pas d’output.
          </div>
          <div class="section-title">Output</div>
          <!-- Start Form: Dynamic Form in right column -->
          <app-dynamic-form *ngIf="isStartForm(model)"
            [schema]="debugRightSchema()"
            [value]="injectedOutput || {}"
            (valueChange)="startPayloadChange.emit($event)"></app-dynamic-form>
          <!-- Start simple: JSON payload editable -->
          <div class="json-pad" *ngIf="isStart(model) && !isStartForm(model)">
            <app-json-schema-viewer-v2
              [data]="injectedOutput || {}" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
            </app-json-schema-viewer-v2>
          </div>
          <!-- Other nodes: output viewer readonly -->
          <div class="json-pad" *ngIf="!isStart(model) && !isStartForm(model) && injectedOutput != null">
            <app-json-schema-viewer-v2
              [data]="injectedOutput || {}" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
            </app-json-schema-viewer-v2>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile layout with carousel/swipe -->
    <div class="m-shell" *ngIf="isMobile" (click)="close.emit()">
      <div class="m-dialog enter" (click)="$event.stopPropagation()">
        <div class="m-body" #carRef (touchstart)="onSwipeStart($event)" (touchmove)="onSwipeMove($event)" (touchend)="onSwipeEnd()">
          <div class="edge-sensor left"
               (touchstart)="onEdgeStart($event, 'left')"
               (dragenter)="onEdgeDragEnter($event, 'left')"
               (dragover)="onEdgeDragOver($event, 'left')"
               (dragleave)="onEdgeDragLeave($event)"
               (drop)="onEdgeDragLeave($event)"></div>
          <div class="edge-sensor right"
               (touchstart)="onEdgeStart($event, 'right')"
               (dragenter)="onEdgeDragEnter($event, 'right')"
               (dragover)="onEdgeDragOver($event, 'right')"
               (dragleave)="onEdgeDragLeave($event)"
               (drop)="onEdgeDragLeave($event)"></div>
          <div class="slides" #slidesRef [style.transform]="slidesTransform" [class.dragging]="dragging">
            <!-- Input slide -->
            <div class="slide">
              <div class="scroll">
                <div class="top-bar">
                  <nz-select class="scenario-select" [ngModel]="simSelectedIndex" (ngModelChange)="onSelectScenario($event)" nzPlaceHolder="Scénario">
                    <nz-option *ngFor="let sc of simScenarios; let i=index" [nzValue]="i" [nzLabel]="(sc?.label || ('Cas ' + (i+1))) + (sc?.match?.exec ? (' • Exécution' + (sc?.match?.handleLabel ? ' (' + (sc?.match?.handleLabel) + ')' : '')) : '')"></nz-option>
                  </nz-select>
                  <div class="seg">
                    <button class="seg-btn" [class.active]="viewMode==='flow'" (click)="setView('flow')">Flow</button>
                    <button class="seg-btn" [class.active]="viewMode==='json'" (click)="setView('json')">JSON</button>
                  </div>
                </div>
                <div class="exec-times" *ngIf="isSelectedScenarioExec() && testStartedAt">
                  <span>Début: {{ formatTime(testStartedAt!) }}</span>
                  <span class="sep">—</span>
                  <span>Fin: {{ formatTime((testStartedAt || 0) + (testDurationMs || 0)) }}</span>
                </div>
                <div *ngIf="loadingInput" class="loading-box"><span class="tiny-spinner"></span> Chargement…</div>
                <div class="sim-wrap" *ngIf="viewMode==='flow' && ((viewNodes?.length || 0) > 0)">
                  <div class="viewer-box">
                    <div class="loading" *ngIf="(!hadFirstLayout) || (isScenarioSwitching && layoutBusy)">Chargement…</div>
                    <flow-viewer-settings-node [hidden]="(!hadFirstLayout) || (isScenarioSwitching && layoutBusy)" [centerRequest]="centerRequestTick"
                      [nodes]="$any(viewNodes)" [edges]="$any(displayEdges)" [meta]="$any(simMeta)"
                      [background]="$any('#EEF0F4')" [useStorage]="false" [showBottomBar]="true"
                      [showRun]="false" [showSave]="false" [showCenterFlow]="true" [selectedNodeId]="model?.id" [autoFitOnInit]="false"
                      [simOutputPreview]="$any(simOutputPreview)" [focusNodeIds]="$any(focusNodeIds)">
                    </flow-viewer-settings-node>
                  </div>
                </div>
                <div class="json-pad" *ngIf="viewMode==='json' && injectedInput != null && !isStart(model)">
                  <app-json-schema-viewer-v2
                    [data]="$any(inputForViewer || {})" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
                  </app-json-schema-viewer-v2>
                </div>
              </div>
            </div>
            <!-- Center slide -->
            <div class="slide center">
              <div class="scroll" (pointerup)="onFormReleased()">
                <flow-advanced-center-panel [model]="model" [ctx]="mergedCtx" [flowId]="flowId" [bare]="true"
                  [disabled]="disableForChecksum" [disableReason]="'Mise à jour du format requise'"
                  (updateArgs)="requestUpdateArgs.emit()" (test)="test.emit()"
                  (modelChange)="modelChange.emit($event)" (committed)="modelChangeCommitted.emit($event)" (submitted)="onFormSubmitted($event)"
                  [testStatus]="testStatus" [testStartedAt]="testStartedAt" [testDurationMs]="testDurationMs" [testDisabled]="testDisabled"
                  [attemptEvents]="attemptEvents" [attemptOptions]="attemptOptions" [selectedAttemptIdx]="selectedAttemptIdx"
                  [simScenarios]="simScenarios" [simSelectedIndex]="simSelectedIndex"
                  (selectedAttemptIdxChange)="selectedAttemptIdxChange.emit($event)">
                </flow-advanced-center-panel>
              </div>
            </div>
            <!-- Output slide -->
            <div class="slide">
              <div class="scroll">
                <div class="top-bar small">
                  <span>Output</span>
                  <span class="spacer"></span>
                  <ng-container *ngIf="execScenarioIndex() as ei">
                    <span class="badge real">Scénario Exec: {{ (ei || 0) + 1 }}</span>
                  </ng-container>
                </div>
                <div class="no-output" *ngIf="!isStart(model) && !isStartForm(model) && hasNoOutput()">
                  Aucune exécution — pas d’output.
                </div>
                <app-dynamic-form *ngIf="isStartForm(model)"
                  [schema]="debugRightSchema()" [value]="injectedOutput || {}"
                  (valueChange)="startPayloadChange.emit($event)"></app-dynamic-form>
                <div class="json-pad" *ngIf="isStart(model) && !isStartForm(model)">
                  <app-json-schema-viewer-v2
                    [data]="injectedOutput || {}" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
                  </app-json-schema-viewer-v2>
                </div>
                <div class="json-pad" *ngIf="!isStart(model) && !isStartForm(model) && injectedOutput != null">
                  <app-json-schema-viewer-v2
                    [data]="injectedOutput || {}" [labels]="labelsMap" [nodeNames]="nodeNamesMap" [nodeMeta]="nodeMetaMap" [order]="null">
                  </app-json-schema-viewer-v2>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="m-footer">
          <div class="dots" role="tablist" aria-label="Panneaux">
            <button class="dot" *ngFor="let p of panels; let i = index" [class.active]="activeIndex===i" (click)="go(i)" [attr.aria-selected]="activeIndex===i" [attr.aria-label]="p"></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 100000; display:block; }
    .overlay { position:absolute; inset:0; background: rgba(17,17,17,0.32); }
    .dialog { position:absolute; inset: 2.5vh 2.5vw; background:#fff; border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.12); display:flex; flex-direction: column; overflow:hidden; }
    .header { display:none; }
    .title { font-weight: 600; }
    .close { margin-left:auto; border:1px solid #e5e7eb; background:#fff; border-radius: 10px; width: 32px; height: 28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .body { flex:1 1 auto; min-height:0; display:grid; grid-template-columns: 1fr minmax(480px, 1.2fr) 1fr; gap: 12px; padding: 0; overflow:hidden; }
    .col { min-height:0; overflow-y:auto; border-radius: 10px; padding: 0; display:flex; flex-direction:column; gap:8px; }
    .col.center { overflow: hidden; display:flex; flex-direction:column; min-height:0; }
    .col.center > flow-advanced-center-panel { flex: 1 1 auto; min-height: 0; display:block; }
    .col.left, .col.right { overflow-x: auto; }
   
    /* center: pas d'overflow horizontal (visible par défaut) */
    .section-title { display:none; }
    .top-bar { display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:nowrap; white-space:nowrap; padding: 12px 8px 0 8px; }
    /* Input (col gauche): padding-left plus grand */
    .col.left .top-bar { padding-left: 20px; }
    /* Match credentials select sizing: fill remaining space, allow ellipsis */
    .left-actions { display:flex; align-items:center; }
    .scenario-select { flex: 1 1 auto; min-width: 0; }
    .seg { display:inline-flex; background:#fff; border:1px solid #e5e7eb; border-radius: 10px; padding:2px; flex: 0 0 auto; }
    .seg .seg-btn { border:none; background:transparent; border-radius:8px; padding:4px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; }
    .seg .seg-btn.active { background:#F8FBFF; border:1px solid #DBEAFE; }
    .sim-wrap { display:flex; flex-direction:column; gap:8px; min-height:0; flex:1 1 auto; }
    .viewer-box { flex: 1 1 auto; min-height: 0; display:block; position:relative; }
    .viewer-box .loading { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; color:#6b7280; background: rgba(255,255,255,0.6); z-index: 2; }
    .viewer-box flow-viewer-settings-node { display:block; height:100%; }
    :host ::ng-deep flow-viewer { height: 100%; display:block; }
    .sc-list { display:flex; flex-wrap: wrap; gap:4px; }
    .sc-list.compact { gap:4px; margin-top:-2px; }
    .sc-item { border:1px solid #e5e7eb; background:#fff; border-radius: 9px; padding:2px 6px; font-size:11px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; max-width: 100%; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sc-item.active, .sc-item:hover { background:#F8FBFF; border-color:#DBEAFE; }
    .sc-item .dot { width:6px; height:6px; border-radius:50%; background:#1677ff; display:inline-block; }
    .badge.real { color:#0a7; border:1px solid #bfe; background:#eff; border-radius: 8px; padding: 0 6px; font-size:11px; }
    .exec-info { padding: 0 8px 6px 8px; font-size: 12px; color:#6b7280; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .exec-info .sep { color:#9ca3af; }
    /* Output (col droite): padding top plus grand */
    .top-bar.small { padding-top: 12px; padding-bottom: 0; font-size:12px; color:#6b7280; display:flex; align-items:center; gap:6px; }
    .top-bar .spacer { flex:1 1 auto; }
    .no-output { padding: 8px; color:#6b7280; font-size:12px; }
    .json-pad { padding: 0 16px 12px; }
    .exec-times { padding: 0 8px 6px 8px; font-size:12px; color:#6b7280; }
    .col.left .exec-times { padding-left: 20px; }
    .exec-times .sep { color:#9ca3af; padding: 0 6px; }

    /* Mobile single-panel shell */
    .m-shell { position: fixed; inset:0; z-index: 100001; display:flex; align-items:center; justify-content:center; }
    .m-dialog { position:relative; width: min(92vw, 520px); height: min(88vh, 720px); background:#fff; border:1px solid rgba(0,0,0,0.06); border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.06); display:flex; flex-direction: column; overflow:hidden; }
    .m-body { position:relative; flex:1 1 auto; min-height:0; overflow:hidden; touch-action: pan-y; -webkit-overflow-scrolling: touch; background:#fff; padding-top: env(safe-area-inset-top); }
    .m-footer { display:flex; align-items:center; justify-content:center; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)) 12px; border-top:0; background:#fff; }
    .dots { display:flex; gap:8px; }
    .dot { width:8px; height:8px; border-radius:50%; border:0; background:#d4d4d8; padding:0; cursor:pointer; }
    .dot.active { background:#111827; }
    .loading-box { display:flex; align-items:center; gap:8px; border:1px dashed #d1d5db; background:#f9fafb; color:#374151; border-radius:8px; padding:6px 8px; margin-bottom:8px; font-size:12px; }
    .tiny-spinner { width:14px; height:14px; border:2px solid #e5e7eb; border-top-color:#111827; border-radius:50%; display:inline-block; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .edge-sensor { position:absolute; top:0; bottom:0; width:24px; z-index:3; }
    .edge-sensor.left { left:0; }
    .edge-sensor.right { right:0; }
    .slides { position:absolute; inset:0; display:flex; width:300%; height:100%; transition: transform .28s ease; will-change: transform; }
    .slides.dragging { transition: none; }
    .slide { width:33.3333%; height:100%; overflow:hidden; }
    .scroll { height:100%; overflow:auto; -webkit-overflow-scrolling: touch; padding: 10px; display:flex; flex-direction: column; }
    .slide.center .scroll { padding: 0; }
  `]
})
export class FlowNodeSettingsV2DialogComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  @Input() flowId: string | null = null;
  @Input() model: any;
  @Input() nodes: Array<{ id: string; data?: any, point?: { x:number; y:number } }>|null = null;
  @Input() edges: Array<any>|null = null;
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
  @Input() simScenarios: Array<{ id: string; index: number; label: string; msgIn: any; match?: { exec?: boolean; handleId?: string; handleLabel?: string } }> | null = null;
  @Input() simSelectedIndex: number = 0;
  @Output() simSelectedIndexChange = new EventEmitter<number>();
  @Output() reloadSimulation = new EventEmitter<void>();
  @Output() requestLoadAttempts = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  labelsMap: Record<string, { label?: string; description?: string }> = {};
  nodeNamesMap: Record<string, string> = {};
  nodeMetaMap: Record<string, { name?: string; templateTitle?: string }> = {};
  // Simulation view state
  viewMode: 'flow'|'json' = 'flow';
  // Local scenario ctx and merged ctx for the Dynamic Form
  private scenarioMsgIn: any = null;
  mergedCtx: any = {};
  private simRequested = false;
  private attemptsRequested = false;
  displayEdges: any[] = [];
  viewNodes: any[] = [];
  layoutBusy = false;
  layoutReady = false;
  hadFirstLayout = false;
  isScenarioSwitching = false;
  // Center once after first layout completes
  centerRequestTick = 0;
  private centeredOnFirstLayout = false;
  simOutputPreview: { [nodeId: string]: Array<{ id: string; name: string; type: string }> } = {};
  simMeta: any = { ui: { portOrientation: 'vertical' } };
  focusNodeIds: string[] = [];
  realScenarioIndex: number | null = null;
  mergedScenarioJson: any = null;
  // Snapshot at open to decouple from live graph mutations
  baseNodes: any[] = [];
  baseEdges: any[] = [];
  private initialized = false;
  private userChangedScenario = false;
  // Cached input data for JSON viewer to avoid re-creating objects every CD
  inputForViewer: any = {};
  private lastInputScenRef: any = null;
  private lastInputExecRef: any = null;
  private lastInputIsExec: boolean | null = null;

  // Mobile carousel state
  @ViewChild('carRef') private carRef?: ElementRef<HTMLElement>;
  @ViewChild('slidesRef') private slidesRef?: ElementRef<HTMLElement>;
  isMobile = false;
  activeIndex = 1; // 0: Input, 1: Center, 2: Output
  panels = ['Input','Center','Output'];
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeDx = 0;
  private swipeDy = 0;
  private swipeActive = false;
  private fromInteractive = false;
  dragging = false;
  slidesTransform = 'translateX(-33.3333%)';
  private swipeStartTime = 0;
  private horizLocked = false;
  private ignoreSwipe = false;
  private edgeOnly = false;
  private swipeFromEdge: 'left'|'right'|null = null;
  private initialViewSet = false;
  private dragEdgeActive: 'left'|'right'|null = null;
  private dragEdgeTimer: any = null;
  private dragEdgeInitialDelay = 650; // ms avant le premier swipe auto
  private dragEdgeRepeatDelay = 950;  // ms entre chaque swipe auto pendant le drag

  constructor(private pathSvc: FlowPathHighlightService, private layoutApi: LayoutBackendService, private cdr: ChangeDetectorRef, private zone: NgZone, private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit() {
    this.updateIsMobile();
    this.updateSlidesTransform();
    if (this.isMobile && !this.initialViewSet) { this.viewMode = 'json'; this.initialViewSet = true; }
  }
  ngAfterViewInit() {
    // Aligner le comportement iOS/Safari avec V1: porter l'hôte dans <body> pour éviter les contextes d'overflow/stacking
    try { this.renderer.addClass(this.el.nativeElement, 'advanced-dialog-portal'); this.renderer.appendChild(document.body, this.el.nativeElement); } catch {}
  }
  ngOnDestroy() { try { this.renderer.removeClass(this.el.nativeElement, 'advanced-dialog-portal'); } catch {} }

  setView(v: 'flow'|'json') { this.viewMode = v; this.refreshScenarioView(); }
  hasNoOutput(): boolean {
    try {
      const v = this.injectedOutput;
      if (v == null) return true;
      if (typeof v === 'object') return Object.keys(v || {}).length === 0;
      return false;
    } catch { return false; }
  }
  formatTime(tsMs: number): string { try { const d = new Date(tsMs); return d.toLocaleString(); } catch { return ''; } }
  formatDuration(ms: number): string {
    try {
      if (!Number.isFinite(ms)) return '';
      if (ms < 1000) return ms.toFixed(0) + ' ms';
      const s = ms / 1000; if (s < 60) return s.toFixed(1) + ' s';
      const m = Math.floor(s / 60); const rem = Math.round(s % 60);
      return m + ' min ' + rem + ' s';
    } catch { return ''; }
  }
  execScenarioIndex(): number | null {
    try {
      const arr = Array.isArray(this.simScenarios) ? this.simScenarios : [];
      const idx = arr.findIndex((sc: any) => !!(sc && (sc.match?.exec === true || sc.isExec === true)));
      return idx >= 0 ? idx : null;
    } catch { return null; }
  }
  isSelectedScenarioExec(): boolean {
    try {
      const sc = Array.isArray(this.simScenarios) ? this.simScenarios[this.simSelectedIndex] : null;
      return !!(sc && (sc as any).match?.exec === true);
    } catch { return false; }
  }
  inputDataForViewer(): any {
    try {
      // Base: scenario msgIn (local), fallback to injectedInput
      const scen = (this.scenarioMsgIn && typeof this.scenarioMsgIn === 'object') ? this.scenarioMsgIn : (this.injectedInput || {});
      if (this.isSelectedScenarioExec()) {
        const exec = (this.ctx && typeof this.ctx === 'object') ? this.ctx : {};
        return { ...scen, ...exec };
      }
      return scen || {};
    } catch { return this.injectedInput || {}; }
  }
  onSelectScenario(i: any) {
    const idx = Number(i || 0);
    this.simSelectedIndex = idx;
    this.simSelectedIndexChange.emit(idx);
    this.isScenarioSwitching = true;
    this.userChangedScenario = true;
    try {
      console.log('[settings-v2][scenario] select', { index: idx });
      this.cdr.detectChanges();
    } catch {}
    try {
      const sc: any = (Array.isArray(this.simScenarios) ? this.simScenarios![idx] : null);
      if (sc && sc.msgIn != null) {
        // Update local scenario ctx; la fusion est conditionnelle (si sc.match.exec)
        this.scenarioMsgIn = sc.msgIn;
        this.recomputeMergedCtx();
        try { console.log('[settings-v2][scenario] msgIn keys', Object.keys(sc.msgIn || {})); } catch {}
        try { console.log('[settings-v2][scenario] match flags', { idx, match: sc?.match }); } catch {}
        this.injectedInputChange.emit(sc.msgIn);
      }
    } catch {}
    this.refreshScenarioView();
  }
  swallowDrag(ev: DragEvent) { try { ev.preventDefault(); ev.stopPropagation(); } catch {} }
  swallowDrop(ev: DragEvent) { try { ev.preventDefault(); ev.stopPropagation(); } catch {} }

  onFormSubmitted(m: any) {
    try { this.modelChange.emit(m || this.model); } catch {}
    try { this.modelChangeCommitted.emit(m || this.model); } catch {}
    this.close.emit();
  }
  onFormReleased() {
    // V2 keeps same behavior: commit on pointer up
    try { this.modelChangeCommitted.emit(this.model); } catch {}
  }

  // Responsive helpers
  private updateIsMobile() { try { this.isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false; } catch { this.isMobile = false; } }
  private updateSlidesTransform() { const basePct = this.activeIndex * (100/3); this.slidesTransform = `translateX(-${basePct}%)`; }
  prev() { if (this.activeIndex > 0) { this.activeIndex--; this.updateSlidesTransform(); } }
  next() { if (this.activeIndex < this.panels.length - 1) { this.activeIndex++; this.updateSlidesTransform(); } }
  go(i: number) { if (i>=0 && i < this.panels.length) { this.activeIndex = i; this.updateSlidesTransform(); } }

  // Touch swipe handlers (mobile)
  onEdgeStart(ev: TouchEvent, side: 'left'|'right') { this.swipeFromEdge = side; this.onSwipeStart(ev); }
  onSwipeStart(ev: TouchEvent) {
    if (!this.isMobile) return;
    const t = ev.touches && ev.touches[0]; if (!t) return;
    const target = (ev.target as HTMLElement) || null;
    const isInteractive = (el: HTMLElement | null): boolean => {
      let n: HTMLElement | null = el; let depth = 0;
      while (n && depth < 8) {
        const tag = (n.tagName || '').toLowerCase();
        const editable = (n as any).isContentEditable === true;
        const tabIndex = (n as any).tabIndex;
        if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button' || editable) return true;
        if (typeof tabIndex === 'number' && tabIndex >= 0) return true;
        const cls = n.className ? String(n.className) : '';
        if (/ant-(select|picker|switch|radio|checkbox|btn|input|textarea|form|cascader|tree|mentions)/.test(cls)) return true;
        if (/(nz-|app-)(select|input|switch|radio|checkbox|button|dynamic-form)/.test(cls)) return true;
        n = n.parentElement; depth++;
      }
      return false;
    };
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const nearLeft = t.clientX <= 28;
    const nearRight = (W - t.clientX) <= 28;
    const startAtEdge = nearLeft || nearRight || !!this.swipeFromEdge;
    this.fromInteractive = isInteractive(target);
    // Détecter le swipe sur toute la zone: ne pas ignorer si interaction; on récupère le geste après lock horizontal
    this.ignoreSwipe = (this.edgeOnly && !startAtEdge);
    if (this.ignoreSwipe) { this.dragging = false; this.swipeActive = false; return; }
    this.swipeStartX = t.clientX; this.swipeStartY = t.clientY; this.swipeDx = 0; this.swipeDy = 0; this.swipeActive = true; this.dragging = true; this.horizLocked = false; this.swipeStartTime = Date.now();
  }
  onSwipeMove(ev: TouchEvent) {
    if (!this.isMobile || !this.swipeActive || this.ignoreSwipe) return;
    const t = ev.touches && ev.touches[0]; if (!t) return;
    this.swipeDx = t.clientX - this.swipeStartX; this.swipeDy = t.clientY - this.swipeStartY;
    const absX = Math.abs(this.swipeDx); const absY = Math.abs(this.swipeDy);
    if (!this.horizLocked) { if (absX > 6 && absX > absY + 4) { this.horizLocked = true; } else { return; } }
    try { ev.preventDefault(); } catch {}
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const basePct = this.activeIndex * (100/3);
    let dragPct = (this.swipeDx / (3 * W)) * 100;
    const atFirst = this.activeIndex === 0 && this.swipeDx > 0;
    const atLast = this.activeIndex === this.panels.length - 1 && this.swipeDx < 0;
    if (atFirst || atLast) dragPct = dragPct * 0.5;
    const pct = basePct - dragPct;
    this.slidesTransform = `translateX(-${pct}%)`;
  }
  onSwipeEnd() {
    if (!this.isMobile || !this.swipeActive) { this.dragging = false; this.ignoreSwipe = false; this.fromInteractive = false; return; }
    const absX = Math.abs(this.swipeDx); const absY = Math.abs(this.swipeDy);
    const dt = Math.max(1, Date.now() - this.swipeStartTime);
    const vx = absX / dt;
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const ratio = absX / W;
    const goNext = (this.swipeDx < 0);
    const canPrev = this.activeIndex > 0;
    const canNext = this.activeIndex < this.panels.length - 1;
    const flick = vx > 0.5;
    // Choisir le panneau le plus engagé: seuil 50% d'un slide
    const byProgress = ratio >= 0.5;
    // Fermer si overscroll bord avec geste suffisant
    if ((goNext && !canNext && (flick || byProgress)) || (!goNext && !canPrev && (flick || byProgress))) {
      this.close.emit();
      this.swipeActive = false; this.dragging = false; this.horizLocked = false; this.fromInteractive = false; this.swipeFromEdge = null;
      return;
    }
    if (absY < 80 && (flick || byProgress)) {
      if (goNext && canNext) this.activeIndex++;
      else if (!goNext && canPrev) this.activeIndex--;
    }
    this.updateSlidesTransform();
    this.swipeActive = false; this.dragging = false; this.horizLocked = false; this.ignoreSwipe = false; this.fromInteractive = false; this.swipeFromEdge = null;
  }

  // Drag auto-swipe at edges (for JSON viewer DnD on mobile)
  onEdgeDragEnter(ev: DragEvent, side: 'left'|'right') {
    try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    this.dragEdgeActive = side;
    this.ensureDragEdgeTimer();
  }
  onEdgeDragOver(ev: DragEvent, side: 'left'|'right') {
    try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    this.dragEdgeActive = side;
    this.ensureDragEdgeTimer();
  }
  onEdgeDragLeave(ev: DragEvent) {
    try { ev.preventDefault(); ev.stopPropagation(); } catch {}
    this.dragEdgeActive = null;
    if (this.dragEdgeTimer) { clearTimeout(this.dragEdgeTimer); this.dragEdgeTimer = null; }
  }
  private ensureDragEdgeTimer() {
    if (this.dragEdgeTimer || !this.dragEdgeActive) return;
    const tick = () => {
      if (!this.dragEdgeActive) { this.dragEdgeTimer = null; return; }
      const dir = this.dragEdgeActive;
      const target = dir === 'left' ? Math.max(0, this.activeIndex - 1) : Math.min(this.panels.length - 1, this.activeIndex + 1);
      this.animateToIndex(target);
      // continuer tant qu'on reste sur le bord
      this.dragEdgeTimer = setTimeout(tick, this.dragEdgeRepeatDelay);
    };
    this.dragEdgeTimer = setTimeout(() => {
      // Premier pas après un petit délai pour laisser le temps de se caler
      tick();
    }, this.dragEdgeInitialDelay);
  }

  private animateToIndex(target: number) {
    if (target === this.activeIndex) return;
    // Assurer que la transition est active (pas de mode dragging)
    this.dragging = false;
    try { this.cdr.detectChanges(); } catch {}
    const el = this.slidesRef?.nativeElement as HTMLElement | undefined;
    // Forcer un reflow pour que le navigateur prenne en compte la transition
    try { if (el) { void el.offsetHeight; } } catch {}
    // Appliquer le changement sur la frame suivante pour déclencher l'animation
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.zone.run(() => {
          this.activeIndex = target;
          this.updateSlidesTransform();
          try { this.cdr.detectChanges(); } catch {}
        });
      });
    });
  }

  hasInput(model: any): boolean {
    try {
      const t = String(model?.templateObj?.type || '').toLowerCase();
      return !(t === 'start' || t === 'start_form' || t === 'event' || t === 'endpoint');
    } catch { return false; }
  }
  hasOutput(model: any): boolean { try { return !!model && model.templateObj?.type !== 'end'; } catch { return false; } }
  isStart(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start'; } catch { return false; } }
  isStartForm(m: any): boolean { try { const t = String(m?.templateObj?.type || '').toLowerCase(); return t === 'start_form'; } catch { return false; } }
  debugRightSchema(): any {
    try { return (this.model?.startFormSchema || this.model?.templateObj?.args) || { title: 'Formulaire', fields: [] }; }
    catch { return { title: 'Formulaire', fields: [] }; }
  }

  ngOnChanges(changes?: SimpleChanges) {
    try {
      if (!changes) return;
      // If no scenarios yet and parent can fetch, request them once
      try {
        const hasPrev = this.hasPrev; const canReq = !this.simRequested && (!Array.isArray(this.simScenarios) || this.simScenarios.length === 0);
        if (canReq && hasPrev) { this.simRequested = true; this.reloadSimulation.emit(); }
      } catch {}
      // If scenarios exist but no attempt events yet, ask parent to load attempts from backend (once)
      try {
        const hasSc = Array.isArray(this.simScenarios) && this.simScenarios.length > 0;
        const hasNoAtt = !Array.isArray(this.attemptEvents) || this.attemptEvents.length === 0;
        if (hasSc && hasNoAtt && !this.attemptsRequested) { this.attemptsRequested = true; this.requestLoadAttempts.emit(); }
      } catch {}
      // Logs for scenarios + match info
      try {
        if (Array.isArray(this.simScenarios)) {
          console.log('[settings-v2] ngOnChanges scenarios', this.simScenarios.map((s:any,i:number)=>({ i, label: s?.label, exec: !!s?.match?.exec, handle: s?.match?.handleLabel })));
        }
        console.log('[settings-v2] ngOnChanges selected', { simSelectedIndex: this.simSelectedIndex });
      } catch {}
      // Garder mergedCtx en phase: MERGE UNIQUEMENT si le scénario sélectionné est marqué exec par le backend
      this.recomputeMergedCtx();
      // On first pass, snapshot nodes/edges and initialize
      if (!this.initialized && (this.nodes || this.edges)) {
        this.baseNodes = (this.nodes || []).map((n: any) => ({ ...n, point: n?.point ? { x: n.point.x, y: n.point.y } : undefined }));
        this.baseEdges = (this.edges || []).map((e: any) => ({ ...e }));
        this.rebuildLabelMaps();
        this.refreshScenarioView();
        this.initialized = true;
        return;
      }
      // After init: only react to scenario selection/data changes
      if (changes['simScenarios'] || changes['simSelectedIndex']) {
        try { console.log('[settings-v2] ngOnChanges', { simScenarios: Array.isArray(this.simScenarios) ? this.simScenarios.length : null, simSelectedIndex: this.simSelectedIndex }); } catch {}
        this.refreshScenarioView();
      }
    } catch {}
  }

  private rebuildLabelMaps() {
    const labels: Record<string, { label?: string; description?: string }> = {};
    const nodeNames: Record<string, string> = {};
    try {
      const arr = Array.isArray(this.nodes) ? this.nodes! : [];
      for (const n of arr) {
        const id = String((n as any)?.id || (n as any)?.data?.model?.id || (n as any)?.data?.id || '');
        if (!id) continue;
        const model = (n as any)?.data?.model || (n as any)?.data || {};
        const template = model?.templateObj || {};
        const name = model?.name || template?.title || template?.name || id;
        nodeNames[id] = String(name);
        const tplTitle = template?.title || template?.name || '';
        this.nodeMetaMap[id] = { name: String(name), templateTitle: String(tplTitle || '') };
        // Collect output schemas from template
        let outSchemas = (template?.outputSchemas && typeof template.outputSchemas === 'object') ? template.outputSchemas : {} as any;
        if ((!outSchemas || !Object.keys(outSchemas).length) && Array.isArray(template?.outputHandles)) {
          try {
            const oh = template.outputHandles as any[];
            const acc: any = {};
            for (const h of oh) { const hid = String(h?.id || 'out'); if (h?.schema) acc[hid] = h.schema; }
            outSchemas = acc;
          } catch {}
        }
        // Merge args for start_form (payload keys)
        const isStartForm = String(template?.type || '').toLowerCase() === 'start_form';
        const startSchema = isStartForm ? (model?.startFormSchema || template?.args || null) : null;
        // Flatten schemas into labels with full path "nodeId.path"
        const addFields = (baseId: string, schema: any, basePath?: string) => {
          try {
            if (!schema) return;
            const fields = (schema.fields || []) as any[];
            for (const f of fields) {
              if (!f) continue;
              const key = (f.key || f.id || '').toString();
              if (!key) { if (f.type === 'section' || f.type === 'section_array') { addFields(baseId, { fields: f.fields || [] }, basePath); } continue; }
              const full = basePath ? `${basePath}.${key}` : `${baseId}.${key}`;
              labels[full] = { label: f.title || f.label || key, description: f.description || f.help || '' };
              // Recurse into section/section_array
              if (f.type === 'section' || f.type === 'section_array' || f.mode === 'array') {
                addFields(baseId, { fields: f.fields || [] }, `${baseId}.${key}`);
              }
            }
          } catch {}
        };
        // For each output handle schema, flatten
        try {
          const handles = Object.keys(outSchemas || {});
          for (const hid of handles) addFields(id, outSchemas[hid], `${id}`);
        } catch {}
        // Start_form payload fields
        if (startSchema) addFields(id, startSchema, `${id}`);
      }
    } catch {}
    this.labelsMap = labels;
    this.nodeNamesMap = nodeNames;
  }

  private refreshScenarioView() {
    try {
      try { console.log('[settings-v2] refreshScenarioView start', { simIdx: this.simSelectedIndex, scenarios: (this.simScenarios||[]).length }); } catch {}
      // Ensure snapshots exist (first-time fallback)
      try {
        if ((!this.baseNodes || this.baseNodes.length === 0) && Array.isArray(this.nodes) && this.nodes.length) {
          this.baseNodes = (this.nodes || []).map((n: any) => ({ ...n, point: n?.point ? { x: n.point.x, y: n.point.y } : undefined }));
        }
        if ((!this.baseEdges || this.baseEdges.length === 0) && Array.isArray(this.edges) && this.edges.length) {
          this.baseEdges = (this.edges || []).map((e: any) => ({ ...e }));
        }
      } catch {}
      // Reset defaults from snapshots to avoid reacting to live builder edits
      this.displayEdges = (this.baseEdges || []).map((e: any) => ({ ...e }));
      // Clone nodes for local layout without mutating builder graph
      this.viewNodes = (this.baseNodes || []).map((n: any) => ({ ...n, point: n?.point ? { x: n.point.x, y: n.point.y } : undefined }));
      this.simOutputPreview = {};
      this.focusNodeIds = [];
      this.zone.run(() => {
        this.layoutBusy = true;
        this.layoutReady = false;
        try { this.cdr.detectChanges(); } catch {}
      });
      // Laisser le backend marquer le scénario correspondant (sc.match.exec=true) — aucune détection frontend
      this.realScenarioIndex = null;
      try {
        if (Array.isArray(this.simScenarios) && !this.userChangedScenario) {
          const idx = this.simScenarios.findIndex((sc: any) => !!(sc && (sc.match?.exec === true || sc.isExec === true)));
          if (idx >= 0 && idx !== this.simSelectedIndex) {
            this.simSelectedIndex = idx;
            this.simSelectedIndexChange.emit(this.simSelectedIndex);
            this.isScenarioSwitching = true;
            try { console.log('[settings-v2] auto-select exec scenario', { idx }); this.cdr.detectChanges(); } catch {}
          }
        }
      } catch {}
      const sc: any = (Array.isArray(this.simScenarios) ? this.simScenarios![this.simSelectedIndex] : null);
      try { console.log('[settings-v2] selected scenario match', { idx: this.simSelectedIndex, match: sc?.match }); } catch {}
      if (sc && sc.path && Array.isArray(sc.path.edges)) {
        const key = (e: any) => `${String(e.source || e.from)}|${String(e.target || e.to)}|${String(e.sourceHandle || '')}`;
        const wanted = new Set(sc.path.edges.map((it: any) => `${String(it.sourceId)}|${String(it.targetId)}|${String(it.sourceHandle || '')}`));
        this.displayEdges = (this.baseEdges || []).map((e: any) => wanted.has(key(e)) ? ({ ...e, data: { ...(e as any).data, color: '#1677ff', strokeWidth: 2, onPath: true } }) : ({ ...e, data: { ...(e as any).data, onPath: false } }));
        const nidSet = new Set<string>(); for (const it of sc.path.edges) { nidSet.add(String(it.sourceId)); nidSet.add(String(it.targetId)); }
        this.focusNodeIds = Array.from(nidSet.values());
      }
      // Emit scenario msgIn to update ctx for Dynamic Form expressions
      try {
        if (sc && sc.msgIn != null) {
          // Keep local scenario ctx; la fusion avec l'exécution est conditionnelle (si sc.match.exec === true)
          this.scenarioMsgIn = sc.msgIn;
          this.recomputeMergedCtx();
          console.log('[settings-v2] refreshScenarioView emit injectedInputChange', { idx: this.simSelectedIndex, keys: Object.keys(sc.msgIn || {}) });
          this.injectedInputChange.emit(sc.msgIn);
        } else {
          console.log('[settings-v2] refreshScenarioView no msgIn to emit');
        }
      } catch {}
      // Build preview map from trace
      try {
        const trace: any[] = Array.isArray((this.simScenarios && (this.simScenarios as any)[this.simSelectedIndex]?.trace)) ? (this.simScenarios as any)[this.simSelectedIndex].trace : [];
        const map: any = {};
        for (const t of trace) { const id = String(t?.nodeId || ''); if (!id) continue; const arr = Array.isArray(t.resultPreview) ? t.resultPreview : []; map[id] = arr.map((it:any, idx:number) => ({ id: `sim_${id}_${idx}`, name: String(it?.key ?? it?.name ?? `item_${idx}`), type: String(it?.type ?? '') })); }
        this.simOutputPreview = map;
      } catch { this.simOutputPreview = {}; }
      // Build merged JSON for JSON mode (schema preview + execution values + extras)
      this.mergedScenarioJson = this.buildMergedJsonForSelectedScenario();
      try { this.cdr.detectChanges(); } catch {}
      // Run a vertical auto-layout pass, adjusted by outputs (like Simulation)
      this.relayoutForScenario(sc);
      try { console.log('[settings-v2] refreshScenarioView queued relayout'); } catch {}
    } catch {}
  }

  private computeRealScenarioIndex(): number | null { return null; }

  private recomputeMergedCtx() {
    try {
      const exec = (this.ctx && typeof this.ctx === 'object') ? this.ctx : {};
      const scen = (this.scenarioMsgIn && typeof this.scenarioMsgIn === 'object') ? this.scenarioMsgIn : {};
      // Ne fusionner avec l'exécution que si le scénario sélectionné est étiqueté comme correspondant à l'exécution par le backend
      const sc = Array.isArray(this.simScenarios) ? this.simScenarios[this.simSelectedIndex] : null;
      const isExec = !!(sc && ((sc as any).match?.exec === true || (sc as any).isExec === true));
      this.mergedCtx = isExec ? { ...scen, ...exec } : scen;
      // Build inputForViewer with same rule, but avoid creating new objects if not needed
      const scenRef = scen;
      const execRef = exec;
      const sigChanged = (this.lastInputScenRef !== scenRef) || (this.lastInputExecRef !== execRef) || (this.lastInputIsExec !== isExec);
      if (sigChanged) {
        this.inputForViewer = isExec ? { ...scenRef, ...execRef } : scenRef;
        this.lastInputScenRef = scenRef;
        this.lastInputExecRef = execRef;
        this.lastInputIsExec = isExec;
      }
      try {
        console.log('[settings-v2][ctx] recompute', { idx: this.simSelectedIndex, isExec, scenKeys: Object.keys(scen||{}), execKeys: Object.keys(exec||{}), mergedKeys: Object.keys(this.mergedCtx||{}) });
      } catch {}
    } catch {}
  }

  private buildMergedJsonForSelectedScenario(): any {
    try {
      const sc: any = (Array.isArray(this.simScenarios) ? this.simScenarios![this.simSelectedIndex] : null);
      if (!sc) return this.injectedOutput || {};
      const nodeId = String(this.model?.id || '');
      const trace: any[] = Array.isArray(sc.trace) ? sc.trace : [];
      const me = trace.find(t => String(t?.nodeId || '') === nodeId);
      const base: any = {};
      if (me && Array.isArray(me.resultPreview)) {
        for (const it of me.resultPreview) { const k = String(it?.key || it?.name || ''); if (k) base[k] = null; }
      }
      const exec = (this.injectedOutput && typeof this.injectedOutput === 'object') ? this.injectedOutput : null;
      if (exec) { for (const [k, v] of Object.entries(exec)) { (base as any)[k] = v; } }
      return base;
    } catch { return this.injectedOutput || {}; }
  }

  private relayoutForScenario(sc: any) {
    try {
      try { console.log('[settings-v2] relayoutForScenario start'); } catch {}
      const counts: Record<string, number> = {};
      const trace: any[] = Array.isArray(sc?.trace) ? sc.trace : [];
      for (const t of trace) {
        const id = String(t?.nodeId || ''); if (!id) continue;
        const c = Number(t?.outputsCount);
        if (Number.isFinite(c)) counts[id] = c;
      }
      for (const [k, arr] of Object.entries(this.simOutputPreview || {})) {
        if (counts[k as string] == null) counts[String(k)] = Array.isArray(arr) ? (arr as any[]).length : 0;
      }
      const graph = {
        nodes: (this.viewNodes || []).map((n: any) => ({ id: String(n.id), data: { model: (n as any)?.data?.model } })),
        edges: (this.displayEdges || []).map((e: any) => ({ id: String(e.id||`${e.source}->${e.target}`), source: String(e.source), target: String(e.target), sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
      } as any;
      const gapX = 260; const baseGapY = 160;
      this.layoutApi.layoutGraph(graph, 'vertical', { width: 223, height: 110, gapX, gapY: baseGapY, adjustByOutputs: true, perOutputYOffset: 20, perOutputXOffset: 12, outputsCount: counts, outputsMode: 'max', includeDescriptions: false }).subscribe({
        next: (res: any) => {
          try {
            const positions = (res && (res.positions || (res.data && res.data.positions))) || {};
            const map = new Map<string, { x: number; y: number }>();
            Object.keys(positions||{}).forEach(k => { const p = (positions as any)[k]; if (p && typeof p.x === 'number' && typeof p.y === 'number') map.set(String(k), { x: Math.round(p.x), y: Math.round(p.y) }); });
            this.zone.run(() => {
              this.viewNodes = (this.viewNodes || []).map((n: any) => { const p = map.get(String(n.id)); return p ? ({ ...n, point: { x: p.x, y: p.y } }) : n; });
              this.layoutReady = true;
              this.hadFirstLayout = true;
              try { this.cdr.detectChanges(); } catch {}
            });
          } catch {}
        },
        error: () => {},
        complete: () => {
          this.zone.run(() => {
            this.layoutBusy = false;
            this.isScenarioSwitching = false;
            if (!this.centeredOnFirstLayout && this.hadFirstLayout) {
              this.centeredOnFirstLayout = true;
              this.centerRequestTick++;
            }
            try { this.cdr.detectChanges(); } catch {}
          });
          try { console.log('[settings-v2] relayoutForScenario complete'); } catch {}
        }
      });
    } catch {}
  }
}
