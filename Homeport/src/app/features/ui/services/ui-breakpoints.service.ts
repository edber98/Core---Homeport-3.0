import { Injectable } from '@angular/core';

export type UiBreakpoint = 'xs'|'sm'|'md'|'lg'|'xl';
export interface UiBreakpointDef { id: UiBreakpoint | string; label: string; min?: number; max?: number; }

@Injectable({ providedIn: 'root' })
export class UiBreakpointsService {
  list: UiBreakpointDef[] = [
    { id: 'xs', label: 'XS', max: 575 },
    { id: 'sm', label: 'SM', min: 576, max: 767 },
    { id: 'md', label: 'MD', min: 768, max: 991 },
    { id: 'lg', label: 'LG', min: 992, max: 1279 },
    { id: 'xl', label: 'XL', min: 1280 },
  ];
  current: UiBreakpoint | 'auto' = 'auto';
  cascadeLock = false; // when true, edits at BP also propagate/lock at base

  add(bp: UiBreakpointDef) { this.list = [...this.list, bp]; }
  remove(id: string) { this.list = this.list.filter(b => b.id !== id); }
  setCurrent(id: UiBreakpoint | 'auto') { this.current = id; }
  setCascadeLock(v: boolean) { this.cascadeLock = v; }
}

