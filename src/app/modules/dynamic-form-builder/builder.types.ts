// src/app/modules/dynamic-form-builder/builder.types.ts

// ✅ Types (type-only re-exports)
export type {
  FormSchema,
  StepConfig,
  SectionConfig,
  FieldConfig,
  InputFieldConfig
} from '../dynamic-form/dynamic-form.service';

// ✅ Valeurs/fonctions (runtime exports)
export { isInputField } from '../dynamic-form/dynamic-form.service';

// (tes propres types peuvent rester tels quels)
export type BuilderSelection =
  | { kind: 'form' }
  | { kind: 'step'; index: number }
  | { kind: 'section'; stepIndex: number | null; index: number }
  | { kind: 'field'; stepIndex: number | null; sectionIndex: number; index: number };
