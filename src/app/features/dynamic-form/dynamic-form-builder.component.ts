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
  schema: FormSchema = { steps: [] };
  selected: StepConfig | SectionConfig | FieldConfig | null = null;
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
      options: [''],
      visibleIf: [''],
      requiredIf: [''],
      disabledIf: [''],
    });
    this.inspector.valueChanges.subscribe(v => {
      if (this.selected) {
        Object.assign(this.selected, {
          title: v.title || undefined,
          key: v.key || undefined,
          label: v.label || undefined,
          placeholder: v.placeholder || undefined,
          options: v.options ? JSON.parse(v.options) : undefined,
          visibleIf: v.visibleIf ? JSON.parse(v.visibleIf) : undefined,
          requiredIf: v.requiredIf ? JSON.parse(v.requiredIf) : undefined,
          disabledIf: v.disabledIf ? JSON.parse(v.disabledIf) : undefined,
        });
      }
    });
  }

  select(obj: any): void {
    this.selected = obj;
    this.inspector.patchValue({
      title: obj.title ?? '',
      key: obj.key ?? '',
      label: obj.label ?? '',
      placeholder: obj.placeholder ?? '',
      options: obj.options ? JSON.stringify(obj.options) : '',
      visibleIf: obj.visibleIf ? JSON.stringify(obj.visibleIf) : '',
      requiredIf: obj.requiredIf ? JSON.stringify(obj.requiredIf) : '',
      disabledIf: obj.disabledIf ? JSON.stringify(obj.disabledIf) : '',
    });
  }

  addStep(): void {
    const step: StepConfig = { title: 'Step', sections: [] };
    this.schema.steps = this.schema.steps ?? [];
    this.schema.steps.push(step);
  }

  addSection(step: StepConfig): void {
    step.sections.push({ title: 'Section', fields: [] });
  }

  addField(section: SectionConfig): void {
    section.fields = section.fields ?? [];
    section.fields.push({ type: 'text', key: 'field', label: 'Field' });
  }

  dropStep(event: CdkDragDrop<StepConfig[]>): void {
    moveItemInArray(this.schema.steps!, event.previousIndex, event.currentIndex);
  }

  dropSection(event: CdkDragDrop<SectionConfig[]>, step: StepConfig): void {
    moveItemInArray(step.sections, event.previousIndex, event.currentIndex);
  }

  dropField(event: CdkDragDrop<FieldConfig[]>, section: SectionConfig): void {
    if (!section.fields) return;
    moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
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
