import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { DynamicFormService } from '../../../modules/dynamic-form/dynamic-form.service';
import type { FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

@Injectable({ providedIn: 'root' })
export class BuilderPreviewService {
  constructor(private dfs: DynamicFormService) {}

  describeRule(rule: any): string {
    if (rule == null) return '';
    if (Array.isArray(rule.any)) return '(' + (rule.any as any[]).map(r => this.describeRule(r)).join(') OU (') + ')';
    if (Array.isArray(rule.all)) return '(' + (rule.all as any[]).map(r => this.describeRule(r)).join(') ET (') + ')';
    if (rule.var) return `${rule.var} est renseigné`;
    if (rule.not && rule.not.var) return `${rule.not.var} n'est pas renseigné`;
    const op = Object.keys(rule)[0];
    const args = (rule as any)[op] || [];
    const field = args[0]?.var ?? '';
    const val = args[1];
    const valStr = typeof val === 'string' ? `'${val}'` : String(val);
    switch (op) {
      case '==': return `${field} est égal à ${valStr}`;
      case '!=': return `${field} est différent de ${valStr}`;
      case '>': return `${field} est supérieur à ${valStr}`;
      case '>=': return `${field} est supérieur ou égal à ${valStr}`;
      case '<': return `${field} est inférieur à ${valStr}`;
      case '<=': return `${field} est inférieur ou égal à ${valStr}`;
      default: return JSON.stringify(rule);
    }
  }

  isRuleSatisfied(schema: FormSchema, rule: any, value: Record<string, any>): boolean {
    const form = this.dfs.buildForm(schema as any, value);
    return !!this.evalRuleLocal(rule, form);
  }

  displayChoiceLabel(schema: FormSchema, key: string, value: any): string {
    const map = this.fieldByKey(schema);
    const f = map[key];
    if (!f) return String(value);
    if (f.type === 'checkbox') return value ? 'Oui' : 'Non';
    if ((f.type === 'select' || f.type === 'radio') && Array.isArray(f.options)) {
      const hit = f.options.find((o: any) => value === o.value);
      return hit ? `${hit.label} (${JSON.stringify(value)})` : String(value);
    }
    if (f.type === 'date') {
      try { return new Date(value).toISOString().slice(0, 10); } catch { return String(value); }
    }
    return String(value);
  }

  measureState(schema: FormSchema, val: Record<string, any>): Record<string, { visible: boolean; disabled: boolean; required: boolean; label: string }> {
    const form = this.dfs.buildForm(schema as any, val);
    const out: Record<string, { visible: boolean; disabled: boolean; required: boolean; label: string }> = {};
    const visit = (fields?: any[]) => {
      (fields || []).forEach((f: any) => {
        if (f.type === 'section') {
          if (this.dfs.isSectionVisible(f, form)) visit(f.fields || []);
        } else if (f.type !== 'textblock') {
          const key = f.key; const ctrl = form.get(key);
          const vis = this.dfs.isFieldVisible(f, form);
          const disabled = !!ctrl?.disabled;
          const required = !!ctrl?.hasValidator?.(Validators.required);
          out[key] = { visible: vis, disabled, required, label: f.label || f.key || 'Field' };
        }
      });
    };
    if (schema.steps?.length) schema.steps.forEach(st => { if (this.dfs.isStepVisible(st, form)) visit(st.fields || []); });
    else visit(schema.fields || []);
    return out;
  }

  ruleToAssignments(schema: FormSchema, rule: any): Record<string, any> {
    const map = this.fieldByKey(schema);
    const merge = (a: Record<string, any>, b: Record<string, any>) => ({ ...a, ...b });
    const assignEq = (field: string, value: any) => ({ [field]: value });
    if (rule == null) return {};
    if (typeof rule !== 'object') return {};
    if (Array.isArray(rule.any)) {
      const first = (rule.any as any[])[0];
      return this.ruleToAssignments(schema, first);
    }
    if (Array.isArray(rule.all)) {
      return (rule.all as any[]).reduce((acc, r) => merge(acc, this.ruleToAssignments(schema, r)), {} as Record<string, any>);
    }
    if (rule.var) {
      const key = rule.var;
      const f = map[key];
      return assignEq(key, this.truthySampleForField(f));
    }
    const op = Object.keys(rule)[0];
    const args = (rule as any)[op] || [];
    const lhs = args[0];
    const rhs = args[1];
    const getKey = (x: any) => (x && typeof x === 'object' && x.var) ? x.var : undefined;
    const k = getKey(lhs);
    const f = k ? map[k] : undefined;
    switch (op) {
      case '==':
        if (k !== undefined) return assignEq(k, rhs);
        return {};
      case '!=':
        if (k !== undefined) {
          if (f?.options?.length) {
            const other = f.options.find((o: any) => o.value !== rhs)?.value;
            if (other !== undefined) return assignEq(k, other);
          }
          return assignEq(k, this.falseySampleForField(f));
        }
        return {};
      case '>':
      case '>=':
        if (k !== undefined) {
          const base = Number(rhs);
          if (!isNaN(base)) return assignEq(k, (op === '>') ? base + 1 : base);
        }
        return {};
      case '<':
      case '<=':
        if (k !== undefined) {
          const base2 = Number(rhs);
          if (!isNaN(base2)) return assignEq(k, (op === '<') ? base2 - 1 : base2);
        }
        return {};
      case 'not':
        if (args && typeof args === 'object' && 'var' in args) {
          const key2 = (args as any).var;
          return assignEq(key2, this.falseySampleForField(map[key2]));
        }
        return {};
      default:
        return {};
    }
  }

  // ---- helpers ----
  private fieldByKey(schema: FormSchema): Record<string, any> {
    const map: Record<string, any> = {};
    const visit = (fields?: any[]) => (fields || []).forEach(f => {
      if (f.type === 'section') visit(f.fields || []);
      else if (f.type !== 'textblock' && f.key) map[f.key] = f;
    });
    if (schema.steps?.length) schema.steps.forEach(st => visit(st.fields)); else visit(schema.fields);
    return map;
  }
  private truthySampleForField(f: any): any {
    switch (f?.type) {
      case 'checkbox': return true;
      case 'number': return 1;
      case 'date': return new Date();
      case 'select':
      case 'radio': return f?.options?.[0]?.value ?? 'x';
      default: return 'x';
    }
  }
  private falseySampleForField(f: any): any {
    switch (f?.type) {
      case 'checkbox': return false;
      case 'number': return 0;
      case 'date': return null;
      default: return '';
    }
  }

  private evalRuleLocal(rule: any, formOrValue: any): any {
    if (rule === null || rule === undefined) return undefined;
    if (typeof rule !== 'object') return rule;
    const [op] = Object.keys(rule);
    const args = (rule as any)[op];
    const getByVar = (src: any, path: string) => {
      if (!path) return undefined;
      if (src && typeof src.get === 'function') return src.get(path)?.value;
      return path.split('.').reduce((acc: any, k: string) => (acc == null ? undefined : acc[k]), src);
    };
    const val = (x: any) => {
      if (x && typeof x === 'object' && 'var' in x) return getByVar(formOrValue, (x as any).var);
      return (typeof x === 'object') ? this.evalRuleLocal(x, formOrValue) : x;
    };
    switch (op) {
      case 'var': return getByVar(formOrValue, args);
      case 'not': return !val(args);
      case 'all': return (args as any[]).every((a: any) => !!val(a));
      case 'any': return (args as any[]).some((a: any) => !!val(a));
      case '==': return val(args[0]) === val(args[1]);
      case '!=': return val(args[0]) !== val(args[1]);
      case '>': return val(args[0]) > val(args[1]);
      case '>=': return val(args[0]) >= val(args[1]);
      case '<': return val(args[0]) < val(args[1]);
      case '<=': return val(args[0]) <= val(args[1]);
      default: return true;
    }
  }
}

