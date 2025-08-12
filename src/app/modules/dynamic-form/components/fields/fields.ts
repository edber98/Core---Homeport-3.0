import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import {
  FieldConfig,
  InputFieldConfig,
  isInputField,
  DynamicFormService,
  FormUI
} from '../../dynamic-form.service';

@Component({
  selector: 'df-field',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzRadioModule, NzCheckboxModule, NzDatePickerModule, NzTypographyModule
  ],
  templateUrl: './fields.html',
  styleUrls: ['./fields.scss']
})
export class Fields {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;

  // exposé si besoin
  isInputField = isInputField;

  constructor(private dfs: DynamicFormService) {}

  /** key si input */
  get fieldKey(): string | undefined {
    return isInputField(this.field) ? (this.field as InputFieldConfig).key : undefined;
    // sinon undefined => on ne bind pas formControlName
  }

  /** champ required ? */
  get requiredFlag(): boolean {
    const k = this.fieldKey;
    if (!k) return false;
    const c = this.form.get(k);
    return !!c?.hasValidator?.(Validators.required);
  }

  /** labels au-dessus ? (vertical => true par défaut; sinon lis ui.labelsOnTop) */
  get labelsOnTop(): boolean {
    if (typeof this.ui?.labelsOnTop === 'boolean') return this.ui!.labelsOnTop!;
    return (this.ui?.layout ?? 'horizontal') === 'vertical';
  }

  /** spans/offsets calculés */
  get labelSpan(): number { return this.labelsOnTop ? 24 : (this.ui?.labelCol?.span ?? 8); }
  get labelOffset(): number { return this.labelsOnTop ? 0  : (this.ui?.labelCol?.offset ?? 0); }
  get controlSpan(): number { return this.labelsOnTop ? 24 : (this.ui?.controlCol?.span ?? 16); }
  get controlOffset(): number { return this.labelsOnTop ? 0  : (this.ui?.controlCol?.offset ?? 0); }

  /** styles marge/padding : fusion ui.itemStyle + field.itemStyle ; textblock => no margin/padding */
  get itemStyle(): Record<string, any> {
    const fromUi = (this.ui as any)?.itemStyle ?? {};
    const fromField = (this.field as any)?.itemStyle ?? {};
    const merged = { ...fromUi, ...fromField };
    if (this.field.type === 'textblock') {
      return { ...merged, margin: 0, padding: 0 };
    }
    return merged;
  }
}
