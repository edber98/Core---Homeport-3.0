import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, ChangeDetectionStrategy, HostListener, OnChanges, SimpleChanges, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HpDrawerContentDirective } from './hp-drawer-content.directive';

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom';

@Component({
  selector: 'hp-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
  <ng-container *ngIf="nzVisible">
    <div #wrapEl class="hp-drawer-wrap" [ngClass]="nzWrapClassName" [style.zIndex]="wrapZIndex" role="dialog" aria-modal="true" (click)="onWrapClick($event)">
      <div class="hp-drawer-mask" *ngIf="nzMask"
           (click)="onMaskClick($event)"
           (touchend)="onMaskPointer($event)"
           (pointerup)="onMaskPointer($event)"></div>
      <div class="hp-drawer" [class.left]="nzPlacement==='left'" [class.right]="nzPlacement==='right'" [class.top]="nzPlacement==='top'" [class.bottom]="nzPlacement==='bottom'"
           [style.width]="panelWidth" [style.height]="panelHeight" [style.transform]="panelTransform">
        <div class="hp-drawer-content">
          <div class="hp-drawer-header" *ngIf="hasHeader">
            <div class="hp-drawer-title">
              <ng-container *ngIf="titleTpl; else textTitle">
                <ng-container *ngTemplateOutlet="titleTpl"></ng-container>
              </ng-container>
              <ng-template #textTitle>{{ nzTitle }}</ng-template>
            </div>
            <button type="button" class="hp-drawer-close" *ngIf="nzClosable" (click)="triggerClose()" aria-label="Close">
              <span class="hp-drawer-close-x">×</span>
            </button>
          </div>
          <div class="hp-drawer-body" [ngStyle]="nzBodyStyle">
            <ng-container *ngIf="contentTpl; else proj">
              <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
            </ng-container>
            <ng-template #proj>
              <ng-content></ng-content>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  </ng-container>
  `,
  styles: [`
    :host { display: contents; }
    .hp-drawer-wrap { position: fixed; inset: 0; pointer-events: auto; }
    .hp-drawer-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.45); pointer-events: auto; z-index: 0; }
    .hp-drawer { position: absolute; background: #fff; box-shadow: 0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05);
      pointer-events: auto; display:flex; flex-direction:column; transition: transform 200ms ease; z-index: 1; }
    .hp-drawer.left { top: 0; bottom: 0; left: 0; width: 378px; transform: translateX(0); }
    .hp-drawer.right { top: 0; bottom: 0; right: 0; width: 378px; transform: translateX(0); }
    .hp-drawer.top { left: 0; right: 0; top: 0; height: 378px; transform: translateY(0); }
    .hp-drawer.bottom { left: 0; right: 0; bottom: 0; height: 378px; transform: translateY(0); }
    .hp-drawer-content { position: relative; display:flex; flex-direction:column; height: 100%; }
    .hp-drawer-header { display:flex; align-items:center; justify-content:space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
    .hp-drawer-title { font-weight: 600; color:#111; }
    .hp-drawer-close { background: transparent; border: none; cursor: pointer; font-size: 18px; line-height: 1; color:#111; }
    .hp-drawer-body { flex: 1 1 auto; overflow: auto; -webkit-overflow-scrolling: touch; padding: 16px; overscroll-behavior: contain; touch-action: pan-y; max-height: 100%; }
    .hp-drawer-mask { touch-action: none; }
    /* iOS safety similar to .ios-safe-drawer global */
    .hp-drawer-wrap.ios-safe-drawer .hp-drawer-body { overscroll-behavior: contain; touch-action: pan-y; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HpDrawerComponent implements OnChanges, OnDestroy, AfterViewInit {
  // Visibility and placement
  @Input('nzVisible') nzVisible = false;
  @Input('nzPlacement') nzPlacement: DrawerPlacement = 'right';
  // Dimensions
  @Input('nzWidth') nzWidth?: number | string;
  @Input('nzHeight') nzHeight?: number | string;
  // UI
  @Input('nzTitle') nzTitle?: string | TemplateRef<any> | null;
  @Input('nzClosable') nzClosable: boolean = true;
  @Input('nzBodyStyle') nzBodyStyle: { [k: string]: any } | null = null;
  @Input('nzMask') nzMask: boolean = true;
  @Input('nzMaskClosable') nzMaskClosable: boolean = true;
  @Input('nzKeyboard') nzKeyboard: boolean = true;
  @Input('nzWrapClassName') nzWrapClassName: string | null = null;
  @Input('nzZIndex') nzZIndex: number | null = null;
  @Input('nzGetContainer') nzGetContainer?: HTMLElement | (() => HTMLElement) | null;

  // Outputs compatible with nz-drawer
  @Output('nzOnClose') nzOnClose = new EventEmitter<void>();
  @Output('nzAfterOpen') nzAfterOpen = new EventEmitter<void>();
  @Output('nzAfterClose') nzAfterClose = new EventEmitter<void>();

  @ContentChild(HpDrawerContentDirective, { static: false }) content?: HpDrawerContentDirective;
  @ViewChild('wrapEl', { static: false }) wrapEl?: ElementRef<HTMLElement>;

  get contentTpl(): TemplateRef<any> | null { return this.content?.templateRef || null; }
  get isTitleTemplate(): boolean { return this.nzTitle instanceof TemplateRef; }
  get titleTpl(): TemplateRef<any> | null { return this.nzTitle instanceof TemplateRef ? this.nzTitle : null; }

  get wrapZIndex(): number { return Math.max(20000, this.nzZIndex ?? 20000); }
  get hasHeader(): boolean { return !!this.nzTitle || this.nzClosable; }

  panelWidth: string | null = null;
  panelHeight: string | null = null;
  panelTransform: string = '';
  private portaled = false;
  private teardownGlobal: Array<() => void> = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.applyDimensions();
    this.applyTransform();
    if (changes['nzVisible']) {
      // Fire lifecycle outputs
      if (this.nzVisible) {
        queueMicrotask(() => this.nzAfterOpen.emit());
        try { document.body.classList.add('hp-drawer-open'); } catch {}
        this.applyPortal();
        this.addGlobalCaptureHandlers();
      } else {
        queueMicrotask(() => this.nzAfterClose.emit());
        try { document.body.classList.remove('hp-drawer-open'); } catch {}
        this.removeGlobalCaptureHandlers();
      }
    }
  }

  ngOnDestroy(): void {
    try { document.body.classList.remove('hp-drawer-open'); } catch {}
    this.unportal();
    this.removeGlobalCaptureHandlers();
  }

  ngAfterViewInit(): void {
    this.applyPortal();
  }

  private applyDimensions() {
    // Width applies for left/right, Height for top/bottom
    const toCss = (v?: number | string): string | null => {
      if (v === undefined || v === null as any) return null;
      return typeof v === 'number' ? `${v}px` : String(v);
    };
    this.panelWidth = (this.nzPlacement === 'left' || this.nzPlacement === 'right') ? (toCss(this.nzWidth) || '378px') : '100%';
    this.panelHeight = (this.nzPlacement === 'top' || this.nzPlacement === 'bottom') ? (toCss(this.nzHeight) || '378px') : '100%';
  }

  private applyTransform() {
    // We render only when visible, so no off-screen transform required; keep API for future animations
    this.panelTransform = 'translate(0, 0)';
  }

  onMaskClick(ev: MouseEvent) {
    if (!this.nzMaskClosable) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.triggerClose();
  }

  onMaskPointer(ev: Event) {
    if (!this.nzMaskClosable) return;
    // On iOS Safari, 'click' can be unreliable; close on initial pointer/touch
    try { (ev as any).preventDefault?.(); } catch {}
    try { (ev as any).stopPropagation?.(); } catch {}
    this.triggerClose();
  }

  triggerClose() {
    this.nzOnClose.emit();
  }

  private resolveContainer(): HTMLElement | null {
    if (!this.nzGetContainer) return null;
    try {
      if (typeof this.nzGetContainer === 'function') return this.nzGetContainer() || null;
      return this.nzGetContainer || null;
    } catch { return null; }
  }

  private applyPortal() {
    const el = this.wrapEl?.nativeElement; if (!el) return;
    const container = this.resolveContainer();
    if (container && !this.portaled) {
      container.appendChild(el);
      this.portaled = true;
    }
  }

  private unportal() {
    if (!this.portaled) return;
    // leave detached; Angular will cleanup
    this.portaled = false;
  }

  private addGlobalCaptureHandlers() {
    this.removeGlobalCaptureHandlers();
    const handler = (ev: Event) => {
      if (!this.nzVisible) return;
      const root = this.wrapEl?.nativeElement; if (!root) return;
      const panel = root.querySelector('.hp-drawer') as HTMLElement | null;
      const target = ev.target as Node | null;
      // If click/touch is inside panel, allow it
      if (panel && target && panel.contains(target)) return;
      // Otherwise, treat as outside click -> close
      if (this.nzMaskClosable) {
        try { (ev as any).stopImmediatePropagation?.(); } catch {}
        try { ev.stopPropagation(); } catch {}
        try { (ev as any).preventDefault?.(); } catch {}
        this.triggerClose();
      }
    };
    const opts: AddEventListenerOptions = { capture: true, passive: false } as any;
    const types: Array<keyof DocumentEventMap> = ['click','touchend','pointerup'];
    types.forEach(t => {
      document.addEventListener(t, handler, opts);
      this.teardownGlobal.push(() => document.removeEventListener(t, handler, { capture: true } as any));
    });
  }

  private removeGlobalCaptureHandlers() {
    try { this.teardownGlobal.forEach(fn => fn()); } catch {}
    this.teardownGlobal = [];
  }

  onWrapClick(ev: MouseEvent) {
    if (!this.nzMaskClosable) return;
    const target = ev.target as HTMLElement;
    // If the click originated inside the panel, ignore
    const panel = (ev.currentTarget as HTMLElement).querySelector('.hp-drawer') as HTMLElement | null;
    if (panel && panel.contains(target)) return;
    this.triggerClose();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent) {
    if (!this.nzVisible) return;
    if (!this.nzKeyboard) return;
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      ev.preventDefault();
      ev.stopPropagation();
      this.triggerClose();
    }
  }
}
