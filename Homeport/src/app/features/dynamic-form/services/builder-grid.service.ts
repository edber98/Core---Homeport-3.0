import { Injectable } from '@angular/core';
import type { FieldConfig } from '../../../modules/dynamic-form/dynamic-form.service';

type BP = 'xs'|'sm'|'md'|'lg'|'xl';

@Injectable({ providedIn: 'root' })
export class BuilderGridService {
  private _resizing: { field: FieldConfig; bp: BP; containerLeft: number; containerWidth: number; onUpdate: (field: FieldConfig, span: number) => void; onEnd?: () => void } | null = null;
  spanForBp(field: FieldConfig, bp: BP): number {
    const col: any = (field as any).col || {};
    const xs = typeof col.xs === 'number' ? col.xs : 24;
    const sm = typeof col.sm === 'number' ? col.sm : xs;
    const md = typeof col.md === 'number' ? col.md : sm;
    const lg = typeof col.lg === 'number' ? col.lg : md;
    const xl = typeof col.xl === 'number' ? col.xl : lg;
    return { xs, sm, md, lg, xl }[bp];
  }

  getSpan(field: FieldConfig, bp: BP): number { return this.spanForBp(field, bp); }

  setSpan(field: FieldConfig, bp: BP, span: number): FieldConfig {
    const col = { ...(field as any).col };
    col[bp] = Math.max(1, Math.min(24, Math.round(span)));
    (field as any).col = col;
    return field;
  }

  computeSpanFromPointer(containerLeft: number, containerWidth: number, pageX: number): number {
    const x = pageX - containerLeft;
    const ratio = Math.max(0, Math.min(1, x / containerWidth));
    return Math.max(1, Math.min(24, Math.round(ratio * 24)));
  }

  startResize(sourceEl: HTMLElement, pageX: number, field: FieldConfig, bp: BP, onUpdate: (field: FieldConfig, span: number) => void, onEnd?: () => void) {
    const grid = sourceEl.closest('.fields.grid') as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    this._resizing = { field, bp, containerLeft: rect.left + window.scrollX, containerWidth: rect.width, onUpdate, onEnd };
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  private _onMouseMove = (ev: MouseEvent) => {
    if (!this._resizing) return;
    const { field, containerLeft, containerWidth, onUpdate } = this._resizing;
    const span = this.computeSpanFromPointer(containerLeft, containerWidth, ev.pageX);
    onUpdate(field, span);
  };

  private _onMouseUp = () => {
    const end = this._resizing?.onEnd;
    this._resizing = null;
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    if (end) try { end(); } catch {}
  };
}
