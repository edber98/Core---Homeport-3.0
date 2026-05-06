import { Component, Input, ElementRef, HostListener, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { WindowManagerService, WindowState, WindowSnapZone } from './window-manager.service';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

/**
 * Frame d'une fenêtre (header + body + resize handles). Gère drag, resize, snap,
 * focus au click. Le contenu est mounted via ngComponentOutlet.
 */
@Component({
  selector: 'ai-window-frame',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgComponentOutlet, NzIconModule],
  template: `
    <div class="wm-window"
         [class.focused]="win.focused"
         [class.snapped]="!!win.snap"
         [class.is-mobile]="wm.isMobile()"
         [style.transform]="'translate(' + win.pos.x + 'px,' + win.pos.y + 'px)'"
         [style.width.px]="win.pos.w"
         [style.height.px]="win.pos.h"
         [style.z-index]="win.zIndex"
         (mousedown)="focus($event)"
         (touchstart)="focus($event)">
      <div class="wm-header" (mousedown)="onDragStart($event)" (touchstart)="onDragStart($event)">
        <div class="wm-phase" *ngIf="win.phaseChip">{{ win.phaseChip }}</div>
        <div class="wm-title">{{ win.title }}</div>
        <div class="wm-actions">
          <button type="button" class="wm-btn" (click)="minimize($event)" title="Réduire">
            <span nz-icon nzType="minus" nzTheme="outline"></span>
          </button>
          <button type="button" class="wm-btn" (click)="maximize($event)" title="Maximiser">
            <span nz-icon nzType="border" nzTheme="outline"></span>
          </button>
          <button type="button" class="wm-btn wm-btn-close" (click)="close($event)" title="Fermer">
            <span nz-icon nzType="close" nzTheme="outline"></span>
          </button>
        </div>
      </div>
      <div class="wm-body">
        <ng-container *ngComponentOutlet="win.contentComponent; inputs: win.contentInputs"></ng-container>
      </div>
      <ng-container *ngIf="!wm.isMobile()">
        <div *ngFor="let dir of resizeDirs" class="wm-resize" [class]="'wm-resize-' + dir"
             (mousedown)="onResizeStart($event, dir)"></div>
      </ng-container>
    </div>
  `,
  styles: [`
    .wm-window {
      position: fixed; top: 0; left: 0;
      background: #fff;
      border: 1px solid #d9d9d9;
      border-radius: 10px;
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
      display: flex; flex-direction: column;
      overflow: hidden;
      transition: box-shadow 0.2s ease;
      min-width: 360px; min-height: 280px;
    }
    .wm-window.focused {
      border-color: #e61982;
      box-shadow: 0 10px 40px rgba(230, 25, 130, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .wm-window.snapped {
      border-radius: 0;
    }
    .wm-header {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      background: linear-gradient(to bottom, #fafafa, #f5f5f5);
      border-bottom: 1px solid #e8e8e8;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    .wm-window.focused .wm-header {
      background: linear-gradient(to bottom, #fdf2f8, #fce7f3);
    }
    .wm-phase {
      font-size: 10px; font-weight: 600;
      padding: 2px 8px; border-radius: 10px;
      background: #fce7f3; color: #e61982;
      text-transform: uppercase; letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    .wm-title {
      font-size: 13px; font-weight: 600; color: #262626;
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .wm-actions { display: flex; gap: 4px; }
    .wm-btn {
      width: 24px; height: 24px;
      border: 0; border-radius: 4px;
      background: transparent; color: #595959;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px;
      transition: background 0.15s ease;
    }
    .wm-btn:hover { background: rgba(0, 0, 0, 0.05); color: #262626; }
    .wm-btn-close:hover { background: #ff4d4f; color: #fff; }
    .wm-body {
      flex: 1; overflow: auto;
      background: #fff;
    }
    .wm-resize {
      position: absolute;
      background: transparent;
      z-index: 10;
    }
    .wm-resize-n { top: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
    .wm-resize-s { bottom: 0; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
    .wm-resize-e { top: 8px; right: 0; bottom: 8px; width: 6px; cursor: ew-resize; }
    .wm-resize-w { top: 8px; left: 0; bottom: 8px; width: 6px; cursor: ew-resize; }
    .wm-resize-nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; }
    .wm-resize-ne { top: 0; right: 0; width: 10px; height: 10px; cursor: nesw-resize; }
    .wm-resize-sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: nesw-resize; }
    .wm-resize-se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; }
    @media (max-width: 900px) {
      .wm-window, .wm-window.focused {
        position: fixed !important;
        inset: 0 !important;
        transform: none !important;
        width: 100vw !important;
        height: 100dvh !important;
        border-radius: 0;
        border: 0;
      }
      .wm-resize { display: none; }
    }
  `],
})
export class WindowFrameComponent {
  @Input({ required: true }) win!: WindowState;

