import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild } from '@angular/core';
import { FlowAdvancedInputPanelComponent } from './flow-advanced-input-panel.component';
import { FlowAdvancedOutputPanelComponent } from './flow-advanced-output-panel.component';
import { FlowAdvancedCenterPanelComponent } from './flow-advanced-center-panel.component';
import { JsonSchemaViewerComponent } from '../../../modules/json-schema-viewer/json-schema-viewer';

@Component({
  selector: 'flow-advanced-editor-dialog',
  standalone: true,
  imports: [CommonModule, FlowAdvancedInputPanelComponent, FlowAdvancedOutputPanelComponent, FlowAdvancedCenterPanelComponent, JsonSchemaViewerComponent],
  template: `
    <div class="overlay" (click)="onBackdrop($event)" [class.enter]="centerVisible"></div>
    <!-- Desktop / tablet layout with wings -->
    <div class="bundle" *ngIf="!isMobile" [class.center-visible]="centerVisible" [class.wings-visible]="wingsVisible">
      <div class="wing left" aria-label="Input wing" *ngIf="hasInput(model)">
        <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Input'"></app-json-schema-viewer>
      </div>
      <div class="center" (pointerup)="onFormReleased()">
        <flow-advanced-center-panel [model]="model" (modelChange)="emitModel($event)" (committed)="onCommittedFromCenter($event)" (submitted)="onFormSubmitted($event)"></flow-advanced-center-panel>
        <button class="close" (click)="startExit()" title="Fermer">✕</button>
      </div>
      <div class="wing right" aria-label="Output wing" *ngIf="hasOutput(model)">
        <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>
      </div>
    </div>

    <!-- Mobile layout: 3-panel carousel (Input / Center / Output) -->
    <div class="carousel" *ngIf="isMobile" #carRef>
      <div class="slides" #slidesRef [style.transform]="slidesTransform" [style.transition]="dragging ? 'none' : 'transform .28s ease'" (touchstart)="onSwipeStart($event)" (touchmove)="onSwipeMove($event)" (touchend)="onSwipeEnd()" (touchcancel)="onSwipeEnd()">
        <div class="slide" *ngIf="hasInput(model)">
          <div class="panel-card">
            <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Input'"></app-json-schema-viewer>
          </div>
          <button class="close" (click)="startExit()" title="Fermer">✕</button>
        </div>
        <div class="slide center" (pointerup)="onFormReleased()">
          <flow-advanced-center-panel [model]="model" [bare]="true" (modelChange)="emitModel($event)" (committed)="onCommittedFromCenter($event)" (submitted)="onFormSubmitted($event)"></flow-advanced-center-panel>
          <button class="close" (click)="startExit()" title="Fermer">✕</button>
        </div>
        <div class="slide" *ngIf="hasOutput(model)">
          <div class="panel-card">
            <app-json-schema-viewer [data]="model?.context || {}" [editable]="true" [editMode]="true" [initialMode]="'Schema'" [title]="'Output'"></app-json-schema-viewer>
          </div>
          <button class="close" (click)="startExit()" title="Fermer">✕</button>
        </div>
      </div>
      <div class="nav">
        <button class="nav-btn" (click)="prev()" [disabled]="activeIndex===0">‹</button>
        <div class="dots">
          <span *ngFor="let _ of panels; let i=index" class="dot" [class.active]="i===activeIndex" (click)="go(i)"></span>
        </div>
        <button class="nav-btn" (click)="next()" [disabled]="activeIndex===panels.length-1">›</button>
      </div>
    </div>
  `,
  styles: [`
    :host { position:fixed; inset:0; z-index: 2000; display:block; }
    .overlay { position:absolute; inset:0; background:rgba(17,17,17,0.28); backdrop-filter: blur(2px); opacity:0; transition: opacity .24s ease; }
    .overlay.enter { opacity:1; }
    .bundle { --dialog-h: 90vh; --dialog-w: 450px; --wing-h: calc(var(--dialog-h) - 200px); --wing-w: max(0px, min(var(--dialog-w), calc((100vw - 400px - var(--dialog-w)) / 2))); position:fixed; top:50%; left:50%; transform: translate(-50%, calc(-50% + 8px)); display:flex; align-items:center; gap:0; z-index:10; opacity:0; transition: opacity .22s ease, transform .26s ease; }
    .bundle.center-visible { opacity:1; transform: translate(-50%, -50%); }
    .center { position:relative; z-index:6; }
    .close { position:absolute; top:8px; right:12px; background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:4px 8px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,.12); }
    .wing { height:var(--wing-h); background:#fff; overflow:auto; padding: 9px; opacity:0; }
    /* Style card + rayon selon côté en non-responsive */
    .wing.left { width: calc(var(--wing-w) + 200px); border:1px solid #ececec; border-radius:14px 0 0 14px; box-shadow:0 20px 40px rgba(0,0,0,.12); transform: translateX(-8px) scaleX(0.98); transform-origin: right center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .wing.right { width: calc(var(--wing-w) + 200px); border:1px solid #ececec; border-radius:0 14px 14px 0; box-shadow:0 20px 40px rgba(0,0,0,.12); transform: translateX(8px) scaleX(0.98); transform-origin: left center; transition: transform .28s ease .12s, opacity .24s ease .12s; z-index:5; }
    .bundle.wings-visible .wing.left, .bundle.wings-visible .wing.right { transform: translateX(0) scaleX(1); opacity:1; }

    /* Mobile carousel */
    .carousel { position:fixed; inset:0; width: 100%; height: 100%; background: transparent; border: 0; border-radius: 0; box-shadow: none; overflow: hidden; z-index: 10; touch-action: pan-y; }
    .slides { width: 300%; height: 100%; display:flex; transform: translateX(calc(-1 * var(--idx, 0) * 33.333%)); position: relative; z-index: 1; will-change: transform; }
    .carousel .slide { width: 33.3333%; height: calc(100% - var(--pos-bar-h, 44px)); padding: 13px; position: relative; }
    /* En responsive, donner un fond et un rayon aux "wings" (Input/Output) via une carte interne pour garder du margin */
    .carousel .slide .panel-card { height: 100%; overflow: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,.10); }
    .carousel .slide.center { position: relative; }
    .carousel .close { position:absolute; top:28px; right:32px; bottom:auto; left:auto; background: transparent; border: 0; box-shadow: none; padding: 0; font-size: 20px; line-height: 1; color: #111; z-index: 3; cursor: pointer; }
    /* Responsive: add inner margin for JSON viewers in left/right slides */
    .carousel .slide:not(.center) .panel-card app-json-schema-viewer { display:block; margin: 8px; }
    .carousel .nav { position:absolute; bottom:8px; left:50%; transform: translateX(-50%); display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #e5e7eb; border-radius: 12px; padding: 4px 8px; box-shadow: 0 6px 16px rgba(0,0,0,.10); z-index: 2; pointer-events: auto; }
    /* Assurer que le center panel occupe toute la hauteur du slide */
    .carousel .slide.center flow-advanced-center-panel { display:flex; flex-direction: column; height: 100%; }
    .carousel .nav-btn { background:#fff; border:1px solid #e5e7eb; border-radius: 8px; width: 28px; height: 28px; cursor:pointer; }
    .carousel .dots { display:flex; gap:6px; }
    .carousel .dot { width: 6px; height: 6px; border-radius: 50%; background:#cbd5e1; cursor:pointer; }
    .carousel .dot.active { background:#111; }
    @media (max-width: 768px) {
      :host { --bottom-bar-h: 52px; --pos-bar-h: 44px; }
    }
  `]
})
export class FlowAdvancedEditorDialogComponent implements OnInit, AfterViewInit {
  @Input() model: any;
  @Output() modelChange = new EventEmitter<any>();
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
  dragging = false;
  slidesTransform = 'translateX(-33.3333%)';
  private swipeStartTime = 0;
  private horizLocked = false;

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

