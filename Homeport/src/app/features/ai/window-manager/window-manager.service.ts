import { Injectable, Type, signal, computed } from '@angular/core';

/** Zone de snap macOS-style */
export type WindowSnapZone = 'left' | 'right' | 'top';

/** Position & taille d'une fenêtre */
export interface WindowPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Snapshot avant minimize (pour restore) */
export interface WindowBeforeMin {
  pos: WindowPos;
  snap?: WindowSnapZone | null;
}

/** État d'une fenêtre gérée par le WM */
export interface WindowState {
  id: string;
  title: string;
  phaseChip?: string;
  contentComponent: Type<any>;
  contentInputs?: Record<string, any>;
  pos: WindowPos;
  snap: WindowSnapZone | null;
  minimized: boolean;
  focused: boolean;
  zIndex: number;
  beforeMin?: WindowBeforeMin;
}

export interface OpenWindowOptions {
  id: string;
  title: string;
  phaseChip?: string;
  contentComponent: Type<any>;
  contentInputs?: Record<string, any>;
  /** 'replace' = réutilise fenêtre même id si existe · 'new' = ouvre nouvelle instance */
  action?: 'replace' | 'new';
  pos?: Partial<WindowPos>;
}

const DEFAULT_W = 640;
const DEFAULT_H = 480;
const MIN_W = 360;
const MIN_H = 280;
const Z_BASE = 500;

/**
 * Window Manager — singleton qui gère les fenêtres flottantes de l'app.
 * Inspiré macOS : drag, resize, snap left/right/top, minimize dock, focus z-index.
 *
 * Usage :
 *   wm.open({ id: 'subagent-xyz', title: 'Tim (research)', contentComponent: AiSubagentWindowComponent, contentInputs: { jobId } });
 *   wm.minimize('subagent-xyz');
 *   wm.close('subagent-xyz');
 */
@Injectable({ providedIn: 'root' })
export class WindowManagerService {
  private _windows = signal<WindowState[]>([]);
  private _stashed = signal(false);
  private _zCounter = Z_BASE;

  /** Liste réactive des fenêtres (inclut minimisées) */
  windows = this._windows.asReadonly();

  /** Fenêtres visibles (non minimisées) */
  visibleWindows = computed(() => this._windows().filter(w => !w.minimized));

  /** Fenêtres minimisées (pour dock bas) */
  minimizedWindows = computed(() => this._windows().filter(w => w.minimized));

  /** État stash (tout réduit via Space) */
  stashed = this._stashed.asReadonly();

  /**
   * Ouvre une fenêtre. Si id existe déjà et action='replace' (défaut), réutilise
   * en mettant à jour le contenu. Si action='new', ouvre une 2e instance décalée.
   */
  open(opts: OpenWindowOptions): void {
    const action = opts.action || 'replace';
    const existing = this._windows().find(w => w.id === opts.id);

    if (existing && action === 'replace') {
      this.update(opts.id, {
        title: opts.title,
        phaseChip: opts.phaseChip,
        contentComponent: opts.contentComponent,
        contentInputs: opts.contentInputs,
      });
      // Si minimisée → restore + focus
      if (existing.minimized) this.restore(opts.id);
      else this.focus(opts.id);
      return;
    }

    const isMobile = this.isMobile();
    const existingCount = this._windows().length;
    const offset = existingCount * 30;
    const pos: WindowPos = isMobile
      ? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
      : {
          x: opts.pos?.x ?? Math.max(60, Math.round((window.innerWidth - DEFAULT_W) / 2) + offset),
          y: opts.pos?.y ?? Math.max(60, Math.round((window.innerHeight - DEFAULT_H) / 2) + offset),
          w: opts.pos?.w ?? DEFAULT_W,
          h: opts.pos?.h ?? DEFAULT_H,
        };

    this._zCounter++;
    const id = action === 'new' && existing ? `${opts.id}-${Date.now()}` : opts.id;
    const win: WindowState = {
      id,
      title: opts.title,
      phaseChip: opts.phaseChip,
      contentComponent: opts.contentComponent,
      contentInputs: opts.contentInputs,
      pos,
      snap: null,
      minimized: false,
      focused: true,
      zIndex: this._zCounter,
    };

    // Défocus les autres
    this._windows.update(arr => [...arr.map(w => ({ ...w, focused: false })), win]);
  }

