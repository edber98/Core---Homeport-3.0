import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzCronExpressionModule } from 'ng-zorro-antd/cron-expression';
import { ExpressionEditorComponent } from '../../../expression-editor/expression-editor';
import { FileFieldComponent } from '../file-field/file-field';
import { SchemaBuilderComponent } from '../schema-builder/schema-builder';
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
    CommonModule, ReactiveFormsModule, FormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzRadioModule, NzCheckboxModule, NzDatePickerModule, NzTypographyModule,
    NzSegmentedModule, NzCronExpressionModule, ExpressionEditorComponent, FileFieldComponent, SchemaBuilderComponent
  ],
  templateUrl: './fields.html',
  styleUrls: ['./fields.scss']
})
export class Fields implements OnInit, OnDestroy {
  @Input({ required: true }) field!: FieldConfig;
  @Input({ required: true }) form!: FormGroup;
  @Input() ui?: FormUI;
  @Input() ctx: any = {};
  @Input() exprPreviewShowErrors = true;
  @Input() disableExpressions = false;

  // exposé si besoin
  isInputField = isInputField;
  // segmented model: 'val' | 'expr'
  exprMode: 'val'|'expr' = 'val';
  get exprEnabled() { return this.exprMode === 'expr'; }
  // Secret input visibility
  secretVisible = false;
  isLgUp = false;

  // Final flag used for ExpressionEditor preview errors: combine global + field-level
  get showPreviewErrors(): boolean {
    const fieldPref = (this.field as any)?.expression?.showPreviewErrors;
    return this.exprPreviewShowErrors && (fieldPref !== false);
  }

  constructor(private dfs: DynamicFormService) {}

  /** key si input */
  get fieldKey(): string | undefined {
    return isInputField(this.field) ? (this.field as InputFieldConfig).key : undefined;
    // sinon undefined => on ne bind pas formControlName
  }

  private sub: any;
  ngOnInit(): void {
    this.updateViewport();
    const k = this.fieldKey;
    // Initial default mode: honor explicit defaultMode first, fallback to auto-detect
    const exprCfg = (this.field as any)?.expression || {};
    if (exprCfg?.defaultMode === 'expr' && exprCfg?.allow !== false) {
      this.exprMode = 'expr';
    }
    // Auto-switch if value looks like an expression and expressions are allowed
    if (this.exprMode !== 'expr' && (exprCfg?.allow !== false) && k) {
      const cur = this.form.get(k)?.value;
      if (typeof cur === 'string' && /\{\{[\s\S]*\}\}/.test(cur)) {
        this.exprMode = 'expr';
      }
    }
    // React to future value injections to auto-enable expression editor
    if (k) {
      this.sub = this.form.get(k)?.valueChanges.subscribe(val => {
        if (this.exprMode === 'expr') return; // do not override once enabled
        if (exprCfg?.allow === false) return;
        if (typeof val === 'string' && /\{\{[\s\S]*\}\}/.test(val)) {
          this.exprMode = 'expr';
        }
      });
    }
  }
  ngOnDestroy(): void { try { this.sub?.unsubscribe?.(); } catch {} }
  @HostListener('window:resize')
  onResize() { this.updateViewport(); }
  private updateViewport(): void {
    if (typeof window === 'undefined') return;
    this.isLgUp = window.innerWidth >= 992;
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
  get labelSpan(): number {
    if (this.labelsOnTop) return 24;
    const base = this.ui?.labelCol?.span ?? 8;
    const controlBase = this.ui?.controlCol?.span ?? 16;
    if (this.isLgUp && base === 8 && controlBase === 16) return 6;
    return base;
  }
  get labelOffset(): number { return this.labelsOnTop ? 0  : (this.ui?.labelCol?.offset ?? 0); }
  get controlSpan(): number {
    if (this.labelsOnTop) return 24;
    const base = this.ui?.controlCol?.span ?? 16;
    const labelBase = this.ui?.labelCol?.span ?? 8;
    if (this.isLgUp && labelBase === 8 && base === 16) return 18;
    return base;
  }
  get controlOffset(): number { return this.labelsOnTop ? 0  : (this.ui?.controlCol?.offset ?? 0); }
}
