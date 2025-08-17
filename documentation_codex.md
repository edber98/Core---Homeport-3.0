Documentation Codex — Inventaire complet (répertoire)

Arborescence:
.
  docs/
    backend/
    technical/
  public/
    imgs/
      logos/
    fronts/
  examples/
  src/
    app/
      layout/
        layout-builder/
        layout-auth/
        layout-main/
      features/
        settings/
        catalog/
        dashboard/
          components/
            field-tags/
            charts/
            expression-editor-testing-component/
          pages/
            dashboard-home/
            dashboard-stats/
        dynamic-form/
          components/
          services/
        flow/
          advanced-editor/
          inspector/
          history/
          palette/
      dev/
      modules/
        expression-editor/
        json-schema-viewer/
        hp-drawer/
        dynamic-form/
          components/
            sections/
            fields/
      pages/
        home/
        graphviz/
        flow/
      services/

## .
- AGENTS.md
- Class css.md
- README.md
- angular.json
- codex-report.md
- codex_prompt.md
- documentation_codex.md
- karma.conf.js
- package-lock.json
- package.json
- tmp1.ts
  - Component: selector='dynamic-form-builder', standalone=True
  - Classes: DynamicFormBuilderComponent
  - Méthodes: openTitleStyleEditor, saveTitleStyle, add, cancelTitleStyle, openDescStyleEditor, saveDescStyle, cancelDescStyle, styleFromForm, addPx, openCustomize, patchStyle, saveCustomize, cancelCustomize, createInspector, sadd, setTimeout, delete, allFieldKeys, collectRuleVars, forEachEntity, cb, selectEntity, clearCondition, recomputeIssues, fieldTypeDefaults, openOptionsBuilder, addOptionRow, removeOptionRow, saveOptions, cancelOptions, openConditionBuilder, buildConditionObject, parseMaybeNumber, saveCondition, cancelCondition, newCondRow, addConditionRow, addConditionGroup, removeConditionRow, changeCondKind, subItemsAt, addSubRule, addSubGroup, removeSubAt, rowFromNode, buildNodeFromForm, select, pickStyleNumber, isSelected, isStep, isSection, isField, quickAdd, addStep, addSectionFromToolbar, addFieldFromToolbar, canAddStep, canAddSectionBtn, canAddFieldBtn, addSection, addField, addFieldToStep, removeStep, removeSection, removeField, dropStep, moveItemInArray, dropSection, dropField, setPreviewWidth, onEditMoveItem, onEditMoveField, move, onEditDeleteField, del, onEditAddFieldTyped, onEditSelectField, onEditSelectSection, onEditSelectStep, onEditAddStep, onEditAddSection, onEditAddFieldStepRoot, onEditAddFieldInSection, onEditDeleteStep, onEditDeleteSection, export, import, alert, visit, pushFieldConds, fieldByKey, truthySampleForField, falseySampleForField, ruleToAssignments, activateCondition, resetSimulation, openConflictFor, confirmConflict, cancelConflict, onConflictSelectionChange, recomputeConflictPreview, measureState, describeRule, evalRuleLocal, isRuleSatisfied, displayChoiceLabel, updateAutoBp, nodeUsesKey, dependentsForKey, formatDependents, newField, ensureStepperMode, ensureFlatMode, stringifyJson, refresh, rebuildTree, pushFieldNodes, onTreeSelect, toggleSelect, onTreeClick, onTreeDrop, onTreeDropdownVisible, onTreeExpand, keyForObject, ctxFromKey, updateTreeSelectedKeys, openTreeMenu, parseKey, currentCtxFromDropdown, ctxAddStep, ctxAddSection, ctxAddFieldToStep, addFieldAtStepTyped, ctxAddFieldToSection, ctxAddFieldToSectionTyped, ctxAddSectionInside, ctxAddFieldRootTyped, ctxAddSectionRoot, ctxAddFieldRoot, ctxDeleteStep, ctxDeleteSection, ctxDeleteField, spanForBp, getSpan, setSpan, changeSpan, onResizeStart, dropFieldInStepRoot, removeFieldFromStep, onResizeMove, onResizeEnd
