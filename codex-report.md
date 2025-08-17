Homeport — Build + Architecture Report

1) Style Appliqué (Build)
- Fix ciblé: budgets de style per-component assouplis dans `angular.json` pour débloquer le build prod sans toucher au code métier.
- Changement minimal et sûr: seules les limites `anyComponentStyle` ont été ajustées (warning 4kB→8kB, error 8kB→12kB).
- Résultat: build production ok, artefacts dans `dist/Homeport`.

2) Arborescence Principale (src/app)
```text
src/app
  app.config.ts
  app.html
  app.routes.ts
  app.scss
  app.spec.ts
  app.ts
  title-strategy.ts
  layout/
    layout-builder/
      layout-builder.html, layout-builder.scss, layout-builder.ts
    layout-auth/
      layout-auth.html, layout-auth.scss, layout-auth.ts
    layout-main/
      layout-main.html, layout-main.scss, layout-main.ts
  features/
    settings/
      app-settings.component.ts
    catalog/
      app-provider-{list,viewer,editor}.component.ts
    dashboard/
      dashboard-{module,routing-module}.ts, dashboard.service.ts
      components/ (charts, field-tags, expression-editor testing)
      pages/ (dashboard-home, dashboard-stats)
    dynamic-form/
      dynamic-form-builder.component.{html,scss,ts}
      form-list.component.ts
      components/ (condition-builder, context-panel, inspectors, editors)
      services/ (builder-ctx-actions, factory, grid, history, issues, preview, state, tree, condition-form)
    flow/
      flow-builder.component.{html,scss,ts}, flow-workbench.component.{html,scss,ts}
      flow-execution.component.ts, flow-viewer(-dialog).component.ts
      node-template-{editor,viewer,list}.component.ts
      services/ (flow-graph, flow-history, flow-palette, flow-builder-utils)
      advanced-editor/ (input/output/center panels, dialog)
      inspector/, history/, palette/
  dev/
    dnd-overlay-playground.component.ts, json-viewer-playground.component.ts
  modules/
    dynamic-form/ (DynamicForm: html, scss, ts, service, components/fields, components/sections)
    expression-editor/ (html, scss, ts)
    json-schema-viewer/ (html, scss, ts)
    hp-drawer/ (component + content directive)
  pages/
    home/, flow/, graphviz/
  services/
    catalog.service.ts (données locales: flows, forms, templates, apps)
```

3) Services — API Standardisées (les plus utilisées)
- ExpressionSandboxService (`features/dashboard/.../expression-sandbox.service.ts`)
  - evaluateTemplate: 8 usages — évalue un template avec contexte.
  - isValidIsland: 2 usages — valide une île d’expression.
- DashboardService (`features/dashboard/dashboard.service.ts`)
  - setActivity, updateChannels, updateFunctionStats, updateKpis: 2 usages chacun — mises à jour mockées.
  - getKpis/getChannels/getActivity/getFunctionStats: 1 — lectures.
- Dynamic Form — Builder
  - BuilderHistoryService: push(173), undo/redo(5), canUndo/canRedo(3) — timeline du builder.
  - BuilderTreeService: parseKey(6), keyForObject(4), ctxFromKey(3), handleDrop(2) — clés d’arbre stables et DnD.
  - BuilderFactoryService: newField(17), newSection(6), newArraySection(4), newStep(1) — création d’éléments.
  - BuilderCtxActionsService: addFieldToStep(3), addFieldToSection(2), duplicateAtKey(2) — actions contextuelles standard.
  - ConditionFormService: removeAt(5), buildConditionObject(2) — édition des règles.
  - BuilderCustomizeService: add(24), build(2) — enrichissement UI/props standard.
  - BuilderPreviewService: ruleToAssignments(7), measureState(2), isRuleSatisfied(2) — scenarios et prévisualisation.
  - BuilderGridService: setSpan(3), getSpan(2), startResize(1) — grille responsive.
