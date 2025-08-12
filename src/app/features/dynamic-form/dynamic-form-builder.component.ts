// dynamic-form-builder.component.ts
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import type {
  FieldConfig,
  FormSchema,
  SectionConfig,
  StepConfig
} from '../../modules/dynamic-form/dynamic-form.service';

type FieldType =
  | 'text' | 'textarea' | 'number' | 'date'
  | 'select' | 'radio' | 'checkbox' | 'textblock';

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
    NzDividerModule,
    NzTabsModule,
    NzSwitchModule,
    NzInputNumberModule,NzTagModule,
NzRadioModule,

    DynamicForm,
  ],
  templateUrl: './dynamic-form-builder.component.html',
  styleUrl: './dynamic-form-builder.component.scss',
})
export class DynamicFormBuilderComponent {
  // Schéma en cours d’édition
  schema: FormSchema = { title: 'Nouveau formulaire' };

  // Sélection courante dans le canvas
  selected: StepConfig | SectionConfig | FieldConfig | FormSchema | null = null;

  // Inspector (réutilisé dans les deux onglets)
  inspector!: FormGroup;

  // Contexte pour la palette (ajouts rapides)
  ctxStepIndex: number | null = null;
  ctxSectionIndex: number | null = null;

  // Prévisualisation responsive
  previewWidth: number | null = null;

  // Import/Export
  json = '';

  private patching = false;

  constructor(private fb: FormBuilder) {
    this.createInspector();
    this.select(this.schema); // on ouvre sur "Form Settings"
  }

  // ---------- Inspector form ----------
  private createInspector(): void {
    this.inspector = this.fb.group({
      // commun / titre
      title: [''],

      // STEP
      visibleIf: [''],

      // SECTION
      description: [''],
      gridGutter: [null],

      // FIELD
      type: ['text'],
      key: [''],
      label: [''],
      placeholder: [''],
      descriptionField: [''],   // description propre au champ
      default: [''],
      options: [''],
      textHtml: [''],
      validators: [''],
      requiredIf: [''],
      disabledIf: [''],
      col: [''],

      // UI (form settings)
      ui_layout: ['horizontal'],
      ui_labelAlign: ['left'],
      ui_labelColSpan: [8],
      ui_controlColSpan: [16],
      ui_widthPx: [1040],

      // Summary (form settings)
      summary_enabled: [false],
      summary_title: ['Résumé'],
      summary_includeHidden: [false],
      summary_dateFormat: ['dd/MM/yyyy'],
    });

    this.inspector.valueChanges.subscribe(v => {
      if (this.patching || !this.selected) return;

      // FORM SETTINGS
      if (this.selected === this.schema) {
        // titre global
        this.schema.title = v.title || undefined;

        // UI
        this.schema.ui = {
          layout: (v.ui_layout || 'horizontal') as 'horizontal'|'vertical'|'inline',
          labelAlign: (v.ui_labelAlign || 'left') as 'left'|'right',
          labelCol: v.ui_labelColSpan != null ? { span: Number(v.ui_labelColSpan) } : undefined,
          controlCol: v.ui_controlColSpan != null ? { span: Number(v.ui_controlColSpan) } : undefined,
          widthPx: v.ui_widthPx != null ? Number(v.ui_widthPx) : undefined
        };

        // Summary
        this.schema.summary = {
          enabled: !!v.summary_enabled,
          title: v.summary_title || undefined,
          includeHidden: !!v.summary_includeHidden,
          dateFormat: v.summary_dateFormat || undefined
        };

        this.refresh();
        return;
      }

      // OBJETS (step/section/field)
      if (this.isStep(this.selected)) {
        // STEP
        this.selected.title = v.title || undefined;
        this.selected.visibleIf = this.parseJson(v.visibleIf);
      } else if (this.isSection(this.selected)) {
        // SECTION
        this.selected.title = v.title || undefined;
        this.selected.description = v.description || undefined;
        this.selected.grid = v.gridGutter != null && v.gridGutter !== ''
          ? { gutter: Number(v.gridGutter) }
          : undefined;
      } else if (this.isField(this.selected)) {
        // FIELD
        const f = this.selected;

        f.type = (v.type || 'text') as FieldType;

        if (f.type === 'textblock') {
          // textblock : pas de key/validators/options
          delete (f as any).key;
          delete (f as any).placeholder;
          delete (f as any).validators;
          delete (f as any).options;
          f.label = v.label || undefined; // label facultatif (peut aider en résumé)
          (f as any).textHtml = v.textHtml || '';
          f.col = this.parseJson(v.col);
        } else {
          // Inputs classiques
          (f as any).key = v.key || '';
          f.label = v.label || undefined;
          (f as any).placeholder = v.placeholder || undefined;
          (f as any).description = v.descriptionField || undefined;
          (f as any).default = v.default ?? undefined;
          (f as any).options = this.parseJson(v.options);
          (f as any).validators = this.parseJson(v.validators);
          (f as any).visibleIf = this.parseJson(v.visibleIf);
          (f as any).requiredIf = this.parseJson(v.requiredIf);
          (f as any).disabledIf = this.parseJson(v.disabledIf);
          f.col = this.parseJson(v.col);
          // textHtml n’a pas de sens pour un input
          delete (f as any).textHtml;
        }
      }

      this.refresh();
    });
  }