- tsconfig.app.json
- tsconfig.json
- tsconfig.spec.json

## ./docs
- AGENT_CHANGES.md
- NOTICE_FR.md
- README.md
- dnd-drawer-vflow-ios.md
- dynamic-form-edit-mode.md
- expression-editor.md
- flow-palette.md

## ./docs/backend
- README.md
- flow-builder-catalog.md
- flows-and-forms-backend.md

## ./docs/technical
- README.md
- dynamic-forms.md
- error-model.md
- expression-language.md
- flow-execution.md
- flow-persistence.md
- functions-multi-outputs.md

## ./public
- README.md
- favicon.ico
- favicon.ico.old

## ./public/imgs
- README.md
- logo.png

## ./public/imgs/logos
- README.md
- c4.svg
- logic.svg
- trigger.svg

## ./public/fronts
- README.md
- sarine-medium.ttf

## ./examples
- README.md
- form-long.md

## ./src
- README.md
- index.html
- main.ts
  - Méthodes: bootstrapApplication
- styles.scss
- theme.less

## ./src/app
- README.md
- app.config.ts
  - Méthodes: registerLocaleData, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, provideRouter
- app.html
- app.routes.ts
  - Méthodes: import
- app.scss
- app.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- app.ts
  - Component: selector='app-root', standalone=False
  - Classes: App
- title-strategy.ts
  - Classes: KinnTitleStrategy

## ./src/app/layout
- README.md

## ./src/app/layout/layout-builder
- README.md
- layout-builder.html
- layout-builder.scss
- layout-builder.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- layout-builder.ts
  - Component: selector='app-layout-builder', standalone=True
  - Classes: LayoutBuilder

## ./src/app/layout/layout-auth
- README.md
- layout-auth.html
- layout-auth.scss
- layout-auth.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- layout-auth.ts
  - Component: selector='app-layout-auth', standalone=False
  - Classes: LayoutAuth

## ./src/app/layout/layout-main
- README.md
- layout-main.html
- layout-main.scss
- layout-main.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- layout-main.ts
  - Component: selector='app-layout-main', standalone=True
  - Classes: LayoutMain
  - Méthodes: openDrawer, closeDrawer, go, getActiveOptions, logout, openCmd, closeCmd, runQuick, onSearch, openLaunch, closeLaunch

## ./src/app/features
- README.md

## ./src/app/features/settings
- README.md
- app-settings.component.ts
  - Component: selector='app-settings', standalone=True
  - Classes: AppSettingsComponent
  - Méthodes: resetAll, setTimeout, exportAll, onImportFile

## ./src/app/features/catalog
- README.md
- app-provider-editor.component.ts
  - Component: selector='app-provider-editor', standalone=True
  - Classes: AppProviderEditorComponent
  - Méthodes: ngOnInit, simpleIconUrl, hexToRgb, ensureId, slug, patch, back, save
- app-provider-list.component.ts
  - Component: selector='app-provider-list', standalone=True
  - Classes: AppProviderListComponent
  - Méthodes: ngOnInit, simpleIconUrl, fgColor, simpleIconUrlWithColor, hexToRgb, create, edit, view, remove, doSearch
- app-provider-viewer.component.ts
  - Component: selector='app-provider-viewer', standalone=True
  - Classes: AppProviderViewerComponent
  - Méthodes: ngOnInit, simpleIconUrl, back

## ./src/app/features/dashboard
- README.md
- dashboard-module.ts
  - Classes: DashboardModule
- dashboard-routing-module.ts
  - Classes: DashboardRoutingModule
- dashboard.service.ts
  - Injectable: true
  - Classes: DashboardService
  - Méthodes: getKpis, getChannels, getActivity, getFunctionStats, updateKpis, updateChannels, addActivity, setActivity, updateFunctionStats
  - Types/Interfaces/Enums exportés: ActivityItem, ChannelStat, DashboardKpis, FunctionStat

## ./src/app/features/dashboard/components
- README.md

