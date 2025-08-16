import { Component, Input, OnChanges, OnInit, SimpleChanges, signal, Output, EventEmitter, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDropDownModule, NzContextMenuService, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';


import {
  DynamicFormService,
  FormSchema,
  FieldConfig,
  SectionConfig,
  StepConfig,
  isInputField,
  InputFieldConfig
} from './dynamic-form.service';


import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { Fields } from './components/fields/fields';
import { Sections } from './components/sections/sections';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzRadioModule,
    NzCheckboxModule,
    NzGridModule,
    NzStepsModule,
    NzButtonModule, NzTypographyModule,
    NzDatePickerModule,
    NzDropDownModule,
    NzTabsModule,
    Sections,
    Fields
  ],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss'
})

export class DynamicForm implements OnInit, OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input() value?: Record<string, any>;
  @Input() ctx: any = {};
  // Expression editor preview: show errors in preview panel (passed to ExpressionEditor)
  @Input() exprPreviewShowErrors = true;
  @Input() editMode = false;
  @Input() forceBp?: 'xs'|'sm'|'md'|'lg'|'xl';
  @Input() selectedField: FieldConfig | null = null;
  @Input() selectedSection: SectionConfig | null = null;
  @Input() selectedStep: StepConfig | null = null;
  @Input() editAllowMove = true;
  @Input() editAllowDelete = true;
  @Output() editMoveField = new EventEmitter<{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; dir: 'up'|'down' }>();
  @Output() editDeleteField = new EventEmitter<{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number }>();
  @Output() editSelectField = new EventEmitter<{ path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; field: FieldConfig }>();
  @Output() editSelectSection = new EventEmitter<{ stepIndex?: number; sectionIndex: number; section: SectionConfig }>();
  @Output() editSelectStep = new EventEmitter<{ stepIndex: number; step: StepConfig; fromStepper?: boolean }>();
  @Output() editAddStep = new EventEmitter<void>();
  @Output() editAddSection = new EventEmitter<{ stepIndex: number }>();
  @Output() editAddFieldStepRoot = new EventEmitter<{ stepIndex: number }>();
  @Output() editAddFieldInSection = new EventEmitter<{ stepIndex?: number; sectionIndex: number }>();
  // Items mixtes: déplacer un item (field ou section) au niveau step ou root (order arrays)
  @Output() editMoveItem = new EventEmitter<{ path: 'step'|'root'; stepIndex?: number; index: number; dir: 'up'|'down' }>();
  @Output() editDeleteStep = new EventEmitter<{ stepIndex: number }>();
  @Output() editDeleteSection = new EventEmitter<{ stepIndex?: number; sectionIndex: number }>();
  // removed legacy section move event (sections moved via editMoveItem)
  @Output() editAddFieldTyped = new EventEmitter<{ path: 'root'|'stepRoot'|'section'; stepIndex?: number; sectionIndex?: number; type: string; sectionPath?: number[] }>();
  @Output() submitted = new EventEmitter<Record<string, any>>();
  // Emit live value + validity to host
  @Output() valueChange = new EventEmitter<Record<string, any>>();
  @Output() validChange = new EventEmitter<boolean>();
  // Nouveau: émis quand l'utilisateur termine une saisie (blur/submit)
  @Output() valueCommitted = new EventEmitter<Record<string, any>>();

  form!: FormGroup;
  current = signal(0);
  private oneFieldSectionCache = new WeakMap<FieldConfig, SectionConfig>();
  // Avoid emitting while initializing or when applying external values
  private suppressEmit = false;
  private lastEmittedJson = '';
  private lastCommittedJson = '';
  private dirtySinceCommit = false;

  constructor(public dfs: DynamicFormService, private dropdown: NzContextMenuService) {}
  // context for floating dropdowns
  menuCtxStepIndex?: number;
  menuCtxSectionStepIndex?: number;
  menuCtxSectionIndex?: number;

  @ViewChild('sharedStepMenu', { static: false }) stepCtxMenu?: NzDropdownMenuComponent;
  @ViewChild('sharedSectionMenu', { static: false }) sectionCtxMenu?: NzDropdownMenuComponent;
  openStepMenu(ev: MouseEvent, i: number) {
    ev.preventDefault(); ev.stopPropagation();
    this.menuCtxStepIndex = i;
    if (this.stepCtxMenu) this.dropdown.create(ev, this.stepCtxMenu);
  }
  openSectionMenu(ev: MouseEvent, i: number, j: number) {
    ev.preventDefault(); ev.stopPropagation();
    this.menuCtxSectionStepIndex = i;
    this.menuCtxSectionIndex = j;
    if (this.sectionCtxMenu) this.dropdown.create(ev, this.sectionCtxMenu);
  }
  addSectionFromMenu() { if (this.menuCtxStepIndex != null) this.editAddSection.emit({ stepIndex: this.menuCtxStepIndex }); }
  addFieldAtStepFromMenu() { if (this.menuCtxStepIndex != null) this.editAddFieldStepRoot.emit({ stepIndex: this.menuCtxStepIndex }); }
  deleteStepFromMenu() { if (this.menuCtxStepIndex != null) this.editDeleteStep.emit({ stepIndex: this.menuCtxStepIndex }); }
  addFieldAtStepTyped(t: string) { if (this.menuCtxStepIndex != null) this.editAddFieldTyped.emit({ path: 'stepRoot', stepIndex: this.menuCtxStepIndex, type: t }); }
  addFieldInSectionFromMenu() {
    if (this.menuCtxSectionIndex != null) this.editAddFieldInSection.emit({ stepIndex: this.menuCtxSectionStepIndex, sectionIndex: this.menuCtxSectionIndex });
  }
  addFieldInSectionTyped(t: string) {
    if (this.menuCtxSectionIndex != null) this.editAddFieldTyped.emit({ path: 'section', stepIndex: this.menuCtxSectionStepIndex, sectionIndex: this.menuCtxSectionIndex, type: t });
  }
  deleteSectionFromMenu() {
    if (this.menuCtxSectionIndex != null) this.editDeleteSection.emit({ stepIndex: this.menuCtxSectionStepIndex, sectionIndex: this.menuCtxSectionIndex });
  }

  ngOnInit(): void {
    this.suppressEmit = true;
    this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
    this.attachFormStreams();
    // Defer first emission to let nested sections (arrays) initialize
    setTimeout(() => {
      this.suppressEmit = false;
      // Force a first emission so hosts receive initial value
      this.emitNow(true);
      this.lastCommittedJson = this.lastEmittedJson;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    
    if (changes['schema'] && this.form) {
      const prevIndex = this.current();
      this.suppressEmit = true;
      this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
      this.attachFormStreams();
      setTimeout(() => { this.suppressEmit = false; this.emitNow(true); });
      const max = Math.max(0, this.visibleSteps.length - 1);
      this.current.set(Math.min(prevIndex, max));
    } else if (changes['value'] && this.form) {
      const fields = this.dfs.collectFields(this.schema).filter(isInputField);
      const patch: Record<string, any> = {};
      for (const f of fields) {
        if (this.value && Object.prototype.hasOwnProperty.call(this.value, f.key)) {
          patch[f.key] = this.dfs.neutralize(f.type, (this.value as any)[f.key]);
        }
      }
      // External value update: patch without re-emitting to avoid feedback loops
      this.form.patchValue(patch, { emitEvent: false });
      // Keep lastEmittedJson in sync to avoid spurious emits on next change
      this.lastEmittedJson = JSON.stringify(this.form.getRawValue());
    }
  }
  private attachFormStreams() {
    try {
      // Initialize lastEmittedJson and validity without notifying host immediately
      this.lastEmittedJson = JSON.stringify(this.form.getRawValue());
      this.validChange.emit(this.form.valid);
      this.form.valueChanges.subscribe(() => {
        if (this.suppressEmit) return;
        this.emitNow();
        this.dirtySinceCommit = true;
      });
      this.form.statusChanges.subscribe(() => {
        if (this.suppressEmit) return;
        this.validChange.emit(this.form.valid);
      });
    } catch {}
  }

  private emitNow(force = false) {
    try {
      const val = this.form.getRawValue();
      const json = JSON.stringify(val);
      if (force || json !== this.lastEmittedJson) {
        this.lastEmittedJson = json;
        this.valueChange.emit(val);
      }
      this.validChange.emit(this.form.valid);
    } catch {}
  }

  // ===== Commit helpers (blur / submit)
  onFormFocusOut(_ev: FocusEvent) {
    // Small delay to let control update propagate
    setTimeout(() => this.commitIfNeeded());
  }
  private commitIfNeeded() {
    try {
      const val = this.form.getRawValue();
      const json = JSON.stringify(val);
      if (!this.dirtySinceCommit && json === this.lastCommittedJson) return;
      this.lastCommittedJson = json;
      this.dirtySinceCommit = false;
      this.valueCommitted.emit(val);
    } catch {}
  }

  // ===== Relais événements édition (up/down/delete/select)
  onMoveInStepRoot(i: number, dir: 'up'|'down', stepIndex: number) {
    this.editMoveField.emit({ path: 'stepRoot', stepIndex, index: i, dir });
  }
  onMoveInSection(i: number, dir: 'up'|'down', stepIndex: number | undefined, sectionIndex: number) {
    this.editMoveField.emit({ path: 'section', stepIndex, sectionIndex, index: i, dir });
  }
  onMoveInFlat(i: number, dir: 'up'|'down') { this.editMoveField.emit({ path: 'flat', index: i, dir }); }
  onDeleteInStepRoot(i: number, stepIndex: number) { this.editDeleteField.emit({ path: 'stepRoot', stepIndex, index: i }); }
  onDeleteInSection(i: number, stepIndex: number | undefined, sectionIndex: number) { this.editDeleteField.emit({ path: 'section', stepIndex, sectionIndex, index: i }); }
  onDeleteInFlat(i: number) { this.editDeleteField.emit({ path: 'flat', index: i }); }
  onSelectInStepRoot(i: number, stepIndex: number, field: FieldConfig) { this.editSelectField.emit({ path: 'stepRoot', stepIndex, index: i, field }); }
  onSelectInSection(i: number, stepIndex: number | undefined, sectionIndex: number, field: FieldConfig) { this.editSelectField.emit({ path: 'section', stepIndex, sectionIndex, index: i, field }); }
  onSelectInFlat(i: number, field: FieldConfig) { this.editSelectField.emit({ path: 'flat', index: i, field }); }

  onSelectSection(stepIndex: number | undefined, sectionIndex: number, section: SectionConfig, ev: MouseEvent) {
    if (!this.editMode) return;
    ev.stopPropagation();
    this.editSelectSection.emit({ stepIndex, sectionIndex, section });
  }
  onSelectStep(stepIndex: number, step: StepConfig, ev: MouseEvent) {
    if (!this.editMode) return;
    ev.stopPropagation();
    this.editSelectStep.emit({ stepIndex, step });
  }

  /** remplace tous undefined de value par des neutres par type */
  private sanitizedValue(val?: Record<string, any>) {
    if (!val) return val;
    const out: Record<string, any> = {};
    for (const f of this.dfs.collectFields(this.schema)) {
      if (!isInputField(f)) continue;
      const has = Object.prototype.hasOwnProperty.call(val, f.key);
      if (has) out[f.key] = this.dfs.neutralize(f.type, (val as any)[f.key]);
    }
    return out;
  }

  // ===== UI getters
  get layout() { return this.schema.ui?.layout ?? 'horizontal'; }
  get maxWidth() { return this.schema.ui?.widthPx ?? 1040; }
  get ui() { return this.schema.ui; }
  get containerStyle() { return this.schema.ui?.containerStyle || {}; }
  get actionsStyle() { return this.schema.ui?.actions?.actionsStyle || {}; }
  get buttonStyle() { return this.schema.ui?.actions?.buttonStyle || {}; }
  get showReset() { return !!this.schema.ui?.actions?.showReset; }
  // Hide cancel button as requested; keep only Reset/Submit
  get showCancel() { return false; }
  get submitText() { return this.schema.ui?.actions?.submitText || 'Valider'; }
  get resetText() { return this.schema.ui?.actions?.resetText || 'Réinitialiser'; }
  get cancelText() { return this.schema.ui?.actions?.cancelText || 'Modifier'; }

  private mergeStyle(base: any, override?: any) {
    return { ...(base || {}), ...(override || {}) };
  }
  stepPrevTextAt(i: number) {
    const st = this.visibleSteps[i];
    return (st?.prevBtn?.text) || st?.prevText || 'Précédent';
  }
  stepNextTextAt(i: number) {
    const st = this.visibleSteps[i];
    return (st?.nextBtn?.text) || st?.nextText || 'Suivant';
  }
  stepBtnStyle(i: number, kind: 'prev'|'next') {
    const st = this.visibleSteps[i];
    const override = (kind === 'prev') ? st?.prevBtn?.style : st?.nextBtn?.style;
    return this.mergeStyle(this.buttonStyle, override);
  }
  submitBtnStyle() { return this.mergeStyle(this.buttonStyle, this.schema.ui?.actions?.submitBtn?.style); }
  cancelBtnStyle() { return this.mergeStyle(this.buttonStyle, this.schema.ui?.actions?.cancelBtn?.style); }
  resetBtnStyle() { return this.mergeStyle(this.buttonStyle, this.schema.ui?.actions?.resetBtn?.style); }

  // Wrap a single field into a stable SectionConfig (cached) for rendering layout
  singleFieldSection(f: FieldConfig): SectionConfig {
    let s = this.oneFieldSectionCache.get(f);
    if (!s) {
      s = { type: 'section', fields: [f] } as any;
      this.oneFieldSectionCache.set(f, s as SectionConfig);
    }
    return s as SectionConfig;
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


  // ===== Helpers ordre: parcourt fields uniquement =====
  stepItems(step: StepConfig) {
    const items = (step.fields || []).map((f, i) => ({ t: ((f as any).type === 'section' || (f as any).type === 'section_array' ? 'section' : 'field') as 'section'|'field', i }));
    return items.map((ent, k) => ({ ent, k }));
  }
  
  rootItems() {
    const items = (this.schema.fields || []).map((f, i) => ({ t: (((f as any).type === 'section' || (f as any).type === 'section_array') ? 'section' : 'field') as 'section'|'field', i }));
    return items.map((ent, k) => ({ ent, k }));
  }

  sectionAt(step: StepConfig, ent: { i: number }): SectionConfig | null {
    const f = (step.fields || [])[ent.i] as any;
    return f && (f.type === 'section' || f.type === 'section_array') ? (f as SectionConfig) : null;
  }

  // ===== Visibilités calculées (getters, pas de signals pour dépendre de schema dynamique)
  get visibleSteps(): StepConfig[] {
    return (this.schema.steps || []).filter(s => this.dfs.isStepVisible(s, this.form));
  }
  get visibleSections(): SectionConfig[] {
    return ((this.schema.fields || []).filter((f: any) => (f.type === 'section' || f.type === 'section_array')) as SectionConfig[])
      .filter(s => this.dfs.isSectionVisible(s, this.form));
  }
  get visibleFieldsFlat(): FieldConfig[] {
    // root-level non-section visible fields
    return (this.schema.fields || []).filter((f: any) => f.type !== 'section' && f.type !== 'section_array').filter(f => this.dfs.isFieldVisible(f, this.form));
  }

  get hasAnyRootSection(): boolean {
    return (this.schema.fields || []).some((f: any) => f.type === 'section' || f.type === 'section_array');
  }

  get currentStep(): StepConfig | null { return this.visibleSteps[this.current()] ?? null; }
  get flatSection(): SectionConfig { return { type: 'section', fields: this.visibleFieldsFlat as FieldConfig[] } as any; }

  // ===== Résumé (getters)
  get summaryEnabled(): boolean { return !!this.schema.summary?.enabled; }
  get summaryTitle(): string { return this.schema.summary?.title || 'Résumé'; }
  get realStepsCount(): number { return this.visibleSteps.length; }
  get summaryIndex(): number { return this.realStepsCount + (this.summaryEnabled ? 1 : 0) - 1; }
  get summaryModel() {
    return this.dfs.buildSummaryModel(
      this.schema,
      this.form,
      this.schema.summary?.includeHidden ?? false
    );
  }

  // ===== Navigation protégée (désactive suivant/valider si invalide)
  private visibleInputFieldsOfStep(step: StepConfig): InputFieldConfig[] {
    const out: InputFieldConfig[] = [];
    const visitFields = (fields?: FieldConfig[]) => {
      for (const f of fields || []) {
        if ((f as any).type === 'section' || (f as any).type === 'section_array') {
          const sec = f as any as SectionConfig;
          if (this.dfs.isSectionVisible(sec, this.form)) visitFields(sec.fields);
        } else if (isInputField(f) && this.dfs.isFieldVisible(f, this.form)) {
          out.push(f);
        }
      }
    };
    visitFields(step.fields);
    return out;
  }

  isCurrentStepValid(): boolean {
    if (!this.visibleSteps.length) {
      return this.form.valid;
    }
    const step = this.visibleSteps[this.current()];
    if (!step) return true;
    const fields = this.visibleInputFieldsOfStep(step);
    if (!fields.length) return true;
    return fields.every(f => {
      const c = this.form.get(f.key) as AbstractControl | null;
      return !!c && (c.disabled || c.valid);
    });
  }

  isNextDisabled(i: number): boolean {
    if (this.current() !== i) return false;
    return !this.isCurrentStepValid() || this.form.pending;
  }

  isSubmitDisabled(): boolean {
    return !this.form.valid || this.form.pending;
  }

  markCurrentStepAsTouched() {
    if (!this.visibleSteps.length) {
      this.form.markAllAsTouched();
      return;
    }
    const step = this.visibleSteps[this.current()];
    if (!step) return;
    this.visibleInputFieldsOfStep(step).forEach(f => {
      const c = this.form.get(f.key);
      c?.markAsTouched();
      c?.updateValueAndValidity({ onlySelf: true });
    });
  }

  private scrollToFirstInvalid() {
    setTimeout(() => {
      const el = document.querySelector('.ng-invalid[formcontrolname]') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

   // ===== Responsive helper: if only 1 visible item in a container, make it full-width
private isVisibleItem(obj: any): boolean {
  if (!obj) return false;
  if ((obj as any).type === 'section' || (obj as any).type === 'section_array') return this.dfs.isSectionVisible(obj as any, this.form);
  return this.dfs.isFieldVisible(obj as any, this.form);
}
onlyOneVisibleInStep(step: StepConfig): boolean {
  const items = (step.fields || []).filter(it => this.isVisibleItem(it));
  return items.length === 1;
}
onlyOneVisibleAtRoot(): boolean {
  const items = (this.schema.fields || []).filter(it => this.isVisibleItem(it));
  return items.length === 1;
}

  go(i: number, skipGuard = false) {
    // Aller en avant → vérifier l’étape courante
    if (!skipGuard && i > this.current() && this.visibleSteps.length && !this.isCurrentStepValid()) {
      this.markCurrentStepAsTouched();
      this.scrollToFirstInvalid();
      return;
    }
    const maxIndex = this.summaryEnabled ? this.summaryIndex : Math.max(0, this.realStepsCount - 1);
    this.current.set(Math.max(0, Math.min(i, maxIndex)));
  }

  // Click sur le stepper: navigue et sélectionne le step (en édition)
  onStepHeaderIndexChange(i: number) {
    if (this.editMode) {
      const step = this.visibleSteps[i];
      if (step) this.editSelectStep.emit({ stepIndex: i, step, fromStepper: true });
      // En mode édition: navigation sans garde (champs requis ne bloquent pas)
      this.go(i, true);
    } else {
      this.go(i);
    }
  }

  onStepperClick() {
    if (!this.editMode) return;
    const idx = this.current();
    const step = this.visibleSteps[idx];
    if (step) this.editSelectStep.emit({ stepIndex: idx, step });
  }

  next() { this.go(this.current() + 1); }
  prev() { this.go(this.current() - 1); }

  stepValid(i: number): boolean {
    const step = this.visibleSteps[i];
    if (!step) return true;
    const fields = this.visibleInputFieldsOfStep(step);
    return fields.every(f => {
      const ctrl = this.form.get(f.key);
      const visible = this.dfs.isFieldVisible(f, this.form);
      return !visible || ctrl?.disabled || ctrl?.valid;
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.scrollToFirstInvalid();
      return;
    }
    const val = this.form.value;
    this.submitted.emit(val);
    // Emit a committed value on submit as well
    try {
      this.valueCommitted.emit(val);
      this.lastCommittedJson = JSON.stringify(this.form.getRawValue());
      this.dirtySinceCommit = false;
    } catch {}
  }

  reset() {
    // Reconstruire le formulaire avec les valeurs initiales
    this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
    this.current.set(0);
  }

  // ===== Sélection par clic sur le conteneur des fields (sans gêner les inputs)
  onFieldContainerClickStep(ev: MouseEvent, stepIndex: number, fieldIndex: number, f: FieldConfig) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return; // laisser l'input bosser
    this.onSelectInStepRoot(fieldIndex, stepIndex, f);
  }
  onFieldContainerClickRoot(ev: MouseEvent, fieldIndex: number, f: FieldConfig) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return;
    this.onSelectInFlat(fieldIndex, f);
  }
  onSectionContainerClick(ev: MouseEvent, stepIndex: number | undefined, sectionIndex: number, s: SectionConfig) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) return;
    this.onSelectSection(stepIndex, sectionIndex, s, ev);
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

  // Stop bubbling only when clicking inside an interactive element of a field
  onInnerClick(ev: MouseEvent) {
    if (!this.editMode) return;
    if (this.isInteractiveClick(ev)) {
      ev.stopPropagation();
    }
  }

  // ===== TrackBy to avoid DOM churn (preserve control state)
  trackByIndex(i: number) { return i; }
  trackByField = (_: number, f: FieldConfig) => (isInputField(f) ? (f as any).key || f : f);
  trackByMixedItem = (_: number, it: any) => `${it.ent.t}:${it.ent.i}`;
}