  wm = inject(WindowManagerService);
  private el = inject(ElementRef<HTMLElement>);

  resizeDirs: ResizeDir[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

  private _drag: { sx: number; sy: number; sl: number; st: number } | null = null;
  private _resize: { dir: ResizeDir; sx: number; sy: number; pos: { x: number; y: number; w: number; h: number } } | null = null;
  private _snapHover = signal<WindowSnapZone | null>(null);

  focus(e: Event): void {
    this.wm.focus(this.win.id);
  }

  close(e: Event): void {
    e.stopPropagation();
    this.wm.close(this.win.id);
  }

  minimize(e: Event): void {
    e.stopPropagation();
    this.wm.minimize(this.win.id);
  }

  maximize(e: Event): void {
    e.stopPropagation();
    this.wm.toggleMaximize(this.win.id);
  }

  onDragStart(e: MouseEvent | TouchEvent): void {
    if ((e.target as HTMLElement).closest('.wm-btn')) return;
    const pt = this._point(e);
    this._drag = { sx: pt.x, sy: pt.y, sl: this.win.pos.x, st: this.win.pos.y };
    this.wm.focus(this.win.id);
  }

  onResizeStart(e: MouseEvent, dir: ResizeDir): void {
    e.stopPropagation();
    e.preventDefault();
    this._resize = { dir, sx: e.clientX, sy: e.clientY, pos: { ...this.win.pos } };
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onMove(e: MouseEvent | TouchEvent): void {
    if (this._drag) {
      const pt = this._point(e);
      const x = this._drag.sl + (pt.x - this._drag.sx);
      const y = this._drag.sy > 20 ? this._drag.st + (pt.y - this._drag.sy) : this._drag.st;
      const newY = this._drag.st + (pt.y - this._drag.sy);
      this.wm.setPosition(this.win.id, { x, y: Math.max(0, newY), w: this.win.pos.w, h: this.win.pos.h });
      this._snapHover.set(this._hitSnapZone(pt.x, pt.y));
    }
    if (this._resize) {
      const dx = e instanceof TouchEvent ? 0 : e.clientX - this._resize.sx;
      const dy = e instanceof TouchEvent ? 0 : e.clientY - this._resize.sy;
      const p = { ...this._resize.pos };
      const dir = this._resize.dir;
      if (dir.includes('e')) p.w = Math.max(360, p.w + dx);
      if (dir.includes('s')) p.h = Math.max(280, p.h + dy);
      if (dir.includes('w')) {
        const newW = Math.max(360, p.w - dx);
        p.x = p.x + (p.w - newW);
        p.w = newW;
      }
      if (dir.includes('n')) {
        const newH = Math.max(280, p.h - dy);
        p.y = p.y + (p.h - newH);
        p.h = newH;
      }
      this.wm.setPosition(this.win.id, p);
    }
  }

  @HostListener('window:mouseup', ['$event'])
  @HostListener('window:touchend', ['$event'])
  onUp(e: MouseEvent | TouchEvent): void {
    if (this._drag) {
      const pt = this._point(e);
      const zone = this._hitSnapZone(pt.x, pt.y);
      if (zone) this.wm.snapWindow(this.win.id, zone);
    }
    this._drag = null;
    this._resize = null;
    this._snapHover.set(null);
  }

  private _point(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (e instanceof TouchEvent) {
      const t = e.touches[0] || e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  private _hitSnapZone(x: number, y: number): WindowSnapZone | null {
    const vw = window.innerWidth;
    const EDGE = 24;
    const TOP = 84;
    if (y <= TOP) return 'top';
    if (x <= EDGE) return 'left';
    if (x >= vw - EDGE) return 'right';
    return null;
  }
}