## ./src/app/features/dashboard/components/field-tags
- README.md
- field-tags.html
- field-tags.scss
- field-tags.ts
  - Component: selector='app-field-tags', standalone=True
  - Classes: FieldTagsComponent
  - Méthodes: onDragStart
  - Types/Interfaces/Enums exportés: ExprTag

## ./src/app/features/dashboard/components/charts
- README.md
- donut-chart.component.ts
  - Component: selector='donut-chart', standalone=True
  - Classes: DonutChartComponent
- mini-area-chart.component.ts
  - Component: selector='mini-area-chart', standalone=True
  - Classes: MiniAreaChartComponent
  - Méthodes: ngOnInit, ngOnChanges, compute, onMove, hideTip
- mini-bar-chart.component.ts
  - Component: selector='mini-bar-chart', standalone=True
  - Classes: MiniBarChartComponent
  - Méthodes: ngOnInit, showTip, hideTip

## ./src/app/features/dashboard/components/expression-editor-testing-component
- README.md
- expression-sandbox.service.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- expression-sandbox.service.ts
  - Injectable: true
  - Classes: ExpressionSandboxService
  - Méthodes: evaluateTemplate, evaluateTemplateDetailed, extractSingleIsland, stringify, evalJs, isValidIsland, validateTemplate, normalizeContext, isSafeExpression, findIslands
  - Types/Interfaces/Enums exportés: ExpressionContext

## ./src/app/features/dashboard/pages
- README.md

## ./src/app/features/dashboard/pages/dashboard-home
- README.md
- dashboard-home.html
- dashboard-home.scss
- dashboard-home.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- dashboard-home.ts
  - Component: selector='app-dashboard-home', standalone=True
  - Classes: DashboardHome
  - Méthodes: loadDemoData, clearData, errSuccRatio

## ./src/app/features/dashboard/pages/dashboard-stats
- README.md
- dashboard-stats.html
- dashboard-stats.scss
- dashboard-stats.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- dashboard-stats.ts
  - Component: selector='app-dashboard-stats', standalone=False
  - Classes: DashboardStats
  - Méthodes: trigger, transition, style, animate, selectItem, createEdge, walk

## ./src/app/features/dynamic-form
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

## ./src/app/features/dynamic-form/components
- README.md
- condition-builder.component.html
- condition-builder.component.scss
- condition-builder.component.ts
  - Component: selector='condition-builder', standalone=True
  - Classes: ConditionBuilderComponent
  - Méthodes: subItemsAt, subItemsAtNested, onChangeKind
- context-panel.component.html
- context-panel.component.scss
- context-panel.component.ts
  - Component: selector='df-context-panel', standalone=True
  - Classes: ContextPanelComponent
  - Méthodes: onTreeClick, onTreeDrop, onTreeExpand, openTreeMenu, setTimeout, onCtxAddStep, onCtxAddFieldRoot, onCtxAddSectionRoot, onCtxAddFieldRootTyped, onCtxAddSectionRootArray, onCtxStepAddSection, onCtxStepAddField, onCtxStepAddFieldTyped, onCtxStepDelete, onCtxStepAddSectionArray, onCtxSectionAddSection, onCtxSectionAddField, onCtxSectionAddFieldTyped, onCtxSectionDelete, onCtxSectionAddSectionArray, onCtxFieldDelete, onCtxSectionDuplicate, onCtxSectionInsertBefore, onCtxSectionInsertAfter, onCtxFieldDuplicate, onCtxFieldInsertBefore, onCtxFieldInsertAfter
- customize-dialog.component.ts
  - Component: selector='app-customize-dialog', standalone=True
  - Classes: CustomizeDialogComponent
  - Méthodes: hasSpacing
- inspector-field.component.scss
- inspector-field.component.ts
  - Component: selector='inspector-field', standalone=True
  - Classes: InspectorFieldComponent
  - Méthodes: ngOnChanges, onValidatorsChanged, safeParseArray, applyValidatorArray, numOrUndef, strOrUndef
- inspector-form-settings.component.html
- inspector-form-settings.component.scss
- inspector-form-settings.component.ts
  - Component: selector='inspector-form-settings', standalone=True
  - Classes: InspectorFormSettingsComponent
  - Méthodes: ngOnInit, ngOnDestroy, createSpacingGroup, bindSpacing
