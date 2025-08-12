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
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzDropDownModule, NzContextMenuService, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
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
NzTreeModule, NzDropDownModule,
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
  // Sélection éditable (champ)
  selectedField: FieldConfig | null = null;

  // Sélections typées pour l'aperçu (évite les casts dans le template)
  get selectedSectionForPreview(): SectionConfig | null {
    return this.isSection(this.selected) ? (this.selected as SectionConfig) : null;
  }
  get selectedStepForPreview(): StepConfig | null {
    return this.isStep(this.selected) ? (this.selected as StepConfig) : null;
  }

  // Inspector (réutilisé dans les deux onglets)
  inspector!: FormGroup;

  // Arbre de structure
  treeNodes: any[] = [];
  dropdownKey: string | null = null;
  treeExpanded = new Set<string>();
  treeSelectedKeys: string[] = [];

  // Prévisualisation responsive
  previewWidth: number | null = null;

  // Grille / breakpoint en édition
  gridBp: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs';
  showGrid = true;

  // Import/Export
  json = '';

  private patching = false;

  // Edit mode toggle
  editMode = true;

  constructor(private fb: FormBuilder, private dropdown: NzContextMenuService) {
    this.createInspector();
    this.select(this.schema); // on ouvre sur "Form Settings"
    this.rebuildTree(); // assure l'affichage de "Formulaire" dès le départ
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
        (this.selected as any).visibleIf = this.parseJson(v.visibleIf);
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
        visibleIf: this.stringifyJson(obj.visibleIf),
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
    this.updateTreeSelectedKeys();
  }

  isSelected(obj: any): boolean { return this.selected === obj; }
  isStep(obj: any): obj is StepConfig {
    return !!obj && obj !== this.schema && !('type' in obj) && (('fields' in obj) || ('sections' in obj)) && !('steps' in obj);
  }
  isSection(obj: any): obj is SectionConfig {
    return !!obj && ('type' in obj) && (obj as any).type === 'section';
  }
  isField(obj: any): obj is FieldConfig {
    return !!obj && 'type' in obj && (obj as any).type !== 'section';
  }

  // ---------- Ajouts rapides (basés sur la sélection) ----------
  quickAdd(type: FieldType): void {
    if (this.selected && this.isSection(this.selected)) {
      this.selected.fields = this.selected.fields || [];
      this.selected.fields.push(this.newField(type));
    } else if (this.selected && this.isStep(this.selected)) {
      (this.selected as any).fields = (this.selected as any).fields || [];
      (this.selected as any).fields.push(this.newField(type));
    } else if (this.schema.steps?.length) {
      const step = this.schema.steps[this.schema.steps.length - 1];
      (step as any).fields = (step as any).fields || [];
      (step as any).fields.push(this.newField(type));
    } else {
      this.ensureFlatMode();
      this.schema.fields!.push(this.newField(type));
    }
    this.refresh();
  }

  // ---------- Canvas actions ----------
  addStep(): void {
    this.ensureStepperMode();
    const step: StepConfig = { title: 'Step', fields: [], style: 'stack' } as any;
    this.schema.steps!.push(step);
    this.refresh();
  }

  // Toolbar helpers to avoid complex template expressions
  addSectionFromToolbar(): void {
    if (this.selected && this.isStep(this.selected)) {
      this.addSection(this.selected);
    } else {
      this.addSection();
    }
  }
  addFieldFromToolbar(): void {
    if (this.selected && this.isSection(this.selected)) {
      this.addField(this.selected);
    } else {
      this.addField();
    }
  }

  // Toolbar disabled states
  get isStepsMode() { return !!this.schema.steps?.length; }
  get isSectionsMode() { return false; }
  get isFlatMode() { return !!this.schema.fields?.length && !this.schema.steps; }

  canAddStep(): boolean { return true; }
  canAddSectionBtn(): boolean {
    // toujours actif: ajoute dans le step sélectionné si présent, sinon à la racine
    return true;
  }
  canAddFieldBtn(): boolean {
    if (this.selected && this.isSection(this.selected)) return true;
    // sinon autoriser, il sera ajouté au bon endroit (step root/section root/flat)
    return true;
  }

  addSection(step?: StepConfig): void {
    const section: SectionConfig = { type: 'section', title: 'Section', fields: [] } as any;
    if (step) {
      step.fields = step.fields || [];
      step.fields.push(section as any);
    } else {
      this.ensureFlatMode();
      this.schema.fields = this.schema.fields || [];
      this.schema.fields.push(section as any);
    }
    this.refresh();
  }

  addField(section?: SectionConfig): void {
    const f = this.newField('text');
    if (section) {
      section.fields = section.fields || [];
      section.fields.push(f);
    } else {
      this.ensureFlatMode();
      this.schema.fields!.push(f);
    }
    this.refresh();
  }

  addFieldToStep(step: StepConfig): void {
    const f = this.newField('text');
    step.fields = step.fields || [];
    step.fields.push(f);
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
    if (step) {
      const idx = (step.fields || []).indexOf(section as any);
      if (idx > -1) step.fields!.splice(idx, 1);
    } else {
      const idx = (this.schema.fields || []).indexOf(section as any);
      if (idx > -1) this.schema.fields!.splice(idx, 1);
    }
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
    if (step) {
      const list = (step.fields || []).filter(f => (f as any).type === 'section') as any[];
      moveItemInArray(list, event.previousIndex, event.currentIndex);
    } else {
      const list = (this.schema.fields || []).filter(f => (f as any).type === 'section') as any[];
      moveItemInArray(list, event.previousIndex, event.currentIndex);
    }
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

  // ---------- Edition via DynamicForm (overlay) ----------
  onEditMoveItem(e: { path: 'step'|'root'; stepIndex?: number; index: number; dir: 'up'|'down' }) {
    const move = (arr: any[] | undefined) => {
      if (!arr) return;
      const from = e.index;
      const to = e.dir === 'up' ? e.index - 1 : e.index + 1;
      if (to < 0 || to >= arr.length) return;
      moveItemInArray(arr, from, to);
    };
    if (e.path === 'root') move(this.schema.fields);
    if (e.path === 'step') move(this.schema.steps?.[e.stepIndex!].fields);
    this.refresh();
  }
  onEditMoveField(e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; dir: 'up'|'down' }) {
    const move = <T>(arr: T[] | undefined) => {
      if (!arr) return;
      const from = e.index;
      const to = e.dir === 'up' ? e.index - 1 : e.index + 1;
      if (to < 0 || to >= arr.length) return;
      moveItemInArray(arr, from, to);
    };
    if (e.path === 'flat') move(this.schema.fields);
    if (e.path === 'section') {
      if (e.stepIndex != null) {
        const f = this.schema.steps?.[e.stepIndex].fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        move(sec?.fields);
      } else {
        const f = this.schema.fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        move(sec?.fields);
      }
    }
    if (e.path === 'stepRoot') move(this.schema.steps?.[e.stepIndex!].fields);
    this.refresh();
  }
  onEditDeleteField(e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number }) {
    const del = <T>(arr: T[] | undefined) => {
      if (!arr) return;
      arr.splice(e.index, 1);
    };
    if (e.path === 'flat') del(this.schema.fields);
    if (e.path === 'section') {
      if (e.stepIndex != null) {
        const f = this.schema.steps?.[e.stepIndex].fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        del(sec?.fields);
      } else {
        const f = this.schema.fields?.[e.sectionIndex!];
        const sec = f && (f as any).type === 'section' ? (f as any) : null;
        del(sec?.fields);
      }
    }
    if (e.path === 'stepRoot') del(this.schema.steps?.[e.stepIndex!].fields);
    if (this.selectedField && e.path) this.selectedField = null;
    this.refresh();
  }
  // removed legacy onEditMoveSection; use onEditMoveItem instead
  onEditAddFieldTyped(e: { path: 'root'|'stepRoot'|'section'; stepIndex?: number; sectionIndex?: number; type: string }) {
    const make = (t: any) => this.newField(t as any);
    if (e.path === 'root') {
      this.ensureFlatMode();
      this.schema.fields = this.schema.fields || [];
      const f = make(e.type);
      this.schema.fields.push(f);
      this.select(f);
    } else if (e.path === 'stepRoot') {
      const st = this.schema.steps?.[e.stepIndex!]; if (!st) return;
      st.fields = st.fields || [];
      const f = make(e.type); st.fields.push(f);
      this.select(f);
    } else if (e.path === 'section') {
      let sec: any = null;
      if (e.stepIndex != null) {
        const f = this.schema.steps?.[e.stepIndex!].fields?.[e.sectionIndex!];
        if (f && (f as any).type === 'section') sec = f as any;
      } else {
        const f = this.schema.fields?.[e.sectionIndex!];
        if (f && (f as any).type === 'section') sec = f as any;
      }
      if (!sec) return; sec.fields = sec.fields || [];
      const f = make(e.type); sec.fields.push(f);
      this.select(f);
    }
    this.refresh();
  }
  onEditSelectField(e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; field: FieldConfig }) {
    this.selectedField = e.field;
    this.select(e.field);
  }
  onEditSelectSection(e: { stepIndex?: number; sectionIndex: number; section: SectionConfig }) {
    if (this.selected === e.section) {
      this.selectedField = null;
      this.selected = null;
    } else {
      this.selectedField = null;
      this.select(e.section);
    }
  }
  onEditSelectStep(e: { stepIndex: number; step: StepConfig; fromStepper?: boolean }) {
    if (!e.fromStepper && this.selected === e.step) {
      this.selectedField = null;
      this.selected = null;
    } else {
      this.selectedField = null;
      this.select(e.step);
    }
  }

  // Ajouts depuis l'aperçu
  onEditAddStep() {
    this.ensureStepperMode();
    const step: StepConfig = { title: 'Step', fields: [], style: 'stack' } as any;
    this.schema.steps!.push(step);
    this.refresh();
  }
  onEditAddSection(e: { stepIndex: number }) {
    if (!this.schema.steps) this.ensureStepperMode();
    const step = this.schema.steps![e.stepIndex];
    step.fields = step.fields || [];
    (step.fields as any).push({ type: 'section', title: 'Section', fields: [] } as any);
    this.refresh();
  }
  onEditAddFieldStepRoot(e: { stepIndex: number }) {
    if (!this.schema.steps) return;
    const step = this.schema.steps[e.stepIndex];
    step.fields = step.fields || [];
    step.fields.push(this.newField('text'));
    this.refresh();
  }
  onEditAddFieldInSection(e: { stepIndex?: number; sectionIndex: number }) {
    if (e.stepIndex != null && this.schema.steps) {
      const f = this.schema.steps[e.stepIndex].fields?.[e.sectionIndex];
      const sec = f && (f as any).type === 'section' ? (f as any) : null;
      if (!sec) return; sec.fields = sec.fields || []; sec.fields.push(this.newField('text'));
    } else if (this.schema.fields) {
      const f = this.schema.fields[e.sectionIndex];
      const sec = f && (f as any).type === 'section' ? (f as any) : null;
      if (!sec) return; sec.fields = sec.fields || []; sec.fields.push(this.newField('text'));
    }
    this.refresh();
  }

  onEditDeleteStep(e: { stepIndex: number }) {
    if (!this.schema.steps) return;
    this.schema.steps.splice(e.stepIndex, 1);
    this.selectedField = null;
    this.select(this.schema);
    this.refresh();
  }
  onEditDeleteSection(e: { stepIndex?: number; sectionIndex: number }) {
    if (e.stepIndex != null && this.schema.steps) {
      const arr = this.schema.steps[e.stepIndex].fields || [];
      arr.splice(e.sectionIndex, 1);
      this.schema.steps[e.stepIndex].fields = arr;
    } else if (this.schema.fields) {
      this.schema.fields.splice(e.sectionIndex, 1);
    }
    this.selectedField = null;
    this.select(this.schema);
    this.refresh();
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
      delete this.schema.fields;
    }
  }

  private ensureFlatMode(): void {
    if (!this.schema.fields) {
      this.schema.fields = [];
    }
    delete this.schema.steps;
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
    const wasSchemaSelected = this.selected === this.schema;
    const old = this.schema;
    this.schema = { ...this.schema };
    // si on avait sélectionné le schéma, réaligner sur la nouvelle ref
    if (wasSchemaSelected) {
      this.selected = this.schema;
      // resynchroniser l'inspector sans émettre
      this.patching = true;
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
    }
    this.rebuildTree();
  }

  // ====== Tree ======
  private rebuildTree() {
    const nodes: any[] = [];
    const isExp = (key: string, def = false) => this.treeExpanded.has(key) || def;
    const pushFieldNodes = (acc: any[], baseKey: string, fields?: FieldConfig[]) => {
      (fields || []).forEach((f: any, i: number) => {
        const key = `${baseKey}:field:${i}`;
        if (f.type === 'section') {
          const secNode: any = { title: f.title || 'Section', key, isLeaf: false, expanded: isExp(key, false), children: [] };
          pushFieldNodes(secNode.children, key, f.fields || []);
          acc.push(secNode);
        } else {
          acc.push({ title: f.label || f.key || f.type, key, isLeaf: true });
        }
      });
    };
    if (this.schema.steps?.length) {
      const children: any[] = [];
      this.schema.steps.forEach((st, si) => {
        const stepKey = `step:${si}`;
        const stepNode: any = { title: st.title || `Step ${si + 1}`, key: stepKey, isLeaf: false, expanded: isExp(stepKey, false), children: [] };
        pushFieldNodes(stepNode.children, stepKey, st.fields || []);
        children.push(stepNode);
      });
      nodes.push({ title: 'Formulaire', key: 'root', isLeaf: false, expanded: true, children });
    } else if (this.schema.fields?.length) {
      const children: any[] = [];
      pushFieldNodes(children, 'field', this.schema.fields);
      nodes.push({ title: 'Formulaire', key: 'root', isLeaf: false, expanded: true, children });
    } else {
      nodes.push({ title: 'Formulaire', key: 'root', isLeaf: true });
    }
    this.treeNodes = nodes;
    this.updateTreeSelectedKeys();
  }

  onTreeSelect(keys: string[]) {
    const key = keys[0];
    if (!key) return;
    const parts = key.split(':');
    const n = (s: string) => Number(s);
    if (parts[0] === 'root') { this.select(this.schema); return; }
    if (parts[0] === 'step') {
      const si = n(parts[1]);
      if (!this.schema.steps || !this.schema.steps[si]) return;
      if (parts.length === 2) { this.toggleSelect(this.schema.steps[si]); return; }
      // traverse fields chain
      let cur: any[] | undefined = this.schema.steps[si].fields;
      let obj: any = null;
      for (let i = 2; i < parts.length; i += 2) {
        if (parts[i] !== 'field') break;
        const fi = n(parts[i + 1]);
        obj = cur?.[fi];
        if (!obj) break;
        cur = (obj as any).fields; // if section, next cur is its fields
      }
      if (obj) this.toggleSelect(obj);
      return;
    }
    if (parts[0] === 'field') {
      // root fields chain
      let cur: any[] | undefined = this.schema.fields;
      let obj: any = null;
      for (let i = 1; i < parts.length; i += 2) {
        if (parts[i - 1] !== 'field') break;
        const fi = n(parts[i]);
        obj = cur?.[fi];
        if (!obj) break;
        cur = (obj as any).fields;
      }
      if (obj) this.toggleSelect(obj);
      return;
    }
  }

  private toggleSelect(obj: any) {
    if (this.selected === obj) {
      this.selected = null;
      this.selectedField = null;
    } else {
      this.select(obj);
    }
  }

  onTreeClick(e: any) {
    const key = e && e.node && e.node.key ? String(e.node.key) : undefined;
    if (!key) return;
    this.onTreeSelect([key]);
  }
  onTreeDropdownVisible(vis: boolean, key: string) { this.dropdownKey = vis ? key : null; }

  onTreeExpand(e: any) {
    const key = e?.node?.key as string | undefined;
    if (!key) return;
    if (e?.node?.isExpanded) this.treeExpanded.add(key); else this.treeExpanded.delete(key);
  }

  private keyForObject(obj: any): string | null {
    if (obj === this.schema) return 'root';
    const searchFields = (base: string, fields?: any[]): string | null => {
      for (let i = 0; i < (fields || []).length; i++) {
        const f = fields![i];
        const key = `${base}:field:${i}`;
        if (f === obj) return key;
        if (f && f.type === 'section') {
          const sub = searchFields(key, f.fields || []);
          if (sub) return sub;
        }
      }
      return null;
    };
    if (this.schema.steps) {
      for (let si = 0; si < this.schema.steps.length; si++) {
        const st = this.schema.steps[si];
        if (obj === st) return `step:${si}`;
        const sub = searchFields(`step:${si}`, st.fields || []);
        if (sub) return sub;
      }
    }
    const subRoot = searchFields('field', this.schema.fields || []);
    if (subRoot) return subRoot;
    return null;
  }

  private updateTreeSelectedKeys() {
    const k = this.keyForObject(this.selected);
    this.treeSelectedKeys = k ? [k] : [];
  }

  openTreeMenu(event: MouseEvent, menu: NzDropdownMenuComponent, key: string) {
    event.preventDefault();
    this.dropdownKey = key;
    this.dropdown.create(event, menu);
  }

  private parseKey(key: string): any | null {
    const parts = key.split(':');
    const n = (s: string) => Number(s);
    if (parts[0] === 'step') {
      const si = n(parts[1]);
      if (parts.length === 2) return { key, type: 'step', stepIndex: si };
      const idxs: number[] = [];
      for (let i = 2; i < parts.length; i += 2) { if (parts[i] !== 'field') break; idxs.push(n(parts[i+1])); }
      return { key, type: 'fieldPath', stepIndex: si, path: idxs };
    }
    if (parts[0] === 'field') {
      const idxs: number[] = [];
      for (let i = 1; i < parts.length; i += 2) { if (parts[i-1] !== 'field') break; idxs.push(n(parts[i])); }
      return { key, type: 'rootFieldPath', path: idxs };
    }
    if (parts[0] === 'root') return { key, type: 'root' };
    return null;
  }

  // actions via menu contextuel (tree) — basées sur dropdownKey
  private currentCtxFromDropdown() {
    if (!this.dropdownKey) return null;
    return this.parseKey(this.dropdownKey);
  }
  ctxAddStep() {
    this.ensureStepperMode();
    const step: StepConfig = { title: 'Step', sections: [], fields: [] } as any;
    this.schema.steps!.push(step);
    this.select(step);
    this.refresh();
  }
  ctxAddSection() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx || ctx.type !== 'step') return;
    const step = this.schema.steps?.[ctx.stepIndex!];
    if (!step) return;
    step.fields = step.fields || [];
    const sec: SectionConfig = { type: 'section', title: 'Section', fields: [] } as any;
    step.fields.push(sec as any);
    this.select(sec as any);
    this.refresh();
  }
  ctxAddFieldToStep() {
    const ctx = this.currentCtxFromDropdown();
    if (ctx?.type !== 'step') return;
    const step = this.schema.steps?.[ctx.stepIndex!];
    if (!step) return;
    step.fields = step.fields || [];
    const f = this.newField('text');
    step.fields.push(f);
    this.select(f);
    this.refresh();
  }
  ctxAddFieldToSection() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx) return;
    let sec: any = null;
    if (ctx.type === 'fieldPath' && ctx.path?.length) {
      let cur: any = this.schema.steps?.[ctx.stepIndex!].fields;
      for (const i of ctx.path) cur = cur?.[i];
      if (cur && cur.type === 'section') sec = cur;
    } else if (ctx.type === 'rootFieldPath' && ctx.path?.length) {
      let cur: any = this.schema.fields;
      for (const i of ctx.path) cur = cur?.[i];
      if (cur && cur.type === 'section') sec = cur;
    }
    if (!sec) return; sec.fields = sec.fields || [];
    const f = this.newField('text'); sec.fields.push(f);
    this.select(f);
    this.refresh();
  }
  ctxAddFieldToSectionTyped(t: string) {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx) return;
    let sec: any = null;
    if (ctx.type === 'fieldPath' && ctx.path?.length) {
      let cur: any = this.schema.steps?.[ctx.stepIndex!].fields;
      for (const i of ctx.path) cur = cur?.[i];
      if (cur && cur.type === 'section') sec = cur;
    } else if (ctx.type === 'rootFieldPath' && ctx.path?.length) {
      let cur: any = this.schema.fields;
      for (const i of ctx.path) cur = cur?.[i];
      if (cur && cur.type === 'section') sec = cur;
    }
    if (!sec) return; sec.fields = sec.fields || [];
    const f = this.newField(t as any); sec.fields.push(f);
    this.select(f); this.refresh();
  }
  ctxAddFieldRootTyped(t: string) {
    if (this.schema.steps?.length) return;
    this.ensureFlatMode();
    this.schema.fields = this.schema.fields || [];
    const f = this.newField(t as any); this.schema.fields.push(f);
    this.select(f); this.refresh();
  }
  ctxAddSectionRoot() {
    // Only when no steps (root-level sections)
    if (this.schema.steps?.length) return;
    this.ensureFlatMode();
    const sec: SectionConfig = { type: 'section', title: 'Section', fields: [] } as any;
    this.schema.fields = this.schema.fields || [];
    this.schema.fields.push(sec as any);
    this.select(sec as any);
    this.refresh();
  }
  ctxAddFieldRoot() {
    // Only when no steps (root-level fields)
    this.ensureFlatMode();
    const f = this.newField('text');
    this.schema.fields = this.schema.fields || [];
    this.schema.fields.push(f);
    this.select(f);
    this.refresh();
  }
  ctxDeleteStep() {
    const ctx = this.currentCtxFromDropdown();
    if (ctx?.type !== 'step') return;
    const steps = this.schema.steps;
    if (!steps) return;
    steps.splice(ctx.stepIndex!, 1);
    if (this.selected && this.isStep(this.selected)) this.select(this.schema);
    this.refresh();
  }
  ctxDeleteSection() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx) return;
    if (ctx.type === 'fieldPath' && ctx.path?.length) {
      const step = this.schema.steps?.[ctx.stepIndex!];
      if (!step) return;
      let parent: any[] | undefined = step.fields;
      for (let i = 0; i < ctx.path.length - 1; i++) parent = (parent?.[ctx.path[i]] as any)?.fields;
      const idx = ctx.path[ctx.path.length - 1];
      parent?.splice(idx, 1);
      if (this.selected && this.isSection(this.selected)) this.select(step);
    } else if (ctx.type === 'rootFieldPath' && ctx.path?.length) {
      let parent: any[] | undefined = this.schema.fields;
      for (let i = 0; i < ctx.path.length - 1; i++) parent = (parent?.[ctx.path[i]] as any)?.fields;
      const idx = ctx.path[ctx.path.length - 1];
      parent?.splice(idx, 1);
      if (this.selected && this.isSection(this.selected)) this.select(this.schema);
    }
    this.refresh();
  }
  ctxDeleteField() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx) return;
    if (ctx.type === 'fieldPath' && ctx.path?.length) {
      const step = this.schema.steps?.[ctx.stepIndex!];
      if (!step) return;
      let parent: any[] | undefined = step.fields;
      for (let i = 0; i < ctx.path.length - 1; i++) parent = (parent?.[ctx.path[i]] as any)?.fields;
      const idx = ctx.path[ctx.path.length - 1];
      parent?.splice(idx, 1);
      if (this.selected && this.isField(this.selected)) this.select(step);
    } else if (ctx.type === 'rootFieldPath' && ctx.path?.length) {
      let parent: any[] | undefined = this.schema.fields;
      for (let i = 0; i < ctx.path.length - 1; i++) parent = (parent?.[ctx.path[i]] as any)?.fields;
      const idx = ctx.path[ctx.path.length - 1];
      parent?.splice(idx, 1);
      if (this.selected && this.isField(this.selected)) this.select(this.schema);
    }
    this.refresh();
  }

  // ====== Helpers Canvas (Grid/Cols) ======
  private spanForBp(field: FieldConfig, bp: 'xs'|'sm'|'md'|'lg'|'xl'): number {
    const col = (field as any).col || {};
    const xs = typeof col.xs === 'number' ? col.xs : 24;
    const sm = typeof col.sm === 'number' ? col.sm : xs;
    const md = typeof col.md === 'number' ? col.md : sm;
    const lg = typeof col.lg === 'number' ? col.lg : md;
    const xl = typeof col.xl === 'number' ? col.xl : lg;
    return { xs, sm, md, lg, xl }[bp];
  }
  getSpan(field: FieldConfig): number { return this.spanForBp(field, this.gridBp); }
  setSpan(field: FieldConfig, span: number) {
    const col = { ...(field as any).col };
    col[this.gridBp] = Math.max(1, Math.min(24, Math.round(span)));
    (field as any).col = col;
    this.refresh();
  }
  changeSpan(field: FieldConfig, delta: number) { this.setSpan(field, this.getSpan(field) + delta); }

  private _resizing: { field: FieldConfig; containerLeft: number; containerWidth: number } | null = null;
  onResizeStart(ev: MouseEvent, field: FieldConfig) {
    ev.stopPropagation();
    const grid = (ev.currentTarget as HTMLElement).closest('.fields.grid') as HTMLElement | null;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    this._resizing = { field, containerLeft: rect.left + window.scrollX, containerWidth: rect.width };
    window.addEventListener('mousemove', this.onResizeMove);
    window.addEventListener('mouseup', this.onResizeEnd);
  }
  onResizeMove = (ev: MouseEvent) => {
    if (!this._resizing) return;
    const { field, containerLeft, containerWidth } = this._resizing;
    const x = ev.pageX - containerLeft;
    const ratio = Math.max(0, Math.min(1, x / containerWidth));
    const span = Math.max(1, Math.min(24, Math.round(ratio * 24)));
    this.setSpan(field, span);
  };
  onResizeEnd = () => {
    this._resizing = null;
    window.removeEventListener('mousemove', this.onResizeMove);
    window.removeEventListener('mouseup', this.onResizeEnd);
  };

  dropFieldInStepRoot(event: CdkDragDrop<FieldConfig[]>, step: StepConfig): void {
    step.fields = step.fields || [];
    moveItemInArray(step.fields, event.previousIndex, event.currentIndex);
    this.refresh();
  }
  removeFieldFromStep(field: FieldConfig, step: StepConfig): void {
    step.fields = step.fields || [];
    const i = step.fields.indexOf(field);
    if (i > -1) step.fields.splice(i, 1);
    if (this.selected === field) this.select(this.schema);
    this.refresh();
  }
}
