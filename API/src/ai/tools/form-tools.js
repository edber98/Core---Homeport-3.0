// Form tools — mode-specific tools for building and editing forms
// Used when agent mode === 'form'

const { Types } = require('mongoose');
const Form = require('../../db/models/form.model');

const FORM_TOOL_DEFINITIONS = [
  {
    name: 'get_form_schema',
    description: 'Récupère le schéma actuel du formulaire (champs, sections, étapes). TOUJOURS appeler en premier pour voir l\'état du formulaire.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'set_form_schema',
    description: 'Remplace le schéma complet du formulaire. Utilise quand tu construis un formulaire de zéro ou pour un remplacement complet.',
    parameters: {
      type: 'object',
      properties: {
        schema: { type: 'object', description: 'Schéma complet du formulaire { fields: [...] }' },
      },
      required: ['schema'],
    },
  },
  {
    name: 'add_field',
    description: 'Ajoute un champ au formulaire. Le champ est ajouté à la fin (ou dans une section si sectionKey est fourni).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Identifiant unique (snake_case)' },
        type: { type: 'string', description: 'Type de champ (text, textarea, number, email, url, tel, select, radio, checkbox, boolean, date, color, file, tags, text_array, code, expression, json, html, section, section_array)' },
        label: { type: 'string', description: 'Libellé affiché' },
        description: { type: 'string', description: 'Description / texte d\'aide' },
        required: { type: 'boolean', description: 'Champ obligatoire ?' },
        defaultValue: { description: 'Valeur par défaut' },
        placeholder: { type: 'string', description: 'Texte placeholder' },
        col: { type: 'object', description: 'Largeur responsive (ex: { xs: 24, md: 12 })' },
        options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } }, description: 'Options pour select/radio' },
        visibleIf: { type: 'object', description: 'Condition de visibilité (ex: { field: "type", value: "urgent" })' },
        sectionKey: { type: 'string', description: 'Clé de la section dans laquelle ajouter le champ (optionnel)' },
      },
      required: ['key', 'type', 'label'],
    },
  },
  {
    name: 'update_field',
    description: 'Modifie un champ existant. Seuls les champs fournis sont mis à jour.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé du champ à modifier' },
        label: { type: 'string', description: 'Nouveau libellé' },
        description: { type: 'string', description: 'Nouvelle description' },
        type: { type: 'string', description: 'Nouveau type' },
        required: { type: 'boolean', description: 'Obligatoire ?' },
        defaultValue: { description: 'Nouvelle valeur par défaut' },
        placeholder: { type: 'string' },
        col: { type: 'object' },
        options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } } },
        visibleIf: { type: 'object' },
      },
      required: ['key'],
    },
  },
  {
    name: 'remove_field',
    description: 'Supprime un champ du formulaire par sa clé.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé du champ à supprimer' },
      },
      required: ['key'],
    },
  },
  {
    name: 'add_section',
    description: 'Ajoute une section (groupe de champs) au formulaire.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Identifiant de la section' },
        label: { type: 'string', description: 'Libellé de la section' },
        type: { type: 'string', enum: ['section', 'section_array'], description: 'section (groupe simple) ou section_array (tableau dynamique)' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' }, type: { type: 'string' }, label: { type: 'string' },
              required: { type: 'boolean' }, description: { type: 'string' },
              options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } } } },
            },
            required: ['key', 'type', 'label'],
          },
          description: 'Champs dans la section',
        },
      },
      required: ['key', 'label'],
    },
  },
  {
    name: 'reorder_fields',
    description: 'Réordonne les champs du formulaire selon un ordre donné.',
    parameters: {
      type: 'object',
      properties: {
        order: { type: 'array', items: { type: 'string' }, description: 'Liste ordonnée des clés de champs' },
      },
      required: ['order'],
    },
  },
  {
    name: 'get_field_types',
    description: 'Liste tous les types de champs disponibles avec leur description.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_form',
    description: 'Crée un nouveau formulaire vide.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du formulaire' },
        description: { type: 'string', description: 'Description' },
      },
      required: ['name'],
    },
  },
  {
    name: 'save_form',
    description: 'Sauvegarde les modifications du formulaire en base de données.',
    parameters: { type: 'object', properties: {} },
  },
];

/**
 * Create a form tools executor.
 * @param {object} metadata - { formId, workspaceId, schema (optional seed) }
 * @param {function} emit - Callback for side events
 */