- inspector-section.component.scss
- inspector-section.component.ts
  - Component: selector='inspector-section', standalone=True
  - Classes: InspectorSectionComponent
- inspector-step.component.scss
- inspector-step.component.ts
  - Component: selector='inspector-step', standalone=True
  - Classes: InspectorStepComponent
- json-editor.component.ts
  - Component: selector='json-editor', standalone=True
  - Classes: JsonEditorComponent
  - Méthodes: onChange, format, minify
- monaco-json-editor.component.ts
  - Component: selector='monaco-json-editor', standalone=True
  - Classes: MonacoJsonEditorComponent
  - Méthodes: ngAfterViewInit, ngOnDestroy, ensureMonaco, createEditor, format, minify, ngOnChanges
- options-builder.component.ts
  - Component: selector='options-builder', standalone=True
  - Classes: OptionsBuilderComponent
- prefixed-spacing-editor.component.html
- prefixed-spacing-editor.component.ts
  - Component: selector='app-prefixed-spacing-editor', standalone=True
  - Classes: PrefixedSpacingEditorComponent
  - Méthodes: ctrl
- spacing-editor.component.html
- spacing-editor.component.scss
- spacing-editor.component.ts
  - Component: selector='app-spacing-editor', standalone=True
  - Classes: SpacingEditorComponent
- style-editor.component.ts
  - Component: selector='app-style-editor', standalone=True
  - Classes: StyleEditorComponent

## ./src/app/features/dynamic-form/services
- README.md
- builder-ctx-actions.service.ts
  - Injectable: true
  - Classes: BuilderCtxActionsService
  - Méthodes: resolveCtx, addFieldToSection, addSectionInside, addArraySectionInside, deleteSection, deleteField, duplicateAtKey, insertSectionBefore, insertSectionAfter, insertFieldBefore, insertFieldAfter, addStep, addSectionToStep, addArraySectionToStep, addFieldToStep, addSectionToRoot, addArraySectionToRoot, addFieldToRoot, moveMixed, moveField, move, deleteFieldByPosition, del
- builder-customize.service.ts
  - Injectable: true
  - Classes: BuilderCustomizeService
  - Méthodes: px, unpx, addSpacing, patchStyle, styleFromForm, m, build, addStd, add, apply
- builder-deps.service.ts
  - Injectable: true
  - Classes: BuilderDepsService
  - Méthodes: nodeUsesKey, dependentsForKey, visit, formatDependents
- builder-factory.service.ts
  - Injectable: true
  - Classes: BuilderFactoryService
  - Méthodes: newStep, newSection, newArraySection, newField
  - Types/Interfaces/Enums exportés: FieldType
- builder-grid.service.ts
  - Injectable: true
  - Classes: BuilderGridService
  - Méthodes: spanForBp, getSpan, setSpan, computeSpanFromPointer, startResize, onUpdate, _onMouseMove, _onMouseUp
- builder-history.service.ts
  - Injectable: true
  - Classes: BuilderHistoryService
  - Méthodes: reset, canUndo, canRedo, last, push, undo, redo, serialize, deserialize
- builder-issues.service.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- builder-issues.service.ts
  - Injectable: true
  - Classes: BuilderIssuesService
  - Méthodes: allFieldKeys, collectRuleVars, forEachEntity, cb, findDuplicates, findInvalidConditionRefs
  - Types/Interfaces/Enums exportés: DuplicateIssueItem, InvalidRefIssueItem
- builder-preview.service.ts
  - Injectable: true
  - Classes: BuilderPreviewService
  - Méthodes: describeRule, isRuleSatisfied, displayChoiceLabel, measureState, ruleToAssignments, fieldByKey, truthySampleForField, falseySampleForField, evalRuleLocal, enumerateScenarios, visit, enumerateFormScenarios, apply, buildValidBaseline, enumerateFieldVariations
- builder-state.service.ts
  - Injectable: true
  - Classes: BuilderStateService
  - Méthodes: clear, setSelected, toggle
