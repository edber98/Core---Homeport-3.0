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
    // Utilise une évaluation locale basée sur l'objet de valeurs (supporte aussi les champs d'array)
    return !!this.evalRuleLocal(rule, value || {});
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
    const value = val || {};
    const out: Record<string, { visible: boolean; disabled: boolean; required: boolean; label: string }> = {};
    const visit = (fields?: any[]) => {
      (fields || []).forEach((f: any) => {
        if (f.type === 'section' || f.type === 'section_array') {
          // Les sous-sections array ne sont pas “visitées” niveau item ici (simulation globale),
          // mais on descend dans les sections classiques pour récupérer les champs
          if (f.type === 'section') visit(f.fields || []);
        } else if (f.type !== 'textblock') {
          const key = f.key;
          const vis = f.visibleIf ? !!this.evalRuleLocal(f.visibleIf, value) : true;
          const dis = f.disabledIf ? !!this.evalRuleLocal(f.disabledIf, value) : false;
          const req = f.requiredIf ? !!this.evalRuleLocal(f.requiredIf, value) : false;
          out[key] = { visible: vis, disabled: dis || !vis, required: req && vis && !dis, label: f.label || f.key || 'Field' };
        }
      });
    };
    if (schema.steps?.length) schema.steps.forEach(st => { if (st.visibleIf ? !!this.evalRuleLocal(st.visibleIf, value) : true) visit(st.fields || []); });
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
      if (f.type === 'section' || f.type === 'section_array') visit(f.fields || []);
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

  // ===== Test generation =====
  enumerateScenarios(schema: FormSchema): Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> {
    const out: Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> = [];
    const describe = (rule: any) => this.describeRule(rule);
    const pushRule = (target: any, kind: 'visibleIf'|'requiredIf'|'disabledIf', rule: any, ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      const patch = this.ruleToAssignments(schema, rule);
      const title = (target?.title || target?.label || target?.key || 'Cible');
      const desc = describe(rule);
      const label = `${kind} • ${title}`;
      out.push({ label, description: ctx?.arrayKey ? `${ctx.arrayTitle || ctx.arrayKey}[0] · ${desc}` : desc, patch, arrayKey: ctx?.arrayKey, arrayTitle: ctx?.arrayTitle });
    };
    const visit = (fields?: any[], ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      (fields || []).forEach(f => {
        if (f.type === 'section' || f.type === 'section_array') {
          const nextCtx = (f.type === 'section_array' || f.mode === 'array') ? { arrayKey: f.key, arrayTitle: f.title || ctx?.arrayTitle } : ctx;
          if (f.visibleIf) pushRule(f, 'visibleIf', f.visibleIf, nextCtx);
          visit(f.fields || [], nextCtx);
        } else if (f.type !== 'textblock') {
          if (f.visibleIf) pushRule(f, 'visibleIf', f.visibleIf, ctx);
          if (f.requiredIf) pushRule(f, 'requiredIf', f.requiredIf, ctx);
          if (f.disabledIf) pushRule(f, 'disabledIf', f.disabledIf, ctx);
        }
      });
    };
    if (schema.steps?.length) schema.steps.forEach(st => { if (st.visibleIf) pushRule(st, 'visibleIf', st.visibleIf); visit(st.fields || [], undefined); });
    else visit(schema.fields || [], undefined);
    return out;
  }

  enumerateFormScenarios(schema: FormSchema): Array<{ label: string; description: string; value: Record<string, any> }> {
    const scenarios: Array<{ label: string; description: string; value: Record<string, any> }> = [];
    const baseline = this.buildValidBaseline(schema);
    scenarios.push({ label: 'Baseline (tout rempli)', description: 'Remplit tout le formulaire avec des valeurs plausibles (1 item/array).', value: baseline });

    // Par step: activer la première règle de chaque entité (si présente) sur la baseline
    const steps = schema.steps?.length ? schema.steps : [{ title: schema.title || 'Form', fields: schema.fields }] as any[];
    steps.forEach((st: any, si: number) => {
      const label = steps.length > 1 ? `Step ${si + 1} (règles principales)` : 'Form (règles principales)';
      const desc = 'Active une hypothèse par entité pour ce bloc.';
      const val = JSON.parse(JSON.stringify(baseline));
      const apply = (patch: any, arrayKey?: string) => {
        if (arrayKey) {
          const arr = val[arrayKey] = Array.isArray(val[arrayKey]) ? val[arrayKey] : [{}];
          arr[0] = { ...(arr[0] || {}), ...patch };
        } else Object.assign(val, patch);
      };
      const rules = this.enumerateScenarios({ ...schema, fields: st.fields, steps: undefined } as any);
      // garder au plus 1 patch par entité cible (field/section)
      const seen = new Set<string>();
      for (const r of rules) {
        const sig = `${r.arrayKey || 'root'}:${JSON.stringify(r.patch)}`;
        if (seen.has(sig)) continue; seen.add(sig);
        apply(r.patch, r.arrayKey);
      }
      scenarios.push({ label, description: desc, value: val });
    });
    return scenarios;
  }

  buildValidBaseline(schema: FormSchema): Record<string, any> {
    const val: Record<string, any> = {};
    const visit = (fields?: any[], target: any = val) => {
      (fields || []).forEach(f => {
        if (f.type === 'section') visit(f.fields || [], target);
        else if (f.type === 'section_array' || f.mode === 'array') {
          const key = f.key || 'items';
          const item: any = {};
          visit(f.fields || [], item);
          target[key] = [item];
        } else if (f.type !== 'textblock') {
          target[f.key] = this.truthySampleForField(f);
        }
      });
    };
    if (schema.steps?.length) schema.steps.forEach(st => visit(st.fields || [], val)); else visit(schema.fields || [], val);
    return val;
  }

  // ===== Global form test cases (per-field variations)
  enumerateFieldVariations(schema: FormSchema): Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> {
    const out: Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> = [];
    const valsFor = (f: any): any[] => {
      if (!f) return [];
      switch (f.type) {
        case 'checkbox': return [false, true];
        case 'select':
        case 'radio': {
          const opts = Array.isArray(f.options) ? f.options : [];
          return opts.slice(0, 3).map((o: any) => o.value).filter((v: any) => v !== undefined);
        }
        case 'number': {
          const vs = [] as number[];
          const validators = Array.isArray(f.validators) ? f.validators : [];
          const minV = validators.find((v: any) => v?.type === 'min')?.value;
          const maxV = validators.find((v: any) => v?.type === 'max')?.value;
          if (typeof minV === 'number') { vs.push(minV, minV + 1); }
          if (typeof maxV === 'number') { vs.push(maxV - 1, maxV); }
          if (!vs.length) vs.push(0, 1);
          // Unique keep order
          return vs.filter((v, i) => vs.indexOf(v) === i);
        }
        case 'date': return [new Date()];
        default: return ['x']; // text / textarea
      }
    };
    const push = (title: string, key: string, v: any, ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      const patch: any = { [key]: v };
      const label = `${title}`;
      const desc = `${title} = ${typeof v === 'string' ? `'${v}'` : String(v)}`;
      out.push({ label, description: ctx?.arrayKey ? `${ctx.arrayTitle || ctx.arrayKey}[0] · ${desc}` : desc, patch, arrayKey: ctx?.arrayKey, arrayTitle: ctx?.arrayTitle });
    };
    const visit = (fields?: any[], ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      (fields || []).forEach(f => {
        if (f.type === 'section' || f.type === 'section_array') {
          const nextCtx = (f.type === 'section_array' || f.mode === 'array') ? { arrayKey: f.key, arrayTitle: f.title || ctx?.arrayTitle } : ctx;
          visit(f.fields || [], nextCtx);
        } else if (f.type !== 'textblock') {
          const values = valsFor(f);
          values.forEach(v => push(f.label || f.key || 'Field', f.key, v, ctx));
        }
      });
    };
    if (schema.steps?.length) schema.steps.forEach(st => visit(st.fields || [], undefined)); else visit(schema.fields || [], undefined);
    return out;
  }
}
