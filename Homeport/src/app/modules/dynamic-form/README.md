README — src/app/modules/dynamic-form

Contenu du dossier:

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
