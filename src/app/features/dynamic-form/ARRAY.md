Array Sections (FormArray)

Overview
- Adds a repeatable “Array” mode to Section items to build a list of repeated sub-forms.
- Each item uses the section’s fields as a template and is stored in the form under `section.key` as a FormArray of FormGroup.

How to Use (Builder)
- Add a regular Section.
- Select the section, then in the properties panel set:
  - Mode: Array
  - Key: storage key for the array (e.g., items, addresses)
  - Items init/min/max: initial, minimum, and maximum row count
  - Buttons text: labels for Add and Remove

Runtime Behavior
- DynamicForm renders array sections as a vertical list of items with per-item Delete and a global Add button.
- Values are nested: `form.value[section.key]` is an array of objects `{ [field.key]: value }`.
- Field visibility/required/disabled rules inside an item can reference sibling fields by key.

Notes
- Fields under Array mode are not flattened into the top-level FormGroup (no top-level controls are created for them).
- Summary includes one block per array item with the item index in the title.
- Nested Sections inside an Array are not summarized; stick to inputs/textblocks in array items.

Schema (Section)
- `mode: 'array'` to activate.
- `key: string` required when in array mode.
- `array: { initialItems?, minItems?, maxItems?, controls?: { add?: { kind?: 'text'|'icon'; text?: string }, remove?: { kind?: 'text'|'icon'; text?: string } } }`

