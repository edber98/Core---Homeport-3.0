# Dynamic Forms — Types, Variables, Rules, Algorithms, Payloads

Date: 2025-08-18

Ce document complète le blueprint backend en détaillant le Form Builder/Dynamic Form: tous les types et propriétés supportés, la grammaire des règles (visibleIf/requiredIf/disabledIf), la sémantique des valeurs, les algorithmes de rendu/résumé/validation et les DTO côté serveur.


## 1) Modèle de Schéma (Frontend Source of Truth)

Emprunté de `src/app/modules/dynamic-form/dynamic-form.service.ts`.

- Types de champs
  - `FieldTypeInput = 'text'|'textarea'|'number'|'select'|'radio'|'checkbox'|'date'`
  - `FieldType = FieldTypeInput | 'textblock' | 'section' | 'section_array'`

- Validateurs
  - `FieldValidator = { type: 'required'|'min'|'max'|'minLength'|'maxLength'|'pattern'; value?: any; message?: string }`

- Base commune (tous champs)
  - `type: FieldType`
  - `label?: string`
  - `placeholder?: string`
  - `description?: string`
  - `options?: { label: string; value: any }[]` (select/radio)
  - `default?: any`
  - `validators?: FieldValidator[]`
  - Règles: `visibleIf?: JSON`, `requiredIf?: JSON`, `disabledIf?: JSON`
  - Grille responsive: `col?: Partial<Record<'xs'|'sm'|'md'|'lg'|'xl', number>>`
  - `itemStyle?: Record<string, any>` (style du conteneur du champ)
  - `textHtml?: string` (pour `textblock`)
  - Expression toggle (UI): `expression?: { allow?: boolean; showPreviewErrors?: boolean }`

- Champs d’entrée (avec clé)
  - `InputFieldConfig extends FieldConfigCommon & { type: FieldTypeInput; key: string }`

- Bloc texte (sans clé)
  - `TextBlockFieldConfig extends FieldConfigCommon & { type: 'textblock'; key?: undefined }`

- Section (groupe de champs)
  - `SectionFieldConfig extends FieldConfigCommon & { type: 'section'|'section_array'; key?: string; mode?: 'normal'|'array'; array?: { initialItems?: number; minItems?: number; maxItems?: number; controls?: { add?: { kind?: 'icon'|'text'; text?: string }; remove?: { kind?: 'icon'|'text'; text?: string }}}; title?: string; description?: string; titleStyle?: Record<string, any>; descriptionStyle?: Record<string, any>; grid?: { gutter?: number }; ui?: Partial<FormUI>; visibleIf?: JSON; fields: FieldConfig[] }`
  - Notes:
    - En mode `array` (ou `type: 'section_array'`), `key` est requis: la valeur est un tableau d’objets; chaque item réplique les champs internes.
    - Les sous-sections dans un `array` sont ignorées pour le résumé imprimé (cf. service).

- Union de champs
  - `FieldConfig = InputFieldConfig | TextBlockFieldConfig | SectionFieldConfig`

- Étapes et formulaire
  - `StepConfig = { key?: string; title: string; visibleIf?: JSON; fields?: FieldConfig[]; prevText?: string; nextText?: string; prevBtn?: ButtonUI; nextBtn?: ButtonUI }`
  - `ButtonUI = { text?: string; style?: Record<string, any>; enabled?: boolean; ariaLabel?: string }`
  - `FormUI = { layout?: 'horizontal'|'vertical'|'inline'; labelAlign?: 'left'|'right'; labelsOnTop?: boolean; labelCol?: { span?: number; offset?: number }; controlCol?: { span?: number; offset?: number }; widthPx?: number; containerStyle?: Record<string, any>; actions?: { showReset?: boolean; showCancel?: boolean; submitText?: string; cancelText?: string; resetText?: string; actionsStyle?: Record<string, any>; buttonStyle?: Record<string, any>; submitBtn?: ButtonUI; cancelBtn?: ButtonUI; resetBtn?: ButtonUI } }`
  - `SummaryConfig = { enabled: boolean; title?: string; includeHidden?: boolean; dateFormat?: string }`
  - `FormSchema = { title?: string; ui?: FormUI; steps?: StepConfig[]; fields?: FieldConfig[]; summary?: SummaryConfig }`


