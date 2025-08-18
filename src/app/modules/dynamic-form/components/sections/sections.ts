import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { SectionConfig, FieldConfig, FormUI, DynamicFormService } from '../../dynamic-form.service';
import { Fields } from '../fields/fields';

@Component({
  selector: 'df-section',
  standalone: true,
  imports: [CommonModule, NzGridModule, NzButtonModule, NzDropDownModule, NzMenuModule, Fields],
  templateUrl: './sections.html',
  styleUrl: './sections.scss'
})
export class Sections implements OnChanges {
  @Input({ required: true }) section!: SectionConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;
  @Input() forceBp?: 'xs'|'sm'|'md'|'lg'|'xl';
  @Input() exprPreviewShowErrors = true;
  @Input() ctx: any = {};
  // Initial values for array items, if section is array
  @Input() initialArrayValue?: any[] | null = null;
  @Input() editMode = false;
  @Input() selectedField: FieldConfig | null = null;
  @Input() selectedSection: SectionConfig | null = null;
  @Input() allowMove = true;
  @Input() allowDelete = true;
  @Output() moveField = new EventEmitter<{ index: number; dir: 'up'|'down' }>();
  @Output() deleteField = new EventEmitter<{ index: number }>();
  @Output() selectField = new EventEmitter<{ index: number; field?: FieldConfig; section?: SectionConfig }>();
  // New: select this child section item and add typed field inside it
  @Output() selectSection = new EventEmitter<{ index: number; section: SectionConfig }>();
  @Output() addFieldTyped = new EventEmitter<{ index: number; type: string; path?: number[] }>();

  constructor(public dfs: DynamicFormService, private fb: FormBuilder) {}
  get visible() { return this.dfs.isSectionVisible(this.section, this.form); }
  isSelected(f: FieldConfig) { return (((f as any).type === 'section' || (f as any).type === 'section_array')) ? (this.selectedSection === (f as any)) : (this.selectedField === f); }
  get sectionUi(): any {
    const base = this.ui || {};
    const over = (this.section as any).ui || {};
    return { ...base, ...over, labelCol: over.labelCol ?? base.labelCol, controlCol: over.controlCol ?? base.controlCol };
  }

  fieldSpanFor(field: FieldConfig, bp: 'xs'|'sm'|'md'|'lg'|'xl'): number {
    const spans = this.dfs.getFieldSpans(field) as any;
    switch (bp) {
      case 'xs': return spans.xs;
      case 'sm': return spans.sm;
      case 'md': return spans.md;
      case 'lg': return spans.lg;
      case 'xl': return spans.xl;
    }
  }
  fieldPercentFor(field: FieldConfig, bp: 'xs'|'sm'|'md'|'lg'|'xl'): number {
    const span = this.fieldSpanFor(field, bp);
    const clamped = Math.max(1, Math.min(24, Number(span) || 24));
    return clamped * 100 / 24;
  }

  onClickField(index: number, ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return; // laisser l'input travailler
    const fld = (this.section.fields || [])[index];
    this.selectField.emit({ index, field: fld, section: this.section });
    ev.stopPropagation();
  }

