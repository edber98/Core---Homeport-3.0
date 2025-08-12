import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { DynamicFormComponent } from './dynamic-form.component';
import { FieldConfig, FormSchema, SectionConfig, StepConfig } from './dynamic-form.types';

@Component({
  selector: 'dynamic-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzFormModule,
    NzCardModule,
    DynamicFormComponent,
  ],
  templateUrl: './dynamic-form-builder.component.html',
  styleUrl: './dynamic-form-builder.component.scss',
})
export class DynamicFormBuilderComponent {
  schema: FormSchema = {};
  selected: StepConfig | SectionConfig | FieldConfig | FormSchema | null = null;
  inspector!: FormGroup;
  json = '';

  constructor(private fb: FormBuilder) {
    this.createInspector();
  }

  createInspector(): void {
    this.inspector = this.fb.group({
      title: [''],
      key: [''],
      label: [''],
      placeholder: [''],
      type: ['text'],
      options: [''],
      visibleIf: [''],
      requiredIf: [''],
      disabledIf: [''],
      layout: [''],
      labelAlign: [''],
      labelColSpan: [''],
      controlColSpan: [''],
      widthPx: [''],
    });
    this.inspector.valueChanges.subscribe(v => {
      if (!this.selected) {
        return;
      }
      if (this.selected === this.schema) {
        this.schema.title = v.title || undefined;
        this.schema.ui = {
          layout: v.layout || undefined,
          labelAlign: v.labelAlign || undefined,
          labelCol: v.labelColSpan ? { span: Number(v.labelColSpan) } : undefined,
          controlCol: v.controlColSpan ? { span: Number(v.controlColSpan) } : undefined,
          widthPx: v.widthPx ? Number(v.widthPx) : undefined,
        };
      } else {
        Object.assign(this.selected, {
          title: v.title || undefined,
          key: v.key || undefined,
          label: v.label || undefined,
          placeholder: v.placeholder || undefined,
          type: v.type || 'text',
          options: v.options ? JSON.parse(v.options) : undefined,
          visibleIf: v.visibleIf ? JSON.parse(v.visibleIf) : undefined,
          requiredIf: v.requiredIf ? JSON.parse(v.requiredIf) : undefined,
          disabledIf: v.disabledIf ? JSON.parse(v.disabledIf) : undefined,
        });
      }
      this.refresh();
    });
  }

  select(obj: any): void {
    this.selected = obj;
    this.inspector.patchValue({
      title: obj.title ?? '',
      key: obj.key ?? '',
      label: obj.label ?? '',
      placeholder: obj.placeholder ?? '',
      type: obj.type ?? 'text',
      options: obj.options ? JSON.stringify(obj.options) : '',
      visibleIf: obj.visibleIf ? JSON.stringify(obj.visibleIf) : '',
      requiredIf: obj.requiredIf ? JSON.stringify(obj.requiredIf) : '',
      disabledIf: obj.disabledIf ? JSON.stringify(obj.disabledIf) : '',
      layout: this.schema.ui?.layout ?? '',
      labelAlign: this.schema.ui?.labelAlign ?? '',
      labelColSpan: this.schema.ui?.labelCol?.span ?? '',
      controlColSpan: this.schema.ui?.controlCol?.span ?? '',
      widthPx: this.schema.ui?.widthPx ?? '',
    });
  }

  private refresh(): void {
    this.schema = { ...this.schema };
  }

  addStep(): void {
    const step: StepConfig = { title: 'Step', sections: [] };
    this.schema.steps = this.schema.steps ?? [];
    this.schema.steps.push(step);
    this.refresh();
  }

  addSection(step?: StepConfig): void {
    const section: SectionConfig = { title: 'Section', fields: [] };
    if (step) {
      step.sections.push(section);
    } else {
      this.schema.sections = this.schema.sections ?? [];
      this.schema.sections.push(section);
    }
    this.refresh();
  }

  addField(section?: SectionConfig): void {
    const field: FieldConfig = { type: 'text', key: 'field', label: 'Field' };
    if (section) {
      section.fields = section.fields ?? [];
      section.fields.push(field);
    } else {
      this.schema.fields = this.schema.fields ?? [];
      this.schema.fields.push(field);
    }
    this.refresh();
  }

  dropStep(event: CdkDragDrop<StepConfig[]>): void {
    if (!this.schema.steps) return;
    moveItemInArray(this.schema.steps, event.previousIndex, event.currentIndex);
    this.refresh();
  }

  dropSection(event: CdkDragDrop<SectionConfig[]>, step?: StepConfig): void {
    const arr = step ? step.sections : this.schema.sections;
    if (!arr) return;
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.refresh();
  }

  dropField(event: CdkDragDrop<FieldConfig[]>, section?: SectionConfig): void {
    const arr = section ? section.fields : this.schema.fields;
    if (!arr) return;
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.refresh();
  }

  export(): void {
    this.json = JSON.stringify(this.schema, null, 2);
  }

  import(): void {
    try {
      this.schema = JSON.parse(this.json);
    } catch {
      alert('Invalid JSON');
    }
  }
}