## 2) Règles (visibleIf / requiredIf / disabledIf)

Grammaire évaluée par `evalRule` côté UI; à reproduire côté serveur pour la validation, l’affichage conditionnel et la cohérence.

- Opérateurs supportés
  - `{"var": "fieldKey"}` → valeur d’un contrôle via `FormGroup.get(path)`; la clé est généralement le `key` du champ (dot‑notation possible pour futurs groupes).
  - Logiques: `{"not": X}`, `{"all": [X1,X2,...]}`, `{"any": [X1,X2,...]}` (tous truthy / au moins un truthy)
  - Comparaisons: `{"==": [A,B]}`, `{"!=": [A,B]}`, `{"<": [A,B]}`, `{"<=": [A,B]}`, `{">": [A,B]}`, `{">=": [A,B]}`

- Sémantique backend à respecter
  - `visibleIf` truthy → afficher; falsy → masquer.
  - `disabledIf` truthy → champ désactivé.
  - Priorité du requis: si `requiredIf` est défini, il décide de l’ajout du validateur `required` (et on ignore tout `required` statique dans `validators`).
  - Un champ masqué ou désactivé ne doit jamais être requis.


## 3) Sémantique des Valeurs et Normalisation

- Valeurs neutres si `undefined` (côté UI via `neutralize(type, v)`), à reproduire côté backend pour `POST /submissions` par exemple:
  - `checkbox` → `false`
  - `number|select|radio|date` → `null`
  - `text|textarea` → `""`

- Affichage (résumé): mapping labels d’options, booléen Oui/Non, formattage de date avec `summary.dateFormat` (ex: `yyyy-MM-dd`).


## 4) Validation Serveur (recommandée)

Lors d’une soumission (ex: `POST /forms/:id/submit`), appliquer:

1) Normalisation des valeurs (règle ci‑dessus) avant validation.
2) Calcul des règles: visibilités + disabled + requiredIf.
3) Construction des validators pour chaque champ visible et activé:
   - `required` (si `requiredIf` true)
   - `min`, `max`, `minLength`, `maxLength`, `pattern` (mêmes sémantiques qu’Angular)
4) Retour d’erreurs structurées: `{ field: string; code: 'required'|'min'|...; message?: string }[]`

Remarque: en mode `section_array`, valider chaque item indépendamment (indexé), ex: `items[0].a`.


## 5) Algorithmes (rendu, aplanissement, résumé)

Cette section décrit les fonctions clés implémentées côté UI et à refléter côté serveur lorsque pertinent.

1) Collecte des champs (aplanissement sans sections)
```
function collectFields(schema): FieldConfig[] {
  const out = []
  function visit(fields) {
    for (const f of fields || []) {
      if (f.type === 'section' || f.type === 'section_array') {
        // En mode array, les champs internes sont instanciés par item → ne pas aplatir
        if (f.mode === 'array' || f.type === 'section_array') continue
        visit(f.fields)
      } else {
        out.push(f)
      }
    }
  }
  if (schema.steps?.length) schema.steps.forEach(st => visit(st.fields))
  else if (schema.fields?.length) visit(schema.fields)
  return out
}
```

2) Spans responsives (cols)
```
function fieldSpans(field) {
  const col = field.col || { xs: 24 }
  return {
    xs: col.xs ?? 24,
    sm: col.sm ?? col.xs ?? 24,
    md: col.md ?? col.sm ?? col.xs ?? 24,
    lg: col.lg ?? col.md ?? col.sm ?? col.xs ?? 24,
    xl: col.xl ?? col.lg ?? col.md ?? col.sm ?? col.xs ?? 24,
  }
}
```

