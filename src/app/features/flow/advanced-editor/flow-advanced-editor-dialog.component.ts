import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild } from '@angular/core';
import { FlowAdvancedInputPanelComponent } from './flow-advanced-input-panel.component';
import { FlowAdvancedOutputPanelComponent } from './flow-advanced-output-panel.component';
import { FlowAdvancedCenterPanelComponent } from './flow-advanced-center-panel.component';
import { JsonSchemaViewerComponent } from '../../../modules/json-schema-viewer/json-schema-viewer';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
 
//               <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>


@Component({
  selector: 'flow-advanced-editor-dialog',
  standalone: true,
  imports: [CommonModule, FlowAdvancedInputPanelComponent, FlowAdvancedOutputPanelComponent, FlowAdvancedCenterPanelComponent, JsonSchemaViewerComponent, NzBadgeModule],
  template: `
    <div class="overlay" (click)="onBackdrop($event)" [class.enter]="centerVisible"></div>
    <!-- Desktop / tablet layout with wings (classic appearance) -->
    <div class="bundle" *ngIf="!isMobile" [class.center-visible]="centerVisible" [class.wings-visible]="wingsVisible">
      <div class="wing left" aria-label="Input wing" *ngIf="hasInput(model)">
        <div *ngIf="loadingInput" class="loading-box"><span class="tiny-spinner"></span> Chargement de l'entrée…</div>
        <div *ngIf="!loadingInput && hasPrev && injectedInput == null" style="border:1px solid #fde68a; background:#fffbeb; color:#92400e; border-radius:8px; padding:6px 8px; margin-bottom:8px; font-size:12px;">
          Aucune exécution précédente pour fournir l'entrée. Vous pouvez lancer le(s) nœud(s) précédent(s).
          <button (click)="runPrev.emit()" style="margin-left:8px; border:1px solid #d97706; background:#fff7ed; color:#92400e; border-radius:6px; padding:2px 8px; cursor:pointer;">Lancer les précédents</button>
        </div>
        <!-- Pour Start, on privilégie l'édition dans l'onglet Output; ne rien afficher ici -->
        <app-json-schema-viewer *ngIf="injectedInput != null && !isStart(model)" [data]="injectedInput" [editable]="false" [editMode]="true" [initialMode]="'Schema'" [title]="'Input'"></app-json-schema-viewer>
      </div>
      <div class="center" (pointerup)="onFormReleased()">
        <flow-advanced-center-panel [model]="model" [ctx]="ctx" [disabled]="disableForChecksum" [disableReason]="'Mise à jour du format requise'" (updateArgs)="requestUpdateArgs.emit()" (test)="test.emit()" (modelChange)="emitModel($event)" (committed)="onCommittedFromCenter($event)" (submitted)="onFormSubmitted($event)"
          [testStatus]="testStatus" [testStartedAt]="testStartedAt" [testDurationMs]="testDurationMs" [testDisabled]="testDisabled" [attemptEvents]="attemptEvents"></flow-advanced-center-panel>
        <button class="close" (click)="startExit()" title="Fermer" aria-label="Fermer">✕</button>
      </div>
      <div class="wing right" aria-label="Output wing" *ngIf="hasOutput(model)">
        <div *ngIf="loadingOutput" class="loading-box"><span class="tiny-spinner"></span> Chargement de la sortie…</div>
        <!-- Start: output = payload initial du flow (éditable et persisté) -->
        <app-json-schema-viewer *ngIf="isStart(model)" [data]="injectedOutput" [editable]="true" [editMode]="true" [initialMode]="'JSON'" [title]="'Payload (Start)'
          " (dataChange)="startPayloadChange.emit($event)"></app-json-schema-viewer>
        <!-- Autres: output en lecture -->
        <app-json-schema-viewer *ngIf="!isStart(model) && injectedOutput != null" [data]="injectedOutput" [editable]="false" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>

        </div>
    </div>

    <!-- Mobile layout: true dialog with carousel and bottom dots -->
    <div class="m-shell" *ngIf="isMobile">
      <div class="m-dialog" [class.enter]="centerVisible">
        <div class="m-header">
          <div class="title">Configuration</div>
          <button class="m-close" (click)="startExit()" aria-label="Fermer">✕</button>
        </div>
        <div
          class="m-body"
          #carRef
          (touchstart)="onSwipeStart($event)"
          (touchmove)="onSwipeMove($event)"
          (touchend)="onSwipeEnd()"
        >
          <!-- Edge sensors inside the dialog body -->
          <div class="edge-sensor left" (touchstart)="onEdgeStart($event, 'left')"></div>
          <div class="edge-sensor right" (touchstart)="onEdgeStart($event, 'right')"></div>
          <div class="slides" #slidesRef [style.transform]="slidesTransform" [class.dragging]="dragging">
          <!-- Input panel -->
          <div class="slide">
            <div class="scroll">
              <div *ngIf="!loadingInput && hasPrev && injectedInput == null" style="border:1px solid #fde68a; background:#fffbeb; color:#92400e; border-radius:8px; padding:6px 8px; margin-bottom:8px; font-size:12px;">
                Aucune exécution précédente pour fournir l'entrée. Vous pouvez lancer le(s) nœud(s) précédent(s).
                <button (click)="runPrev.emit()" style="margin-left:8px; border:1px solid #d97706; background:#fff7ed; color:#92400e; border-radius:6px; padding:2px 8px; cursor:pointer;">Lancer les précédents</button>
              </div>
              <div *ngIf="loadingInput" class="loading-box" style="margin-bottom:8px;"><span class="tiny-spinner"></span> Chargement de l'entrée…</div>
              <app-json-schema-viewer *ngIf="!loadingInput && injectedInput != null" [data]="injectedInput" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Input'"></app-json-schema-viewer>
            </div>
          </div>
            <!-- Center panel -->
            <div class="slide center">
              <div class="scroll" (pointerup)="onFormReleased()">
                <flow-advanced-center-panel [model]="model" [ctx]="ctx" [bare]="true" [disabled]="disableForChecksum" [disableReason]="'Mise à jour du format requise'" (updateArgs)="requestUpdateArgs.emit()" (test)="test.emit()" (modelChange)="emitModel($event)" (committed)="onCommittedFromCenter($event)" (submitted)="onFormSubmitted($event)"></flow-advanced-center-panel>
              </div>
            </div>
          <!-- Output panel -->
          <div class="slide">
            <div class="scroll">
              <div *ngIf="loadingOutput" class="loading-box" style="margin-bottom:8px;"><span class="tiny-spinner"></span> Chargement de la sortie…</div>
              <app-json-schema-viewer *ngIf="!loadingOutput && injectedOutput != null" [data]="injectedOutput" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>
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
    :host { position:fixed; inset:0; z-index: 100000; display:block; }
    .overlay { position:absolute; inset:0; background:rgba(17,17,17,0.32); backdrop-filter: blur(2px); opacity:0; transition: opacity .24s ease; pointer-events: none; }
    .overlay.enter { opacity:1; pointer-events:auto; }
    .bundle { --dialog-h: 90vh; --dialog-w: 450px; --wing-h: calc(var(--dialog-h) - 200px); --wing-w: max(0px, min(var(--dialog-w), calc((100vw - 400px - var(--dialog-w)) / 2))); position:fixed; top:50%; left:50%; transform: translate(-50%, calc(-50% + 8px)); display:flex; align-items:center; gap:0; z-index:100001; opacity:0; transition: opacity .22s ease, transform .26s ease; pointer-events: auto; }
    .bundle.center-visible { opacity:1; transform: translate(-50%, -50%); }
    .center { position:relative; z-index:6; }
    .close { position:absolute; top:8px; right:12px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:4px 8px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.12); }
    .wing { height:var(--wing-h); background:#fff; overflow:auto; padding: 9px; opacity:0; }
    /* Style card + rayon selon côté en non-responsive */
    /* Avoid overlap with center by using safe widths and a flex gap; remove transforms to avoid Safari hit-testing bugs */
    .wing { position: relative; pointer-events: auto; height:var(--wing-h); overflow:auto; padding: 9px; opacity:0; background:#fff; }
    .wing.left { width: calc(var(--wing-w) + 200px); border:1px solid #ececec; border-radius:14px 0 0 14px; box-shadow:0 8px 24px rgba(0,0,0,.08); transform: translateX(-8px) scaleX(0.98); transform-origin: right center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .wing.right { width: calc(var(--wing-w) + 200px); border:1px solid #ececec; border-radius:0 14px 14px 0; box-shadow:0 8px 24px rgba(0,0,0,.08); transform: translateX(8px) scaleX(0.98); transform-origin: left center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .bundle.wings-visible .wing.left, .bundle.wings-visible .wing.right { transform: translateX(0) scaleX(1); opacity:1; }
    .bundle.wings-visible .wing.left, .bundle.wings-visible .wing.right { transform: translateX(0) scaleX(1); opacity:1; }

    /* Mobile single-panel shell */
    .m-shell { position: fixed; inset:0; z-index: 100001; display:flex; align-items:center; justify-content:center; }
    .m-dialog { position:relative; width: min(92vw, 520px); height: min(88vh, 720px); background:#fff; border:1px solid rgba(0,0,0,0.06); border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.06); transform: translateY(8px); opacity:0; transition: opacity .22s ease, transform .26s ease; display:flex; flex-direction: column; overflow:hidden; }
    .m-dialog.enter { opacity:1; transform: translateY(0); }
    .m-header { display:flex; align-items:center; justify-content:space-between; padding: calc(8px + env(safe-area-inset-top)) 12px 8px 12px; border-bottom:1px solid #f0f0f0; }
    .m-header .title { font-weight:600; font-size:14px; color:#111; }
    .m-close { border:1px solid #e5e7eb; background:#fff; border-radius: 10px; width: 32px; height: 28px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
    .m-body { position:relative; flex:1 1 auto; min-height:0; overflow:hidden; touch-action: pan-y; -webkit-overflow-scrolling: touch; background:#fff; }
    .m-footer { display:flex; align-items:center; justify-content:center; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)) 12px; border-top:0; background:#fff; }
    .dots { display:flex; gap:8px; }
    .dot { width:8px; height:8px; border-radius:50%; border:0; background:#d4d4d8; padding:0; cursor:pointer; }
    .dot.active { background:#111827; }
    .loading-box { display:flex; align-items:center; gap:8px; border:1px dashed #d1d5db; background:#f9fafb; color:#374151; border-radius:8px; padding:6px 8px; margin-bottom:8px; font-size:12px; }
    .tiny-spinner { width:14px; height:14px; border:2px solid #e5e7eb; border-top-color:#111827; border-radius:50%; display:inline-block; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toolbar { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
    .toolbar .sp { flex:1 1 auto; }
    .edge-sensor { position:absolute; top:0; bottom:0; width:24px; z-index:3; }
    .edge-sensor.left { left:0; }
    .edge-sensor.right { right:0; }
    .slides { position:absolute; inset:0; display:flex; width:300%; height:100%; transition: transform .28s ease; will-change: transform; }
    .slides.dragging { transition: none; }
    .slide { width:33.3333%; height:100%; overflow:hidden; }
    .scroll { height:100%; overflow:auto; -webkit-overflow-scrolling: touch; padding: 10px; }
    .slide.center .scroll { padding: 0; }
    /* removed global-close; use header close for a single close button */
    .toast { position: fixed; left:50%; top:16px; transform: translateX(-50%); background:#111; color:#fff; padding:6px 10px; border-radius:8px; z-index: 100003; }
    
    @media (max-width: 768px) {
      :host { --bottom-bar-h: 52px; --pos-bar-h: 44px; }
    }
  `]
})
export class FlowAdvancedEditorDialogComponent implements OnInit, AfterViewInit {
  @Input() model: any;
  @Input() disableForChecksum = false;
  @Input() hasPrev: boolean = false;
  @Input() loadingInput: boolean = false;
  @Input() loadingOutput: boolean = false;
  @Input() testStatus: 'idle'|'running'|'success'|'error' = 'idle';
  @Input() testStartedAt: number | null = null;
  @Input() testDurationMs: number | null = null;
  @Input() attemptEvents: any[] = [];
  @Input() testDisabled: boolean = false;
  // Injected context and I/O for test mode previews
  @Input() ctx: any = {};
  @Input() injectedInput: any = null;
  @Input() injectedOutput: any = null;
  @Output() requestUpdateArgs = new EventEmitter<void>();
  @Output() modelChange = new EventEmitter<any>();
  @Output() test = new EventEmitter<void>();
  @Output() runPrev = new EventEmitter<void>();
  @Output() startPayloadChange = new EventEmitter<any>();
  // Nouvel événement: émis lorsquon «relâche» le formulaire (pointerup) ou submit
  @Output() modelChangeCommitted = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('carRef') private carRef?: any;
  @ViewChild('slidesRef') private slidesRef?: any;
  centerVisible = false;
  wingsVisible = false;
  private latestModel: any = null;
  private dirty = false;
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
  // (removed viewer drag auto-pan state)

