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
export type FieldType = FieldTypeInput | 'textblock' | 'section' | 'section_array';

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
    itemStyle?: Record<string, any>; // margins/paddings/styles appliqués au conteneur
    textHtml?: string; // textblock
    // Expression support: when allowed, UI can switch the field to expression editor
    expression?: {
        allow?: boolean;            // show toggle to switch to expression editor
        showPreviewErrors?: boolean; // controls preview error display (default: true)
    };
}

export interface InputFieldConfig extends FieldConfigCommon {
    type: FieldTypeInput;
    key: string;
}

export interface TextBlockFieldConfig extends FieldConfigCommon {
    type: 'textblock';
    key?: undefined;
}

export interface SectionFieldConfig extends FieldConfigCommon {
    type: 'section' | 'section_array';
    // Si mode === 'array', une clé est requise pour stocker le FormArray
    key?: string;
    // Mode d'affichage/comportement: normal (par défaut) ou tableau d'items
    mode?: 'normal' | 'array';
    // Configuration spécifique au mode array
    array?: {
        initialItems?: number; // défaut 1
        minItems?: number;     // défaut 0
        maxItems?: number;     // optionnel
        controls?: {
            add?: { kind?: 'icon'|'text'; text?: string };
            remove?: { kind?: 'icon'|'text'; text?: string };
        };
    };
    title?: string;
    description?: string;
    titleStyle?: Record<string, any>;       // style h3
    descriptionStyle?: Record<string, any>; // style p
    grid?: { gutter?: number };
    // UI overrides (appliquées aux champs internes de cette section)
    ui?: Partial<FormUI>;
    visibleIf?: JSONVal;
    fields: FieldConfig[];
}

export type FieldConfig = InputFieldConfig | TextBlockFieldConfig | SectionFieldConfig;

// Back-compat alias
export type SectionConfig = SectionFieldConfig;

export interface StepConfig {
    key?: string;
    title: string;
    visibleIf?: JSONVal;
    fields?: FieldConfig[];
    prevText?: string;
    nextText?: string;
    prevBtn?: ButtonUI;
    nextBtn?: ButtonUI;
}

export interface FormUI {
    layout?: 'horizontal' | 'vertical' | 'inline';
    labelAlign?: 'left' | 'right';
    labelsOnTop?: boolean;
    labelCol?: { span?: number; offset?: number };
    controlCol?: { span?: number; offset?: number };
    widthPx?: number;
    containerStyle?: Record<string, any>;   // style du <form>
    actions?: {
        showReset?: boolean;
        showCancel?: boolean;
        submitText?: string;
        cancelText?: string;
        resetText?: string;
        actionsStyle?: Record<string, any>; // style de la barre d'actions
        buttonStyle?: Record<string, any>;  // style appliqué aux boutons (défaut)
        submitBtn?: ButtonUI;
        cancelBtn?: ButtonUI;
        resetBtn?: ButtonUI;
    };
}

export interface ButtonUI {
    text?: string;
    style?: Record<string, any>;
    enabled?: boolean;
    ariaLabel?: string;
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
    fields?: FieldConfig[];
    summary?: SummaryConfig;
}

export const isInputField = (f: FieldConfig): f is InputFieldConfig => (f.type !== 'textblock' && f.type !== 'section' && (f as any).type !== 'section_array');

@Injectable({ providedIn: 'root' })
export class DynamicFormService {

    private locale = 'fr-FR';
    // Mémoires pour éviter des re-applies inutiles (et boucles de validation)
    private lastDisabled = new WeakMap<FormControl, boolean>();
    private lastValidatorsSig = new WeakMap<FormControl, string>();

    constructor(private fb: FormBuilder) { }

    buildForm(schema: FormSchema, initialValue?: Record<string, any>): FormGroup {
        const controls: Record<string, FormControl> = {};
        for (const f of this.collectFields(schema)) {
            if (!isInputField(f)) continue;
            const v = this.initialValueForField(f, initialValue);
            controls[f.key] = this.fb.control(v, this.mapValidators(f.validators || []));
        }
        const form = this.fb.group(controls);

        // règles + réactivité (appliquer une fois puis écouter les changements)
        this.applyRules(schema, form);
        form.valueChanges.subscribe(() => this.applyRules(schema, form));
        return form;
    }