3) Résumé structuré (groupé par step/section)
```
function buildSummary(schema, formValue, includeHidden=false) {
  const byStep = []
  function consider(f) { return includeHidden || isFieldVisible(f, formValue) }
  function sectionsFrom(fields, parentTitle, onlySections=false) {
    const blocks = []
    const rootRows = []
    for (const f of fields || []) {
      if (f.type === 'section' || f.type === 'section_array') {
        const sec = f
        if (!includeHidden && !isSectionVisible(sec, formValue)) continue
        // Mode array: un bloc par item
        if ((sec.mode === 'array' || sec.type === 'section_array') && sec.key) {
          const items = Array.isArray(formValue[sec.key]) ? formValue[sec.key] : []
          items.forEach((it, idx) => {
            const rows = (sec.fields||[])
              .filter(ff => ff.type !== 'textblock' && ff.type !== 'section' && ff.type !== 'section_array')
              .map(ff => ({ key: ff.key, label: ff.label || ff.key || '', value: displayValue(ff, it ? it[ff.key] : undefined, schema) }))
            if (rows.length) blocks.push({ title: `${sec.title || parentTitle || 'Item'} #${idx+1}`, rows })
          })
          continue
        }
        const directRows = (sec.fields||[])
          .filter(ff => ff.type !== 'textblock' && ff.type !== 'section' && ff.type !== 'section_array')
          .filter(consider)
          .map(ff => ({ key: ff.key, label: ff.label || ff.key || '', value: displayValue(ff, formValue[ff.key], schema) }))
        if (directRows.length) blocks.push({ title: sec.title, rows: directRows })
        blocks.push(...sectionsFrom(sec.fields, sec.title || parentTitle, true))
      } else if (f.type !== 'textblock') {
        if (!onlySections && consider(f)) rootRows.push({ key: f.key, label: f.label || f.key || '', value: displayValue(f, formValue[f.key], schema) })
      }
    }
    if (!onlySections && rootRows.length) blocks.unshift({ title: parentTitle, rows: rootRows })
    return blocks
  }
  if (schema.steps?.length) {
    schema.steps.forEach((step, si) => {
      if (!includeHidden && !isStepVisible(step, formValue)) return
      const block = { title: step.title || `Étape ${si+1}`, sections: [] }
      block.sections.push(...sectionsFrom(step.fields))
      if (block.sections.length) byStep.push(block)
    })
  } else if (schema.fields?.length) {
    const block = { title: schema.title || 'Résumé', sections: [] }
    block.sections.push(...sectionsFrom(schema.fields))
    if (block.sections.length) byStep.push(block)
  }
  return byStep
}
```

4) Évaluation des règles (sécurité et compat)
```
function evalRule(rule, form) {
  if (rule == null) return undefined
  if (typeof rule !== 'object') return rule
  const [op] = Object.keys(rule)
  const args = rule[op]
  const getByVar = (src, path) => {
    if (!path) return undefined
    // Support Angular FormGroup or plain object
    if (src && typeof src.get === 'function') return src.get(path)?.value
    return path.split('.').reduce((acc, k) => acc == null ? undefined : acc[k], src)
  }
  const val = x => (x && typeof x === 'object' && 'var' in x) ? getByVar(form, x.var) : (typeof x === 'object' ? evalRule(x, form) : x)
  switch (op) {
    case 'var': return getByVar(form, args)
    case 'not': return !val(args)
    case 'all': return (args||[]).every(a => !!val(a))
    case 'any': return (args||[]).some(a => !!val(a))
    case '==': return val(args[0]) === val(args[1])
    case '!=': return val(args[0]) !== val(args[1])
    case '>': return val(args[0]) > val(args[1])
    case '>=': return val(args[0]) >= val(args[1])
    case '<': return val(args[0]) < val(args[1])
    case '<=': return val(args[0]) <= val(args[1])
    default: return true
  }
}
```


## 6) DTO Backend Proposés

- Définition (draft) / Version (publish)
```ts
type UUID = string;

