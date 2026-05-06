import { Component, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { WindowManagerService } from './window-manager.service';
import { WindowFrameComponent } from './window-frame.component';

/**
 * Host global du WM. À monter UNE seule fois au niveau app (root / fullpage).
 * Rend toutes les fenêtres visibles + dock bottom des fenêtres minimisées.
 *
 * Raccourci Space = stash all (réduit/restaure toutes les fenêtres).
 */
@Component({
  selector: 'ai-window-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NzIconModule, WindowFrameComponent],
  template: `
    <ng-container *ngFor="let w of wm.visibleWindows(); trackBy: trackWin">
      <ai-window-frame [win]="w"></ai-window-frame>
    </ng-container>

    <div class="wm-minbar" *ngIf="wm.minimizedWindows().length > 0">
      <button type="button" class="wm-minbar-item"
              *ngFor="let w of wm.minimizedWindows(); trackBy: trackWin"
              (click)="restore(w.id)"
              [title]="w.title">
        <span class="chip" *ngIf="w.phaseChip">{{ w.phaseChip }}</span>
        <span class="label">{{ w.title }}</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wm-minbar {
      position: fixed; bottom: 12px; left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex; gap: 6px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(8px);
      border: 1px solid #e8e8e8;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      max-width: calc(100vw - 40px);
      overflow-x: auto;
    }
    .wm-minbar-item {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      transition: all 0.15s ease;
      max-width: 240px;
      flex-shrink: 0;
    }
    .wm-minbar-item:hover {
      background: #fdf2f8;
      border-color: #e61982;
    }
    .wm-minbar-item .chip {
      font-size: 9px; font-weight: 600;
      padding: 1px 6px; border-radius: 8px;
      background: #fce7f3; color: #e61982;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .wm-minbar-item .label {
      font-weight: 500; color: #262626;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    @media (max-width: 900px) {
      .wm-minbar { bottom: 8px; border-radius: 10px; }
    }
  `],
})
export class WindowHostComponent {
  wm = inject(WindowManagerService);

  trackWin = (_: number, w: { id: string }) => w.id;

  restore(id: string): void {
    this.wm.restore(id);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (e.code === 'Space' && !this._isTyping(e.target)) {
      if (this.wm.windows().length === 0) return;
      e.preventDefault();
      this.wm.toggleStashAll();
    }
    if (e.key === 'Escape') {
      const focused = this.wm.visibleWindows().find(w => w.focused);
      if (focused) {
        e.preventDefault();
        this.wm.minimize(focused.id);
      }
    }
  }

  private _isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    return false;
  }
}
