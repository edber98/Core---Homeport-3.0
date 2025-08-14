import { Injectable } from '@angular/core';
import type { FieldConfig, SectionConfig, StepConfig } from '../../../modules/dynamic-form/dynamic-form.service';

export type FieldType = 'text'|'textarea'|'number'|'date'|'select'|'radio'|'checkbox'|'textblock';

@Injectable({ providedIn: 'root' })
export class BuilderFactoryService {
  newStep(): StepConfig { return { title: 'Step', fields: [] } as any; }
  newSection(): SectionConfig { return { type: 'section', title: 'Section', fields: [], col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 } } as any; }

  newField(type: FieldType): FieldConfig {
    const base: any = { type };
    if (type === 'textblock') {
      base.label = 'Texte';
      base.textHtml = '';
    } else {
      base.key = `${type}_${Math.random().toString(36).slice(2,7)}`;
      base.label = type;
      base.col = { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 };
      if (type === 'select' || type === 'radio') {
        base.options = [ { label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' } ];
        base.default = 'option1';
      } else if (type === 'number') base.default = 0;
      else if (type === 'checkbox') base.default = false;
      else base.default = '';
    }
    return base as FieldConfig;
  }
}