  // Touch swipe handlers (mobile)
  onSwipeStart(ev: TouchEvent) {
    if (!this.isMobile) return;
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    this.swipeStartX = t.clientX; this.swipeStartY = t.clientY; this.swipeDx = 0; this.swipeDy = 0; this.swipeActive = true; this.dragging = true; this.horizLocked = false; this.swipeStartTime = Date.now();
  }
  onSwipeMove(ev: TouchEvent) {
    if (!this.isMobile || !this.swipeActive) return;
    const t = ev.touches && ev.touches[0]; if (!t) return;
    this.swipeDx = t.clientX - this.swipeStartX; this.swipeDy = t.clientY - this.swipeStartY;
    const absX = Math.abs(this.swipeDx); const absY = Math.abs(this.swipeDy);
    if (!this.horizLocked) {
      if (absX > 8 && absX > absY + 6) { this.horizLocked = true; }
      else { return; }
    }
    try { ev.preventDefault(); } catch {}
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const basePct = this.activeIndex * (100/3);
    let dragPct = (this.swipeDx / (3 * W)) * 100;
    const atFirst = this.activeIndex === 0 && this.swipeDx > 0;
    const atLast = this.activeIndex === this.panels.length - 1 && this.swipeDx < 0;
    if (atFirst || atLast) dragPct = dragPct * 0.35;
    const pct = basePct - dragPct;
    this.slidesTransform = `translateX(-${pct}%)`;
  }
  onSwipeEnd() {
    if (!this.isMobile || !this.swipeActive) { this.dragging = false; return; }
    const absX = Math.abs(this.swipeDx); const absY = Math.abs(this.swipeDy);
    const dt = Math.max(1, Date.now() - this.swipeStartTime);
    const vx = absX / dt; // px per ms
    const car = this.carRef?.nativeElement as HTMLElement | undefined;
    const W = car?.clientWidth || window.innerWidth || 1;
    const ratio = absX / W;
    const goNext = (this.swipeDx < 0);
    const canPrev = this.activeIndex > 0;
    const canNext = this.activeIndex < this.panels.length - 1;
    const flick = vx > 0.5; // ~500px/s
    const far = ratio > 0.22; // 22% of width
    if (absY < 60 && (flick || far)) {
      if (goNext && canNext) this.activeIndex++;
      else if (!goNext && canPrev) this.activeIndex--;
    }
    this.updateSlidesTransform();
    this.swipeActive = false; this.dragging = false; this.horizLocked = false;
  }

  private commitIfDirty() {
    if (!this.dirty) return;
    const toEmit = this.latestModel || this.model;
    try { this.modelChangeCommitted.emit(toEmit); } catch {}
    this.dirty = false;
  }

}