    collectFields(schema: FormSchema): FieldConfig[] {
        const out: FieldConfig[] = [];
        const visit = (fields?: FieldConfig[]) => {
            for (const f of fields || []) {
                if (f.type === 'section' || (f as any).type === 'section_array') {
                    // En mode tableau, les champs sont gérés dynamiquement via FormArray -> ne pas aplatir
                    if ((f as any).mode === 'array' || (f as any).type === 'section_array') continue;
                    visit((f as any).fields);
                } else {
                    out.push(f);
                }
            }
        };
        if (schema.steps?.length) {
            for (const st of schema.steps) visit(st.fields);
        } else if (schema.fields?.length) {
            visit(schema.fields);
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

    // Visibilité: un rule "truthy" => visible (compat conditions directes)
    isStepVisible(s: StepConfig, form: FormGroup) { return s.visibleIf ? !!this.evalRule(s.visibleIf, form) : true; }
    isSectionVisible(s: SectionConfig, form: FormGroup) { return s.visibleIf ? !!this.evalRule(s.visibleIf, form) : true; }
    isFieldVisible(f: FieldConfig, form: FormGroup) { return f.visibleIf ? !!this.evalRule(f.visibleIf, form) : true; }

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

            let needsUpdate = false;

            // visibilité et disabled
            const isVisible = this.isFieldVisible(f, form);
            // disabledIf OU pas visible → disable
            const shouldDisable = (f.disabledIf ? this.evalRule(f.disabledIf, form) === true : false) || !isVisible;
            // Appliquer l'état disabled de façon déterministe (évite des cas où la map de cache diverge)
            if (shouldDisable && !ctrl.disabled) { ctrl.disable({ emitEvent: false }); needsUpdate = true; }
            if (!shouldDisable && ctrl.disabled) { ctrl.enable({ emitEvent: false }); needsUpdate = true; }
            this.lastDisabled.set(ctrl as FormControl, shouldDisable);

            // required: si requiredIf est défini, il a priorité et on ignore 'required' statique dans validators
            const rawValidators = (f.validators || []);
            const base = this.mapValidators(
                f.requiredIf ? rawValidators.filter(v => v?.type !== 'required') : rawValidators
            );
            // Un champ non visible ou désactivé ne doit pas être requis.
            // Si requiredIf existe, lui seul décide du required; sinon on se fie au base (qui peut inclure required).
            const needReq = !shouldDisable && (f.requiredIf ? this.evalRule(f.requiredIf, form) === true : false);
            const sig = JSON.stringify({ validators: (f.validators || []).map(v => ({ t: v.type, v: v.value })), req: needReq });
            if (this.lastValidatorsSig.get(ctrl as FormControl) !== sig) {
                ctrl.setValidators(needReq ? [...base, Validators.required] : base);
                this.lastValidatorsSig.set(ctrl as FormControl, sig);
                needsUpdate = true;
            }

            // sécurité "pas d'undefined" si l'app t'envoie une value ensuite
            const val = ctrl.value;
            const sane = this.neutralize(f.type, val);
            if (sane !== val) {
                ctrl.setValue(sane, { emitEvent: false });
                needsUpdate = true;
            }
            if (needsUpdate) ctrl.updateValueAndValidity({ emitEvent: false });
        }
    }

    /** Retourne les champs "input" (hors textblock) réellement affichés */
    visibleInputFields(schema: FormSchema, form: FormGroup): FieldConfig[] {
        const all = this.flattenAllInputFields(schema);
        return all.filter(f => this.isFieldVisible(f, form));
    }

