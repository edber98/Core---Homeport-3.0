README — src/app/features/dynamic-form

Contenu du dossier:

- ARRAY.md
- COMPONENTS.md
- README.md
- dynamic-form-builder.component.html
- dynamic-form-builder.component.scss
- dynamic-form-builder.component.ts
  - Component: selector='dynamic-form-builder', standalone=True
  - Classes: DynamicFormBuilderComponent
  - Méthodes: openPanel, mobileAddSection, mobileAddField, mobileToggleEdit, onCtxChange, openTitleStyleEditor, saveTitleStyle, add, cancelTitleStyle, openDescStyleEditor, saveDescStyle, cancelDescStyle, styleFromForm, addPx, openCustomize, patchStyle, saveCustomize, cancelCustomize, createInspector, sadd, setTimeout, delete, allFieldKeys, collectRuleVars, forEachEntity, cb, selectEntity, clearCondition, recomputeIssues, fieldTypeDefaults, openOptionsBuilder, addOptionRow, removeOptionRow, saveOptions, cancelOptions, openConditionBuilder, buildConditionObject, saveCondition, cancelCondition, localKeysForSelected, arrayAncestorOfSelected, addConditionRow, addConditionGroup, removeConditionRow, changeCondKind, addSubRule, addSubGroup, removeSubAt, select, pickStyleNumber, isSelected, isStep, isSection, isField, quickAdd, addStep, addSectionFromToolbar, addArraySectionFromToolbar, addFieldFromToolbar, canAddStep, canAddSectionBtn, canAddFieldBtn, addSection, addField, addFieldToStep, removeStep, removeSection, removeField, dropStep, moveItemInArray, dropSection, dropField, setPreviewWidth, onEditMoveItem, onEditMoveField, onEditDeleteField, onEditAddFieldTyped, onEditSelectField, onEditSelectSection, onEditSelectStep, onEditAddStep, onEditAddSection, onEditAddFieldStepRoot, onEditAddFieldInSection, onEditDeleteStep, onEditDeleteSection, export, import, alert, saveSchema, visit, pushFieldConds, ruleToAssignments, describeRuleWithCtx, describeRulePretty, labelForKey, isRuleSatisfiedWithCtx, activateCondition, resetSimulation, undo, redo, applySnapshot, cloneSchema, onKey, openConflictFor, confirmConflict, cancelConflict, onConflictSelectionChange, recomputeConflictPreview, measureState, describeRule, isRuleSatisfied, displayChoiceLabel, updateAutoBp, onEditModeChange, dependentsForKey, formatDependents, buildBaseline, applyScenario, applyScenarioAll, applyFormScenario, newField, ensureStepperMode, ensureFlatMode, stringifyJson, refresh, refreshDebounced, rebuildTree, onTreeSelect, toggleSelect, onTreeClick, onTreeDrop, onTreeDropdownVisible, onTreeExpand, updateTreeSelectedKeys, openTreeMenu, parseKey, currentCtxFromDropdown, ctxAddStep, ctxAddSection, ctxAddSectionArray, ctxAddFieldToStep, addFieldAtStepTyped, ctxAddFieldToSection, ctxAddFieldToSectionTyped, ctxAddSectionInside, ctxAddSectionInsideArray, ctxAddFieldRootTyped, ctxAddSectionRoot, ctxAddSectionRootArray, ctxAddFieldRoot, ctxDeleteStep, ctxDeleteSection, ctxDeleteField, ctxDuplicateSection, ctxInsertSectionBefore, ctxInsertSectionAfter, ctxDuplicateField, ctxInsertFieldBefore, ctxInsertFieldAfter, onPreviewSubmitted, getSpan, setSpan, changeSpan, onResizeStart, dropFieldInStepRoot, removeFieldFromStep, toggleEditMode, onBpChange
- form-list.component.ts
  - Component: selector='form-list', standalone=True
  - Classes: FormListComponent
  - Méthodes: ngOnInit, load, openBuilder, openViewer, openCreate, closeCreate, canCreate, makeIdFromName, createForm, setTimeout, doSearch
- instruction.md
