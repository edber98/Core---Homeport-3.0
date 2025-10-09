import { Injectable } from '@angular/core';
import type { UiBreakpoint } from './ui-breakpoints.service';

export type UiState = 'base'|'hover'|'active'|'focus';

export interface UiClassDef {
  name: string; // single name or combo token (e.g., 'btn.primary.small')
  parts: string[]; // ['btn','primary','small']
  styles: {
    [state in UiState]?: {
      base?: Record<string, string>;
      bp?: Partial<Record<UiBreakpoint | string, Record<string, string>>>;
    }
  };
}

@Injectable({ providedIn: 'root' })
export class UiClassStyleService {
  classes: UiClassDef[] = [];

  list(): UiClassDef[] { return this.classes; }
  find(name: string): UiClassDef | undefined { return this.classes.find(c => c.name === name); }
  ensure(name: string): UiClassDef {
    const existing = this.find(name); if (existing) return existing;
    const parts = name.split('.').filter(Boolean);
    const def: UiClassDef = { name, parts, styles: {} };
    this.classes = [...this.classes, def];
    return def;
  }
  rename(oldName: string, newName: string) {
    const it = this.find(oldName); if (!it) return; it.name = newName; it.parts = newName.split('.').filter(Boolean);
  }
  remove(name: string) { this.classes = this.classes.filter(c => c.name !== name); }

  setStyles(name: string, state: UiState, bp: UiBreakpoint | 'auto', styles: Record<string,string>) {
    const it = this.ensure(name);
    const target = (it.styles[state] = it.styles[state] || {});
    if (bp === 'auto') { target.base = styles; } else { target.bp = { ...(target.bp || {}), [bp]: styles }; }
  }
  getStyles(name: string, state: UiState, bp: UiBreakpoint | 'auto'): Record<string,string> {
    const it = this.find(name); if (!it) return {};
    const s = it.styles[state]; if (!s) return {};
    const base = s.base || {};
    const over = (bp !== 'auto' ? (s.bp?.[bp] || {}) : {});
    return { ...base, ...over };
  }

  effectiveForClasses(classList: string[] | undefined, state: UiState, bp: UiBreakpoint | 'auto'): Record<string,string> {
    const out: Record<string,string> = {};
    const list = classList || [];
    // 1) Apply single class styles in order
    list.forEach(name => { Object.assign(out, this.getStyles(name, state, bp)); });
    // 2) Apply combo class styles when all parts are present (e.g., 'btn.primary')
    for (const def of this.classes) {
      if (!def.parts || def.parts.length <= 1) continue;
      const hasAll = def.parts.every(p => list.includes(p));
      if (!hasAll) continue;
      Object.assign(out, this.getStyles(def.name, state, bp));
    }
    return out;
  }
}