    /** Aplatis tous les champs "input" (steps/sections/flat), sans filtrer la visibilité */
    flattenAllInputFields(schema: FormSchema): FieldConfig[] {
        const out: FieldConfig[] = [];
        const visit = (fs?: FieldConfig[]) => {
            for (const f of fs || []) {
                if (f.type === 'section' || (f as any).type === 'section_array') visit((f as any).fields);
                else if (f.type !== 'textblock') out.push(f);
            }
        };
        if (schema.steps) schema.steps.forEach(st => { visit(st.fields); });
        if (schema.fields) visit(schema.fields);
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

        const considerField = (f: FieldConfig) => includeHidden || this.isFieldVisible(f, form);

        const sectionsFrom = (fields?: FieldConfig[], parentTitle?: string, onlySections = false) => {
            const blocks: Array<{ title?: string; rows: Array<{ key: string; label: string; value: string }> }> = [];
            const rootRows: Array<{ key: string; label: string; value: string }> = [];
            for (const f of fields || []) {
                if (f.type === 'section' || (f as any).type === 'section_array') {
                    const sec: any = f;
                    if (!includeHidden && !this.isSectionVisible(sec, form)) {
                        // skip entire section and its subtree
                        continue;
                    }
                    // Section en mode tableau => produire un bloc par item
                    if ((((sec as any).mode === 'array') || ((sec as any).type === 'section_array')) && sec.key) {
                        const arrVal: any[] = (form.value || {})[sec.key] || [];
                        const items = Array.isArray(arrVal) ? arrVal : [];
                        items.forEach((it, idx) => {
                            const rows = (sec.fields || [])
                              .filter((ff: FieldConfig) => ff.type !== 'textblock' && ff.type !== 'section' && (ff as any).type !== 'section_array')
                              .map((ff: any) => ({
                                  key: ff.key,
                                  label: ff.label || ff.key || '',
                                  value: this.displayValue(ff, it ? it[ff.key] : undefined, schema)
                              }));
                            if (rows.length) blocks.push({ title: `${sec.title || parentTitle || 'Item'} #${idx + 1}` , rows });
                        });
                        // ne pas descendre dans des sections internes (non supportées dans array pour le résumé)
                        continue;
                    }
                    // direct rows in this section
                    const directRows = (sec.fields || [])
                        .filter((ff: FieldConfig) => ff.type !== 'textblock' && ff.type !== 'section' && (ff as any).type !== 'section_array')
                        .filter(considerField)
                        .map((ff: any) => ({
                            key: ff.key,
                            label: ff.label || ff.key || '',
                            value: this.displayValue(ff, value[ff.key], schema)
                        }));
                    if (directRows.length) blocks.push({ title: sec.title, rows: directRows });
                    // nested sections: ne pas re-collecter les champs directs (évite les doublons)
                    blocks.push(
                        ...sectionsFrom(sec.fields, sec.title || parentTitle, true)
                    );
                } else if (f.type !== 'textblock') {
                    if (!onlySections && considerField(f)) rootRows.push({
                        key: (f as any).key,
                        label: f.label || (f as any).key || '',
                        value: this.displayValue(f, value[(f as any).key], schema)
                    });
                }
            }
            if (!onlySections && rootRows.length) blocks.unshift({ title: parentTitle, rows: rootRows });
            return blocks;
        };

        if (schema.steps?.length) {
            schema.steps.forEach((step, si) => {
                if (!includeHidden && !this.isStepVisible(step, form)) return;
                const stepBlock = { title: step.title || `Étape ${si + 1}`, sections: [] as any[] };
            stepBlock.sections.push(...sectionsFrom(step.fields));
                if (stepBlock.sections.length) byStep.push(stepBlock);
            });
        } else if (schema.fields?.length) {
            const stepBlock = { title: schema.title || 'Résumé', sections: [] as any[] };
            stepBlock.sections.push(...sectionsFrom(schema.fields));
            if (stepBlock.sections.length) byStep.push(stepBlock);
        }

        return byStep;
    }

    private evalRule(rule: any, formOrValue: FormGroup | any): any {
        if (rule === null || rule === undefined) return undefined;
        if (typeof rule !== 'object') return rule;
        const [op] = Object.keys(rule);
        const args = rule[op];

        const getByVar = (src: any, path: string) => {
            if (!path) return undefined;
            // FormGroup avec .get
            if (src && typeof src.get === 'function') return src.get(path)?.value;
            // Objet brut: naviguer par dot-notation
            return path.split('.').reduce((acc: any, k: string) => (acc == null ? undefined : acc[k]), src);
        };
        const val = (x: any) => {
            if (x && typeof x === 'object' && 'var' in x) return getByVar(formOrValue, (x as any).var);
            return (typeof x === 'object') ? this.evalRule(x, formOrValue) : x;
        };

        switch (op) {
            case 'var': return getByVar(formOrValue, args);
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

    // Exposé publiquement pour que les composants avancés (p.ex. array) puissent créer des contrôles
    mapValidators(vs: FieldValidator[]) {
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