- builder-tree.service.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- builder-tree.service.ts
  - Injectable: true
  - Classes: BuilderTreeService
  - Méthodes: isSection, keyForObject, ctxFromKey, handleDrop, buildTreeNodes, pushFieldNodes, parseKey
- condition-form.service.ts
  - Injectable: true
  - Classes: ConditionFormService
  - Méthodes: newRow, fromNode, changeKind, addSubRule, addSubGroup, removeAt, removeSubAt, rootItems, addRootRule, addRootGroup, removeRootAt, changeRootKind, addSubRuleAt, addSubGroupAt, removeSubAtRoot, buildNodeFromForm, buildConditionObject, parseMaybeNumber, seedFormFromJson, buildJsonString

## ./src/app/features/flow
- README.md
- flow-builder-utils.service.ts
  - Injectable: true
  - Classes: FlowBuilderUtilsService
  - Méthodes: normalizeTemplate, generateNodeId, screenToWorld, computeDropPointFromMouse, viewportCenterWorld, centerViewportOnWorldPoint, computeNewNodePosition, findBestSourceNode, findFreeOutputHandle, getConditionItems, getConditionItemsFull, ensureStableConditionIds, reconcileEdgesForNode, recomputeErrorPropagation, buildDefaultGraphFromPalette
- flow-builder.component.html
- flow-builder.component.scss
- flow-builder.component.ts
  - Component: selector='flow-builder', standalone=True
  - Classes: FlowBuilderComponent
  - Méthodes: openPanel, openMobilePanel, setTimeout, enableGlobalBlockers, disableGlobalBlockers, updateGlobalBlockers, onLeftDrawerClose, onRightDrawerClose, ngOnInit, miniIconClass, simpleIconUrl, appLabelOf, ngAfterViewInit, ngOnDestroy, updateIsMobile, updateZoomDisplay, onZoomSlider, applyZoomPercent, onPaletteQueryChange, rebuildPaletteGroups, inputId, outputIds, getOutputName, onExternalDrop, normalizeTemplate, computeDropPoint, onConnect, deleteEdge, onDeleteEdgeClick, getEdgeLabel, computeEdgeLabel, updateTimelineCaches, mapMetaToItem, formatTime, describeReason, recomputeErrorPropagation, isNodeInError, isEdgeDeleteDisabled, onDragEnter, onDragLeave, onDragOver, onDragStart, onDragEnd, onPaletteClick, viewportCenterWorld, findBestSourceNode, isStartLike, hasStartLikeNode, isPaletteItemDisabled, findFreeOutputHandle, computeNewNodePosition, isDragging, onNodeContextMenu, openCtxMenuAt, onNodeTouchStart, onNodeTouchMove, onNodeTouchEnd, closeCtxMenu, ctxOpenAdvancedAndInspector, ctxDuplicateTarget, collectAllConditionHandleIds, generateNodeId, ctxDeleteTarget, ctxCenterTarget, onSelected, selectItem, openAdvancedEditor, closeAdvancedEditor, onAdvancedModelChange, onAdvancedModelCommitted, saveSelectedJson, deleteSelected, undo, redo, centerFlow, centerOnSelection, centerOnNodeId, centerViewportOnWorldPoint, exportFlow, saveFlow, runFlow, showToast, onKeydown, snapshot, now, isIgnoring, beginApplyingHistory, pushState, onHandleEnter, onHandleMove, onHandleLeave, onNodePositionChange, onWheel, onPointerUp, onNodesRemoved, onEdgesRemoved, log, onEdgesDetached, onHistoryHoverPast, onHistoryHoverFuture, onHistoryHoverLeave, previewSnapshot, revertPreview, onHistoryClickPast, onHistoryClickFuture, importFlow
- flow-execution.component.ts
  - Component: selector='flow-execution', standalone=True
  - Classes: FlowExecutionComponent
- flow-graph.service.ts
  - Injectable: true
  - Classes: FlowGraphService
  - Méthodes: outputIds, getOutputName, computeEdgeLabel
