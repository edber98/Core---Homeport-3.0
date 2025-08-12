import { Injectable } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { formatDate } from '@angular/common';

type JSONVal = any;

export interface FieldValidator {
    type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern';
    value?: any;
    message?: string;
}

export type FieldTypeInput = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'date';
export type FieldType = FieldTypeInput | 'textblock';

export interface FieldConfigCommon {
    type: FieldType;
    label?: string;
    placeholder?: string;
    description?: string;
    options?: { label: string; value: any }[]; // select/radio
    default?: any;
    validators?: FieldValidator[];
    visibleIf?: JSONVal;
    requiredIf?: JSONVal;
    disabledIf?: JSONVal;
    col?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>;
    textHtml?: string; // textblock
}

export interface InputFieldConfig extends FieldConfigCommon {
    type: FieldTypeInput;
    key: string;
}

export interface TextBlockFieldConfig extends FieldConfigCommon {
    type: 'textblock';
    key?: undefined;
}

export type FieldConfig = InputFieldConfig | TextBlockFieldConfig;

export interface SectionConfig {
    key?: string;
    title?: string;
    description?: string;
    grid?: { gutter?: number };
    visibleIf?: JSONVal;
    fields: FieldConfig[];
}

export interface StepConfig {
    key?: string;
    title: string;
    visibleIf?: JSONVal;
    /**
     * Sections de l'étape. Si `style === 'tabs'`, ces sections sont rendues en onglets.
     */
    sections: SectionConfig[];
    /**
     * Champs à la racine de l'étape (optionnels), sans devoir créer une section.
     */
    fields?: FieldConfig[];
    /**
     * Rendu des sections: 'stack' (défaut) ou 'tabs'.
     */
    style?: 'stack' | 'tabs';
}

export interface FormUI {
    layout?: 'horizontal' | 'vertical' | 'inline';
    labelAlign?: 'left' | 'right';
    labelsOnTop?: boolean;
    labelCol?: { span?: number; offset?: number };
    controlCol?: { span?: number; offset?: number };
    widthPx?: number;
}

export interface SummaryConfig {
    enabled: boolean;
    title?: string;               // défaut: "Résumé"
    includeHidden?: boolean;      // défaut: false (n'affiche que les champs visibles)
    dateFormat?: string;          // défaut: 'yyyy-MM-dd'
}

export interface FormSchema {
    title?: string;
    ui?: FormUI;
    steps?: StepConfig[];
    sections?: SectionConfig[];
    fields?: FieldConfig[];
    summary?: SummaryConfig;      // <— AJOUT
}

export const isInputField = (f: FieldConfig): f is InputFieldConfig => f.type !== 'textblock';

@Injectable({ providedIn: 'root' })
export class DynamicFormService {

    private locale = 'fr-FR';

    constructor(private fb: FormBuilder) { }

    buildForm(schema: FormSchema, initialValue?: Record<string, any>): FormGroup {
        const controls: Record<string, FormControl> = {};
        for (const f of this.collectFields(schema)) {
            if (!isInputField(f)) continue;
            const v = this.initialValueForField(f, initialValue);
            controls[f.key] = this.fb.control(v, this.mapValidators(f.validators || []));
        }
        const form = this.fb.group(controls);

        // règles + réactivité
        this.applyRules(schema, form);
        form.valueChanges.subscribe(() => this.applyRules(schema, form));
        return form;
    }

    collectFields(schema: FormSchema): FieldConfig[] {
        const out: FieldConfig[] = [];
        if (schema.steps?.length) {
            for (const st of schema.steps) {
                for (const f of (st.fields || [])) out.push(f);
                for (const sec of st.sections || []) for (const f of sec.fields || []) out.push(f);
            }
        } else {
            if (schema.sections?.length) {
                for (const sec of schema.sections) for (const f of sec.fields || []) out.push(f);
            }
            if (schema.fields?.length) {
                for (const f of schema.fields) out.push(f);
            }
        }
        return out;
    }

    /** Jamais undefined : value > default > neutre par type */
    private initialValueForField(f: InputFieldConfig, initial?: Record<string, any>) {
        const hasKey = !!initial && Object.prototype.hasOwnProperty.call(initial, f.key);
        const candidate = hasKey ? (initial as any)[f.key] : (f.default !== undefined ? f.default : undefined);
        return this.neutralize(f.type, candidate);
    }

