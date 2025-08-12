import { Component, Input, OnChanges, OnInit, SimpleChanges, computed, signal } from '@angular/core';
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
 
    Sections
  ],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss'
})

export class DynamicForm implements OnInit, OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input() value?: Record<string, any>;

  form!: FormGroup;
  current = signal(0);

  constructor(public dfs: DynamicFormService) {}

  ngOnInit(): void {
    this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] && this.form) {
      this.form = this.dfs.buildForm(this.schema, this.sanitizedValue(this.value));
      this.current.set(0);
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

  // ===== Visibilités calculées
  visibleSteps = computed<StepConfig[]>(() =>
    (this.schema.steps || []).filter(s => this.dfs.isStepVisible(s, this.form))
  );
  visibleSections = computed<SectionConfig[]>(() =>
    (this.schema.sections || []).filter(s => this.dfs.isSectionVisible(s, this.form))
  );
  visibleFieldsFlat = computed(() =>
    (this.schema.fields || []).filter(f => this.dfs.isFieldVisible(f, this.form))
  );

  currentStep = computed(() => this.visibleSteps()[this.current()] ?? null);
  flatSection = computed<SectionConfig>(() => ({ fields: this.visibleFieldsFlat() as FieldConfig[] }));

  // ===== Résumé
  summaryEnabled = computed(() => !!this.schema.summary?.enabled);
  summaryTitle = computed(() => this.schema.summary?.title || 'Résumé');
  realStepsCount = computed(() => this.visibleSteps().length); // NB: steps visibles
  summaryIndex = computed(() => this.realStepsCount() + (this.summaryEnabled() ? 1 : 0) - 1);
  summaryModel = computed(() =>
    this.dfs.buildSummaryModel(
      this.schema,
      this.form,
      this.schema.summary?.includeHidden ?? false
    )
  );

  // ===== Navigation protégée (désactive suivant/valider si invalide)
  private visibleInputFieldsOfStep(step: StepConfig): InputFieldConfig[] {
    const out: InputFieldConfig[] = [];
    step.sections?.forEach(sec => {
      (sec.fields || []).forEach(f => {
        if (isInputField(f) && this.dfs.isFieldVisible(f, this.form)) out.push(f);
      });
    });
    return out;
  }

  isCurrentStepValid(): boolean {
    if (!this.visibleSteps().length) {
      return this.form.valid;
    }
    const step = this.visibleSteps()[this.current()];
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
    if (!this.visibleSteps().length) {
      this.form.markAllAsTouched();
      return;
    }
    const step = this.visibleSteps()[this.current()];
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

  go(i: number) {
    // Aller en avant → vérifier l’étape courante
    if (i > this.current() && this.visibleSteps().length && !this.isCurrentStepValid()) {
      this.markCurrentStepAsTouched();
      this.scrollToFirstInvalid();
      return;
    }
    const maxIndex = this.summaryEnabled() ? this.summaryIndex() : Math.max(0, this.realStepsCount() - 1);
    this.current.set(Math.max(0, Math.min(i, maxIndex)));
  }

  next() { this.go(this.current() + 1); }
  prev() { this.go(this.current() - 1); }

  stepValid(i: number): boolean {
    const step = this.visibleSteps()[i];
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