- flow-history.service.ts
  - Injectable: true
  - Classes: FlowHistoryService
  - Méthodes: reset, push, canUndo, canRedo, undo, redo, clone, pastCount, futureCount, getPastMeta, getFutureMeta, getPastAt, getFutureAt
  - Types/Interfaces/Enums exportés: FlowHistoryMeta, FlowState
- flow-list.component.ts
  - Component: selector='flow-list', standalone=True
  - Classes: FlowListComponent
  - Méthodes: doSearch, ngOnInit, load, getIcon, openEditor, openExecutions, openCreate, closeCreate, canCreate, makeIdFromName, createFlow, setTimeout
- flow-palette.service.ts
  - Injectable: true
  - Classes: FlowPaletteService
  - Méthodes: toPaletteItems, buildGroups, ensure
  - Types/Interfaces/Enums exportés: PaletteGroup
- flow-viewer-dialog.component.ts
  - Component: selector='flow-viewer-dialog', standalone=True
  - Classes: FlowViewerDialogComponent
  - Méthodes: toggleMenu, centerFlow, snapshot, close
- flow-viewer.component.ts
  - Component: selector='flow-viewer', standalone=True
  - Classes: FlowViewerComponent
  - Méthodes: ngOnInit, ngAfterViewInit, setTimeout, ngOnDestroy, inputId, outputIds, fitAll, setZoomAndCenter, saveViewport, restoreViewport, updateZoomDisplay, loadDemo, onNodePositionChange, onWheel, onPointerDown, onRun, onSave, onCenterFlow, computeEdgeLabel, getOutputName, onHandleEnter, onHandleMove, onHandleLeave
- flow-workbench.component.html
- flow-workbench.component.scss
- flow-workbench.component.ts
  - Component: selector='flow-workbench', standalone=True
  - Classes: FlowWorkbenchComponent
- node-template-editor.component.ts
  - Component: selector='node-template-editor', standalone=True
  - Classes: NodeTemplateEditorComponent
  - Méthodes: ngOnInit, addOutput, removeOutput, dropOutput, onArgsChange, patchTemplate, makeIdFromName, cancel, save
- node-template-list.component.ts
  - Component: selector='node-template-list', standalone=True
  - Classes: NodeTemplateListComponent
  - Méthodes: doSearch, ngOnInit, load, edit, view, createNew, appFor, simpleIconUrl, viewApp
- node-template-viewer.component.ts
  - Component: selector='node-template-viewer', standalone=True
  - Classes: NodeTemplateViewerComponent
  - Méthodes: ngOnInit, simpleIconUrl, back, openApp, computePreviewPorts

## ./src/app/features/flow/advanced-editor
- README.md
- flow-advanced-center-panel.component.ts
  - Component: selector='flow-advanced-center-panel', standalone=True
  - Classes: FlowAdvancedCenterPanelComponent
  - Méthodes: ngOnChanges, onValue, onValid, undoForm, redoForm, applyForm, setTimeout, commitNow, onValueCommitted, onSubmitted, onPointerUp, onToggleCatchError
- flow-advanced-editor-dialog.component.ts
  - Component: selector='flow-advanced-editor-dialog', standalone=True
  - Classes: FlowAdvancedEditorDialogComponent
  - Méthodes: onBackdrop, emitModel, ngOnInit, ngAfterViewInit, setTimeout, startExit, hasInput, hasOutput, onFormSubmitted, onCommittedFromCenter, onFormReleased, updateIsMobile, updateSlidesTransform, prev, next, go, onEdgeStart, onSwipeStart, onSwipeMove, onSwipeEnd, commitIfDirty
- flow-advanced-input-panel.component.ts
  - Component: selector='flow-advanced-input-panel', standalone=True
  - Classes: FlowAdvancedInputPanelComponent
- flow-advanced-output-panel.component.ts
  - Component: selector='flow-advanced-output-panel', standalone=True
  - Classes: FlowAdvancedOutputPanelComponent

## ./src/app/features/flow/inspector
- README.md
- flow-inspector-panel.component.ts
  - Component: selector='flow-inspector-panel', standalone=True
  - Classes: FlowInspectorPanelComponent

