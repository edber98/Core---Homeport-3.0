import { Injectable } from '@angular/core';
import { UiNode } from '../ui-model.service';
import { UiClassStyleService, UiState } from './ui-class-style.service';
import type { UiBreakpoint } from './ui-breakpoints.service';

@Injectable({ providedIn: 'root' })
export class UiValidationService {
  constructor(private cls: UiClassStyleService) {}

  // Returns the list of classes (single or combo) that define a given CSS property
  collisionClassesFor(node: UiNode | null | undefined, prop: string, state: UiState = 'base', bp: UiBreakpoint | 'auto' = 'auto'): string[] {
    if (!node) return [];
    const list = node.classes || [];
    const defs = this.cls.list();
    const names = new Set<string>();
    // Direct classes
    list.forEach(n => names.add(n));
    // Combo classes: add those whose parts are all present on the node
    for (const def of defs) {
      if (!def.parts || def.parts.length <= 1) continue;
      const hasAll = def.parts.every(p => list.includes(p));
      if (hasAll) names.add(def.name);
    }
    const out: string[] = [];
    for (const name of names) {
      const style = this.cls.getStyles(name, state, bp);
      if (style && Object.prototype.hasOwnProperty.call(style, prop)) out.push(name);
    }
    return out.sort();
  }
}

