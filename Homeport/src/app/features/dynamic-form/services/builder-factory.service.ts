import { Injectable } from '@angular/core';
import type { FieldConfig, SectionConfig, StepConfig } from '../../../modules/dynamic-form/dynamic-form.service';

export type FieldType = 'text'|'textarea'|'number'|'date'|'select'|'radio'|'checkbox'|'cron'|'textblock';

@Injectable({ providedIn: 'root' })
export class BuilderFactoryService {
  newStep(): StepConfig { return { title: 'Step', fields: [] } as any; }
  newSection(): SectionConfig { return { type: 'section', title: 'Section', fields: [], col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 } } as any; }
  newArraySection(): SectionConfig {
    return {
      type: 'section',
      title: 'Section (Array)',
      mode: 'array',
      key: 'items',
      array: { initialItems: 1, minItems: 0 },
      fields: [],
      col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 }
    } as any;
  }

  newField(type: FieldType): FieldConfig {
    const base: any = { type };
    if (type === 'textblock') {
      base.label = 'Texte';
      base.textHtml = '';
    } else {
      base.key = `${type}_${Math.random().toString(36).slice(2,7)}`;
      base.label = type;
      base.col = { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 };
      base.itemStyle = {
        marginTop: '8px',
        marginBottom: '8px',
        marginLeft: '4px',
        marginRight: '4px',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '8px',
        paddingRight: '8px',
      };
      if (type === 'select' || type === 'radio') {
        base.options = [ { label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' } ];
        base.default = 'option1';
      } else if (type === 'number') base.default = 0;
      else if (type === 'cron') base.default = '';
      else if (type === 'checkbox') base.default = false;
      else base.default = '';
      if (type === 'cron') {
        base.cron = { type: 'linux', size: 'default', borderless: false, collapseDisable: false };
        base.col = { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
      }
    }
    return base as FieldConfig;
  }
}
