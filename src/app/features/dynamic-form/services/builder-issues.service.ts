import { Injectable } from '@angular/core';
import type { FormSchema, FieldConfig, SectionConfig, StepConfig } from '../../../modules/dynamic-form/dynamic-form.service';

export interface DuplicateIssueItem { key: string; objs: any[]; }
export interface InvalidRefIssueItem { kind: 'step'|'section'|'field'; obj: any; title?: string; prop: 'visibleIf'|'requiredIf'|'disabledIf'; missing: string[]; }

@Injectable({ providedIn: 'root' })
export class BuilderIssuesService {
  private allFieldKeys(schema: FormSchema): string[] {
    const keys = new Set<string>();
    const walk = (arr?: FieldConfig[]) => {
      for (const f of (arr || [])) {
        if ((f as any).type === 'section') walk((f as any).fields);
        else { const k = (f as any).key; if (k) keys.add(k); }
      }
    };
    if (schema.steps?.length) schema.steps.forEach(s => walk(s.fields as any)); else walk(schema.fields as any);
    return Array.from(keys);
  }

  private collectRuleVars(rule: any, acc = new Set<string>()): Set<string> {
    if (!rule) return acc;
    if (Array.isArray(rule)) { rule.forEach(r => this.collectRuleVars(r, acc)); return acc; }
    if (typeof rule === 'object') {
      for (const [k,v] of Object.entries(rule)) {
        if (k === 'var') { if (typeof v === 'string') acc.add(v); }
        else this.collectRuleVars(v as any, acc);
      }
    }
    return acc;
  }

  private forEachEntity(schema: FormSchema, cb: (ent: { kind: 'step'|'section'|'field'; obj: any; title?: string }) => void) {
    if (schema.steps?.length) {
      for (const st of schema.steps) {
        cb({ kind: 'step', obj: st, title: st.title });
        for (const it of (st.fields || [])) {
          if ((it as any).type === 'section') {
            const sec = it as any;
            cb({ kind: 'section', obj: sec, title: sec.title });
            for (const f of (sec.fields || [])) cb({ kind: 'field', obj: f, title: (f as any).label || (f as any).key });
          } else cb({ kind: 'field', obj: it, title: (it as any).label || (it as any).key });
        }
      }
    } else {
      for (const it of (schema.fields || [])) {
        if ((it as any).type === 'section') {
          const sec = it as any; cb({ kind: 'section', obj: sec, title: sec.title });
          for (const f of (sec.fields || [])) cb({ kind: 'field', obj: f, title: (f as any).label || (f as any).key });
        } else cb({ kind: 'field', obj: it, title: (it as any).label || (it as any).key });
      }
    }
  }

  findDuplicates(schema: FormSchema): DuplicateIssueItem[] {
    const map = new Map<string, any[]>();
    this.forEachEntity(schema, ent => {
      if (ent.kind === 'field') {
        const k = (ent.obj as any).key;
        if (k) {
          const a = map.get(k) || [];
          a.push(ent.obj);
          map.set(k, a);
        }
      }
    });
    const out: DuplicateIssueItem[] = [];
    for (const [key, objs] of map.entries()) if (objs.length > 1) out.push({ key, objs });
    return out;
  }

  findInvalidConditionRefs(schema: FormSchema): InvalidRefIssueItem[] {
    const all = new Set(this.allFieldKeys(schema));
    const props: Array<'visibleIf'|'requiredIf'|'disabledIf'> = ['visibleIf','requiredIf','disabledIf'];
    const out: InvalidRefIssueItem[] = [];
    this.forEachEntity(schema, ent => {
      for (const p of props) {
        const rule = (ent.obj as any)[p];
        if (!rule) continue;
        const used = Array.from(this.collectRuleVars(rule));
        const missing = used.filter(k => !all.has(k));
        if (missing.length) out.push({ kind: ent.kind, obj: ent.obj, title: ent.title, prop: p, missing });
      }
    });
    return out;
  }
}

