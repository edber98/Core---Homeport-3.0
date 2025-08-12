import { Injectable } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { FieldConfig, FormSchema, StepConfig } from './dynamic-form.types';

@Injectable({ providedIn: 'root' })
export class DynamicFormService {
  constructor(private fb: FormBuilder) {}

  buildForm(schema: FormSchema): FormGroup {
    const group: Record<string, FormControl> = {};
    const addField = (field: FieldConfig): void => {
      if (!field.key) {
        return;
      }
      const value = field.default ?? this.defaultValue(field.type);
      const control = new FormControl(value, field.validators ?? []);
      group[field.key] = control;
    };

    const walkFields = (fields?: FieldConfig[]): void => {
      fields?.forEach(f => addField(f));
    };

    const walkSections = (sections?: any[]): void => {
      sections?.forEach((s: any) => walkFields(s.fields));
    };

    if (schema.steps) {
      schema.steps.forEach((step: StepConfig) => walkSections(step.sections));
    }
    walkSections(schema.sections);
    walkFields(schema.fields);

    return this.fb.group(group);
  }

  defaultValue(type: string): unknown {
    switch (type) {
      case 'text':
      case 'textarea':
        return '';
      case 'checkbox':
        return false;
      case 'number':
      case 'date':
      case 'select':
      case 'radio':
        return null;
      default:
        return null;
    }
  }

  evaluate(expr: any, values: any): boolean {
    if (!expr) {
      return true;
    }
    const op = Object.keys(expr)[0];
    const args = expr[op];
    switch (op) {
      case 'var':
        return values[args as string];
      case '==':
        return this.evaluate(args[0], values) === this.evaluate(args[1], values);
      case '!=':
        return this.evaluate(args[0], values) !== this.evaluate(args[1], values);
      case '>':
        return this.evaluate(args[0], values) > this.evaluate(args[1], values);
      case '<':
        return this.evaluate(args[0], values) < this.evaluate(args[1], values);
      case '>=':
        return this.evaluate(args[0], values) >= this.evaluate(args[1], values);
      case '<=':
        return this.evaluate(args[0], values) <= this.evaluate(args[1], values);
      case 'all':
        return args.every((a: any) => this.evaluate(a, values));
      case 'any':
        return args.some((a: any) => this.evaluate(a, values));
      case 'not':
        return !this.evaluate(args, values);
      default:
        return true;
    }
  }
}