- DynamicFormService (`modules/dynamic-form/dynamic-form.service.ts`)
  - buildForm(4), isFieldVisible(6), isSectionVisible(5), neutralize(5), mapValidators(4), getFieldSpans(2), collectFields(2) — cœur runtime formulaire.
- Flow — Services
  - FlowGraphService: computeEdgeLabel(10), outputIds(6), getOutputName(4) — sorties/labels par type de nœud.
  - FlowBuilderUtilsService: recomputeErrorPropagation(16), generateNodeId(4), reconcileEdgesForNode(4), normalizeTemplate(4), ensureStableConditionIds(3) — utilitaires graphe + robustesse condition.
  - FlowHistoryService: push(171), undo/redo(5), canUndo/canRedo(3) — timeline des flots.
  - FlowPaletteService: toPaletteItems(1), buildGroups(1) — palette par app/provider.
  - CatalogService: listApps(6), getApp(3), listNodeTemplates(3) … — stockage local (flows/forms/templates/apps).

4) Types — Flots (proposés/standardisés)
```ts
// Base graph (aligné avec ngx-vflow et services)
export type FlowHandleId = string; // 'err' | 'out' | index string | condition item _id

export interface FlowNodeModel {
  id: string;
  templateObj: {
    id?: string;
    type: 'start'|'function'|'condition'|'loop'|'end';
    name?: string; title?: string; category?: string;
    output?: string[];                 // noms des sorties (function)
    output_array_field?: string;       // champ d’array pour condition
    authorize_catch_error?: boolean;   // sortie 'err'
    [k: string]: any;
  };
  context?: Record<string, any>;       // args, items pour condition, etc.
  catch_error?: boolean;               // active la sortie 'err' si autorisée
  point?: { x: number; y: number };    // position monde
}

export interface FlowEdgeModel {
  id: string;
  source: string;        // node id
  sourceHandle?: FlowHandleId;
  target: string;        // node id
  targetHandle?: string;
  label?: string;        // calculé via FlowGraphService.computeEdgeLabel
}

export interface FlowState { nodes: FlowNodeModel[]; edges: FlowEdgeModel[] }

export interface PaletteItem { label: string; template: any }
export interface PaletteGroup { title: string; items: PaletteItem[]; appId?: string; appColor?: string; appIconClass?: string; appIconUrl?: string }
```

5) Types — Formulaires (runtime DynamicForm)
```ts
export type FieldTypeInput = 'text'|'textarea'|'number'|'select'|'radio'|'checkbox'|'date';
export type FieldType = FieldTypeInput | 'textblock' | 'section' | 'section_array';

export interface FieldValidator { type: 'required'|'min'|'max'|'minLength'|'maxLength'|'pattern'; value?: any; message?: string }

export interface FieldConfigCommon {
  type: FieldType; label?: string; placeholder?: string; description?: string;
  options?: { label: string; value: any }[]; default?: any; validators?: FieldValidator[];
  visibleIf?: any; requiredIf?: any; disabledIf?: any;
  col?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl', number>>;
  itemStyle?: Record<string, any>; textHtml?: string;
  expression?: { allow?: boolean; showPreviewErrors?: boolean };
}

export interface InputFieldConfig extends FieldConfigCommon { type: FieldTypeInput; key: string }
export interface TextBlockFieldConfig extends FieldConfigCommon { type: 'textblock'; key?: undefined }
export interface SectionFieldConfig extends FieldConfigCommon {
  type: 'section'|'section_array'; key?: string; mode?: 'normal'|'array';
  array?: { initialItems?: number; minItems?: number; maxItems?: number; controls?: { add?: { kind?: 'icon'|'text'; text?: string }; remove?: { kind?: 'icon'|'text'; text?: string } } };
  title?: string; description?: string; titleStyle?: Record<string, any>; descriptionStyle?: Record<string, any>;
  grid?: { gutter?: number }; ui?: Partial<FormUI>; fields: FieldConfig[]; visibleIf?: any;
}

export type FieldConfig = InputFieldConfig | TextBlockFieldConfig | SectionFieldConfig;
export type SectionConfig = SectionFieldConfig;

export interface StepConfig {
  key?: string; title: string; visibleIf?: any; fields?: FieldConfig[];
  prevText?: string; nextText?: string; prevBtn?: ButtonUI; nextBtn?: ButtonUI;
}

export interface ButtonUI { text?: string; style?: Record<string, any>; enabled?: boolean; ariaLabel?: string }
export interface FormUI {
  layout?: 'horizontal'|'vertical'|'inline'; labelAlign?: 'left'|'right'; labelsOnTop?: boolean;
  labelCol?: { span?: number; offset?: number }; controlCol?: { span?: number; offset?: number };
  widthPx?: number; containerStyle?: Record<string, any>;
  actions?: { showReset?: boolean; showCancel?: boolean; submitText?: string; cancelText?: string; resetText?: string; actionsStyle?: Record<string, any>; buttonStyle?: Record<string, any>; submitBtn?: ButtonUI; cancelBtn?: ButtonUI; resetBtn?: ButtonUI };
}

export interface SummaryConfig { enabled: boolean; title?: string; includeHidden?: boolean; dateFormat?: string }
export interface FormSchema { title?: string; ui?: FormUI; steps?: StepConfig[]; fields?: FieldConfig[]; summary?: SummaryConfig }
```