  // ---------- Sélection / patch inspector ----------
  select(obj: StepConfig | SectionConfig | FieldConfig | FormSchema): void {
    this.selected = obj;
    this.patching = true;

    if (obj === this.schema) {
      // Onglet "Form Settings"
      this.inspector.patchValue({
        title: this.schema.title ?? '',
        ui_layout: this.schema.ui?.layout ?? 'horizontal',
        ui_labelAlign: this.schema.ui?.labelAlign ?? 'left',
        ui_labelColSpan: this.schema.ui?.labelCol?.span ?? 8,
        ui_controlColSpan: this.schema.ui?.controlCol?.span ?? 16,
        ui_widthPx: this.schema.ui?.widthPx ?? 1040,
        summary_enabled: !!this.schema.summary?.enabled,
        summary_title: this.schema.summary?.title ?? '',
        summary_includeHidden: !!this.schema.summary?.includeHidden,
        summary_dateFormat: this.schema.summary?.dateFormat ?? 'dd/MM/yyyy',
      }, { emitEvent: false });
      this.patching = false;
      return;
    }

    // Onglet "Propriétés" (Step / Section / Field)
    const basePatch: any = { title: (obj as any).title ?? '' };

    if (this.isStep(obj)) {
      Object.assign(basePatch, {
        visibleIf: this.stringifyJson(obj.visibleIf),
        // neutraliser champs non pertinents
        description: '',
        gridGutter: null,
        type: 'text',
        key: '',
        label: '',
        placeholder: '',
        descriptionField: '',
        default: '',
        options: '',
        textHtml: '',
        validators: '',
        requiredIf: '',
        disabledIf: '',
        col: ''
      });
    } else if (this.isSection(obj)) {
      Object.assign(basePatch, {
        description: obj.description ?? '',
        gridGutter: obj.grid?.gutter ?? null,
        visibleIf: '', // (non supporté sur section → si tu veux, tu peux l’ajouter côté moteur)
        type: 'text',
        key: '',
        label: '',
        placeholder: '',
        descriptionField: '',
        default: '',
        options: '',
        textHtml: '',
        validators: '',
        requiredIf: '',
        disabledIf: '',
        col: ''
      });
    } else if (this.isField(obj)) {
      const isTB = obj.type === 'textblock';
      Object.assign(basePatch, {
        type: obj.type,
        key: (obj as any).key ?? '',
        label: obj.label ?? '',
        placeholder: (obj as any).placeholder ?? '',
        descriptionField: (obj as any).description ?? '',
        default: (obj as any).default ?? '',
        options: this.stringifyJson((obj as any).options),
        textHtml: (obj as any).textHtml ?? '',
        validators: this.stringifyJson((obj as any).validators),
        visibleIf: this.stringifyJson((obj as any).visibleIf),
        requiredIf: this.stringifyJson((obj as any).requiredIf),
        disabledIf: this.stringifyJson((obj as any).disabledIf),
        col: this.stringifyJson((obj as any).col)
      });

      if (isTB) {
        // masquer valeurs non pertinentes dans l’UI (pas obligatoire, mais propre)
        basePatch.key = '';
        basePatch.placeholder = '';
        basePatch.descriptionField = '';
        basePatch.default = '';
        basePatch.options = '';
        basePatch.validators = '';
        basePatch.visibleIf = '';
        basePatch.requiredIf = '';
        basePatch.disabledIf = '';
      }
    }

    this.inspector.patchValue(basePatch, { emitEvent: false });
    this.patching = false;
  }

  isSelected(obj: any): boolean { return this.selected === obj; }
  isStep(obj: any): obj is StepConfig { return !!obj && obj !== this.schema && 'sections' in obj && !('fields' in obj); }
  isSection(obj: any): obj is SectionConfig { return !!obj && 'fields' in obj && !('steps' in obj); }
  isField(obj: any): obj is FieldConfig {
    return !!obj && 'type' in obj && !('fields' in obj) && !('steps' in obj) && !('sections' in obj);
  }

  // ---------- Palette / Contexte ----------
  addSectionToCtx(): void {
    if (this.ctxStepIndex == null || !this.schema.steps) return;
    const sec: SectionConfig = { title: 'Section', fields: [] };
    this.schema.steps[this.ctxStepIndex].sections = this.schema.steps[this.ctxStepIndex].sections || [];
    this.schema.steps[this.ctxStepIndex].sections!.push(sec);
    this.refresh();
  }

