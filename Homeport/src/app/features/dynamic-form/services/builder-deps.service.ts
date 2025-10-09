import { Injectable } from '@angular/core';
import type { FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

@Injectable({ providedIn: 'root' })
export class BuilderDepsService {
  private nodeUsesKey(rule: any, key: string): boolean {
    if (!rule || typeof rule !== 'object') return false;
    if (rule.var === key) return true;
    for (const k of Object.keys(rule)) {
      const v: any = (rule as any)[k];
      if (Array.isArray(v)) { if (v.some(x => this.nodeUsesKey(x, key))) return true; }
      else if (typeof v === 'object') { if (this.nodeUsesKey(v, key)) return true; }
    }
    return false;
  }

  dependentsForKey(schema: FormSchema, key: string): Array<{ targetType: 'step'|'section'|'field'; kind: 'visibleIf'|'requiredIf'|'disabledIf'; label: string }>{
    const out: Array<{ targetType: 'step'|'section'|'field'; kind: 'visibleIf'|'requiredIf'|'disabledIf'; label: string }> = [];
    const visit = (fields?: any[]) => {
      (fields || []).forEach((f: any) => {
        if (f.type === 'section') {
          if (f.visibleIf && this.nodeUsesKey(f.visibleIf, key)) out.push({ targetType: 'section', kind: 'visibleIf', label: f.title || 'Section' });
          visit(f.fields || []);
        } else if (f.type !== 'textblock') {
          if (f.visibleIf && this.nodeUsesKey(f.visibleIf, key)) out.push({ targetType: 'field', kind: 'visibleIf', label: f.label || f.key || 'Field' });
          if (f.requiredIf && this.nodeUsesKey(f.requiredIf, key)) out.push({ targetType: 'field', kind: 'requiredIf', label: f.label || f.key || 'Field' });
          if (f.disabledIf && this.nodeUsesKey(f.disabledIf, key)) out.push({ targetType: 'field', kind: 'disabledIf', label: f.label || f.key || 'Field' });
        }
      });
    };
    if (schema.steps?.length) {
      schema.steps.forEach(st => {
        if (st.visibleIf && this.nodeUsesKey(st.visibleIf, key)) out.push({ targetType: 'step', kind: 'visibleIf', label: st.title || 'Step' });
        visit(st.fields || []);
      });
    } else {
      visit(schema.fields || []);
    }
    return out;
  }

  formatDependents(schema: FormSchema, key: string): string {
    const arr = this.dependentsForKey(schema, key);
    if (!arr.length) return 'Aucun';
    return arr.map(d => `${d.label} (${d.kind})`).join(', ');
  }
}