function createFormExecutor(metadata, emit) {
  let schema = null;
  let formDoc = null;
  let changed = false;

  async function ensureSchema() {
    if (schema) return schema;

    if (metadata.schema && typeof metadata.schema === 'object') {
      schema = metadata.schema;
      return schema;
    }

    if (metadata.formId) {
      const fid = String(metadata.formId);
      formDoc = Types.ObjectId.isValid(fid) ? await Form.findById(fid) : await Form.findOne({ id: fid });
      if (formDoc?.schema) { schema = formDoc.schema; return schema; }
    }

    schema = { fields: [] };
    return schema;
  }

  function findField(fields, key) {
    for (const f of (fields || [])) {
      if (f.key === key) return f;
      if (f.type === 'section' || f.type === 'section_array') {
        const sub = findField(f.fields, key);
        if (sub) return sub;
      }
    }
    return null;
  }

  function removeFieldFromArray(fields, key) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].key === key) { fields.splice(i, 1); return true; }
      if (fields[i].type === 'section' || fields[i].type === 'section_array') {
        if (removeFieldFromArray(fields[i].fields || [], key)) return true;
      }
    }
    return false;
  }

  function emitUpdate() {
    changed = true;
    emit({ type: 'form.update', formId: metadata.formId, schema });
  }

  const FIELD_TYPES = [
    { type: 'text', description: 'Texte court (une ligne)' },
    { type: 'textarea', description: 'Texte long (plusieurs lignes)' },
    { type: 'number', description: 'Nombre (entier ou décimal)' },
    { type: 'email', description: 'Adresse email' },
    { type: 'url', description: 'URL / lien web' },
    { type: 'tel', description: 'Numéro de téléphone' },
    { type: 'password', description: 'Mot de passe (masqué)' },
    { type: 'select', description: 'Liste déroulante (un seul choix)' },
    { type: 'radio', description: 'Boutons radio (un seul choix)' },
    { type: 'checkbox', description: 'Case à cocher (oui/non)' },
    { type: 'boolean', description: 'Interrupteur vrai/faux' },
    { type: 'date', description: 'Sélecteur de date' },
    { type: 'color', description: 'Sélecteur de couleur' },
    { type: 'file', description: 'Upload de fichier' },
    { type: 'tags', description: 'Liste de tags (étiquettes)' },
    { type: 'text_array', description: 'Liste de textes' },
    { type: 'code', description: 'Éditeur de code' },
    { type: 'expression', description: 'Expression / formule' },
    { type: 'cron', description: 'Expression cron (planification)' },
    { type: 'json', description: 'Éditeur JSON' },
    { type: 'schema_builder', description: 'Constructeur de schéma' },
    { type: 'html', description: 'Éditeur HTML' },
    { type: 'hidden', description: 'Champ caché' },
    { type: 'section', description: 'Section (groupe de champs)' },
    { type: 'section_array', description: 'Section dynamique (tableau, l\'utilisateur ajoute/supprime des lignes)' },
  ];

  const tools = {
    async get_form_schema() {
      const s = await ensureSchema();
      return { success: true, schema: s, fieldCount: (s?.fields || []).length };
    },

    async set_form_schema(input) {
      const s = input?.schema;
      if (!s) return { success: false, error: 'Schéma manquant' };
      schema = s;
      emitUpdate();
      return { success: true, fieldCount: (s?.fields || []).length };
    },

    async add_field(input) {
      await ensureSchema();
      const fields = schema.fields || [];

      // Check for duplicate key
      if (findField(fields, input.key)) {
        return { success: false, error: `Un champ avec la clé '${input.key}' existe déjà` };
      }

      const field = {
        key: input.key,
        type: input.type || 'text',
        label: input.label,
        ...(input.description ? { description: input.description } : {}),
        ...(input.defaultValue !== undefined ? { defaultValue: input.defaultValue } : {}),
        ...(input.placeholder ? { placeholder: input.placeholder } : {}),
        ...(input.col ? { col: input.col } : { col: { xs: 24, sm: 24, md: input.type === 'textarea' ? 24 : 12 } }),
        ...(input.required ? { validators: [{ type: 'required' }] } : {}),
        ...(input.options ? { options: input.options } : {}),
        ...(input.visibleIf ? { visibleIf: input.visibleIf } : {}),
      };

      // Add to section if specified
      if (input.sectionKey) {
        const section = findField(fields, input.sectionKey);
        if (!section) return { success: false, error: `Section '${input.sectionKey}' introuvable` };
        if (!section.fields) section.fields = [];
        section.fields.push(field);
      } else {
        fields.push(field);
      }

      schema.fields = fields;
      emitUpdate();
      return { success: true, key: input.key };
    },

    async update_field(input) {
      await ensureSchema();
      const field = findField(schema.fields || [], input.key);
      if (!field) return { success: false, error: `Champ '${input.key}' introuvable` };

      if (input.label !== undefined) field.label = input.label;
      if (input.description !== undefined) field.description = input.description;
      if (input.type !== undefined) field.type = input.type;
      if (input.defaultValue !== undefined) field.defaultValue = input.defaultValue;
      if (input.placeholder !== undefined) field.placeholder = input.placeholder;
      if (input.col !== undefined) field.col = input.col;
      if (input.options !== undefined) field.options = input.options;
      if (input.visibleIf !== undefined) field.visibleIf = input.visibleIf;
      if (input.required !== undefined) {
        field.validators = input.required ? [{ type: 'required' }] : (field.validators || []).filter(v => v.type !== 'required');
      }

      emitUpdate();
      return { success: true, key: input.key };
    },

    async remove_field(input) {
      await ensureSchema();
      const removed = removeFieldFromArray(schema.fields || [], input.key);
      if (!removed) return { success: false, error: `Champ '${input.key}' introuvable` };
      emitUpdate();
      return { success: true };
    },

    async add_section(input) {
      await ensureSchema();
      const fields = schema.fields || [];

      if (findField(fields, input.key)) {
        return { success: false, error: `Un champ avec la clé '${input.key}' existe déjà` };
      }

      const sectionFields = (input.fields || []).map(f => ({
        key: f.key, type: f.type || 'text', label: f.label,
        ...(f.description ? { description: f.description } : {}),
        ...(f.required ? { validators: [{ type: 'required' }] } : {}),
        ...(f.options ? { options: f.options } : {}),
        col: { xs: 24, sm: 24, md: f.type === 'textarea' ? 24 : 12 },
      }));

      fields.push({
        key: input.key,
        type: input.type || 'section',
        label: input.label,
        fields: sectionFields,
      });

      schema.fields = fields;
      emitUpdate();
      return { success: true, key: input.key, fieldCount: sectionFields.length };
    },

    async reorder_fields(input) {
      await ensureSchema();
      const order = input?.order || [];
      if (!order.length) return { success: false, error: 'Ordre vide' };

      const fields = schema.fields || [];
      const byKey = new Map(fields.map(f => [f.key, f]));
      const ordered = [];
      for (const key of order) {
        const f = byKey.get(key);
        if (f) { ordered.push(f); byKey.delete(key); }
      }
      // Append remaining fields not in order
      for (const f of byKey.values()) ordered.push(f);

      schema.fields = ordered;
      emitUpdate();
      return { success: true };
    },

    async get_field_types() {
      return { success: true, types: FIELD_TYPES };
    },

    async create_form(input) {
      const form = await Form.create({
        name: input.name, description: input.description || '',
        workspaceId: metadata.workspaceId, schema: { fields: [] },
      });
      formDoc = form;
      metadata.formId = form._id;
      schema = { fields: [] };
      emit({ type: 'form.created', form: { id: form.id, _id: String(form._id), name: form.name } });
      return { success: true, formId: form.id };
    },

    async save_form() {
      await ensureSchema();
      if (!metadata.formId && !formDoc) return { success: false, error: 'Aucun formulaire. Utilise create_form d\'abord.' };
      let form = formDoc;
      if (!form && metadata.formId) {
        const fid = String(metadata.formId);
        form = Types.ObjectId.isValid(fid) ? await Form.findById(fid) : await Form.findOne({ id: fid });
      }
      if (!form) return { success: false, error: 'Formulaire introuvable' };
      form.schema = schema;
      await form.save();
      changed = false;
      return { success: true, formId: form.id };
    },
  };

  return {
    definitions: FORM_TOOL_DEFINITIONS,
    canHandle(name) { return name in tools; },
    async execute(name, input) {
      if (!(name in tools)) throw new Error(`Unknown form tool: ${name}`);
      return tools[name](input || {});
    },
    getSchema() { return schema; },
    hasChanges() { return changed; },
  };
}

module.exports = { FORM_TOOL_DEFINITIONS, createFormExecutor };
