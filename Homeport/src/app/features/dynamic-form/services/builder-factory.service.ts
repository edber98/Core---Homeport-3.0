import { Injectable } from '@angular/core';
import type { FieldConfig, SectionConfig, StepConfig } from '../../../modules/dynamic-form/dynamic-form.service';

export type FieldType = 'text'|'textarea'|'number'|'date'|'select'|'radio'|'checkbox'|'cron'|'file'|'textblock'|'schema_builder'|'tags'|'email'|'tel'|'color'|'rate';

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
      } else if (type === 'number' || type === 'rate') base.default = 0;
      else if (type === 'cron') base.default = '';
      else if (type === 'checkbox') base.default = false;
      else base.default = '';
      if (type === 'cron') {
        base.cron = { type: 'linux', size: 'default', borderless: false, collapseDisable: false };
        base.col = { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
      }
      if (type === 'file') {
        base.default = null;
        base.file = { accept: '', maxSize: 10485760, multiple: false, maxCount: 10, lifecycle: 'execution', preview: true, dragDrop: false, listType: 'text', buttonText: '', hint: '' };
        base.col = { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
      }
      if (type === 'schema_builder') {
        base.default = null;
        base.col = { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
      }
      if (type === 'tags') {
        base.default = [];
        base.tags = { itemType: 'text' };
        base.col = { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
      }
      if (type === 'email') {
        base.placeholder = 'exemple@email.com';
        base.default = '';
        base.validators = [{ type: 'pattern', value: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }];
      }
      if (type === 'tel') {
        base.placeholder = '+33 6 12 34 56 78';
        base.default = '';
      }
      if (type === 'color') {
        base.default = '#1677ff';
        base.col = { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 };
      }
      if (type === 'rate') {
        base.default = 0;
        base.rate = { allowHalf: false };
        base.col = { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 };
      }
    }
    return base as FieldConfig;
  }
}
