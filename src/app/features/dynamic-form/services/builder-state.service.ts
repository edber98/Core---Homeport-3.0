import { Injectable } from '@angular/core';
import type { FieldConfig, SectionConfig, StepConfig, FormSchema } from '../../../modules/dynamic-form/dynamic-form.service';

@Injectable({ providedIn: 'root' })
export class BuilderStateService {
  selected: StepConfig | SectionConfig | FieldConfig | FormSchema | null = null;
  selectedField: FieldConfig | null = null;

  clear() { this.selected = null; this.selectedField = null; }
  setSelected(obj: any) {
    this.selected = obj;
    // mirror selectedField for preview when a field is selected
    if (obj && (obj as any).type && (obj as any).type !== 'section') this.selectedField = obj as FieldConfig;
    else this.selectedField = null;
  }
  toggle(obj: any) { this.selected === obj ? this.clear() : this.setSelected(obj); }
}