export interface FormDefinition {
  id: UUID; orgId: UUID; projectId: UUID; name: string; description?: string;
  schema: FormSchema; // identique côté UI
  status: 'draft'|'archived'; createdAt: string; updatedAt: string;
}

export interface FormVersion {
  id: UUID; formId: UUID; version: number; schema: FormSchema; publishedAt: string;
}
```

- Soumission
```ts
export interface FormSubmissionRequest {
  versionId: UUID;              // version publiée ciblée
  data: Record<string, any>;    // valeurs client; normalisées par le serveur
  context?: Record<string, any>; // variables serveur si nécessaires aux règles
}

export interface FormSubmissionResult {
  ok: boolean;
  errors?: Array<{ field: string; code: string; message?: string; index?: number }>;
}
```


## 7) Exemples de Schémas

- Formulaire simple (flat)
```json
{
  "title": "Contact",
  "ui": { "layout": "vertical", "labelsOnTop": true },
  "fields": [
    { "type": "text", "key": "name", "label": "Nom", "default": "", "validators": [{"type":"minLength","value":2}] },
    { "type": "text", "key": "email", "label": "Email", "validators": [{"type":"pattern","value":"^.+@.+\\..+$"}] },
    { "type": "checkbox", "key": "newsletter", "label": "S'abonner", "default": false },
    { "type": "textarea", "key": "message", "label": "Message", "visibleIf": {"any":[{"var":"newsletter"},{"==":[{"var":"name"},"Admin"]}] } }
  ],
  "summary": { "enabled": true, "dateFormat": "yyyy-MM-dd" }
}
```

- Sections et array
```json
{
  "title": "Commande",
  "fields": [
    {
      "type": "section",
      "title": "Client",
      "fields": [
        { "type": "text", "key": "firstName", "label": "Prénom" },
        { "type": "text", "key": "lastName", "label": "Nom" },
        { "type": "date", "key": "dob", "label": "Naissance" }
      ],
      "grid": { "gutter": 16 },
      "ui": { "layout": "horizontal", "labelCol": {"span": 8}, "controlCol": {"span": 16} }
    },
    {
      "type": "section",
      "title": "Articles",
      "mode": "array",
      "key": "items",
      "array": { "initialItems": 1, "minItems": 0, "controls": { "add": {"kind":"text", "text":"Ajouter"}, "remove": {"kind":"icon"} } },
      "fields": [
        { "type": "text", "key": "sku", "label": "SKU" },
        { "type": "number", "key": "qty", "label": "Qté", "default": 1, "validators": [{"type":"min","value":1}] },
        { "type": "number", "key": "price", "label": "Prix" }
      ]
    }
  ]
}
```


## 8) UI & Accessibilité

- `FormUI.actions` permet de masquer/renommer les boutons (submit/cancel/reset) et de styliser la barre d’actions.
- `labelsOnTop` + `layout` gèrent l’alignement label/contrôle; fallback sur `labelCol`/`controlCol`.
- `ariaLabel` sur `ButtonUI`; côté backend, conserver ces propriétés pour ré-affichage fidèle.


## 9) Compatibilité et Évolution

- L’UI expose `expression.allow` pour basculer un champ en mode "expression" (éditeur d’expressions). C’est un hint UI; l’évaluation des expressions n’est pas couverte par ce module (cf. Expression Sandbox). Le backend peut accepter des valeurs de la forme `{ "$expr": "..." }` si une évaluation serveur est souhaitée.
- Les sections imbriquées sont supportées en mode normal; en `array`, éviter la profondeur > 1 pour rester compatible avec le résumé actuel.
- `section_array` est un alias historique de `section`+`mode: 'array'`.


## 10) Références

- src/app/modules/dynamic-form/dynamic-form.service.ts — implémentation et types UI
- src/app/features/dynamic-form/services/* — builder (factory/tree/issues)
- docs/backend/homeport-backend-blueprint.md — vue d’ensemble backend