## ./src/app/features/flow/history
- README.md
- flow-history-timeline.component.ts
  - Component: selector='flow-history-timeline', standalone=True
  - Classes: FlowHistoryTimelineComponent
  - Méthodes: emitPast, emitFuture, onContainerClick

## ./src/app/features/flow/palette
- README.md
- flow-palette-panel.component.ts
  - Component: selector='flow-palette-panel', standalone=True
  - Classes: FlowPalettePanelComponent

## ./src/app/dev
- README.md
- dnd-overlay-playground.component.ts
  - Component: selector='dev-dnd-overlay-playground', standalone=True
  - Classes: DevDndOverlayPlaygroundComponent
  - Méthodes: onPalettePointerDown, onDragStarted, onDragEnded, openDrawer, closeDrawer, ensure, miniIconClass, simpleIconUrl, dropped, moveItemInArray, transferArrayItem, dropIntoDrawer, addNodeFromItem, onConnect, inputId, outputIds
- json-viewer-playground.component.ts
  - Component: selector='app-json-viewer-playground', standalone=True
  - Classes: JsonViewerPlaygroundComponent
  - Méthodes: onOver, onDrop, openDialog, closeDialog, prevCv, nextCv

## ./src/app/modules
- README.md

## ./src/app/modules/expression-editor
- README.md
- expression-editor.html
- expression-editor.scss
- expression-editor.ts
  - Component: selector='app-expression-editor', standalone=True
  - Classes: ExpressionEditorComponent
  - Méthodes: ngOnInit, ngOnChanges, ngOnDestroy, writeValue, registerOnChange, registerOnTouched, setDisabledState, ngAfterViewInit, setTimeout, initEditorDom, mount, update, build, history, onUpdate, updateSuggestions, openAtCaret, requestAnimationFrame, closeMenu, moveSel, flatItems, clickItem, acceptSelected, setOptions, scrollSelectedIntoView, acceptItem, computePlacement, updateInfoPanel, normalizeAroundClose, normalizeIslandAt, computeAnchor, ensureCaretVisible, updateDragCaret, hideDragCaret, insertTagAt, updatePreview, onFormulaClick, keyCapture

## ./src/app/modules/json-schema-viewer
- README.md
- json-schema-viewer.html
- json-schema-viewer.scss
- json-schema-viewer.ts
  - Component: selector='app-json-node', standalone=True
  - Component: selector='app-json-schema-viewer', standalone=True
  - Classes: JsonNodeComponent, JsonSchemaViewerComponent
  - Méthodes: ngOnInit, ngOnChanges, toggle, toggleIfExpandable, drag, onDragStart, mkGhost, setTimeout, updateJsonHtml, isPlainObject, objectEntries, toggleEdit, saveEdit, cancelEdit, formatEditor, minifyEditor, writeValue, updateJsonHtmlAsync, registerOnChange, registerOnTouched

## ./src/app/modules/hp-drawer
- README.md
- hp-drawer-content.directive.ts
  - Classes: HpDrawerContentDirective
- hp-drawer.component.ts
  - Component: selector='hp-drawer', standalone=True
  - Classes: HpDrawerComponent
  - Méthodes: ngOnChanges, queueMicrotask, ngOnDestroy, ngAfterViewInit, applyDimensions, applyTransform, onMaskClick, onMaskPointer, triggerClose, resolveContainer, applyPortal, unportal, addGlobalCaptureHandlers, removeGlobalCaptureHandlers, onWrapClick, onKeydown

## ./src/app/modules/dynamic-form
- README.md
- documentation.md
- dynamic-form.html
- dynamic-form.scss
- dynamic-form.service.ts
  - Injectable: true
  - Classes: DynamicFormService
  - Méthodes: buildForm, collectFields, visit, initialValueForField, neutralize, isStepVisible, isSectionVisible, isFieldVisible, getFieldSpans, applyRules, visibleInputFields, flattenAllInputFields, displayValue, buildSummaryModel, evalRule, mapValidators
  - Types/Interfaces/Enums exportés: ButtonUI, FieldConfig, FieldConfigCommon, FieldType, FieldTypeInput, FieldValidator, FormSchema, FormUI, InputFieldConfig, SectionConfig, SectionFieldConfig, StepConfig, SummaryConfig, TextBlockFieldConfig
