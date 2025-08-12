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
 
    Sections
  ],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss'
})

export class DynamicForm implements OnInit, OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input() value?: Record<string, any>;
  @Input() editMode = false;
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
  @Output() editDeleteStep = new EventEmitter<{ stepIndex: number }>();
  @Output() editDeleteSection = new EventEmitter<{ stepIndex?: number; sectionIndex: number }>();
  @Output() editMoveSection = new EventEmitter<{ path: 'sectionRoot'|'stepSections'; stepIndex?: number; sectionIndex: number; dir: 'up'|'down' }>();
  @Output() editAddFieldTyped = new EventEmitter<{ path: 'root'|'stepRoot'|'section'; stepIndex?: number; sectionIndex?: number; type: string }>();

  form!: FormGroup;
  current = signal(0);

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
    this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] && this.form) {
      const prevIndex = this.current();
      this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
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
      this.form.patchValue(patch, { emitEvent: true });
    }
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

  // ===== Visibilités calculées (getters, pas de signals pour dépendre de schema dynamique)
  get visibleSteps(): StepConfig[] {
    return (this.schema.steps || []).filter(s => this.dfs.isStepVisible(s, this.form));
  }
  get visibleSections(): SectionConfig[] {
    return (this.schema.sections || []).filter(s => this.dfs.isSectionVisible(s, this.form));
  }
  get visibleFieldsFlat(): FieldConfig[] {
    return (this.schema.fields || []).filter(f => this.dfs.isFieldVisible(f, this.form));
  }

  get currentStep(): StepConfig | null { return this.visibleSteps[this.current()] ?? null; }
  get flatSection(): SectionConfig { return { fields: this.visibleFieldsFlat as FieldConfig[] }; }

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
    // champs racine de l'étape
    (step.fields || []).forEach(f => {
      if (isInputField(f) && this.dfs.isFieldVisible(f, this.form)) out.push(f);
    });
    // champs des sections
    step.sections?.forEach(sec => {
      (sec.fields || []).forEach(f => {
        if (isInputField(f) && this.dfs.isFieldVisible(f, this.form)) out.push(f);
      });
    });
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
    const fields: InputFieldConfig[] = [];
    for (const sec of step.sections) for (const f of sec.fields) if (isInputField(f)) fields.push(f);
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
    // 👉 ici, fais ton emit/HTTP, etc.
    console.log('Payload', this.form.value);
  }
}