    /** Force une valeur neutre quand undefined */
    neutralize(type: FieldTypeInput, v: any) {
        if (v === undefined) {
            switch (type) {
                case 'checkbox': return false;
                case 'number':
                case 'select':
                case 'radio':
                case 'date': return null;
                default: return ''; // text / textarea
            }
        }
        return v;
    }

    // Visibilité
    isStepVisible(s: StepConfig, form: FormGroup) { return s.visibleIf ? this.evalRule(s.visibleIf, form) !== false : true; }
    isSectionVisible(s: SectionConfig, form: FormGroup) { return s.visibleIf ? this.evalRule(s.visibleIf, form) !== false : true; }
    isFieldVisible(f: FieldConfig, form: FormGroup) { return f.visibleIf ? this.evalRule(f.visibleIf, form) !== false : true; }

    // Cols
    getFieldSpans(field: FieldConfig) {
        const col = field.col || { xs: 24 };
        return {
            xs: col.xs ?? 24,
            sm: col.sm ?? col.xs ?? 24,
            md: col.md ?? col.sm ?? col.xs ?? 24,
            lg: col.lg ?? col.md ?? col.sm ?? col.xs ?? 24,
            xl: col.xl ?? col.lg ?? col.md ?? col.sm ?? col.xs ?? 24
        };
    }

    private applyRules(schema: FormSchema, form: FormGroup) {
        for (const f of this.collectFields(schema)) {
            if (!isInputField(f)) continue;
            const ctrl = form.get(f.key);
            if (!ctrl) continue;

            // disabled
            const shouldDisable = f.disabledIf ? this.evalRule(f.disabledIf, form) === true : false;
            shouldDisable ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false });

            // required
            const base = this.mapValidators(f.validators || []);
            const needReq = f.requiredIf ? this.evalRule(f.requiredIf, form) === true : false;
            ctrl.setValidators(needReq ? [...base, Validators.required] : base);

            // sécurité "pas d'undefined" si l'app t'envoie une value ensuite
            const val = ctrl.value;
            const sane = this.neutralize(f.type, val);
            if (sane !== val) ctrl.setValue(sane, { emitEvent: false });