- dynamic-form.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- dynamic-form.ts
  - Component: selector='app-dynamic-form', standalone=True
  - Classes: DynamicForm
  - Méthodes: openStepMenu, openSectionMenu, addSectionFromMenu, addFieldAtStepFromMenu, deleteStepFromMenu, addFieldAtStepTyped, addFieldInSectionFromMenu, addFieldInSectionTyped, deleteSectionFromMenu, ngOnInit, setTimeout, ngOnChanges, attachFormStreams, emitNow, onFormFocusOut, commitIfNeeded, onMoveInStepRoot, onMoveInSection, onMoveInFlat, onDeleteInStepRoot, onDeleteInSection, onDeleteInFlat, onSelectInStepRoot, onSelectInSection, onSelectInFlat, onSelectSection, onSelectStep, sanitizedValue, mergeStyle, stepPrevTextAt, stepNextTextAt, stepBtnStyle, submitBtnStyle, cancelBtnStyle, resetBtnStyle, singleFieldSection, fieldSpanFor, fieldPercentFor, stepItems, rootItems, sectionAt, visibleInputFieldsOfStep, visitFields, isCurrentStepValid, isNextDisabled, isSubmitDisabled, markCurrentStepAsTouched, scrollToFirstInvalid, isVisibleItem, onlyOneVisibleInStep, onlyOneVisibleAtRoot, go, onStepHeaderIndexChange, onStepperClick, next, prev, stepValid, submit, reset, onFieldContainerClickStep, onFieldContainerClickRoot, onSectionContainerClick, isInteractiveClick, onInnerClick, trackByIndex

## ./src/app/modules/dynamic-form/components
- README.md

## ./src/app/modules/dynamic-form/components/sections
- README.md
- sections.html
- sections.scss
- sections.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- sections.ts
  - Component: selector='df-section', standalone=True
  - Classes: Sections
  - Méthodes: isSelected, fieldSpanFor, fieldPercentFor, onClickField, onInnerFieldClick, onClickSection, isInteractiveClick, ensureArray, ngOnChanges, canRemoveAt, canAddMore, addArrayItem, visit, addArrayItemWithValue, buildItemGroupFrom, removeArrayItem, moveArrayItem, duplicateArrayItem, canMoveUp, canMoveDown, applyRulesToItem, evalLocal

## ./src/app/modules/dynamic-form/components/fields
- README.md
- fields.html
- fields.scss
- fields.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- fields.ts
  - Component: selector='df-field', standalone=True
  - Classes: Fields
  - Méthodes: ngOnInit, ngOnDestroy

## ./src/app/pages
- README.md

## ./src/app/pages/home
- README.md
- home.html
- home.scss
- home.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- home.ts
  - Component: selector='app-home', standalone=False
  - Classes: Home
  - Méthodes: selectItem, drop, moveItemInArray

## ./src/app/pages/graphviz
- README.md
- graphviz.html
- graphviz.scss
- graphviz.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- graphviz.ts
  - Component: selector='app-graphviz', standalone=False
  - Classes: Graphviz
  - Méthodes: createEdge

## ./src/app/pages/flow
- README.md
- flow.html
- flow.scss
- flow.spec.ts
  - Méthodes: describe, beforeEach, it, expect
- flow.ts
  - Component: selector='app-flow', standalone=False
  - Classes: Flow
  - Méthodes: ngAfterViewInit, setTimeout, centerView, onExternalDrop, onDragEnter, onDragLeave, onDragOver, selectItem, createEdge

## ./src/app/services
- README.md
- catalog.service.ts
  - Injectable: true
  - Classes: CatalogService
  - Méthodes: listFlows, getFlow, saveFlow, listForms, getForm, saveForm, listNodeTemplates, getNodeTemplate, saveNodeTemplate, listApps, getApp, saveApp, deleteApp, resetAll, exportData, importData, ensureSeed, save
  - Types/Interfaces/Enums exportés: AppProvider, FlowDoc, FlowSummary, FormDoc, FormSummary, NodeTemplate

