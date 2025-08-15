// dynamic-form-builder.component.ts
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, AbstractControl, Validators } from '@angular/forms';

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
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { DynamicForm } from '../../modules/dynamic-form/dynamic-form';
import { StyleEditorComponent } from './components/style-editor.component';
import { CustomizeDialogComponent } from './components/customize-dialog.component';
import { ContextPanelComponent } from './components/context-panel.component';
import { MonacoJsonEditorComponent } from './components/monaco-json-editor.component';
import { JsonSchemaViewerComponent } from '../../modules/json-schema-viewer/json-schema-viewer';
import { InspectorFormSettingsComponent } from './components/inspector-form-settings.component';
import { InspectorStepComponent } from './components/inspector-step.component';
import { InspectorSectionComponent } from './components/inspector-section.component';
import { InspectorFieldComponent } from './components/inspector-field.component';
import { ConditionBuilderComponent } from './components/condition-builder.component';
import { OptionsBuilderComponent } from './components/options-builder.component';
import { BuilderTreeService } from './services/builder-tree.service';
import { BuilderCtxActionsService } from './services/builder-ctx-actions.service';
import { BuilderCustomizeService } from './services/builder-customize.service';
import { BuilderIssuesService } from './services/builder-issues.service';
import { BuilderPreviewService } from './services/builder-preview.service';
import { BuilderDepsService } from './services/builder-deps.service';
import { ConditionFormService } from './services/condition-form.service';
import { BuilderFactoryService } from './services/builder-factory.service';
import { BuilderGridService } from './services/builder-grid.service';
import { BuilderHistoryService } from './services/builder-history.service';
import { BuilderStateService } from './services/builder-state.service';
import { DynamicFormService } from '../../modules/dynamic-form/dynamic-form.service';
import type {
  FieldConfig,
  FormSchema,
  SectionConfig,
  StepConfig
} from '../../modules/dynamic-form/dynamic-form.service';

type FieldType =
  | 'text' | 'textarea' | 'number' | 'date'
  | 'select' | 'radio' | 'checkbox' | 'textblock';

type Issue = { level: 'blocker'|'error'|'warning'; message: string; actions?: Array<{ label: string; run: () => void }>; };

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
    NzInputNumberModule, NzTagModule,
    NzTreeModule, NzDropDownModule, NzModalModule, NzIconModule,
    NzRadioModule, NzCheckboxModule,
    NzToolTipModule,
    NzColorPickerModule,
    StyleEditorComponent,
    CustomizeDialogComponent,
    CustomizeDialogComponent,
    ContextPanelComponent,
    MonacoJsonEditorComponent,
    InspectorFormSettingsComponent,
    InspectorStepComponent,
    InspectorSectionComponent,
    InspectorFieldComponent,
    ConditionBuilderComponent,
    OptionsBuilderComponent,

    DynamicForm,
    JsonSchemaViewerComponent,
  ],
  templateUrl: './dynamic-form-builder.component.html',
  styleUrl: './dynamic-form-builder.component.scss',
})
export class DynamicFormBuilderComponent {
  // Schéma en cours d’édition
  schema: FormSchema = { title: 'Nouveau formulaire' };

  // Sélection (centralisée via service)
  get selected(): StepConfig | SectionConfig | FieldConfig | FormSchema | null { return this.state.selected; }
  set selected(v: any) { this.state.selected = v; }
  get selectedField(): FieldConfig | null { return this.state.selectedField; }
  set selectedField(v: FieldConfig | null) { this.state.selectedField = v; }

  // Sélections typées pour l'aperçu (évite les casts dans le template)
  get selectedSectionForPreview(): SectionConfig | null {
    return this.isSection(this.selected) ? (this.selected as SectionConfig) : null;
  }
  get selectedStepForPreview(): StepConfig | null {
    return this.isStep(this.selected) ? (this.selected as StepConfig) : null;
  }

  // Inspector (réutilisé dans les deux onglets)
  inspector!: FormGroup;
  // Modals
  optionsModalVisible = false;
  conditionModalVisible = false;
  optionsForm!: FormGroup; // { items: FormArray<FormGroup<{label,value}>> }
  conditionTarget: 'visibleIf'|'requiredIf'|'disabledIf' = 'visibleIf';
  conditionForm!: FormGroup; // { logic: 'single'|'any'|'all', items: FormArray<{field,operator,value}> }
  // Styles modals for Section title/desc
  titleStyleModalVisible = false;
  descStyleModalVisible = false;
  titleStyleForm!: FormGroup;
  descStyleForm!: FormGroup;
  // Dialogue générique de personnalisation (extrait via service)
  custVisible = false;
  custTitle = 'Personnaliser';
  custForm!: FormGroup;
  private custApply: (() => void) | null = null;

  // Arbre de structure
  treeNodes: any[] = [];
  dropdownKey: string | null = null;
  treeExpanded = new Set<string>();
  treeSelectedKeys: string[] = [];

  // Prévisualisation responsive (par défaut AUTO)
  previewWidth: number | null = null;
  // Preview options: suppress expression errors in preview panel (builder-level convenience)
  previewSuppressExprErrors = false;

  // Référence direct à l'aperçu pour piloter la navigation des steps
  @ViewChild(DynamicForm) private df?: DynamicForm;

  // Grille / breakpoint en édition
  gridBp: 'xs'|'sm'|'md'|'lg'|'xl' = 'xs';
  showGrid = true;

  // Import/Export
  json = '';

  private patching = false;
  private refreshDebounceTimer: any = null;

  // Edit mode toggle
  editMode = true;

  // Simulation des conditions dans l'aperçu
  previewUseSim = false;
  simValues: Record<string, any> = {};
  // Contexte pour expressions (passé à app-dynamic-form)
  ctxJson = '{\n  "json": {},\n  "$json": {},\n  "env": {},\n  "$env": {},\n  "node": {},\n  "$node": {},\n  "now": "' + new Date().toISOString() + '"\n}';
  ctxObj: any = { json: {}, $json: {}, env: {}, $env: {}, node: {}, $node: {}, now: new Date() };
  scenarios: Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> = [];
  scenariosAll: Array<{ label: string; description: string; patch: Record<string, any>; arrayKey?: string; arrayTitle?: string }> = [];
  formScenarios: Array<{ label: string; description: string; value: Record<string, any> }> = [];
  // Conflits/choix pour conditions sur le même champ
  conflictModalVisible = false;
  conflictItems: Array<{ key: string; choices: any[]; selected: any }> = [];
  private pendingEntry: { rule: any } | null = null;
  // Contrôles / validation
  issues: Issue[] = [];

  // Modal de résultat (preview submit)
  submitModalVisible = false;
  submitResult: any = null;

  constructor(private fb: FormBuilder, private dropdown: NzContextMenuService, private dfs: DynamicFormService, private msg: NzMessageService, private treeSvc: BuilderTreeService, private custSvc: BuilderCustomizeService, private issuesSvc: BuilderIssuesService, private condSvc: ConditionFormService, private prevSvc: BuilderPreviewService, private depsSvc: BuilderDepsService, private ctxActions: BuilderCtxActionsService, private factory: BuilderFactoryService, private state: BuilderStateService, private gridSvc: BuilderGridService, private hist: BuilderHistoryService) {
    this.createInspector();
    this.select(this.schema); // on ouvre sur "Form Settings"
    this.rebuildTree(); // assure l'affichage de "Formulaire" dès le départ
    // init builders
    this.optionsForm = this.fb.group({ items: this.fb.array([]) });
    this.conditionForm = this.fb.group({
      logic: ['single'],
      items: this.fb.array([ this.condSvc.newRow('rule') ])
    });
    // section styles forms
    const mkStyleForm = () => this.fb.group({
      color: [''], fontSize: [null],
      m_top: [null], m_right: [null], m_bottom: [null], m_left: [null],
      p_top: [null], p_right: [null], p_bottom: [null], p_left: [null],
    });
    this.titleStyleForm = mkStyleForm();
    this.descStyleForm = mkStyleForm();
    // init auto breakpoint display
    try { this.updateAutoBp(); } catch {}
    this.recomputeIssues();
    try { this.hist.reset(this.cloneSchema()); } catch {}
  }

  onCtxChange(v: string) {
    this.ctxJson = v || '';
    try {
      const obj = v && v.trim().length ? JSON.parse(v) : {};
      // Normalize aliases roughly here as well
      const o: any = { json: {}, $json: {}, env: {}, $env: {}, node: {}, $node: {}, now: new Date() };
      Object.assign(o, obj);
      if (o.json && !o.$json) o.$json = o.json; if (o.$json && !o.json) o.json = o.$json;
      if (o.env && !o.$env) o.$env = o.env; if (o.$env && !o.env) o.env = o.$env;
      if (o.node && !o.$node) o.$node = o.node; if (o.$node && !o.node) o.node = o.$node;
      this.ctxObj = o;
    } catch { /* invalid JSON; keep last good ctxObj */ }
  }

  // Open/save style modals for Section title/description
  openTitleStyleEditor() {
    if (!this.isSection(this.selected)) return;
    const s: any = this.selected;
    const st = s.titleStyle || {};
    this.titleStyleForm.patchValue({
      color: st.color || '',
      fontSize: this.pickStyleNumber(st.fontSize),
      m_top: this.pickStyleNumber(st.marginTop), m_right: this.pickStyleNumber(st.marginRight), m_bottom: this.pickStyleNumber(st.marginBottom), m_left: this.pickStyleNumber(st.marginLeft),
      p_top: this.pickStyleNumber(st.paddingTop), p_right: this.pickStyleNumber(st.paddingRight), p_bottom: this.pickStyleNumber(st.paddingBottom), p_left: this.pickStyleNumber(st.paddingLeft),
    }, { emitEvent: false });
    this.titleStyleModalVisible = true;
  }
  saveTitleStyle() {
    if (!this.isSection(this.selected)) { this.titleStyleModalVisible = false; return; }
    const v = this.titleStyleForm.value;
    const out: any = {};
    if (v.color) out.color = v.color;
    if (v.fontSize != null && v.fontSize !== '') out.fontSize = `${Number(v.fontSize)}px`;
    const add = (k: string, val: any) => { if (val != null && val !== '' && !isNaN(Number(val))) out[k] = `${Number(val)}px`; };
    add('marginTop', v.m_top); add('marginRight', v.m_right); add('marginBottom', v.m_bottom); add('marginLeft', v.m_left);
    add('paddingTop', v.p_top); add('paddingRight', v.p_right); add('paddingBottom', v.p_bottom); add('paddingLeft', v.p_left);
    (this.selected as any).titleStyle = Object.keys(out).length ? out : undefined;
    this.titleStyleModalVisible = false;
    this.refresh();
  }
  cancelTitleStyle() { this.titleStyleModalVisible = false; }