            ctrl.updateValueAndValidity({ emitEvent: false });
        }
    }

    /** Retourne les champs "input" (hors textblock) réellement affichés */
    visibleInputFields(schema: FormSchema, form: FormGroup): FieldConfig[] {
        const all = this.flattenAllInputFields(schema);
        return all.filter(f => this.isVisible(f, form.value)); // ta logique existante visibleIf(...)
    }

    isVisible(field: FieldConfig, formValue: any): boolean {
        if (field.visibleIf) {
            return this.evalRule(field.visibleIf, { value: formValue } as any) !== false;
        }
        return true;
    }

    /** Aplatis tous les champs "input" (steps/sections/flat), sans filtrer la visibilité */
    flattenAllInputFields(schema: FormSchema): FieldConfig[] {
        const push = (acc: FieldConfig[], fs?: FieldConfig[]) => {
            if (!fs) return acc;
            fs.forEach(f => { if (f.type !== 'textblock') acc.push(f); });
            return acc;
        };
        let out: FieldConfig[] = [];
        if (schema.fields) out = push(out, schema.fields);
        if (schema.sections) schema.sections.forEach(s => push(out, s.fields));
        if (schema.steps) schema.steps.forEach(st => st.sections?.forEach(s => push(out, s.fields)));
        return out;
    }

    /** Map value → affichage (labels options, booléen, date, vide par type) */
    displayValue(field: FieldConfig, raw: any, schema: FormSchema): string {
        // valeurs “par défaut d’affichage” si vide/undefined
        const emptyByType: Record<string, string> = {
            text: '—',
            textarea: '—',
            number: '—',
            select: '—',
            radio: '—',
            checkbox: 'Non',
            date: '—'
        };
        if (raw === undefined || raw === null || raw === '') {
            return emptyByType[field.type] ?? '—';
        }

        // mapping options → label
        if ((field.type === 'select' || field.type === 'radio') && field.options?.length) {
            const hit = field.options.find(o => o.value === raw);
            return (hit?.label ?? String(raw)) || '—';
        }

        // checkbox
        if (field.type === 'checkbox') return raw ? 'Oui' : 'Non';

        // date
        if (field.type === 'date') {
            const fmt = schema.summary?.dateFormat || 'yyyy-MM-dd';
            try {
                return formatDate(raw, fmt, this.locale);
            } catch {
                return String(raw);
            }
        }

        // number/text/textarea
        return String(raw);
    }

    /** Regroupe par step/section pour un rendu “propre” avec liens d’édition */
    buildSummaryModel(schema: FormSchema, form: FormGroup, includeHidden = false) {
        const value = form.value;
        const byStep: Array<{
            title: string;
            sections: Array<{
                title?: string;
                rows: Array<{ key: string; label: string; value: string }>;
            }>;
        }> = [];

        const considerField = (f: FieldConfig) =>
            includeHidden || this.isVisible(f, value);

        if (schema.steps?.length) {
            schema.steps.forEach((step, si) => {
                if (!includeHidden && step.visibleIf && !this.evalRule(step.visibleIf, value)) return;
                const stepBlock = { title: step.title || `Étape ${si + 1}`, sections: [] as any[] };
                // champs racine de l'étape
                const rootRows = (step.fields || [])
                    .filter(f => f.type !== 'textblock')
                    .filter(considerField)
                    .map(f => ({
                        key: (f as any).key,
                        label: f.label || (f as any).key || '',
                        value: this.displayValue(f, value[(f as any).key], schema)
                    }));
                if (rootRows.length) stepBlock.sections.push({ title: undefined, rows: rootRows });
                step.sections?.forEach(sec => {
                    const rows = (sec.fields || [])
                        .filter(f => f.type !== 'textblock')
                        .filter(considerField)
                        .map(f => ({
                            key: (f as any).key,
                            label: f.label || (f as any).key || '',
                            value: this.displayValue(f, value[(f as any).key], schema)
                        }));
                    if (rows.length) stepBlock.sections.push({ title: sec.title, rows });
                });
                if (stepBlock.sections.length) byStep.push(stepBlock);
            });
        } else {
            const stepBlock = { title: schema.title || 'Résumé', sections: [] as any[] };
            (schema.sections || []).forEach(sec => {
                const rows = (sec.fields || [])
                    .filter(f => f.type !== 'textblock')
                    .filter(considerField)
                    .map(f => ({
                        key: (f as any).key,
                        label: f.label || (f as any).key || '',
                        value: this.displayValue(f, value[(f as any).key], schema)
                    }));
                if (rows.length) stepBlock.sections.push({ title: sec.title, rows });
            });
            const flatRows = (schema.fields || [])
                .filter(f => f.type !== 'textblock')
                .filter(considerField)
                .map(f => ({
                    key: (f as any).key,
                    label: f.label || (f as any).key || '',
                    value: this.displayValue(f, value[(f as any).key], schema)
                }));
            if (flatRows.length) stepBlock.sections.push({ rows: flatRows } as any);
            if (stepBlock.sections.length) byStep.push(stepBlock);
        }

        return byStep;
    }

    private evalRule(rule: any, form: FormGroup): any {
        if (rule === null || rule === undefined) return undefined;
        if (typeof rule !== 'object') return rule;
        const [op] = Object.keys(rule);
        const args = rule[op];

        const val = (x: any) => {
            if (x && typeof x === 'object' && 'var' in x) return form.get(x.var)?.value;
            return (typeof x === 'object') ? this.evalRule(x, form) : x;
        };

        switch (op) {
            case 'var': return form.get(args)?.value;
            case 'not': return !val(args);
            case 'all': return (args as any[]).every(a => !!val(a));
            case 'any': return (args as any[]).some(a => !!val(a));
            case '==': return val(args[0]) === val(args[1]);
            case '!=': return val(args[0]) !== val(args[1]);
            case '>': return val(args[0]) > val(args[1]);
            case '>=': return val(args[0]) >= val(args[1]);
            case '<': return val(args[0]) < val(args[1]);
            case '<=': return val(args[0]) <= val(args[1]);
            default: return true;
        }
    }

    private mapValidators(vs: FieldValidator[]) {
        const arr = [];
        for (const v of vs) {
            switch (v.type) {
                case 'required': arr.push(Validators.required); break;
                case 'min': arr.push(Validators.min(v.value)); break;
                case 'max': arr.push(Validators.max(v.value)); break;
                case 'minLength': arr.push(Validators.minLength(v.value)); break;
                case 'maxLength': arr.push(Validators.maxLength(v.value)); break;
                case 'pattern': arr.push(Validators.pattern(v.value)); break;
            }
        }
        return arr;
    }
}