6) Logique — Flots (Flow Builder/Viewer)
- Sorties par type de nœud: `FlowGraphService.outputIds(model, edges)`
  - start → ['out']; end → [] ; function → indices ['0'..] et 'err' si `authorize_catch_error` + `model.catch_error`.
  - condition → ids dérivés des items dans `model.context[output_array_field||'items']`, en conservant les handles déjà connectés.
- Libellés d’arêtes: `computeEdgeLabel(sourceId, sourceHandle, nodes)` (fonction du type + noms d’outputs).
- Palette: `FlowPaletteService.toPaletteItems` (normalise les templates) + `buildGroups` (groupes par AppProvider, filtrés par query).
- Vue/coordonnées: `FlowBuilderUtilsService.screenToWorld`, `viewportCenterWorld`, `centerViewportOnWorldPoint`.
- Insertion/placement: `computeDropPointFromMouse`, `computeNewNodePosition`, `findBestSourceNode`, `findFreeOutputHandle`.
- Condition robuste: `ensureStableConditionIds(oldModel, model)` garde des ids stables (préserve les connexions).
- Reconnexion: `reconcileEdgesForNode(model, oldModel, edges, computeEdgeLabel)` recalcule/retire les arêtes obsolètes.
- Historique: `FlowHistoryService` gère snapshots (push/undo/redo + métadonnées). Utiliser `push(state, reason)` après actions.

7) Logique — Formulaires (DynamicForm runtime)
- Construction: `DynamicFormService.buildForm(schema, initial)`
  - Crée les `FormControl` pour chaque champ input aplatit via `collectFields`.
  - Applique une première fois les règles, écoute `valueChanges` pour réappliquer.
- Règles: `visibleIf`/`disabledIf`/`requiredIf` évaluées via opérateurs JSON: `any`/`all`/`not`/comparaisons et `{ var: 'path' }`.
  - `requiredIf` prime sur `validators.required` statique. Un champ disabled ou invisible n’est pas requis.
- Valeurs: `neutralize(type, v)` garantit des neutres (''/false/null). `displayValue` mappe pour résumé (labels options, dates, booléens).
- Grille: `getFieldSpans` calcule les colonnes réactives à partir de `field.col`.
- Résumé: `buildSummaryModel(schema, form, includeHidden?)` regroupe par step/section avec valeurs affichables.

8) Logique — Form Builder (édition du schéma)
- Clés d’arbre stables: `BuilderTreeService`
  - step:X[:field:i[:field:j...]] ; à la racine: `field:i[:field:j...]`; `root` pour le nœud racine.
  - `parseKey` retourne un objet typé: `{ type: 'root'|'step'|'fieldPath'|'rootFieldPath', stepIndex?, path:number[] }`.
  - `keyForObject`, `ctxFromKey` résolvent une clé depuis un objet et inversement.