  onBackdrop(_ev: MouseEvent) { this.startExit(); }
  emitModel(m: any) {
    this.latestModel = m;
    this.dirty = true;
    this.modelChange.emit(m);
  }
  ngOnInit() { this.updateIsMobile(); this.updateSlidesTransform(); }
  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}
  ngAfterViewInit() {
    this.zone.run(() => {
      setTimeout(() => {
        this.centerVisible = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.wingsVisible = true;
          this.cdr.detectChanges();
        }, 160);
      });
    });
  }

  startExit() {
    // Reverse sequence: retract wings, then hide center/overlay, then emit close
    this.wingsVisible = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.centerVisible = false;
      this.cdr.detectChanges();
      setTimeout(() => this.close.emit(), 260);
    }, 320);
  }

  hasInput(model: any): boolean {
    try { return !!model && model.templateObj?.type !== 'start'; } catch { return false; }
  }
  hasOutput(model: any): boolean {
    try { return !!model && model.templateObj?.type !== 'end'; } catch { return false; }
  }
  onFormSubmitted(m: any) {
    try { this.emitModel(m || this.model); } catch {}
    this.commitIfDirty();
    this.startExit();
  }
  onCommittedFromCenter(m: any) {
    // Reçoit le commit direct depuis dynamic-form (via center-panel) → émet le commit global du dialog
    try { this.emitModel(m || this.model); } catch {}
    
    this.commitIfDirty();
  }

  // Déclenche un commit lors dun relâchement dans la zone centrale
  onFormReleased() {
    this.commitIfDirty();
  }

  // Responsive helpers
  private updateIsMobile() {
    try { this.isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false; } catch { this.isMobile = false; }
  }

  private updateSlidesTransform() {
    const basePct = this.activeIndex * (100/3);
    this.slidesTransform = `translateX(-${basePct}%)`;
  }
  prev() { if (this.activeIndex > 0) { this.activeIndex--; this.updateSlidesTransform(); } }
  next() { if (this.activeIndex < this.panels.length - 1) { this.activeIndex++; this.updateSlidesTransform(); } }
  go(i: number) { if (i>=0 && i < this.panels.length) { this.activeIndex = i; this.updateSlidesTransform(); } }

  // (removed onViewerMobileDrag)

  // Touch swipe handlers (mobile)
  onEdgeStart(ev: TouchEvent, side: 'left'|'right') { this.swipeFromEdge = side; this.onSwipeStart(ev); }
  onSwipeStart(ev: TouchEvent) {
    if (!this.isMobile) return;
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    // Do not hijack interactions that start on form controls (inputs, selects, buttons, ant components)
    const target = (ev.target as HTMLElement) || null;
    const isInteractive = (el: HTMLElement | null): boolean => {
      let n: HTMLElement | null = el;
      let depth = 0;
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
    // Original conservative guard: ignore swipe on interactive or when not starting at edge (if edgeOnly)
    this.ignoreSwipe = this.fromInteractive || (this.edgeOnly && !startAtEdge);
    if (this.ignoreSwipe) { this.dragging = false; this.swipeActive = false; return; }
    this.swipeStartX = t.clientX; this.swipeStartY = t.clientY; this.swipeDx = 0; this.swipeDy = 0; this.swipeActive = true; this.dragging = true; this.horizLocked = false; this.swipeStartTime = Date.now();
  }
  onSwipeMove(ev: TouchEvent) {
    if (!this.isMobile || !this.swipeActive || this.ignoreSwipe) return;
    const t = ev.touches && ev.touches[0]; if (!t) return;
    this.swipeDx = t.clientX - this.swipeStartX; this.swipeDy = t.clientY - this.swipeStartY;
    const absX = Math.abs(this.swipeDx); const absY = Math.abs(this.swipeDy);
    if (!this.horizLocked) {
      // Make it slightly easier to lock to horizontal swipes
      if (absX > 6 && absX > absY + 4) { this.horizLocked = true; }
      else { return; }
    }
    // If gesture started on an interactive control, only hijack when user clearly swipes horizontally
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
    const vx = absX / dt; // px per ms
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const ratio = absX / W;
    const goNext = (this.swipeDx < 0);
    const canPrev = this.activeIndex > 0;
    const canNext = this.activeIndex < this.panels.length - 1;
    const flick = vx > 0.5;
    const far = ratio > 0.22;
    // Close if overscrolling beyond edges with sufficient gesture
    if ((goNext && !canNext && (flick || far)) || (!goNext && !canPrev && (flick || far))) {
      this.startExit();
      this.swipeActive = false; this.dragging = false; this.horizLocked = false; this.fromInteractive = false;
      return;
    }
    if (absY < 60 && (flick || far)) {
      if (goNext && canNext) this.activeIndex++;
      else if (!goNext && canPrev) this.activeIndex--;
    }
    this.updateSlidesTransform();
    this.swipeActive = false; this.dragging = false; this.horizLocked = false; this.ignoreSwipe = false; this.fromInteractive = false;
  }

  private commitIfDirty() {
    if (!this.dirty) return;
    const toEmit = this.latestModel || this.model;
    try { this.modelChangeCommitted.emit(toEmit); } catch {}
    this.dirty = false;
  }

  // (test diagnostics removed)
  isStart(m: any): boolean { try { return String(m?.templateObj?.type || '').toLowerCase() === 'start'; } catch { return false; } }
}
