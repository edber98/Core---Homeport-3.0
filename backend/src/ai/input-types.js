// Catalog of supported Dynamic Form input/section types and their configurable options.
// This is used by the AI agent's tools to understand what keys are allowed per type.

const INPUT_TYPES = [
  {
    type: 'text',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression','secret'
    ],
    validators: ['required','minLength','maxLength','pattern']
  },
  {
    type: 'textarea',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required','minLength','maxLength','pattern']
  },
  {
    type: 'number',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required','min','max']
  },
  {
    type: 'select',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','options','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required']
  },
  {
    type: 'radio',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','options','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required']
  },
  {
    type: 'checkbox',
    category: 'input',
    options: [
      'key','label','description','default','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required']
  },
  {
    type: 'date',
    category: 'input',
    options: [
      'key','label','placeholder','description','default','validators','visibleIf','requiredIf','disabledIf','col','itemStyle','expression'
    ],
    validators: ['required']
  },
  {
    type: 'textblock',
    category: 'display',
    options: [
      'textHtml','description','itemStyle','visibleIf','col'
    ],
    validators: []
  },
  {
    type: 'section',
    category: 'container',
    options: [
      'title','description','titleStyle','descriptionStyle','grid','ui','visibleIf','fields','col','itemStyle'
    ],
    validators: []
  },
  {
    type: 'section_array',
    category: 'container',
    options: [
      'key','mode','array','title','description','titleStyle','descriptionStyle','grid','ui','visibleIf','fields','col','itemStyle'
    ],
    notes: 'mode should be "array" when using section_array',
    validators: []
  }
];

const SCHEMA_OPTIONS = {
  form: {
    options: ['title','ui','fields','steps','summary'],
    uiOptions: ['layout','labelAlign','labelsOnTop','labelCol','controlCol','widthPx','containerStyle','actions']
  },
  step: {
    options: ['key','title','visibleIf','fields','prevText','nextText','prevBtn','nextBtn']
  },
  expression: {
    options: ['allow','showPreviewErrors','defaultMode','large','showDialogAction','dialogTitle','dialogMode','autoHeight','groupBefore','showFormulaAction','suggestionPlacement','errorMode','showPreview','inline']
  },
  array: {
    options: ['initialItems','minItems','maxItems','controls']
  }
};

function getCatalog(){
  return {
    types: INPUT_TYPES,
    schema: SCHEMA_OPTIONS
  };
}

module.exports = { getCatalog };