  update(id: string, patch: Partial<WindowState>): void {
    this._windows.update(arr => arr.map(w => w.id === id ? { ...w, ...patch } : w));
  }

  close(id: string): void {
    this._windows.update(arr => arr.filter(w => w.id !== id));
  }

  closeAll(): void {
    this._windows.set([]);
  }

  minimize(id: string): void {
    const win = this._windows().find(w => w.id === id);
    if (!win) return;
    const beforeMin: WindowBeforeMin = { pos: { ...win.pos }, snap: win.snap };
    this.update(id, { minimized: true, focused: false, snap: null, beforeMin });
  }

  restore(id: string): void {
    const win = this._windows().find(w => w.id === id);
    if (!win) return;
    const patch: Partial<WindowState> = { minimized: false };
    if (win.beforeMin) {
      patch.pos = win.beforeMin.pos;
      patch.snap = win.beforeMin.snap || null;
    }
    this.update(id, patch);
    this.focus(id);
  }

  focus(id: string): void {
    this._zCounter++;
    this._windows.update(arr => arr.map(w => ({
      ...w,
      focused: w.id === id,
      zIndex: w.id === id ? this._zCounter : w.zIndex,
    })));
  }

  /** Appelé par window-frame lors d'un drag : synchronise la position */
  setPosition(id: string, pos: WindowPos): void {
    this._windows.update(arr => arr.map(w => w.id === id ? { ...w, pos, snap: null } : w));
  }

  /** Applique un snap macOS-style sur une zone */
  snapWindow(id: string, zone: WindowSnapZone): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const TOP = 60;
    let pos: WindowPos;
    if (zone === 'left') pos = { x: 0, y: TOP, w: vw / 2, h: vh - TOP };
    else if (zone === 'right') pos = { x: vw / 2, y: TOP, w: vw / 2, h: vh - TOP };
    else pos = { x: 0, y: TOP, w: vw, h: vh - TOP };
    // Mémorise la position AVANT snap pour permettre un toggle de retour (sauf si déjà snappée).
    this._windows.update(arr => arr.map(w => {
      if (w.id !== id) return w;
      const beforeMin = w.snap ? w.beforeMin : { pos: { ...w.pos }, snap: null };
      return { ...w, pos, snap: zone, beforeMin };
    }));
  }

  /**
   * Toggle maximize : si la fenêtre est snappée en top → restaure la position
   * précédente. Sinon → applique le snap top (plein écran).
   */
  toggleMaximize(id: string): void {
    const win = this._windows().find(w => w.id === id);
    if (!win) return;
    if (win.snap === 'top' && win.beforeMin) {
      const restoredPos = win.beforeMin.pos;
      this._windows.update(arr => arr.map(w => w.id === id
        ? { ...w, pos: restoredPos, snap: null }
        : w,
      ));
    } else {
      this.snapWindow(id, 'top');
    }
  }

  /** Toggle stash all : réduit toutes les fenêtres ou les restaure */
  toggleStashAll(): void {
    const wins = this._windows();
    const anyVisible = wins.some(w => !w.minimized);
    if (anyVisible) {
      wins.forEach(w => { if (!w.minimized) this.minimize(w.id); });
      this._stashed.set(true);
    } else {
      wins.forEach(w => { if (w.minimized) this.restore(w.id); });
      this._stashed.set(false);
    }
  }

  isMobile(): boolean {
    return window.innerWidth <= 900;
  }
}