  onInnerFieldClick(ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) ev.stopPropagation();
  }

  onClickSection(index: number, ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return;
    const sec = (this.section.fields || [])[index] as any;
    if (sec && (sec.type === 'section' || sec.type === 'section_array')) this.selectSection.emit({ index, section: sec });
    ev.stopPropagation();
  }

  private isInteractiveClick(ev: MouseEvent): boolean {
    const target = ev.target as HTMLElement | null;
    const current = ev.currentTarget as HTMLElement | null;
    if (!target) return false;
    const isEditable = (el: HTMLElement) => (
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON' ||
      el.isContentEditable || el.getAttribute('contenteditable') === 'true' ||
      /ant-select|ant-radio|ant-checkbox|ant-picker|ant-input|cm-editor/.test(el.className)
    );
    let el: HTMLElement | null = target;
    while (el && current && el !== current) {
      if (isEditable(el)) return true;
      el = el.parentElement;
    }
    return isEditable(target);
  }

  // ======== Array mode helpers ========
  private ensureArray(): FormArray {
    const key = (this.section as any).key || 'items';
    let arr = this.form.get(key) as FormArray | null;
    if (!arr) {
      arr = new FormArray([] as FormGroup[]);
      this.form.setControl(key, arr);
      // Seed initial items from provided value or from config
      const initVals = Array.isArray(this.initialArrayValue) ? this.initialArrayValue as any[] : [];
      if (initVals.length) {
        for (const v of initVals) this.addArrayItemWithValue(v);
      } else {
        const init = Number((this.section as any).array?.initialItems ?? 1) || 0;
        for (let i = 0; i < init; i++) this.addArrayItem();
      }
    }
    return arr;
  }
  ngOnChanges(changes: SimpleChanges): void {
    // Synchroniser le FormArray avec initialArrayValue si fourni
    const isArray = ((this.section as any).mode === 'array') || ((this.section as any).type === 'section_array');
    if (!isArray) return;
    const vals = Array.isArray(this.initialArrayValue) ? (this.initialArrayValue as any[]) : null;
    if (vals == null) return;
    const key = (this.section as any).key || 'items';
    let arr = this.form.get(key) as FormArray | null;
    if (!arr) { this.ensureArray(); arr = this.form.get(key) as FormArray | null; }
    if (!arr) return;
    // Check if current array value equals incoming; if so, skip rebuild to avoid loops
    const currentVals = (arr.controls as FormGroup[]).map(g => g.getRawValue());
    try {
      const same = JSON.stringify(currentVals) === JSON.stringify(vals);
      if (same) return;
    } catch {}
    // Build a fresh FormArray and swap it in one shot to limit emissions
    const fresh = new FormArray([] as FormGroup[]);
    for (const v of vals) {
      const g = this.buildItemGroupFrom(v);
      // Apply rules and subscribe
      this.applyRulesToItem(g);
      g.valueChanges.subscribe(() => this.applyRulesToItem(g));
      fresh.push(g);
    }
    this.form.setControl(key, fresh);
  }
  get arrayKey(): string { return (this.section as any).key || 'items'; }
  get arrayForm(): FormArray { return this.ensureArray(); }
  get arrayItems(): FormGroup[] { return (this.arrayForm.controls as FormGroup[]) || []; }
  canRemoveAt(i: number): boolean {
    const min = Number((this.section as any).array?.minItems ?? 0) || 0;
    return this.arrayItems.length > min && i >= 0;
  }
  canAddMore(): boolean {
    const max = (this.section as any).array?.maxItems;
    if (max == null) return true;
    return this.arrayItems.length < Number(max);
  }
  addArrayItem(): void {
    if (!this.canAddMore()) return;
    const group: Record<string, FormControl> = {};
    const visit = (fields?: any[]) => {
      for (const f of (fields || [])) {
        if (!f) continue;
        if (f.type === 'textblock') continue;
        if (f.type === 'section' || f.type === 'section_array') {
          // normal nested section => descend; array section => handled by nested df-section ensureArray()
          if (f.type === 'section' && (f as any).mode !== 'array') visit(f.fields);
          continue;
        }
        const def = this.dfs.neutralize((f as any).type, (f as any).default);
        group[(f as any).key] = new FormControl(def, this.dfs.mapValidators((f as any).validators || []));
      }
    };
    visit(this.section.fields);
    const g = this.fb.group(group);
    this.applyRulesToItem(g);
    g.valueChanges.subscribe(() => this.applyRulesToItem(g));
    this.arrayForm.push(g);
  }
  private addArrayItemWithValue(valObj: any): void {
    if (!this.canAddMore()) return;
    const group: Record<string, FormControl> = {};
    const visit = (fields?: any[]) => {
      for (const f of (fields || [])) {
        if (!f) continue;
        if (f.type === 'textblock') continue;
        if (f.type === 'section' || f.type === 'section_array') {
          if (f.type === 'section' && (f as any).mode !== 'array') visit(f.fields);
          continue;
        }
        const def = this.dfs.neutralize((f as any).type, (f as any).default);
        const cur = (valObj && typeof valObj === 'object') ? valObj[(f as any).key] : undefined;
        group[(f as any).key] = new FormControl(cur !== undefined ? cur : def, this.dfs.mapValidators((f as any).validators || []));
      }
    };
    visit(this.section.fields);
    const g = this.fb.group(group);
    this.applyRulesToItem(g);
    g.valueChanges.subscribe(() => this.applyRulesToItem(g));
    this.arrayForm.push(g);
  }
  private buildItemGroupFrom(valObj: any): FormGroup {
    const group: Record<string, FormControl> = {};
    const visit = (fields?: any[]) => {
      for (const f of (fields || [])) {
        if (!f) continue;
        if (f.type === 'textblock') continue;
        if (f.type === 'section' || f.type === 'section_array') {
          if (f.type === 'section' && (f as any).mode !== 'array') visit(f.fields);
          continue;
        }
        const def = this.dfs.neutralize((f as any).type, (f as any).default);
        const cur = (valObj && typeof valObj === 'object') ? valObj[(f as any).key] : undefined;
        group[(f as any).key] = new FormControl(cur !== undefined ? cur : def, this.dfs.mapValidators((f as any).validators || []));
      }
    };
    visit(this.section.fields);
    return this.fb.group(group);
  }
  removeArrayItem(i: number): void {
    if (!this.canRemoveAt(i)) return;
    this.arrayForm.removeAt(i);
  }
  moveArrayItem(i: number, dir: 'up'|'down'): void {
    const arr = this.arrayForm;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    const ctrl = arr.at(i);
    arr.removeAt(i);
    arr.insert(j, ctrl);
  }
  duplicateArrayItem(i: number): void {
    const src = this.arrayItems[i]; if (!src) return;
    const val = src.getRawValue();
    this.addArrayItem();
    const last = this.arrayItems[this.arrayItems.length - 1];
    last?.patchValue(val);
  }
  canMoveUp(i: number): boolean { return i > 0; }
  canMoveDown(i: number): boolean { return i < this.arrayItems.length - 1; }
  get addBtnText(): string { return (this.section as any).array?.controls?.add?.text || 'Ajouter'; }
  get removeBtnText(): string { return (this.section as any).array?.controls?.remove?.text || 'Supprimer'; }

  private applyRulesToItem(g: FormGroup) {
    const visit = (fields?: any[]) => {
      for (const f of (fields || [])) {
        if (!f || (f as any).type === 'textblock') continue;
        if ((f as any).type === 'section' || (f as any).type === 'section_array') {
          if ((f as any).type === 'section' && (f as any).mode !== 'array') visit((f as any).fields);
          continue;
        }
        const key = (f as any).key;
        const ctrl = g.get(key);
        if (!ctrl) continue;
        const isVisible = this.dfs.isFieldVisible(f as any, g);
        const disabled = (f as any).disabledIf ? this.evalLocal((f as any).disabledIf, g) === true : false;
        const shouldDisable = disabled || !isVisible;
        if (shouldDisable) ctrl.disable({ emitEvent: false }); else ctrl.enable({ emitEvent: false });
        const base = this.dfs.mapValidators((f as any).validators || []);
        const needReq = !shouldDisable && ((f as any).requiredIf ? this.evalLocal((f as any).requiredIf, g) === true : false);
        ctrl.setValidators(needReq ? [...base, Validators.required] : base);
        ctrl.updateValueAndValidity({ emitEvent: false });
      }
    };
    visit(this.section.fields);
  }

  private evalLocal(rule: any, formOrValue: any): any {
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
      return (typeof x === 'object') ? this.evalLocal(x, formOrValue) : x;
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
}
