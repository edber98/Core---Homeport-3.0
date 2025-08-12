import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { DynamicFormService } from './dynamic-form.service';
import { FieldConfig, FormSchema, SectionConfig, StepConfig } from './dynamic-form.types';
import { NgIf, NgFor, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

@Component({
  selector: 'dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgIf,
    NgFor,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzRadioModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzGridModule,
    NzStepsModule,
    NzButtonModule,
    NzTypographyModule,
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss',
})
export class DynamicFormComponent implements OnChanges {
  @Input() schema?: FormSchema;

  form?: FormGroup;
  readonly Validators = Validators;
  currentStep = 0;
  stepFieldKeys: string[][] = [];

  constructor(private dfs: DynamicFormService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema'] && this.schema) {
      this.form = this.dfs.buildForm(this.schema);
      if (this.schema.steps) {
        this.stepFieldKeys = this.schema.steps.map(step => this.collectFieldKeys(step));
        if (this.schema.summary?.enabled) {
          this.stepFieldKeys.push([]);
        }
      } else {
        this.stepFieldKeys = [
          this.collectFieldKeys({ sections: this.schema.sections ?? [], visibleIf: undefined } as StepConfig, this.schema.fields ?? [])
        ];
        if (this.schema.summary?.enabled) {
          this.stepFieldKeys.push([]);
        }
      }
    }
  }

  collectFieldKeys(step: StepConfig, fields: FieldConfig[] = []): string[] {
    const keys: string[] = [];
    step.sections.forEach(sec => sec.fields?.forEach(f => f.key && keys.push(f.key)));
    fields.forEach(f => f.key && keys.push(f.key));
    return keys;
  }

  isVisible(expr: any): boolean {
    return this.dfs.evaluate(expr, this.form?.value ?? {});
  }

  isStepValid(index: number): boolean {
    const keys = this.stepFieldKeys[index];
    if (!this.form) {
      return false;
    }
    return keys.every(key => {
      const ctrl = this.form!.get(key);
      return ctrl && ctrl.valid && !ctrl.pending;
    });
  }

  next(): void {
    if (this.currentStep < this.stepFieldKeys.length - 1) {
      this.currentStep++;
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  submit(): void {
    if (this.form?.valid) {
      console.log(this.form.value);
    }
  }

  visibleFields(section: SectionConfig): FieldConfig[] {
    return (section.fields ?? []).filter(f => this.isVisible(f.visibleIf));
  }

  allFields(): FieldConfig[] {
    const fields: FieldConfig[] = [];
    const collect = (sections?: SectionConfig[]) => {
      sections?.forEach(s => s.fields?.forEach(f => fields.push(f)));
    };
    if (this.schema?.steps) {
      this.schema.steps.forEach(step => collect(step.sections));
    }
    collect(this.schema?.sections);
    fields.push(...(this.schema?.fields ?? []));
    return fields;
  }
}
