export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'textblock';

export interface FormUI {
  layout?: 'horizontal' | 'vertical' | 'inline';
  labelAlign?: 'left' | 'right';
  labelCol?: { span?: number; offset?: number };
  controlCol?: { span?: number; offset?: number };
  widthPx?: number;
}

export interface BaseField {
  type: FieldType;
  label?: string;
  placeholder?: string;
  description?: string;
  default?: unknown;
  validators?: any[];
  options?: { label: string; value: unknown }[];
  visibleIf?: any;
  requiredIf?: any;
  disabledIf?: any;
  col?: Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>>;
  textHtml?: string;
  key?: string;
}

export type FieldConfig = BaseField;

export interface SectionConfig {
  title?: string;
  description?: string;
  grid?: { gutter?: number };
  visibleIf?: any;
  fields?: FieldConfig[];
}

export interface StepConfig {
  title?: string;
  visibleIf?: any;
  sections: SectionConfig[];
}

export interface FormSchema {
  title?: string;
  ui?: FormUI;
  steps?: StepConfig[];
  sections?: SectionConfig[];
  fields?: FieldConfig[];
  summary?: { enabled?: boolean; title?: string; includeHidden?: boolean };
}