  openDescStyleEditor() {
    if (!this.isSection(this.selected)) return;
    const s: any = this.selected;
    const st = s.descriptionStyle || {};
    this.descStyleForm.patchValue({
      color: st.color || '',
      fontSize: this.pickStyleNumber(st.fontSize),
      m_top: this.pickStyleNumber(st.marginTop), m_right: this.pickStyleNumber(st.marginRight), m_bottom: this.pickStyleNumber(st.marginBottom), m_left: this.pickStyleNumber(st.marginLeft),
      p_top: this.pickStyleNumber(st.paddingTop), p_right: this.pickStyleNumber(st.paddingRight), p_bottom: this.pickStyleNumber(st.paddingBottom), p_left: this.pickStyleNumber(st.paddingLeft),
    }, { emitEvent: false });
    this.descStyleModalVisible = true;
  }
  saveDescStyle() {
    if (!this.isSection(this.selected)) { this.descStyleModalVisible = false; return; }
    const v = this.descStyleForm.value;
    const out: any = {};
    if (v.color) out.color = v.color;
    if (v.fontSize != null && v.fontSize !== '') out.fontSize = `${Number(v.fontSize)}px`;
    const add = (k: string, val: any) => { if (val != null && val !== '' && !isNaN(Number(val))) out[k] = `${Number(val)}px`; };
    add('marginTop', v.m_top); add('marginRight', v.m_right); add('marginBottom', v.m_bottom); add('marginLeft', v.m_left);
    add('paddingTop', v.p_top); add('paddingRight', v.p_right); add('paddingBottom', v.p_bottom); add('paddingLeft', v.p_left);
    (this.selected as any).descriptionStyle = Object.keys(out).length ? out : undefined;
    this.descStyleModalVisible = false;
    this.refresh();
  }
  cancelDescStyle() { this.descStyleModalVisible = false; }

  // ======= Dialogue générique de personnalisation =======
  private styleFromForm(): Record<string, any> {
    const v: any = this.custForm.value;
    const st: any = {};
    const addPx = (k: string, val: any) => { if (val != null && val !== '' && !isNaN(Number(val))) st[k] = `${Number(val)}px`; };
    const copy = (k: string) => { if (v[k] != null && v[k] !== '') st[k] = v[k]; };
    ['color','borderColor','boxShadow'].forEach(copy);
    addPx('fontSize', v['fontSize']); addPx('borderWidth', v['borderWidth']); addPx('borderRadius', v['borderRadius']);
    addPx('marginTop', v['m_top']); addPx('marginRight', v['m_right']); addPx('marginBottom', v['m_bottom']); addPx('marginLeft', v['m_left']);
    addPx('paddingTop', v['p_top']); addPx('paddingRight', v['p_right']); addPx('paddingBottom', v['p_bottom']); addPx('paddingLeft', v['p_left']);
    return st;
  }

