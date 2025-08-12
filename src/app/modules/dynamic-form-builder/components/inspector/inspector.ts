// modules/dynamic-form-builder/components/inspector/inspector.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { BuilderState } from '../../builder-state.service';
import { isInputField } from '../../builder.types';

@Component({
  selector: 'df-inspector',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NzFormModule, NzInputModule, NzSelectModule, NzSwitchModule, NzButtonModule
  ],
  templateUrl: './inspector.html'
})
export class Inspector {
  constructor(public state: BuilderState, private fb: FormBuilder) {}

  isInputField = isInputField;

  // ---------- Helpers privés ----------
  private withField(updater: (f: any) => void) {
    const sel = this.state.selection();
    if (sel.kind !== 'field') return;
    this.state.updateSelection(s => {
      const sec = sel.stepIndex != null
        ? s.steps![sel.stepIndex].sections![sel.sectionIndex]
        : s.sections![sel.sectionIndex];
      const f = sec.fields![sel.index] as any;
      updater(f);
    });
  }

  private getSelectedField(): any | null {
    const sel = this.state.selection();
    if (sel.kind !== 'field') return null;
    const sec = sel.stepIndex != null
      ? this.state.schema().steps![sel.stepIndex].sections![sel.sectionIndex]
      : this.state.schema().sections![sel.sectionIndex];
    return sec.fields![sel.index] ?? null;
  }

  // ---------- Form ----------
  updateFormTitle(v: string) { this.state.updateSchema({ title: v }); }
  setLayout(v: 'horizontal'|'vertical'|'inline') {
    this.state.updateSchema({ ui: { ...(this.state.schema().ui || {}), layout: v }});
  }
  setLabelsOnTop(v: boolean) {
    this.state.updateSchema({ ui: { ...(this.state.schema().ui || {}), labelsOnTop: v }});
  }
  toggleStepper(enabled: boolean) {
    this.state.updateSchema(enabled ? { steps: [], sections: [], fields: [] } : { steps: undefined });
  }
  toggleSummary(enabled: boolean) {
    this.state.updateSchema({ summary: { ...(this.state.schema().summary || {}), enabled }});
  }

  // ---------- Step ----------
  stepTitle(): string {
    const sel = this.state.selection();
    if (sel.kind !== 'step') return '';
    return this.state.schema().steps![sel.index].title || '';
  }
  updateStepTitle(v: string) {
    const sel = this.state.selection();
    if (sel.kind !== 'step') return;
    this.state.updateSelection(s => { s.steps![sel.index].title = v; });
  }

  // ---------- Section ----------
  sectionTitle(): string {
    const sel = this.state.selection();
    if (sel.kind !== 'section') return '';
    const sec = sel.stepIndex != null
      ? this.state.schema().steps![sel.stepIndex].sections![sel.index]
      : this.state.schema().sections![sel.index];
    return sec?.title || '';
  }
  updateSectionTitle(v: string) {
    const sel = this.state.selection();
    if (sel.kind !== 'section') return;
    this.state.updateSelection(s => {
      const sec = sel.stepIndex != null ? s.steps![sel.stepIndex].sections![sel.index] : s.sections![sel.index];
      sec.title = v;
    });
  }
  addField(type: string) {
    const sel = this.state.selection();
    if (sel.kind === 'section') this.state.addField(type as any, sel.stepIndex ? sel.stepIndex:0, sel.index);
  }

  // ---------- Field (lectures) ----------
  fieldType(): string { return this.getSelectedField()?.type ?? ''; }
  selectedFieldIsTextblock(): boolean { return this.fieldType() === 'textblock'; }
  fieldKey(): string { return this.getSelectedField()?.key ?? ''; }
  fieldLabel(): string { return this.getSelectedField()?.label ?? ''; }
  fieldPlaceholder(): string { return this.getSelectedField()?.placeholder ?? ''; }
  textHtml(): string { return this.getSelectedField()?.textHtml ?? ''; }

  // ---------- Field (écritures) ----------
  updateFieldKey(v: string)         { this.withField(f => f.key = v); }
  updateFieldLabel(v: string)       { this.withField(f => f.label = v); }
  updateFieldPlaceholder(v: string) { this.withField(f => f.placeholder = v); }
  updateTextHtml(v: string)         { this.withField(f => f.textHtml = v); }

  setOptions(example: 'countries' | 'yesno') {
    const opts = example === 'countries'
      ? [{ label: 'France', value: 'FR' }, { label: 'Belgique', value: 'BE' }, { label: 'Suisse', value: 'CH' }]
      : [{ label: 'Oui', value: true }, { label: 'Non', value: false }];
    this.withField(f => f.options = opts);
  }
}
