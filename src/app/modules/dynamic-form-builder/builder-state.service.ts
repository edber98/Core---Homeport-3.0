// modules/dynamic-form-builder/builder-state.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  FormSchema, StepConfig, SectionConfig, FieldConfig
} from './builder.types';
import { BuilderSelection } from './builder.types';

const EMPTY_SCHEMA: FormSchema = {
  ui: { layout: 'horizontal', widthPx: 900 },
  steps: [],
  sections: [],
  fields: []
};

@Injectable({ providedIn: 'root' })
export class BuilderState {
  schema = signal<FormSchema>(load() ?? EMPTY_SCHEMA);

  // ⬇️  ICI: on tape correctement la sélection
  selection = signal<BuilderSelection>({ kind: 'form' });

  // helpers
  hasStepper = computed(() => (this.schema().steps?.length ?? 0) > 0);
  rootSections = computed(() => this.schema().sections ?? []);
  rootFields = computed(() => this.schema().fields ?? []);

  // sélection
  selectForm() { this.selection.set({ kind: 'form' }); }
  selectStep(index: number) { this.selection.set({ kind: 'step', index }); }
  selectSection(index: number, stepIndex?: number) { this.selection.set({ kind: 'section', stepIndex: stepIndex ? stepIndex: 0, index }); }
  selectField(index: number, sectionIndex: number, stepIndex?: number) {
    this.selection.set({ kind: 'field', stepIndex: stepIndex ? stepIndex: 0, sectionIndex, index });
  }

  // mutations (inchangé)
  addStep() {
    const s = structuredClone(this.schema());
    (s.steps ??= []).push({ title: 'Étape', sections: [] });
    this.schema.set(s); this.persist();
  }

  addSection(stepIndex?: number) {
    const s = structuredClone(this.schema());
    const sec: SectionConfig = { title: 'Section', fields: [] };
    if (stepIndex != null) (s.steps![stepIndex].sections ??= []).push(sec);
    else (s.sections ??= []).push(sec);
    this.schema.set(s); this.persist();
  }

  addField(kind: FieldConfig['type'], stepIndex?: number, sectionIndex?: number) {
    const s = structuredClone(this.schema());
    const f: FieldConfig =
      kind === 'textblock'
        ? { type: 'textblock', textHtml: '<p>Texte</p>' }
        : { type: kind as any, key: autoKey(kind), label: 'Label' };

    const targetSection = stepIndex != null
      ? s.steps![stepIndex].sections![sectionIndex!]
      : s.sections![sectionIndex!];

    (targetSection.fields ??= []).push(f);
    this.schema.set(s); this.persist();
  }

  moveInArray<T>(arr: T[], prev: number, curr: number) {
    const [it] = arr.splice(prev, 1); arr.splice(curr, 0, it);
  }
  reorderStep(prev: number, curr: number) {
    const s = structuredClone(this.schema());
    this.moveInArray(s.steps!, prev, curr);
    this.schema.set(s); this.persist();
  }
  reorderSection(stepIndex: number | undefined, prev: number, curr: number) {
    const s = structuredClone(this.schema());
    const list = stepIndex != null ? s.steps![stepIndex].sections! : s.sections!;
    this.moveInArray(list, prev, curr);
    this.schema.set(s); this.persist();
  }
  reorderField(stepIndex: number | undefined, sectionIndex: number, prev: number, curr: number) {
    const s = structuredClone(this.schema());
    const list = stepIndex != null
      ? s.steps![stepIndex].sections![sectionIndex].fields!
      : s.sections![sectionIndex].fields!;
    this.moveInArray(list, prev, curr);
    this.schema.set(s); this.persist();
  }

  updateSchema(patch: Partial<FormSchema>) {
    this.schema.set({ ...this.schema(), ...patch }); this.persist();
  }

  // ⬇️  Reste identique : applique un updater sur la copie de schema
  updateSelection(updater: (s: FormSchema) => void) {
    const s = structuredClone(this.schema()); updater(s);
    this.schema.set(s); this.persist();
  }

  import(schema: FormSchema) { this.schema.set(schema); this.selectForm(); this.persist(); }
  export(): string { return JSON.stringify(this.schema(), null, 2); }
  persist() { try { localStorage.setItem('df_builder_schema', JSON.stringify(this.schema())); } catch {} }
}

function load(): FormSchema | null {
  try { const raw = localStorage.getItem('df_builder_schema'); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function autoKey(kind: string) {
  const id = Math.random().toString(36).slice(2, 7);
  return `${kind}_${id}`;
}