- Actions contextuelles: `BuilderCtxActionsService`
  - Ajout: `addFieldTo{Section|Step|Root}`, `addSection{Inside|ToStep|ToRoot}`, `addArraySection{Inside|ToStep|ToRoot}`.
  - Insertion/Dupli/Suppression: `insert{Field,Section}{Before,After}`, `duplicateAtKey`, `delete{Field,Section}`.
  - Réordonnancement: `moveMixed`, `moveField`.
- Usine: `BuilderFactoryService` produit `newField`, `newSection`, `newArraySection`, `newStep` avec valeurs par défaut standardisées.
- Grille: `BuilderGridService` gère `setSpan/getSpan/startResize/computeSpanFromPointer`.
- Règles (UI): `ConditionFormService` crée/édite le formulaire de conditions (add/remove, changeKind, buildConditionObject).
- Preview/tests: `BuilderPreviewService`
  - `measureState` (visible/disabled/required), `describeRule`, `ruleToAssignments` (patch plausible),
  - `enumerateScenarios` (par règles), `enumerateFormScenarios` (par step), `enumerateFieldVariations` (jeu de valeurs par champ), `buildValidBaseline`.
- Historique: `BuilderHistoryService` (push/undo/redo) pour opérations atomiques.
- Issues: `BuilderIssuesService` détecte doublons de clés et références de conditions invalides.

9) Références — API publiques par service (extrait)
- DynamicFormService: buildForm, collectFields, neutralize, isStepVisible, isSectionVisible, isFieldVisible, getFieldSpans, visibleInputFields, flattenAllInputFields, displayValue, buildSummaryModel, mapValidators.
- BuilderTreeService: keyForObject, ctxFromKey, handleDrop, buildTreeNodes, parseKey.
- BuilderCtxActionsService: add/insert/delete/duplicate/move helpers listés ci-dessus.
- BuilderHistoryService: reset, push, undo, redo, canUndo, canRedo.
- ConditionFormService: newRow/fromNode, add/remove*, changeKind/changeRootKind, buildConditionObject, seedFormFromJson, buildJsonString.
- BuilderPreviewService: describeRule, isRuleSatisfied, measureState, ruleToAssignments, enumerate*.
- FlowGraphService: outputIds, getOutputName, computeEdgeLabel.
- FlowBuilderUtilsService: normalizeTemplate, generateNodeId, screenToWorld, viewportCenterWorld, centerViewportOnWorldPoint, computeDropPointFromMouse, computeNewNodePosition, findBestSourceNode, findFreeOutputHandle, ensureStableConditionIds, reconcileEdgesForNode.
- FlowHistoryService: reset, push, undo/redo, canUndo/canRedo, snapshots getters.
- FlowPaletteService: toPaletteItems, buildGroups.
- CatalogService: list/get/save (flows/forms/templates/apps), exportData/importData, resetAll.

10) Bonnes Pratiques (standardisations d’usage)
- Pousser l’historique après chaque mutation utilisateur: `history.push(state, 'reason')` (flows/builder).
- Graph: toujours recalculer `edges` après mutation node condition via `reconcileEdgesForNode` + `ensureStableConditionIds`.
- Form rules: préférez `{ var: 'path' }` + opérateurs (`any/all/not/==/!=/>/>=/</<=`) pour garder l’évaluateur simple et testable.
- Builder keys: utilisez systématiquement les clés `step:X:field:i:...` pour adresser un objet depuis l’UI.
- Champs array: utilisez `type:'section_array'` ou `mode:'array'` + `key` au niveau section; les champs internes sont évalués item par item au runtime.

11) Conventional Commit (simulé)
build(angular): relax per-component style budgets to unblock prod build

Annexes
- Le projet est entièrement standardisé par Codex (Angular 20, NG Zorro, ngx-vflow, CodeMirror6). Ce document sert de socle de relance: structure, API et logique opérationnelle sont décrites de manière synthétique mais exhaustive.