  openCustomize(key: string) {
    const g = this.fb.group({});
    const add = (k: string, init: any = null) => g.addControl(k, this.fb.control(init));
    const addSpacing = () => ['m_top','m_right','m_bottom','m_left','p_top','p_right','p_bottom','p_left'].forEach(k => add(k, null));
    const patchStyle = (st?: Record<string, any>) => {
      const pick = (prop: string) => this.pickStyleNumber(st?.[prop]);
      g.patchValue({
        color: st?.['color'] ?? '', fontSize: this.pickStyleNumber(st?.['fontSize']),
        borderWidth: this.pickStyleNumber(st?.['borderWidth']), borderRadius: this.pickStyleNumber(st?.['borderRadius']), borderColor: st?.['borderColor'] ?? '', boxShadow: st?.['boxShadow'] ?? '',
        m_top: pick('marginTop'), m_right: pick('marginRight'), m_bottom: pick('marginBottom'), m_left: pick('marginLeft'),
        p_top: pick('paddingTop'), p_right: pick('paddingRight'), p_bottom: pick('paddingBottom'), p_left: pick('paddingLeft'),
      }, { emitEvent: false });
    };

    this.custApply = null;
    const sel = this.selected;
    if (!sel) return;

    if (sel === this.schema) {
      if (key === 'form.actionsBar') {
        ['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing();
        patchStyle(this.schema.ui?.actions?.actionsStyle);
        this.custApply = () => { const st = this.styleFromForm(); this.schema.ui = this.schema.ui || {}; this.schema.ui.actions = this.schema.ui.actions || {} as any; (this.schema.ui.actions as any).actionsStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Barre d’actions (Formulaire)';
      } else if (/form\.(submitBtn|cancelBtn|resetBtn)/.test(key)) {
        const btnKey = key.split('.')[1] as 'submitBtn'|'cancelBtn'|'resetBtn';
        add('text', (this.schema.ui?.actions as any)?.[btnKey]?.text || ''); add('enabled', (this.schema.ui?.actions as any)?.[btnKey]?.enabled ?? true); add('ariaLabel', (this.schema.ui?.actions as any)?.[btnKey]?.ariaLabel || '');
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing();
        patchStyle((this.schema.ui?.actions as any)?.[btnKey]?.style);
        this.custApply = () => { const v = this.custForm.value as any; const st = this.styleFromForm(); this.schema.ui = this.schema.ui || {}; this.schema.ui.actions = this.schema.ui.actions || {} as any; (this.schema.ui.actions as any)[btnKey] = { text: v.text || undefined, enabled: v.enabled !== false, ariaLabel: v.ariaLabel || undefined, style: Object.keys(st).length ? st : undefined }; this.refresh(); };
        this.custTitle = `Bouton ${(btnKey==='submitBtn'?'Valider':btnKey==='cancelBtn'?'Annuler':'Reset')} (Formulaire)`;
      }
    }

    if (this.isStep(sel)) {
      const step = sel as any;
      if (key === 'step.prevBtn' || key === 'step.nextBtn') {
        const target = key === 'step.prevBtn' ? 'prevBtn' : 'nextBtn';
        add('text', step[target]?.text || ''); add('enabled', step[target]?.enabled ?? true); add('ariaLabel', step[target]?.ariaLabel || '');
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing();
        patchStyle(step[target]?.style);
        this.custApply = () => { const v = this.custForm.value as any; const st = this.styleFromForm(); step[target] = { text: v.text || undefined, enabled: v.enabled !== false, ariaLabel: v.ariaLabel || undefined, style: Object.keys(st).length ? st : undefined }; this.refresh(); };
        this.custTitle = key === 'step.prevBtn' ? 'Bouton Précédent (Step)' : 'Bouton Suivant (Step)';
      }
    }

    if (this.isSection(sel)) {
      const section = sel as any;
      if (key === 'section.container') {
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing(); patchStyle(section.itemStyle);
        this.custApply = () => { const st = this.styleFromForm(); section.itemStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Section: Conteneur';
      } else if (key === 'section.title') {
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing(); patchStyle(section.titleStyle);
        this.custApply = () => { const st = this.styleFromForm(); section.titleStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Section: Titre';
      } else if (key === 'section.description') {
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing(); patchStyle(section.descriptionStyle);
        this.custApply = () => { const st = this.styleFromForm(); section.descriptionStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Section: Description';
      }
    }

    if (this.isField(sel)) {
      const field = sel as any;
      if (key === 'field.label') {
        add('color', field.labelStyle?.color || ''); add('fontSize', this.pickStyleNumber(field.labelStyle?.fontSize));
        this.custApply = () => { const v = this.custForm.value as any; const st: any = {}; if (v.color) st.color = v.color; if (v.fontSize != null && v.fontSize !== '') st.fontSize = `${Number(v.fontSize)}px`; field.labelStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Field: Label';
      } else if (key === 'field.container') {
        ;['color','fontSize','borderWidth','borderColor','borderRadius','boxShadow'].forEach(k => add(k)); addSpacing(); patchStyle(field.itemStyle);
        this.custApply = () => { const st = this.styleFromForm(); field.itemStyle = Object.keys(st).length ? st : undefined; this.refresh(); };
        this.custTitle = 'Field: Conteneur';
      }
    }

    this.custForm = g;
    this.custVisible = true;
  }

  saveCustomize() { if (this.custApply) this.custApply(); this.custVisible = false; this.custApply = null; }
  cancelCustomize() { this.custVisible = false; this.custApply = null; }

  get optionsItems(): FormArray { return this.optionsForm.get('items') as FormArray; }

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
      // Section advanced: array mode
      sec_mode: ['normal'], // 'normal' | 'array'
      sec_key: [''],
      arr_initial: [1],
      arr_min: [0],
      arr_max: [null],
      arr_addKind: ['text'],
      arr_addText: ['Ajouter'],
      arr_removeKind: ['text'],
      arr_removeText: ['Supprimer'],
      // Section UI overrides
      sec_ui_layout: [''],
      sec_ui_labelAlign: [''],
      sec_ui_labelsOnTop: [null],
      sec_ui_labelColSpan: [null],
      sec_ui_controlColSpan: [null],

      // FIELD
      type: ['text'],
      key: [''],
      label: [''],
      expression_allow: [false],
      expression_hideErrors: [false],
      placeholder: [''],
      descriptionField: [''],   // description propre au champ
      default: [''],
      options: [''],
      textHtml: [''],
      validators: [''],
      requiredIf: [''],
      disabledIf: [''],
      col: [''],
      col_xs: [24],
      col_sm: [24],
      col_md: [12],
      col_lg: [12],
      col_xl: [12],
      // Spacing (fields only)
      m_top: [null], m_right: [null], m_bottom: [null], m_left: [null],
      p_top: [null], p_right: [null], p_bottom: [null], p_left: [null],

      // UI (form settings)
      ui_layout: ['horizontal'],
      ui_labelAlign: ['left'],
      ui_labelsOnTop: [false],
      ui_labelColSpan: [8],
      ui_controlColSpan: [16],
      ui_widthPx: [1040],
      // UI spacing for form container
      ui_form_m_top: [null], ui_form_m_right: [null], ui_form_m_bottom: [null], ui_form_m_left: [null],
      ui_form_p_top: [null], ui_form_p_right: [null], ui_form_p_bottom: [null], ui_form_p_left: [null],
      // Actions/buttons options
      ui_showReset: [false],
      ui_showCancel: [false],
      ui_submitText: [''], ui_cancelText: [''], ui_resetText: [''],
      ui_actions_m_top: [null], ui_actions_m_right: [null], ui_actions_m_bottom: [null], ui_actions_m_left: [null],
      ui_actions_p_top: [null], ui_actions_p_right: [null], ui_actions_p_bottom: [null], ui_actions_p_left: [null],
      ui_button_m_top: [null], ui_button_m_right: [null], ui_button_m_bottom: [null], ui_button_m_left: [null],
      ui_button_p_top: [null], ui_button_p_right: [null], ui_button_p_bottom: [null], ui_button_p_left: [null],

      // Summary (form settings)
      summary_enabled: [false],
      summary_title: ['Résumé'],
      summary_includeHidden: [false],
      summary_dateFormat: ['dd/MM/yyyy'],
      // Step nav labels
      step_prevText: [''],
      step_nextText: [''],
      // Section title/desc style
      sec_titleColor: [''], sec_titleFontSize: [null], sec_titleMT: [null], sec_titleMB: [null],
      sec_descColor: [''], sec_descFontSize: [null], sec_descMT: [null], sec_descMB: [null],
      // Field label/text styles (optional)
      fld_labelColor: [''], fld_labelFontSize: [null],
      tb_textColor: [''], tb_textFontSize: [null],
    });

      this.inspector.valueChanges.subscribe(v => {
        if (this.patching || !this.selected) return;

        // FORM SETTINGS
        if (this.selected === this.schema) {
        // titre global
        this.schema.title = v.title || undefined;

        // UI
        const mkStyle = (prefix: string) => {
          const style: any = {};
          const add = (k: string, v: any, unit = 'px') => { if (v !== null && v !== '' && !isNaN(Number(v))) style[k] = `${Number(v)}${unit}`; };
          add('marginTop', v[`${prefix}m_top`]); add('marginRight', v[`${prefix}m_right`]); add('marginBottom', v[`${prefix}m_bottom`]); add('marginLeft', v[`${prefix}m_left`]);
          add('paddingTop', v[`${prefix}p_top`]); add('paddingRight', v[`${prefix}p_right`]); add('paddingBottom', v[`${prefix}p_bottom`]); add('paddingLeft', v[`${prefix}p_left`]);
          return Object.keys(style).length ? style : undefined;
        };
        this.schema.ui = {
          layout: (v.ui_layout || 'horizontal') as 'horizontal'|'vertical'|'inline',
          labelAlign: (v.ui_labelAlign || 'left') as 'left'|'right',
          labelsOnTop: (v.ui_layout === 'vertical') ? true : (typeof v.ui_labelsOnTop === 'boolean' ? !!v.ui_labelsOnTop : this.schema.ui?.labelsOnTop),
          labelCol: v.ui_labelColSpan != null ? { span: Number(v.ui_labelColSpan) } : undefined,
          controlCol: v.ui_controlColSpan != null ? { span: Number(v.ui_controlColSpan) } : undefined,
          widthPx: v.ui_widthPx != null ? Number(v.ui_widthPx) : undefined,
          containerStyle: mkStyle('ui_form_'),
          actions: {
            showReset: !!v.ui_showReset,
            showCancel: !!v.ui_showCancel,
            submitText: v.ui_submitText || undefined,
            cancelText: v.ui_cancelText || undefined,
            resetText: v.ui_resetText || undefined,
            actionsStyle: mkStyle('ui_actions_'),
            buttonStyle: mkStyle('ui_button_')
          }
        };

        // No extra toggles persisted in schema; per-field expression preview setting is in field inspector

        // Summary
        this.schema.summary = {
          enabled: !!v.summary_enabled,
          title: v.summary_title || undefined,
          includeHidden: !!v.summary_includeHidden,
          dateFormat: v.summary_dateFormat || undefined
        };

        // Coalesce rapid keystrokes in inspector: debounce refresh/history
        this.refreshDebounced();
        this.recomputeIssues();
        return;
      }

      // OBJETS (step/section/field)
      if (this.isStep(this.selected)) {
        // STEP
        this.selected.title = v.title || undefined;
        this.selected.visibleIf = this.parseJson(v.visibleIf);
        (this.selected as any).prevText = v.step_prevText || undefined;
        (this.selected as any).nextText = v.step_nextText || undefined;
      } else if (this.isSection(this.selected)) {
        // SECTION
        this.selected.title = v.title || undefined;
        this.selected.description = v.description || undefined;
        const gut = (v.gridGutter == null || v.gridGutter === '') ? 16 : Number(v.gridGutter);
        this.selected.grid = { gutter: gut };
        (this.selected as any).visibleIf = this.parseJson(v.visibleIf);
        // Section mode / array config
        (this.selected as any).mode = (v.sec_mode || 'normal') as any;
        if ((this.selected as any).mode === 'array') {
          (this.selected as any).key = v.sec_key || (this.selected as any).key || 'items';
          (this.selected as any).array = {
            initialItems: (v.arr_initial != null && v.arr_initial !== '') ? Number(v.arr_initial) : 1,
            minItems: (v.arr_min != null && v.arr_min !== '') ? Number(v.arr_min) : 0,
            maxItems: (v.arr_max != null && v.arr_max !== '' && !isNaN(Number(v.arr_max))) ? Number(v.arr_max) : undefined,
            controls: {
              add: { kind: (v.arr_addKind || 'text') as any, text: v.arr_addText || undefined },
              remove: { kind: (v.arr_removeKind || 'text') as any, text: v.arr_removeText || undefined }
            }
          };
        } else {
          // cleanup array specifics when leaving array mode
          (this.selected as any).array = undefined;
          // key remains optional for normal sections
        }
        // col spans
        (this.selected as any).col = {
          xs: Number(v.col_xs ?? 24) || 24,
          sm: Number(v.col_sm ?? 24) || 24,
          md: Number(v.col_md ?? 24) || 24,
          lg: Number(v.col_lg ?? 24) || 24,
          xl: Number(v.col_xl ?? 24) || 24,
        };
        // Section UI overrides
        const secUi: any = {};
        if (v.sec_ui_layout) secUi.layout = v.sec_ui_layout;
        if (v.sec_ui_labelAlign) secUi.labelAlign = v.sec_ui_labelAlign;
        if (typeof v.sec_ui_labelsOnTop === 'boolean') secUi.labelsOnTop = v.sec_ui_labelsOnTop;
        if (v.sec_ui_labelColSpan != null && v.sec_ui_labelColSpan !== '') secUi.labelCol = { span: Number(v.sec_ui_labelColSpan) };
        if (v.sec_ui_controlColSpan != null && v.sec_ui_controlColSpan !== '') secUi.controlCol = { span: Number(v.sec_ui_controlColSpan) };
        (this.selected as any).ui = Object.keys(secUi).length ? secUi : undefined;
        // Spacing section (si saisi)
        const sstyle: any = {};
        const sadd = (k: string, val: any) => { if (val !== null && val !== '' && !isNaN(Number(val))) sstyle[k] = `${Number(val)}px`; };
        sadd('marginTop', v.m_top);
        sadd('marginRight', v.m_right);
        sadd('marginBottom', v.m_bottom);
        sadd('marginLeft', v.m_left);
        sadd('paddingTop', v.p_top);
        sadd('paddingRight', v.p_right);
        sadd('paddingBottom', v.p_bottom);
        sadd('paddingLeft', v.p_left);
        (this.selected as any).itemStyle = Object.keys(sstyle).length ? sstyle : undefined;
        // Styles titre/description
        const tStyle: any = {};
        if (v.sec_titleColor) tStyle.color = v.sec_titleColor;
        if (v.sec_titleFontSize != null && v.sec_titleFontSize !== '') tStyle.fontSize = `${Number(v.sec_titleFontSize)}px`;
        if (v.sec_titleMT != null && v.sec_titleMT !== '') tStyle.marginTop = `${Number(v.sec_titleMT)}px`;
        if (v.sec_titleMB != null && v.sec_titleMB !== '') tStyle.marginBottom = `${Number(v.sec_titleMB)}px`;
        (this.selected as any).titleStyle = Object.keys(tStyle).length ? tStyle : undefined;
        const dStyle: any = {};
        if (v.sec_descColor) dStyle.color = v.sec_descColor;
        if (v.sec_descFontSize != null && v.sec_descFontSize !== '') dStyle.fontSize = `${Number(v.sec_descFontSize)}px`;
        if (v.sec_descMT != null && v.sec_descMT !== '') dStyle.marginTop = `${Number(v.sec_descMT)}px`;
        if (v.sec_descMB != null && v.sec_descMB !== '') dStyle.marginBottom = `${Number(v.sec_descMB)}px`;
        (this.selected as any).descriptionStyle = Object.keys(dStyle).length ? dStyle : undefined;
      } else if (this.isField(this.selected)) {
        // FIELD
        const f = this.selected;

        const prevType = f.type;
        f.type = (v.type || 'text') as FieldType;

        if (prevType !== f.type) {
          const d = this.fieldTypeDefaults(f.type as FieldType);
          // patch inspector defaults for options/default/placeholder
          this.patching = true;
          this.inspector.patchValue({
            placeholder: d.placeholder ?? '',
            default: d.defaultValue ?? '',
            options: d.optionsJson ?? ''
          }, { emitEvent: false });
          this.patching = false;
          // also set on object immediately
          (f as any).placeholder = d.placeholder ?? undefined;
          (f as any).default = d.defaultValue;
          if (d.optionsArr) (f as any).options = d.optionsArr;
          // Petite impulsion supplémentaire pour forcer le rebuild de l'aperçu (type change)
          setTimeout(() => this.refresh());
        }

        if (f.type === 'textblock') {
          // textblock : pas de key/validators/options
          delete (f as any).key;
          delete (f as any).placeholder;
          delete (f as any).validators;
          delete (f as any).options;
          f.label = v.label || undefined; // label facultatif (peut aider en résumé)
          (f as any).textHtml = v.textHtml || '';
          (f as any).col = {
            xs: Number(v.col_xs ?? 24) || 24,
            sm: Number(v.col_sm ?? 24) || 24,
            md: Number(v.col_md ?? 12) || 12,
            lg: Number(v.col_lg ?? 12) || 12,
            xl: Number(v.col_xl ?? 12) || 12,
          };
          // Style du texte (textblock)
          const ts: any = {};
          if (v.tb_textColor) ts.color = v.tb_textColor;
          if (v.tb_textFontSize != null && v.tb_textFontSize !== '') ts.fontSize = `${Number(v.tb_textFontSize)}px`;
          (f as any).textStyle = Object.keys(ts).length ? ts : undefined;
      } else {
        // Inputs classiques
        (f as any).key = v.key || '';
        f.label = v.label || undefined;
        // Expression toggle + options
        if (v.expression_allow) {
          (f as any).expression = { allow: true, showPreviewErrors: !v.expression_hideErrors };
        } else {
          (f as any).expression = undefined;
        }
        (f as any).placeholder = v.placeholder || undefined;
        (f as any).description = v.descriptionField || undefined;
          (f as any).default = v.default ?? undefined;
          (f as any).options = this.parseJson(v.options);
          (f as any).validators = this.parseJson(v.validators);
          (f as any).visibleIf = this.parseJson(v.visibleIf);
          (f as any).requiredIf = this.parseJson(v.requiredIf);
          (f as any).disabledIf = this.parseJson(v.disabledIf);
          (f as any).col = {
            xs: Number(v.col_xs ?? 24) || 24,
            sm: Number(v.col_sm ?? 24) || 24,
            md: Number(v.col_md ?? 12) || 12,
            lg: Number(v.col_lg ?? 12) || 12,
            xl: Number(v.col_xl ?? 12) || 12,
          };
          // Spacing → itemStyle (en px)
          const style: any = {};
          const add = (k: string, val: any) => { if (val !== null && val !== '' && !isNaN(Number(val))) style[k] = `${Number(val)}px`; };
          add('marginTop', v.m_top);
          add('marginRight', v.m_right);
          add('marginBottom', v.m_bottom);
          add('marginLeft', v.m_left);
          add('paddingTop', v.p_top);
          add('paddingRight', v.p_right);
          add('paddingBottom', v.p_bottom);
          add('paddingLeft', v.p_left);
          (f as any).itemStyle = Object.keys(style).length ? style : undefined;
          // label / text styles
          const lbl: any = {};
          if (v.fld_labelColor) lbl.color = v.fld_labelColor;
          if (v.fld_labelFontSize != null && v.fld_labelFontSize !== '') lbl.fontSize = `${Number(v.fld_labelFontSize)}px`;
          (f as any).labelStyle = Object.keys(lbl).length ? lbl : undefined;
          // textHtml n’a pas de sens pour un input
          delete (f as any).textHtml;
        }
      }

      this.refreshDebounced();
      this.recomputeIssues();
    });

    // Réagir au changement de layout pour gérer labelsOnTop et disponibilités
    const layoutCtrl = this.inspector.get('ui_layout');
    const labelsOnTopCtrl = this.inspector.get('ui_labelsOnTop');
    layoutCtrl?.valueChanges.subscribe((layout: 'horizontal'|'vertical'|'inline') => {
      this.patching = true;
      try {
        if (layout === 'vertical') {
          // En vertical, labelsOnTop toujours true (option non affichée)
          labelsOnTopCtrl?.setValue(true, { emitEvent: false });
        }
        if (layout === 'inline' && this.hasSections) {
          this.msg.error("Le layout 'inline' est indisponible car des sections existent.");
          layoutCtrl?.setValue('horizontal', { emitEvent: true });
        }
      } finally {
        this.patching = false;
      }
      this.recomputeIssues();
    });
  }

  // ======== Contrôles / Validation ========
  get hasSections(): boolean {
    const hasIn = (arr?: FieldConfig[]) => !!(arr || []).some((f: any) => f.type === 'section');
    if (hasIn(this.schema.fields as any)) return true;
    for (const st of this.schema.steps || []) if (hasIn(st.fields as any)) return true;
    return false;
  }

  private allFieldKeys(): string[] {
    const keys = new Set<string>();
    const walk = (arr?: FieldConfig[]) => {
      for (const f of (arr || [])) {
        if ((f as any).type === 'section') walk((f as any).fields);
        else { const k = (f as any).key; if (k) keys.add(k); }
      }
    };
    if (this.schema.steps?.length) this.schema.steps.forEach(s => walk(s.fields as any)); else walk(this.schema.fields as any);
    return Array.from(keys);
  }

  private collectRuleVars(rule: any, acc = new Set<string>()): Set<string> {
    if (!rule) return acc;
    if (Array.isArray(rule)) { rule.forEach(r => this.collectRuleVars(r, acc)); return acc; }
    if (typeof rule === 'object') {
      for (const [k,v] of Object.entries(rule)) {
        if (k === 'var') { if (typeof v === 'string') acc.add(v); }
        else this.collectRuleVars(v as any, acc);
      }
    }
    return acc;
  }

  private forEachEntity(cb: (ent: { kind: 'step'|'section'|'field'; obj: any; title?: string }) => void) {
    if (this.schema.steps?.length) {
      for (const st of this.schema.steps) {
        cb({ kind: 'step', obj: st, title: st.title });
        for (const it of (st.fields || [])) {
          if ((it as any).type === 'section') {
            const sec = it as any;
            cb({ kind: 'section', obj: sec, title: sec.title });
            for (const f of (sec.fields || [])) cb({ kind: 'field', obj: f, title: (f as any).label || (f as any).key });
          } else cb({ kind: 'field', obj: it, title: (it as any).label || (it as any).key });
        }
      }
    } else {
      for (const it of (this.schema.fields || [])) {
        if ((it as any).type === 'section') {
          const sec = it as any; cb({ kind: 'section', obj: sec, title: sec.title });
          for (const f of (sec.fields || [])) cb({ kind: 'field', obj: f, title: (f as any).label || (f as any).key });
        } else cb({ kind: 'field', obj: it, title: (it as any).label || (it as any).key });
      }
    }
  }

  private selectEntity(ent: any) { this.select(ent); }
  private clearCondition(ent: any, prop: 'visibleIf'|'requiredIf'|'disabledIf') {
    if (!ent) return; if (prop in ent) ent[prop] = undefined;
    if (this.selected === ent) this.inspector.get(prop)?.setValue('', { emitEvent: false });
    this.refresh();
    this.recomputeIssues();
  }

  recomputeIssues() {
    const issues: Issue[] = [];
    // Layout inline bloqué
    if ((this.inspector.get('ui_layout')?.value || this.schema.ui?.layout) === 'inline' && this.hasSections) {
      issues.push({
        level: 'blocker',
        message: "Layout 'inline' indisponible: des sections sont présentes.",
        actions: [ { label: 'Basculer en horizontal', run: () => this.inspector.get('ui_layout')?.setValue('horizontal') } ]
      });
    }
    // Duplicates via service
    for (const d of this.issuesSvc.findDuplicates(this.schema)) {
      const arr = d.objs;
      issues.push({ level: 'warning', message: `Clé de champ dupliquée: "${d.key}" (${arr.length} occurrences)`, actions: arr.slice(0,3).map((o,i)=>({label:`Voir ${i+1}`, run:()=>this.selectEntity(o)})) });
    }
    // Invalid condition refs via service
    for (const it of this.issuesSvc.findInvalidConditionRefs(this.schema)) {
      const title = it.title || it.kind;
      const p = it.prop;
      issues.push({ level: 'error', message: `${it.kind} « ${title} »: ${p} référence ${it.missing.join(', ')} (inexistants)`, actions: [ { label: 'Effacer la condition', run: () => this.clearCondition(it.obj, p) }, { label: 'Éditer', run: () => { this.selectEntity(it.obj); this.openConditionBuilder(p); } } ] });
    }
    this.issues = issues;
  }

  private fieldTypeDefaults(type: FieldType): { placeholder?: string; defaultValue: any; optionsJson?: string; optionsArr?: any[] } {
    switch (type) {
      case 'text': return { placeholder: 'Saisir un texte', defaultValue: '' };
      case 'textarea': return { placeholder: 'Saisir un texte multi-ligne', defaultValue: '' };
      case 'number': return { placeholder: '0', defaultValue: 0 } as any;
      case 'date': return { defaultValue: null } as any;
      case 'checkbox': return { defaultValue: false } as any;
      case 'select':
      case 'radio': {
        const opts = [ { label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' } ];
        return { defaultValue: 'option1', optionsJson: JSON.stringify(opts), optionsArr: opts } as any;
      }
      default: return { defaultValue: '' } as any;
    }
  }

  // ---------- Options Builder ----------
  openOptionsBuilder() {
    // seed from current textarea JSON
    this.optionsItems.clear();
    const raw = this.inspector.get('options')?.value;
    let opts: any[] = [];
    try { opts = raw ? JSON.parse(raw) : []; } catch { opts = []; }
    (opts || []).forEach(o => this.optionsItems.push(this.fb.group({ label: [o.label || ''], value: [o.value ?? ''] })));
    if (!this.optionsItems.length) this.optionsItems.push(this.fb.group({ label: [''], value: [''] }));
    this.optionsModalVisible = true;
  }
  addOptionRow() { this.optionsItems.push(this.fb.group({ label: [''], value: [''] })); }
  removeOptionRow(i: number) { this.optionsItems.removeAt(i); }
  saveOptions() {
    const opts = this.optionsItems.value.map((o: any) => ({ label: o.label, value: o.value }));
    this.inspector.get('options')?.setValue(JSON.stringify(opts));
    this.optionsModalVisible = false;
  }
  cancelOptions() { this.optionsModalVisible = false; }

  // ---------- Condition Builder ----------
  openConditionBuilder(target: 'visibleIf'|'requiredIf'|'disabledIf') {
    this.conditionTarget = target;
    const ctrl = this.inspector.get(target);
    this.condSvc.seedFormFromJson(this.conditionForm, ctrl?.value);
    this.conditionModalVisible = true;
  }
  buildConditionObject(): any { return this.condSvc.buildConditionObject(this.conditionForm); }
  saveCondition() {
    const obj = this.buildConditionObject();
    this.inspector.get(this.conditionTarget)?.setValue(JSON.stringify(obj));
    this.conditionModalVisible = false;
  }
  cancelCondition() { this.conditionModalVisible = false; }

  // Helpers for builder UI
  get inputFieldKeys(): string[] {
    // Contexte: si on édite un champ ou une section 'array', limiter aux clés des champs frères
    const localKeys: string[] | null = this.localKeysForSelected();
    if (localKeys) return localKeys;
    // Sinon: global
    const keys: string[] = [];
    const visit = (fs?: any[]) => (fs||[]).forEach(f => { if ((f.type==='section') || (f.type==='section_array')) visit(f.fields); else if (f.type!=='textblock' && f.key) keys.push(f.key); });
    if (this.schema.steps?.length) this.schema.steps.forEach(st => visit(st.fields)); else visit(this.schema.fields);
    return Array.from(new Set(keys));
  }
  private localKeysForSelected(): string[] | null {
    const sec = this.arrayAncestorOfSelected();
    if (!sec) return null;
    const keys: string[] = [];
    (sec.fields || []).forEach((f: any) => { if (f.type!=='textblock' && f.type!=='section' && f.type!=='section_array' && f.key) keys.push(f.key); });
    return keys.length ? keys : null;
  }
  private arrayAncestorOfSelected(): any | null {
    // Si selected est une section array → c'est l'ancêtre
    if (this.selected && this.isSection(this.selected) && (((this.selected as any).mode === 'array') || ((this.selected as any).type === 'section_array'))) return this.selected as any;
    // Si selected est un field → trouver sa section parente la plus proche qui est array
    if (this.selected && this.isField(this.selected)) {
      const target = this.selected as any;
      let found: any = null;
      const visit = (fs?: any[], parent?: any): boolean => {
        for (const f of (fs || [])) {
          if (f === target) { if (parent && (((parent.mode==='array') || (parent.type==='section_array')))) { found = parent; } return true; }
          if (f && (f.type==='section' || f.type==='section_array')) { if (visit(f.fields, f)) return true; }
        }
        return false;
      };
      if (this.schema.steps?.length) { for (const st of this.schema.steps) if (visit(st.fields)) break; }
      else visit(this.schema.fields);
      return found;
    }
    return null;
  }

  get conditionItems(): FormArray { return this.conditionForm.get('items') as FormArray; }
  addConditionRow() { this.condSvc.addRootRule(this.conditionForm); }
  addConditionGroup() { this.condSvc.addRootGroup(this.conditionForm); }
  removeConditionRow(i: number) { this.condSvc.removeRootAt(this.conditionForm, i); }
  changeCondKind(i: number, kind: 'rule'|'group') { this.condSvc.changeRootKind(this.conditionForm, i, kind); }
  addSubRule(i: number) { this.condSvc.addSubRuleAt(this.conditionForm, i); }
  addSubGroup(i: number) { this.condSvc.addSubGroupAt(this.conditionForm, i); }
  removeSubAt(i: number, j: number) { this.condSvc.removeSubAtRoot(this.conditionForm, i, j); }

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
        ui_labelsOnTop: !!this.schema.ui?.labelsOnTop,
        ui_labelColSpan: this.schema.ui?.labelCol?.span ?? 8,
        ui_controlColSpan: this.schema.ui?.controlCol?.span ?? 16,
        ui_widthPx: this.schema.ui?.widthPx ?? 1040,
        ui_form_m_top: this.pickStyleNumber(this.schema.ui?.containerStyle?.['marginTop']),
        ui_form_m_right: this.pickStyleNumber(this.schema.ui?.containerStyle?.['marginRight']),
        ui_form_m_bottom: this.pickStyleNumber(this.schema.ui?.containerStyle?.['marginBottom']),
        ui_form_m_left: this.pickStyleNumber(this.schema.ui?.containerStyle?.['marginLeft']),
        ui_form_p_top: this.pickStyleNumber(this.schema.ui?.containerStyle?.['paddingTop']),
        ui_form_p_right: this.pickStyleNumber(this.schema.ui?.containerStyle?.['paddingRight']),
        ui_form_p_bottom: this.pickStyleNumber(this.schema.ui?.containerStyle?.['paddingBottom']),
        ui_form_p_left: this.pickStyleNumber(this.schema.ui?.containerStyle?.['paddingLeft']),
        ui_showReset: !!this.schema.ui?.actions?.showReset,
        ui_showCancel: !!this.schema.ui?.actions?.showCancel,
        ui_submitText: this.schema.ui?.actions?.submitText ?? '',
        ui_cancelText: this.schema.ui?.actions?.cancelText ?? '',
        ui_resetText: this.schema.ui?.actions?.resetText ?? '',
        ui_actions_m_top: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['marginTop']),
        ui_actions_m_right: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['marginRight']),
        ui_actions_m_bottom: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['marginBottom']),
        ui_actions_m_left: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['marginLeft']),
        ui_actions_p_top: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['paddingTop']),
        ui_actions_p_right: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['paddingRight']),
        ui_actions_p_bottom: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['paddingBottom']),
        ui_actions_p_left: this.pickStyleNumber(this.schema.ui?.actions?.actionsStyle?.['paddingLeft']),
        ui_button_m_top: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['marginTop']),
        ui_button_m_right: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['marginRight']),
        ui_button_m_bottom: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['marginBottom']),
        ui_button_m_left: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['marginLeft']),
        ui_button_p_top: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['paddingTop']),
        ui_button_p_right: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['paddingRight']),
        ui_button_p_bottom: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['paddingBottom']),
        ui_button_p_left: this.pickStyleNumber(this.schema.ui?.actions?.buttonStyle?.['paddingLeft']),
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
        step_prevText: (obj as any).prevText ?? '',
        step_nextText: (obj as any).nextText ?? '',
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
        gridGutter: obj.grid?.gutter ?? 16,
        visibleIf: this.stringifyJson(obj.visibleIf),
        sec_mode: ((obj as any).mode || 'normal'),
        sec_key: (obj as any).key || '',
        arr_initial: (obj as any).array?.initialItems ?? 1,
        arr_min: (obj as any).array?.minItems ?? 0,
        arr_max: (obj as any).array?.maxItems ?? null,
        arr_addKind: (obj as any).array?.controls?.add?.kind || 'text',
        arr_addText: (obj as any).array?.controls?.add?.text || 'Ajouter',
        arr_removeKind: (obj as any).array?.controls?.remove?.kind || 'text',
        arr_removeText: (obj as any).array?.controls?.remove?.text || 'Supprimer',
        // Per-section UI overrides
        sec_ui_layout: (obj as any).ui?.layout ?? '',
        sec_ui_labelAlign: (obj as any).ui?.labelAlign ?? '',
        sec_ui_labelsOnTop: typeof (obj as any).ui?.labelsOnTop === 'boolean' ? (obj as any).ui?.labelsOnTop : null,
        sec_ui_labelColSpan: (obj as any).ui?.labelCol?.span ?? null,
        sec_ui_controlColSpan: (obj as any).ui?.controlCol?.span ?? null,
        sec_titleColor: (obj as any).titleStyle?.color ?? '',
        sec_titleFontSize: this.pickStyleNumber((obj as any).titleStyle?.fontSize),
        sec_titleMT: this.pickStyleNumber((obj as any).titleStyle?.marginTop),
        sec_titleMB: this.pickStyleNumber((obj as any).titleStyle?.marginBottom),
        sec_descColor: (obj as any).descriptionStyle?.color ?? '',
        sec_descFontSize: this.pickStyleNumber((obj as any).descriptionStyle?.fontSize),
        sec_descMT: this.pickStyleNumber((obj as any).descriptionStyle?.marginTop),
        sec_descMB: this.pickStyleNumber((obj as any).descriptionStyle?.marginBottom),
        col_xs: (obj as any).col?.xs ?? 24,
        col_sm: (obj as any).col?.sm ?? 24,
        col_md: (obj as any).col?.md ?? 24,
        col_lg: (obj as any).col?.lg ?? 24,
        col_xl: (obj as any).col?.xl ?? 24,
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
        expression_allow: !!(obj as any).expression?.allow,
        expression_hideErrors: ((obj as any).expression?.allow ? ((obj as any).expression?.showPreviewErrors === false) : false),
        placeholder: (obj as any).placeholder ?? '',
        descriptionField: (obj as any).description ?? '',
        default: (obj as any).default ?? '',
        options: this.stringifyJson((obj as any).options),
        textHtml: (obj as any).textHtml ?? '',
        validators: this.stringifyJson((obj as any).validators),
        visibleIf: this.stringifyJson((obj as any).visibleIf),
        requiredIf: this.stringifyJson((obj as any).requiredIf),
        disabledIf: this.stringifyJson((obj as any).disabledIf),
        col: this.stringifyJson((obj as any).col),
        col_xs: (obj as any).col?.xs ?? 24,
        col_sm: (obj as any).col?.sm ?? 24,
        col_md: (obj as any).col?.md ?? 12,
        col_lg: (obj as any).col?.lg ?? 12,
        col_xl: (obj as any).col?.xl ?? 12,
        m_top: this.pickStyleNumber((obj as any).itemStyle?.marginTop),
        m_right: this.pickStyleNumber((obj as any).itemStyle?.marginRight),
        m_bottom: this.pickStyleNumber((obj as any).itemStyle?.marginBottom),
        m_left: this.pickStyleNumber((obj as any).itemStyle?.marginLeft),
        p_top: this.pickStyleNumber((obj as any).itemStyle?.paddingTop),
        p_right: this.pickStyleNumber((obj as any).itemStyle?.paddingRight),
        p_bottom: this.pickStyleNumber((obj as any).itemStyle?.paddingBottom),
        p_left: this.pickStyleNumber((obj as any).itemStyle?.paddingLeft),
        fld_labelColor: (obj as any).labelStyle?.color ?? '',
        fld_labelFontSize: this.pickStyleNumber((obj as any).labelStyle?.fontSize),
        tb_textColor: (obj as any).textStyle?.color ?? '',
        tb_textFontSize: this.pickStyleNumber((obj as any).textStyle?.fontSize),
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
        // col_x* restent visibles pour textblock aussi
      }
    }

    this.inspector.patchValue(basePatch, { emitEvent: false });
    this.patching = false;
    this.updateTreeSelectedKeys();
  }

  private pickStyleNumber(v: any): number | null {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace('px',''));
    return isNaN(n) ? null : n;
  }

  isSelected(obj: any): boolean { return this.selected === obj; }
  isStep(obj: any): obj is StepConfig {
    return !!obj && obj !== this.schema && !('type' in obj) && (('fields' in obj) || ('sections' in obj)) && !('steps' in obj);
  }
  isSection(obj: any): obj is SectionConfig {
    return !!obj && ('type' in obj) && (((obj as any).type === 'section') || ((obj as any).type === 'section_array'));
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
    } else if (this.selected && this.isSection(this.selected)) {
      this.addSection(undefined); // ajouter à la racine si flat; sinon, on passe par ctxAddSectionInside via menu
      // en mode steps et sélection section, préférer l'ajout via menu contexte dans la section
    } else if (!this.isStepsMode) {
      this.addSection();
    } else {
      // mode steps sans sélection valide → ignorer
      return;
    }
  }
  addArraySectionFromToolbar(): void {
    if (this.selected && this.isStep(this.selected)) {
      // Ajouter dans le step sélectionné
      const ctx = this.treeSvc.keyForObject(this.schema, this.selected);
      if (ctx) { this.dropdownKey = ctx; this.ctxAddSectionArray(); return; }
    } else if (this.selected && this.isSection(this.selected)) {
      // Ajouter comme sous-section de la section sélectionnée
      const ctx = this.treeSvc.keyForObject(this.schema, this.selected);
      if (ctx) { this.dropdownKey = ctx; this.ctxAddSectionInsideArray(); return; }
      // sinon, à la racine si flat
      if (!this.isStepsMode) { this.ctxAddSectionRootArray(); return; }
    } else if (!this.isStepsMode) {
      this.ctxAddSectionRootArray();
      return;
    }
  }
  addFieldFromToolbar(): void {
    if (this.selected && this.isSection(this.selected)) {
      this.addField(this.selected);
    } else if (this.selected && this.isStep(this.selected)) {
      this.addFieldToStep(this.selected);
    } else if (!this.isStepsMode) {
      this.addField();
    } else {
      // mode steps sans sélection → ignorer
      return;
    }
  }

  // Toolbar disabled states
  get isStepsMode() { return !!this.schema.steps?.length; }
  get isSectionsMode() { return false; }
  get isFlatMode() { return !!this.schema.fields?.length && !this.schema.steps; }

  canAddStep(): boolean { return true; }
  canAddSectionBtn(): boolean {
    // Flat mode: autorisé (ajoute à la racine)
    if (!this.isStepsMode) return true;
    // Steps mode: autorisé si un step ou une section est sélectionné
    return !!(this.selected && (this.isStep(this.selected) || this.isSection(this.selected)));
  }
  canAddFieldBtn(): boolean {
    // Flat mode: autorisé
    if (!this.isStepsMode) return true;
    // Steps mode: autorisé si section ou step sélectionné
    return !!(this.selected && (this.isSection(this.selected) || this.isStep(this.selected)));
  }

  // Palette rapide: activer uniquement si contexte valide
  get canQuickAddField(): boolean {
    if (!this.isStepsMode) return true; // à la racine en flat
    return !!(this.selected && (this.isSection(this.selected) || this.isStep(this.selected)));
  }

  addSection(step?: StepConfig): void {
    const section: SectionConfig = { type: 'section', title: 'Section', fields: [], col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 } } as any;
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
    this.ctxActions.moveMixed(this.schema, e);
    this.refresh();
  }
  onEditMoveField(e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number; dir: 'up'|'down' }) {
    this.ctxActions.moveField(this.schema, e);
    this.refresh();
  }
  onEditDeleteField(e: { path: 'flat'|'section'|'stepRoot'; stepIndex?: number; sectionIndex?: number; index: number }) {
    this.ctxActions.deleteFieldByPosition(this.schema, e);
    if (this.selectedField && e.path) this.selectedField = null;
    this.refresh();
  }
  // removed legacy onEditMoveSection; use onEditMoveItem instead
  onEditAddFieldTyped(e: { path: 'root'|'stepRoot'|'section'; stepIndex?: number; sectionIndex?: number; type: string; sectionPath?: number[] }) {
    const make = (t: any) => this.newField(t as any);
    const makeSection = (t: string) => {
      if (t === 'section_array') return this.factory.newArraySection();
      return this.factory.newSection();
    };
    if (e.path === 'root') {
      this.ensureFlatMode();
      this.schema.fields = this.schema.fields || [];
      const f = make(e.type);
      this.schema.fields.push(f);
      this.select(f);
      this.refresh();
      return;
    }
    if (e.path === 'stepRoot') {
      const st = this.schema.steps?.[e.stepIndex!]; if (!st) return;
      st.fields = st.fields || [];
      const f = make(e.type); st.fields.push(f);
      this.select(f);
      this.refresh();
      return;
    }
    if (e.path === 'section') {
      const descend = (rootSec: any, path: number[] | undefined) => {
        let cur = rootSec;
        for (const idx of (path || [])) {
          const next = (cur.fields || [])[idx];
          if (!next || (next as any).type !== 'section') break;
          cur = next as any;
        }
        return cur;
      };
      let start: any = null;
      if (e.stepIndex != null) start = this.schema.steps?.[e.stepIndex!].fields?.[e.sectionIndex!];
      else start = this.schema.fields?.[e.sectionIndex!];
      if (!start || (start as any).type !== 'section') return;
      const target = descend(start, e.sectionPath);
      target.fields = target.fields || [];
      if (e.type === 'section' || e.type === 'section_array') {
        const sec = makeSection(e.type);
        target.fields.push(sec as any);
        this.select(sec as any);
      } else {
        const f = make(e.type);
        target.fields.push(f);
        this.select(f);
      }
      this.refresh();
      return;
    }
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
    (step.fields as any).push({ type: 'section', title: 'Section', fields: [], col: { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 } } as any);
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
      this.refresh();
    } catch (e) {
      alert('JSON invalide');
    }
  }

  // ---------- Helpers ----------
  // Conditions: extraction + simulation
  get conditionEntries(): Array<{ targetType: 'step'|'section'|'field'; target: any; targetLabel: string; kind: 'visibleIf'|'requiredIf'|'disabledIf'; rule: any; arrayKey?: string; arrayTitle?: string }> {
    const out: Array<{ targetType: 'step'|'section'|'field'; target: any; targetLabel: string; kind: 'visibleIf'|'requiredIf'|'disabledIf'; rule: any; arrayKey?: string; arrayTitle?: string }> = [];
    const pushFieldConds = (f: any, ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      if (f.visibleIf) out.push({ targetType: 'field', target: f, targetLabel: f.label || f.key || 'Field', kind: 'visibleIf', rule: f.visibleIf });
      if (f.requiredIf) out.push({ targetType: 'field', target: f, targetLabel: f.label || f.key || 'Field', kind: 'requiredIf', rule: f.requiredIf });
      if (f.disabledIf) out.push({ targetType: 'field', target: f, targetLabel: f.label || f.key || 'Field', kind: 'disabledIf', rule: f.disabledIf });
      // Append context
      const last = out.slice(-3);
      last.forEach(it => { if (ctx?.arrayKey) { (it as any).arrayKey = ctx.arrayKey; (it as any).arrayTitle = ctx.arrayTitle; } });
    };
    const visit = (fields?: any[], ctx?: { arrayKey?: string; arrayTitle?: string }) => {
      (fields || []).forEach(f => {
        if (f.type === 'section' || f.type === 'section_array') {
          const sec = f as any;
          const nextCtx = (sec.type === 'section_array' || sec.mode === 'array') ? { arrayKey: sec.key, arrayTitle: sec.title || ctx?.arrayTitle } : ctx;
          if (sec.visibleIf) out.push({ targetType: 'section', target: sec, targetLabel: sec.title || 'Section', kind: 'visibleIf', rule: sec.visibleIf, arrayKey: nextCtx?.arrayKey, arrayTitle: nextCtx?.arrayTitle });
          visit(sec.fields || [], nextCtx);
        } else if (f.type !== 'textblock') {
          pushFieldConds(f, ctx);
        }
      });
    };
    if (this.schema.steps?.length) this.schema.steps.forEach(st => { if (st.visibleIf) out.push({ targetType: 'step', target: st, targetLabel: st.title || 'Step', kind: 'visibleIf', rule: st.visibleIf }); visit(st.fields || [], undefined); });
    else visit(this.schema.fields || [], undefined);
    return out;
  }

  private ruleToAssignments(rule: any): Record<string, any> { return this.prevSvc.ruleToAssignments(this.schema, rule); }

  describeRuleWithCtx(c: { rule: any; arrayKey?: string; arrayTitle?: string }): string {
    const base = this.describeRulePretty(c.rule);
    if (c.arrayKey) return `${c.arrayTitle || c.arrayKey}[0] · ${base}`;
    return base;
  }
  private describeRulePretty(rule: any): string {
    // Remplace les clés par labels si connus
    const rep = (r: any): string => {
      if (!r) return '';
      if (Array.isArray(r.any)) return '(' + (r.any as any[]).map(rep).join(') OU (') + ')';
      if (Array.isArray(r.all)) return '(' + (r.all as any[]).map(rep).join(') ET (') + ')';
      if (r.var) return `${this.labelForKey(r.var) || r.var} est renseigné`;
      if (r.not && r.not.var) return `${this.labelForKey(r.not.var) || r.not.var} n'est pas renseigné`;
      const op = Object.keys(r)[0];
      const args = (r as any)[op] || [];
      const field = args[0]?.var ?? '';
      const fieldLabel = this.labelForKey(field) || field;
      const val = args[1];
      const valStr = typeof val === 'string' ? `'${val}'` : String(val);
      switch (op) {
        case '==': return `${fieldLabel} est égal à ${valStr}`;
        case '!=': return `${fieldLabel} est différent de ${valStr}`;
        case '>': return `${fieldLabel} est supérieur à ${valStr}`;
        case '>=': return `${fieldLabel} est supérieur ou égal à ${valStr}`;
        case '<': return `${fieldLabel} est inférieur à ${valStr}`;
        case '<=': return `${fieldLabel} est inférieur ou égal à ${valStr}`;
        default: return JSON.stringify(r);
      }
    };
    return rep(rule);
  }
  private labelForKey(k: string): string | undefined {
    let found: string | undefined;
    const visit = (fs?: any[]) => {
      for (const f of (fs || [])) {
        if (f?.type === 'section' || f?.type === 'section_array') visit(f.fields);
        else if (f?.key === k) { found = f.label || f.key; return true; }
      }
      return false;
    };
    if (this.schema.steps?.length) { for (const st of this.schema.steps) if (visit(st.fields)) break; }
    else visit(this.schema.fields);
    return found;
  }
  isRuleSatisfiedWithCtx(c: { rule: any; arrayKey?: string }): boolean {
    const val = this.previewUseSim ? this.simValues : {};
    const ctx = c.arrayKey ? ((val as any)[c.arrayKey]?.[0] || {}) : val;
    return this.prevSvc.isRuleSatisfied(this.schema, c.rule, ctx);
  }

  activateCondition(entry: { rule: any; arrayKey?: string }): void {
    // si déjà satisfait → désactiver (retirer ce que cette règle a posé)
    if (this.isRuleSatisfiedWithCtx(entry)) {
      const toUnset = this.ruleToAssignments(entry.rule);
      const copy = { ...this.simValues } as any;
      if (entry.arrayKey) {
        const prevArr = Array.isArray(copy[entry.arrayKey]) ? copy[entry.arrayKey] : [];
        const arr = [...prevArr];
        const prevItem = arr[0] || {};
        const item = { ...prevItem };
        for (const k of Object.keys(toUnset)) {
          if (item[k] !== undefined && JSON.stringify(item[k]) === JSON.stringify((toUnset as any)[k])) delete item[k];
        }
        arr[0] = item;
        copy[entry.arrayKey] = arr;
      } else {
        for (const k of Object.keys(toUnset)) {
          if (copy[k] !== undefined && JSON.stringify(copy[k]) === JSON.stringify((toUnset as any)[k])) delete copy[k];
        }
      }
      this.simValues = copy as any;
      if (Object.keys(this.simValues).length === 0) this.previewUseSim = false;
      this.refresh();
      return;
    }
    // Sinon: activer, en gérant les conflits éventuels
    if (this.openConflictFor(entry as any)) return;
    const patch = this.ruleToAssignments(entry.rule);
    if (entry.arrayKey) {
      const copy = { ...this.simValues } as any;
      const prevArr = Array.isArray(copy[entry.arrayKey]) ? copy[entry.arrayKey] : [];
      const arr = [...prevArr];
      const prevItem = arr[0] || {};
      const item = { ...prevItem, ...patch };
      arr[0] = item;
      copy[entry.arrayKey] = arr;
      this.simValues = copy as any;
    } else {
      this.simValues = { ...this.simValues, ...patch };
    }
    this.previewUseSim = true;
  }
  resetSimulation(): void {
    this.simValues = {};
    this.previewUseSim = false;
    // Forcer un rebuild du preview pour remettre les valeurs neutres
    this.refresh();
  }

  // ====== Historique (Undo/Redo) ======
  applyingHistory = false;
  get canUndo(): boolean { try { return this.hist.canUndo(); } catch { return false; } }
  get canRedo(): boolean { try { return this.hist.canRedo(); } catch { return false; } }
  undo(): void { const snap = this.hist.undo(); if (snap) this.applySnapshot(snap); }
  redo(): void { const snap = this.hist.redo(); if (snap) this.applySnapshot(snap); }
  private applySnapshot(s: any) {
    this.applyingHistory = true;
    try {
      this.schema = s as any;
      this.select(this.schema);
      this.refresh();
    } finally { setTimeout(() => { this.applyingHistory = false; }); }
  }
  private cloneSchema(): any { return JSON.parse(JSON.stringify(this.schema || {})); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const isEditable = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (isEditable) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); this.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); this.redo(); }
  }

  private openConflictFor(entry: { rule: any }): boolean {
    const current = this.ruleToAssignments(entry.rule);
    const valueKey = (v: any) => JSON.stringify(v);
    const entries = this.conditionEntries;
    const maps = entries.map(e => this.ruleToAssignments(e.rule));
    const items: Array<{ key: string; choices: any[]; selected: any }> = [];
    for (const key of Object.keys(current)) {
      const set = new Map<string, any>();
      set.set(valueKey(current[key]), current[key]);
      for (const m of maps) {
        if (m[key] !== undefined) set.set(valueKey(m[key]), m[key]);
      }
      const choices = Array.from(set.values());
      if (choices.length > 1) {
        items.push({ key, choices, selected: current[key] });
      }
    }
    if (!items.length) return false;
    this.conflictItems = items;
    this.pendingEntry = entry;
    this.conflictModalVisible = true;
    // pré-calcul de l'impact avec la sélection initiale
    this.recomputeConflictPreview();
    return true;
  }
  confirmConflict(): void {
    if (!this.pendingEntry) { this.conflictModalVisible = false; return; }
    const base = this.ruleToAssignments(this.pendingEntry.rule);
    const patch: Record<string, any> = { ...base };
    for (const it of this.conflictItems) patch[it.key] = it.selected;
    this.simValues = { ...this.simValues, ...patch };
    this.previewUseSim = true;
    this.pendingEntry = null;
    this.conflictItems = [];
    this.conflictModalVisible = false;
  }
  cancelConflict(): void {
    this.pendingEntry = null;
    this.conflictItems = [];
    this.conflictModalVisible = false;
  }

  // ====== Prévisualisation des effets d'un choix (conflits)
  conflictPreview = {
    appear: [] as string[],
    disappear: [] as string[],
    enable: [] as string[],
    disable: [] as string[],
    reqOn: [] as string[],
    reqOff: [] as string[],
  };
  onConflictSelectionChange() { this.recomputeConflictPreview(); }
  private recomputeConflictPreview() {
    if (!this.conflictModalVisible) return;
    const baseVal = this.previewUseSim ? { ...this.simValues } : {};
    const currentState = this.prevSvc.measureState(this.schema, baseVal);

    let targetVal: Record<string, any> = { ...baseVal };
    if (this.pendingEntry) {
      // base assignment from rule + chosen overrides
      const baseAssign = this.ruleToAssignments(this.pendingEntry.rule);
      targetVal = { ...targetVal, ...baseAssign };
      for (const it of this.conflictItems) targetVal[it.key] = it.selected;
    }
    const nextState = this.prevSvc.measureState(this.schema, targetVal);

    const keys = Array.from(new Set([...Object.keys(currentState), ...Object.keys(nextState)]));
    const appear: string[] = []; const disappear: string[] = [];
    const enable: string[] = []; const disable: string[] = [];
    const reqOn: string[] = []; const reqOff: string[] = [];
    for (const k of keys) {
      const a = currentState[k] || { visible: false, disabled: false, required: false, label: k };
      const b = nextState[k] || { visible: false, disabled: false, required: false, label: k };
      if (!a.visible && b.visible) appear.push(b.label);
      if (a.visible && !b.visible) disappear.push(a.label);
      if (a.visible && b.visible) {
        if (a.disabled && !b.disabled) enable.push(b.label);
        if (!a.disabled && b.disabled) disable.push(b.label);
        if (!a.required && b.required) reqOn.push(b.label);
        if (a.required && !b.required) reqOff.push(b.label);
      }
    }
    this.conflictPreview = { appear, disappear, enable, disable, reqOn, reqOff } as any;
  }

  private measureState(val: Record<string, any>): Record<string, { visible: boolean; disabled: boolean; required: boolean; label: string }> {
    // construire un form avec les règles appliquées
    const form = this.dfs.buildForm(this.schema as any, val);
    const out: Record<string, { visible: boolean; disabled: boolean; required: boolean; label: string }> = {};
    const visit = (fields?: any[]) => {
      (fields || []).forEach((f: any) => {
        if (f.type === 'section') {
          if (this.dfs.isSectionVisible(f, form)) visit(f.fields || []);
        } else if (f.type !== 'textblock') {
          const key = f.key; const ctrl = form.get(key);
          const vis = this.dfs.isFieldVisible(f, form);
          const disabled = !!ctrl?.disabled;
          const required = !!ctrl?.hasValidator?.(Validators.required);
          out[key] = { visible: vis, disabled, required, label: f.label || f.key || 'Field' };
        }
      });
    };
    if (this.schema.steps?.length) {
      this.schema.steps.forEach(st => {
        if (this.dfs.isStepVisible(st, form)) visit(st.fields || []);
      });
    } else {
      visit(this.schema.fields || []);
    }
    return out;
  }

  // ====== Description textuelle simple des conditions + évaluation
  describeRule(rule: any): string { return this.prevSvc.describeRule(rule); }
  isRuleSatisfied(rule: any, value: Record<string, any>): boolean { return this.prevSvc.isRuleSatisfied(this.schema, rule, value); }
  displayChoiceLabel(key: string, value: any): string { return this.prevSvc.displayChoiceLabel(this.schema, key, value); }
  get forceBp(): 'xs'|'sm'|'md'|'lg'|'xl' | undefined {
    const w = this.previewWidth;
    if (w == null) return undefined;
    if (w < 576) return 'xs';
    if (w < 768) return 'sm';
    if (w < 992) return 'md';
    if (w < 1200) return 'lg';
    return 'xl';
  }

  // Détection du breakpoint auto (viewport) pour affichage du badge
  autoBp: 'xs'|'sm'|'md'|'lg'|'xl' = 'md';
  private updateAutoBp() {
    const w = window?.innerWidth || 0;
    this.autoBp = w < 576 ? 'xs' : w < 768 ? 'sm' : w < 992 ? 'md' : w < 1200 ? 'lg' : 'xl';
  }
  onEditModeChange(enabled: boolean) {
    this.editMode = enabled;
    if (!enabled) {
      this.selectedField = null;
      this.selected = null as any;
      this.updateTreeSelectedKeys();
    }
  }
  @HostListener('window:resize') onResize() { this.updateAutoBp(); }

  // ====== Dépendances: champs impactés par une clé (utilisés dans visibleIf/requiredIf/disabledIf)
  dependentsForKey(key: string) { return this.depsSvc.dependentsForKey(this.schema, key); }
  formatDependents(key: string): string { return this.depsSvc.formatDependents(this.schema, key); }

  buildBaseline(): any { return this.prevSvc.buildValidBaseline(this.schema); }

  applyScenario(sc: { patch: Record<string, any>; arrayKey?: string }) {
    const base = this.buildBaseline();
    let merged: any = { ...base };
    if (sc.arrayKey) {
      const arr = merged[sc.arrayKey] = Array.isArray(merged[sc.arrayKey]) ? merged[sc.arrayKey] : [{}];
      const item = { ...(arr[0] || {}), ...sc.patch };
      arr[0] = item;
    } else {
      merged = { ...merged, ...sc.patch };
    }
    this.simValues = merged;
    this.previewUseSim = true;
    this.refresh();
  }

  applyScenarioAll(sc: { patch: Record<string, any>; arrayKey?: string }) {
    const base = this.buildBaseline();
    let merged: any = { ...base };
    if (sc.arrayKey) {
      const arr = merged[sc.arrayKey] = Array.isArray(merged[sc.arrayKey]) ? merged[sc.arrayKey] : [{}];
      const item = { ...(arr[0] || {}), ...sc.patch };
      arr[0] = item;
    } else {
      merged = { ...merged, ...sc.patch };
    }
    this.simValues = merged;
    this.previewUseSim = true;
    this.refresh();
  }

  applyFormScenario(sc: { value: Record<string, any> }) {
    this.simValues = JSON.parse(JSON.stringify(sc.value));
    this.previewUseSim = true;
    this.refresh();
  }

  private newField(type: FieldType): FieldConfig { return this.factory.newField(type); }

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
    // Recalculer les contrôles à chaque refresh
    try { this.recomputeIssues(); } catch {}
    try {
      this.scenarios = this.prevSvc.enumerateScenarios(this.schema);
      (this as any).scenariosAll = this.prevSvc.enumerateFieldVariations(this.schema);
      (this as any).formScenarios = this.prevSvc.enumerateFormScenarios(this.schema);
    } catch {}
    if (!this.applyingHistory) {
      try { this.hist.push(this.schema as any); } catch {}
    }
  }

  // Debounced refresh for inspector typing to avoid letter-by-letter history
  private refreshDebounced(delay = 350): void {
    if (this.refreshDebounceTimer) clearTimeout(this.refreshDebounceTimer);
    this.refreshDebounceTimer = setTimeout(() => {
      this.refreshDebounceTimer = null;
      this.refresh();
    }, delay);
  }

  // ====== Tree ======
  private rebuildTree() {
    // Assurer l'expansion automatique des ancêtres de l'élément sélectionné
    const selKey = this.treeSvc.keyForObject(this.schema, this.selected);
    if (selKey) {
      const parts = selKey.split(':');
      const ancestors: string[] = [];
      if (parts[0] === 'step') {
        // ex: step:0:field:3:field:2 => ancestors: step:0, step:0:field:3
        ancestors.push(`${parts[0]}:${parts[1]}`);
        for (let i = 2; i < parts.length - 1; i += 2) ancestors.push(parts.slice(0, i + 2).join(':'));
      } else if (parts[0] === 'field') {
        // ex: field:0:field:2 => ancestors: field:0
        for (let i = 0; i < parts.length - 1; i += 2) ancestors.push(parts.slice(0, i + 2).join(':'));
      }
      ancestors.forEach(k => this.treeExpanded.add(k));
    }
    const isExp = (key: string, def = false) => this.treeExpanded.has(key) || def;
    this.treeNodes = this.treeSvc.buildTreeNodes(this.schema, isExp);
    this.updateTreeSelectedKeys();
  }

  onTreeSelect(keys: string[]) {
    const key = keys[0];
    if (!key) return;
    if (key === 'root') { this.select(this.schema); return; }
    const ctx = this.treeSvc.ctxFromKey(this.schema, key);
    if (!ctx) return;
    const obj = ctx.obj;
    // si step sélectionné → synchroniser l'aperçu
    if (this.isStep(obj)) {
      this.toggleSelect(obj);
      try {
        const list = this.df?.visibleSteps || [];
        const vi = list.findIndex(s => s === obj);
        if (vi >= 0) this.df?.go(vi, true);
      } catch {}
      return;
    }
    if (obj) this.toggleSelect(obj);
  }

  private toggleSelect(obj: any) {
    if (this.selected === obj) {
      this.selected = null;
      this.selectedField = null;
    } else {
      // si c'est un field, tenir selectedField en phase pour l'aperçu
      if (this.isField(obj)) {
        this.selectedField = obj as any;
      } else {
        this.selectedField = null;
      }
      this.select(obj);
    }
  }

  onTreeClick(e: any) {
    const key = e && e.node && e.node.key ? String(e.node.key) : undefined;
    if (!key) return;
    this.onTreeSelect([key]);
  }
  // Drag & Drop dans le tree (déplacer fields/sections entre niveaux compatibles)
  
  onTreeDrop(e: any) {
    try {
      const key = this.treeSvc.handleDrop(this.schema, e);
      if (!key) return;
      this.refresh();
      this.treeSelectedKeys = [key];
    } catch (err) {
      
    }
  }
  onTreeDropdownVisible(vis: boolean, key: string) { this.dropdownKey = vis ? key : null; }

  onTreeExpand(e: any) {
    // Support both NzFormatEmitEvent and our forwarded { key, expanded }
    const key = (e?.node?.key as string | undefined) ?? (e?.key as string | undefined);
    const expanded = (e?.node?.isExpanded as boolean | undefined) ?? (e?.expanded as boolean | undefined) ?? (e?.isExpanded as boolean | undefined);
    if (!key || expanded == null) return;
    if (expanded) this.treeExpanded.add(key); else this.treeExpanded.delete(key);
  }

  private updateTreeSelectedKeys() {
    const k = this.treeSvc.keyForObject(this.schema, this.selected);
    this.treeSelectedKeys = k ? [k] : [];
  }

  openTreeMenu(event: MouseEvent, menu: NzDropdownMenuComponent, key: string) {
    event.preventDefault();
    this.dropdownKey = key;
    this.dropdown.create(event, menu);
  }

  private parseKey(key: string): any | null { return this.treeSvc.parseKey(key); }

  // actions via menu contextuel (tree) — basées sur dropdownKey
  private currentCtxFromDropdown() {
    if (!this.dropdownKey) return null;
    return this.parseKey(this.dropdownKey);
  }
  ctxAddStep() {
    this.ensureStepperMode();
    const step = this.ctxActions.addStep(this.schema) as StepConfig;
    this.select(step);
    this.refresh();
  }
  ctxAddSection() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx || ctx.type !== 'step') return;
    const sec = this.ctxActions.addSectionToStep(this.schema, ctx.key);
    if (sec) this.select(sec as any);
    this.refresh();
  }
  ctxAddSectionArray() {
    const ctx = this.currentCtxFromDropdown();
    if (!ctx || ctx.type !== 'step') return;
    const sec = this.ctxActions.addArraySectionToStep(this.schema, ctx.key);
    if (sec) this.select(sec as any);
    this.refresh();
  }
  ctxAddFieldToStep() {
    const ctx = this.currentCtxFromDropdown();
    if (ctx?.type !== 'step') return;
    const f = this.ctxActions.addFieldToStep(this.schema, ctx.key, 'text');
    if (f) this.select(f);
    this.refresh();
  }
  addFieldAtStepTyped(t: string) {
    const ctx = this.currentCtxFromDropdown();
    if (ctx?.type !== 'step') return;
    const f = this.ctxActions.addFieldToStep(this.schema, ctx.key, t);
    if (f) this.select(f);
    this.refresh();
  }
  ctxAddFieldToSection() {
    const key = this.dropdownKey; if (!key) return;
    const f = this.ctxActions.addFieldToSection(this.schema, key, 'text');
    if (f) { this.select(f); this.refresh(); }
  }
  ctxAddFieldToSectionTyped(t: string) {
    const key = this.dropdownKey; if (!key) return;
    const f = this.ctxActions.addFieldToSection(this.schema, key, t);
    if (f) { this.select(f); this.refresh(); }
  }
  ctxAddSectionInside() {
    const key = this.dropdownKey; if (!key) return;
    const ns = this.ctxActions.addSectionInside(this.schema, key);
    if (ns) { this.select(ns as any); this.refresh(); }
  }
  ctxAddSectionInsideArray() {
    const key = this.dropdownKey; if (!key) return;
    const ns = this.ctxActions.addArraySectionInside(this.schema, key);
    if (ns) { this.select(ns as any); this.refresh(); }
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
    const sec = this.ctxActions.addSectionToRoot(this.schema);
    this.select(sec as any);
    this.refresh();
  }
  ctxAddSectionRootArray() {
    if (this.schema.steps?.length) return;
    this.ensureFlatMode();
    const sec = this.ctxActions.addArraySectionToRoot(this.schema);
    this.select(sec as any);
    this.refresh();
  }
  ctxAddFieldRoot() {
    // Only when no steps (root-level fields)
    this.ensureFlatMode();
    const f = this.ctxActions.addFieldToRoot(this.schema, 'text');
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
    const key = this.dropdownKey; if (!key) return;
    if (this.ctxActions.deleteSection(this.schema, key)) {
      if (this.selected && this.isSection(this.selected)) this.select(this.schema);
      this.refresh();
    }
  }
  ctxDeleteField() {
    const key = this.dropdownKey; if (!key) return;
    if (this.ctxActions.deleteField(this.schema, key)) {
      if (this.selected && this.isField(this.selected)) this.select(this.schema);
      this.refresh();
    }
  }

  // New: duplicate / insert before/after
  ctxDuplicateSection() {
    const key = this.dropdownKey; if (!key) return;
    const clone = this.ctxActions.duplicateAtKey(this.schema, key);
    if (clone) { this.select(clone as any); this.refresh(); }
  }
  ctxInsertSectionBefore() {
    const key = this.dropdownKey; if (!key) return;
    const sec = this.ctxActions.insertSectionBefore(this.schema, key);
    if (sec) { this.select(sec as any); this.refresh(); }
  }
  ctxInsertSectionAfter() {
    const key = this.dropdownKey; if (!key) return;
    const sec = this.ctxActions.insertSectionAfter(this.schema, key);
    if (sec) { this.select(sec as any); this.refresh(); }
  }
  ctxDuplicateField() {
    const key = this.dropdownKey; if (!key) return;
    const clone = this.ctxActions.duplicateAtKey(this.schema, key);
    if (clone) { this.select(clone as any); this.refresh(); }
  }
  ctxInsertFieldBefore() {
    const key = this.dropdownKey; if (!key) return;
    const f = this.ctxActions.insertFieldBefore(this.schema, key, 'text');
    if (f) { this.select(f as any); this.refresh(); }
  }
  ctxInsertFieldAfter() {
    const key = this.dropdownKey; if (!key) return;
    const f = this.ctxActions.insertFieldAfter(this.schema, key, 'text');
    if (f) { this.select(f as any); this.refresh(); }
  }

  // ====== Prévisualisation: réception du submit du DynamicForm
  onPreviewSubmitted(result: any) {
    this.submitResult = result;
    this.submitModalVisible = true;
  }

  // ====== Helpers Canvas (Grid/Cols) ======
  getSpan(field: FieldConfig): number { return this.gridSvc.getSpan(field, this.gridBp); }
  setSpan(field: FieldConfig, span: number) { this.gridSvc.setSpan(field, this.gridBp, span); this.refresh(); }
  changeSpan(field: FieldConfig, delta: number) { this.setSpan(field, this.getSpan(field) + delta); }

  onResizeStart(ev: MouseEvent, field: FieldConfig) {
    ev.stopPropagation();
    this.gridSvc.startResize(ev.currentTarget as HTMLElement, ev.pageX, field, this.gridBp, (f, span) => this.setSpan(f, span));
  }

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
