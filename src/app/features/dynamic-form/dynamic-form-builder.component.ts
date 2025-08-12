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
    return !!obj && obj !== this.schema && !('type' in obj) && ('sections' in obj);
  }
  isSection(obj: any): obj is SectionConfig {
    return !!obj && !('type' in obj) && ('fields' in obj) && !('sections' in obj) && !('steps' in obj);
  }
  isField(obj: any): obj is FieldConfig {
    return !!obj && 'type' in obj && !('fields' in obj) && !('steps' in obj) && !('sections' in obj);
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
    } else if (this.schema.sections && !this.schema.steps) {
      if (!this.schema.sections.length) this.addSection();
      this.schema.sections[0].fields = this.schema.sections[0].fields || [];
      this.schema.sections[0].fields!.push(this.newField(type));
    } else {
      this.ensureFlatMode();
      this.schema.fields!.push(this.newField(type));
    }
    this.refresh();
  }

  // ---------- Canvas actions ----------
  addStep(): void {
    this.ensureStepperMode();
    const step: StepConfig = { title: 'Step', sections: [], fields: [], style: 'stack' } as any;
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
  get isSectionsMode() { return !!this.schema.sections?.length && !this.schema.steps; }
  get isFlatMode() { return !!this.schema.fields?.length && !this.schema.steps && !this.schema.sections; }

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

  // ---------- Edition via DynamicForm (overlay) ----------
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
      if (e.stepIndex != null) move(this.schema.steps?.[e.stepIndex].sections?.[e.sectionIndex!].fields);
      else move(this.schema.sections?.[e.sectionIndex!].fields);
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
      if (e.stepIndex != null) del(this.schema.steps?.[e.stepIndex].sections?.[e.sectionIndex!].fields);
      else del(this.schema.sections?.[e.sectionIndex!].fields);
    }
    if (e.path === 'stepRoot') del(this.schema.steps?.[e.stepIndex!].fields);
    if (this.selectedField && e.path) this.selectedField = null;
    this.refresh();
  }
  onEditMoveSection(e: { path: 'sectionRoot'|'stepSections'; stepIndex?: number; sectionIndex: number; dir: 'up'|'down' }) {
    const moveSec = (arr: SectionConfig[] | undefined) => {
      if (!arr) return;
      const from = e.sectionIndex;
      const to = e.dir === 'up' ? e.sectionIndex - 1 : e.sectionIndex + 1;
      if (to < 0 || to >= arr.length) return;
      moveItemInArray(arr, from, to);
    };
    if (e.path === 'sectionRoot') moveSec(this.schema.sections);
    if (e.path === 'stepSections') moveSec(this.schema.steps?.[e.stepIndex!].sections);
    this.refresh();
  }
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
      const sec = e.stepIndex != null ? this.schema.steps?.[e.stepIndex!].sections?.[e.sectionIndex!] : this.schema.sections?.[e.sectionIndex!];
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
    const step: StepConfig = { title: 'Step', sections: [], fields: [], style: 'stack' } as any;
    this.schema.steps!.push(step);
    this.refresh();
  }
  onEditAddSection(e: { stepIndex: number }) {
    if (!this.schema.steps) this.ensureStepperMode();
    const step = this.schema.steps![e.stepIndex];
    step.sections = step.sections || [];
    step.sections.push({ title: 'Section', fields: [] });
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
      const sec = this.schema.steps[e.stepIndex].sections?.[e.sectionIndex];
      if (!sec) return; sec.fields = sec.fields || []; sec.fields.push(this.newField('text'));
    } else if (this.schema.sections) {
      const sec = this.schema.sections[e.sectionIndex];
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
      const sections = this.schema.steps[e.stepIndex].sections || [];
      sections.splice(e.sectionIndex, 1);
    } else if (this.schema.sections) {
      this.schema.sections.splice(e.sectionIndex, 1);
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
      delete this.schema.sections;
      delete this.schema.fields;
    }
  }

  private ensureSectionsMode(): void {
    if (!this.schema.sections) {
      this.schema.sections = [];
    }
    delete this.schema.steps;
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
    if (this.schema.steps?.length) {
      const children: any[] = [];
      this.schema.steps.forEach((st, si) => {
        const stepNode: any = {
          title: st.title || `Step ${si + 1}`,
          key: `step:${si}`,
          isLeaf: false,
          expanded: isExp(`step:${si}`, false),
          children: [] as any[]
        };
        // champs racine du step
        (st.fields || []).forEach((f, fi) => {
          stepNode.children.push({
            title: f.label || (f as any).key || f.type,
            key: `step:${si}:field:${fi}`,
            isLeaf: true
          });
        });
        // sections
        (st.sections || []).forEach((sec, sj) => {
          const secKey = `step:${si}:section:${sj}`;
          const secNode: any = { title: sec.title || `Section ${sj + 1}`, key: secKey, isLeaf: false, expanded: isExp(secKey, false), children: [] };
          (sec.fields || []).forEach((f, fi) => {
            secNode.children.push({ title: f.label || (f as any).key || f.type, key: `step:${si}:section:${sj}:field:${fi}`, isLeaf: true });
          });
          stepNode.children.push(secNode);
        });
        children.push(stepNode);
      });
      nodes.push({ title: 'Formulaire', key: 'root', isLeaf: false, expanded: true, children });
    } else if (this.schema.sections?.length) {
      const children: any[] = [];
      this.schema.sections.forEach((sec, si) => {
        const secKey = `section:${si}`;
        const secNode: any = { title: sec.title || `Section ${si + 1}`, key: secKey, isLeaf: false, expanded: isExp(secKey, false), children: [] };
        (sec.fields || []).forEach((f, fi) => {
          secNode.children.push({ title: f.label || (f as any).key || f.type, key: `section:${si}:field:${fi}`, isLeaf: true });
        });
        children.push(secNode);
      });
      nodes.push({ title: 'Formulaire', key: 'root', isLeaf: false, expanded: true, children });
    } else if (this.schema.fields?.length) {
      const children: any[] = [];
      this.schema.fields.forEach((f, i) => children.push({ title: f.label || (f as any).key || f.type, key: `field:${i}`, isLeaf: true }));
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
    const type = parts[0];
    const idx = (s: string) => Number(s);
    if (type === 'step') {
      const si = idx(parts[1]);
      if (parts[2] === 'field') {
        const fi = idx(parts[3]);
        const f = this.schema.steps?.[si].fields?.[fi];
        if (f) this.toggleSelect(f);
      } else if (parts[2] === 'section') {
        const sj = idx(parts[3]);
        if (parts[4] === 'field') {
          const fi = idx(parts[5]);
          const f = this.schema.steps?.[si].sections?.[sj].fields?.[fi];
          if (f) this.toggleSelect(f);
        } else {
          const sec = this.schema.steps?.[si].sections?.[sj];
          if (sec) this.toggleSelect(sec);
        }
      } else {
        const st = this.schema.steps?.[si];
        if (st) this.toggleSelect(st);
      }
    } else if (type === 'section') {
      const si = idx(parts[1]);
      if (parts[2] === 'field') {
        const fi = idx(parts[3]);
        const f = this.schema.sections?.[si].fields?.[fi];
        if (f) this.toggleSelect(f);
      } else {
        const sec = this.schema.sections?.[si];
        if (sec) this.toggleSelect(sec);
      }
    } else if (type === 'field') {
      const fi = idx(parts[1]);
      const f = this.schema.fields?.[fi];
      if (f) this.toggleSelect(f);
    } else if (type === 'root') {
      this.select(this.schema);
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
    // steps
    if (this.schema.steps) {
      for (let si = 0; si < this.schema.steps.length; si++) {
        const st = this.schema.steps[si];
        if (obj === st) return `step:${si}`;
        if (st.fields) {
          for (let fi = 0; fi < st.fields.length; fi++) if (obj === st.fields[fi]) return `step:${si}:field:${fi}`;
        }
        if (st.sections) {
          for (let sj = 0; sj < st.sections.length; sj++) {
            const sec = st.sections[sj];
            if (obj === sec) return `step:${si}:section:${sj}`;
            for (let fi = 0; fi < (sec.fields || []).length; fi++) if (obj === sec.fields[fi]) return `step:${si}:section:${sj}:field:${fi}`;
          }
        }
      }
    }
    // sections root
    if (this.schema.sections) {
      for (let si = 0; si < this.schema.sections.length; si++) {
        const sec = this.schema.sections[si];
        if (obj === sec) return `section:${si}`;
        for (let fi = 0; fi < (sec.fields || []).length; fi++) if (obj === sec.fields[fi]) return `section:${si}:field:${fi}`;
      }
    }
    // flat fields
    if (this.schema.fields) {
      for (let fi = 0; fi < this.schema.fields.length; fi++) if (obj === this.schema.fields[fi]) return `field:${fi}`;
    }
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
      if (parts[2] === 'section') {
        const sj = n(parts[3]);
        if (parts[4] === 'field') return { key, type: 'field', stepIndex: si, sectionIndex: sj, fieldIndex: n(parts[5]) };
        return { key, type: 'section', stepIndex: si, sectionIndex: sj };
      }
      if (parts[2] === 'field') return { key, type: 'field', stepIndex: si, fieldIndex: n(parts[3]) };
      return { key, type: 'step', stepIndex: si };
    }
    if (parts[0] === 'section') {
      const sj = n(parts[1]);
      if (parts[2] === 'field') return { key, type: 'field', sectionIndex: sj, fieldIndex: n(parts[3]) };
      return { key, type: 'section', sectionIndex: sj };
    }
    if (parts[0] === 'field') return { key, type: 'field', fieldIndex: n(parts[1]) };
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
    if (ctx?.type !== 'step') return;
    const step = this.schema.steps?.[ctx.stepIndex!];
    if (!step) return;
    step.sections = step.sections || [];
    const sec: SectionConfig = { title: 'Section', fields: [] };
    step.sections.push(sec);
    this.select(sec);
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
    if (ctx?.type !== 'section') return;
    const sec = this.schema.steps?.[ctx.stepIndex!].sections?.[ctx.sectionIndex!];
    if (!sec) return;
    sec.fields = sec.fields || [];
    const f = this.newField('text');
    sec.fields.push(f);
    this.select(f);
    this.refresh();
  }
  ctxAddFieldToSectionTyped(t: string) {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx || ctx.type !== 'section') return;
    const sec = ctx.stepIndex != null ? this.schema.steps?.[ctx.stepIndex!].sections?.[ctx.sectionIndex!] : this.schema.sections?.[ctx.sectionIndex!];
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
    this.ensureSectionsMode();
    const sec: SectionConfig = { title: 'Section', fields: [] };
    this.schema.sections = this.schema.sections || [];
    this.schema.sections.push(sec);
    this.select(sec);
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
    if (!ctx || ctx.type !== 'section') return;
    const sections = this.schema.steps?.[ctx.stepIndex!].sections;
    if (!sections) return;
    sections.splice(ctx.sectionIndex!, 1);
    if (this.selected && this.isSection(this.selected)) this.select(this.schema);
    this.refresh();
  }
  ctxDeleteField() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx || ctx.type !== 'field') return;
    const fi = ctx.fieldIndex as number;
    let removed = false;
    if (ctx.stepIndex != null && ctx.sectionIndex != null) {
      const arr = this.schema.steps?.[ctx.stepIndex].sections?.[ctx.sectionIndex].fields;
      if (arr) { arr.splice(fi, 1); removed = true; }
    } else if (ctx.stepIndex != null) {
      const arr = this.schema.steps?.[ctx.stepIndex].fields; if (arr) { arr.splice(fi, 1); removed = true; }
    } else if (ctx.sectionIndex != null) {
      const arr = this.schema.sections?.[ctx.sectionIndex].fields; if (arr) { arr.splice(fi, 1); removed = true; }
    } else {
      const arr = this.schema.fields; if (arr) { arr.splice(fi, 1); removed = true; }
    }
    if (removed && this.selected && this.isField(this.selected)) this.select(this.schema);
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