  addFieldToCtx(): void {
    if (this.ctxStepIndex == null || this.ctxSectionIndex == null || !this.schema.steps) return;
    const section = this.schema.steps[this.ctxStepIndex].sections?.[this.ctxSectionIndex];
    if (!section) return;
    section.fields = section.fields || [];
    section.fields.push(this.newField('text'));
    this.refresh();
  }

  quickAdd(type: FieldType): void {
    if (this.ctxStepIndex != null && this.ctxSectionIndex != null && this.schema.steps) {
      // dans une section d’un step
      const section = this.schema.steps[this.ctxStepIndex].sections?.[this.ctxSectionIndex];
      if (!section) return;
      section.fields = section.fields || [];
      section.fields.push(this.newField(type));
    } else if (this.schema.sections && !this.schema.steps) {
      // sections directes
      if (!this.schema.sections.length) this.addSection();
      this.schema.sections[0].fields = this.schema.sections[0].fields || [];
      this.schema.sections[0].fields!.push(this.newField(type));
    } else {
      // flat
      this.ensureFlatMode();
      this.schema.fields!.push(this.newField(type));
    }
    this.refresh();
  }

  // ---------- Canvas actions ----------
  addStep(): void {
    this.ensureStepperMode();
    const step: StepConfig = { title: 'Step', sections: [] };
    this.schema.steps!.push(step);
    this.refresh();
  }

  addSection(step?: StepConfig): void {
    const section: SectionConfig = { title: 'Section', fields: [] };
    if (step) {
      step.sections = step.sections || [];
      step.sections.push(section);
    } else {
      this.ensureSectionsMode();
      this.schema.sections!.push(section);
    }
    this.refresh();
  }

  addField(section?: SectionConfig): void {
    const f = this.newField('text');
    if (section) {
      section.fields = section.fields || [];
      section.fields.push(f);
    } else if (this.schema.sections && !this.schema.steps) {
      if (!this.schema.sections.length) this.addSection();
      this.schema.sections[0].fields = this.schema.sections[0].fields || [];
      this.schema.sections[0].fields!.push(f);
    } else {
      this.ensureFlatMode();
      this.schema.fields!.push(f);
    }
    this.refresh();
  }

  removeStep(step: StepConfig): void {
    if (!this.schema.steps) return;
    const i = this.schema.steps.indexOf(step);
    if (i > -1) this.schema.steps.splice(i, 1);
    if (this.selected === step) this.select(this.schema);
    this.refresh();
  }

  removeSection(section: SectionConfig, step?: StepConfig): void {
    const arr = step ? step.sections : this.schema.sections;
    if (!arr) return;
    const i = arr.indexOf(section);
    if (i > -1) arr.splice(i, 1);
    if (this.selected === section) this.select(this.schema);
    this.refresh();
  }

  removeField(field: FieldConfig, section?: SectionConfig): void {
    const arr = section ? section.fields : this.schema.fields;
    if (!arr) return;
    const i = arr.indexOf(field);
    if (i > -1) arr.splice(i, 1);
    if (this.selected === field) this.select(this.schema);
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

  // ---------- Preview ----------
  setPreviewWidth(px?: number): void {
    this.previewWidth = px ?? null;
  }

  // ---------- Import / Export ----------
  export(): void {
    this.json = JSON.stringify(this.schema, null, 2);
  }

  import(): void {
    try {
      const parsed = JSON.parse(this.json) as FormSchema;
      this.schema = parsed || {};
      this.select(this.schema);
    } catch (e) {
      alert('JSON invalide');
    }
  }

  // ---------- Helpers ----------
  private newField(type: FieldType): FieldConfig {
    if (type === 'textblock') {
      return { type, textHtml: '<p>Nouveau bloc</p>', col: { xs: 24 } } as any;
    }
    return { type, key: 'field', label: 'Field' } as FieldConfig;
  }

  private ensureStepperMode(): void {
    if (!this.schema.steps) {
      this.schema.steps = [];
      delete this.schema.sections;
      delete this.schema.fields;
    }
  }

  private ensureSectionsMode(): void {
    if (!this.schema.sections) {
      this.schema.sections = [];
      delete this.schema.steps;
      delete this.schema.fields;
    }
  }

  private ensureFlatMode(): void {
    if (!this.schema.fields) {
      this.schema.fields = [];
      delete this.schema.steps;
      delete this.schema.sections;
    }
  }

  private parseJson<T = any>(src: any): T | undefined {
    if (src == null || src === '') return undefined;
    try { return JSON.parse(src); } catch { return undefined; }
  }
  private stringifyJson(v: any): string {
    return v == null ? '' : JSON.stringify(v);
  }

  private refresh(): void {
    // change detection (garde les références internes pour la sélection)
    this.schema = { ...this.schema };
  }
}
