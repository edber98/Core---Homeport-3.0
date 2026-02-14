// Form tools — mode-specific tools for building and editing forms
// Used when agent mode === 'form'

const { Types } = require('mongoose');
const Form = require('../../db/models/form.model');

const FORM_TOOL_DEFINITIONS = [
  {
    name: 'search_forms',
    description: 'Recherche des formulaires existants dans le workspace par nom ou description.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Texte de recherche (nom ou description)' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 10)' },
      },
    },
  },
  {
    name: 'load_form',
    description: 'Charge un formulaire existant pour le modifier. Utilise l\'ID obtenu via search_forms.',
    parameters: {
      type: 'object',
      properties: {
        formId: { type: 'string', description: 'ID du formulaire à charger' },
      },
      required: ['formId'],
    },
  },
  {
    name: 'get_form_schema',
    description: 'Récupère le schéma actuel du formulaire chargé (champs, sections, étapes). Appelle load_form d\'abord si tu modifies un formulaire existant.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'set_form_schema',
    description: 'Remplace le schéma complet du formulaire. Utilise quand tu construis un formulaire de zéro ou pour un remplacement complet. Le layout vertical + labelsOnTop est appliqué automatiquement.',
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
        visibleIf: { type: 'object', description: 'Condition de visibilité ({ field, operator, value } ou { logic: "all"|"any", conditions: [...] })' },
        requiredIf: { type: 'object', description: 'Obligatoire conditionnel ({ field, operator, value } ou { logic: "all"|"any", conditions: [...] })' },
        disabledIf: { type: 'object', description: 'Désactivé conditionnel ({ field, operator, value })' },
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
        requiredIf: { type: 'object' },
        disabledIf: { type: 'object' },
        labelStyle: { type: 'object', description: 'Style CSS du label (color, fontSize en px)' },
        itemStyle: { type: 'object', description: 'Style CSS du conteneur champ (color, fontSize, borderWidth, borderColor, borderRadius, boxShadow, marginTop, paddingTop, etc. en px)' },
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
    description: 'Ajoute une section vide au formulaire. IMPORTANT : après add_section, ajoute les champs UN PAR UN avec add_field(sectionKey=...).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Identifiant de la section' },
        label: { type: 'string', description: 'Titre de la section (OBLIGATOIRE et descriptif, ex: "Informations générales")' },
        description: { type: 'string', description: 'Description de la section (texte d\'aide)' },
        type: { type: 'string', enum: ['section', 'section_array'], description: 'section (groupe simple) ou section_array (tableau dynamique)' },
      },
      required: ['key', 'label'],
    },
  },
  {
    name: 'update_section',
    description: 'Modifie les propriétés d\'une section existante (titre, description, style).',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Clé de la section à modifier' },
        label: { type: 'string', description: 'Nouveau titre' },
        description: { type: 'string', description: 'Nouvelle description' },
        titleStyle: { type: 'object', description: 'Style CSS du titre (color, fontSize, marginTop, paddingBottom, etc.)' },
        descriptionStyle: { type: 'object', description: 'Style CSS de la description' },
        itemStyle: { type: 'object', description: 'Style CSS du conteneur section (borderWidth, borderColor, borderRadius, padding*, margin*, boxShadow)' },
        gridGutter: { type: 'number', description: 'Espacement entre champs en px (défaut: 16)' },
      },
      required: ['key'],
    },
  },
  {
    name: 'update_form_settings',
    description: 'Modifie les paramètres globaux du formulaire (titre affiché, description, disposition).',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre du formulaire' },
        description: { type: 'string', description: 'Description du formulaire' },
        displayTitle: { type: 'boolean', description: 'Afficher le titre (défaut: true)' },
        displayDescription: { type: 'boolean', description: 'Afficher la description (défaut: true)' },
        centerTitle: { type: 'boolean', description: 'Centrer le titre' },
        centerDescription: { type: 'boolean', description: 'Centrer la description' },
        layout: { type: 'string', enum: ['vertical', 'horizontal', 'inline'], description: 'Disposition (défaut: vertical)' },
        labelsOnTop: { type: 'boolean', description: 'Labels au-dessus des champs' },
      },
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

  /** Ensure schema has default UI layout (vertical + labelsOnTop) */
  function ensureDefaultUi(s) {
    if (!s) return s;
    if (!s.ui) s.ui = {};
    if (!s.ui.layout) s.ui.layout = 'vertical';
    if (s.ui.labelsOnTop === undefined) s.ui.labelsOnTop = true;
    // Default display settings: show title & description for standalone forms
    if (s.displayTitle === undefined) s.displayTitle = true;
    if (s.displayDescription === undefined) s.displayDescription = true;
    return s;
  }

  /**
   * Guard: require a form to be loaded or created before modifications.
   * Returns null if OK, or an error result if no form is loaded.
   */
  function requireFormLoaded() {
    if (formDoc || metadata.formId) return null;
    return {
      success: false,
      error: 'Aucun formulaire chargé. Tu DOIS d\'abord appeler create_form (nouveau formulaire) ou search_forms + load_form (formulaire existant) avant de modifier des champs.',
    };
  }

  const tools = {
    async search_forms(input) {
      const q = input?.query || '';
      const limit = input?.limit || 10;
      const filter = { workspaceId: metadata.workspaceId };
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { description: rx }];
      }
      const forms = await Form.find(filter, 'id name description status createdAt updatedAt')
        .sort({ updatedAt: -1 }).limit(limit).lean();
      return {
        success: true,
        forms: forms.map(f => ({
          id: f.id, name: f.name, description: f.description || '',
          status: f.status || 'draft',
          updatedAt: f.updatedAt,
        })),
      };
    },

    async load_form(input) {
      if (!input?.formId) return { success: false, error: 'formId requis' };
      const fid = String(input.formId);
      const form = Types.ObjectId.isValid(fid)
        ? await Form.findById(fid)
        : await Form.findOne({ id: fid, workspaceId: metadata.workspaceId });
      if (!form) return { success: false, error: `Formulaire '${fid}' introuvable` };
      formDoc = form;
      metadata.formId = form._id;
      schema = form.schema || { fields: [] };
      return {
        success: true, formId: form.id, name: form.name,
        description: form.description || '',
        fieldCount: (schema?.fields || []).length,
        fields: (schema?.fields || []).map(f => ({
          key: f.key, type: f.type, label: f.label,
          ...(f.type === 'section' || f.type === 'section_array'
            ? { subFields: (f.fields || []).map(sf => ({ key: sf.key, type: sf.type, label: sf.label })) }
            : {}),
        })),
      };
    },

    async get_form_schema() {
      const s = await ensureSchema();
      return { success: true, schema: s, fieldCount: (s?.fields || []).length };
    },

    async set_form_schema(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
      const s = input?.schema;
      if (!s) return { success: false, error: 'Schéma manquant' };
      schema = ensureDefaultUi(s);
      emitUpdate();
      return { success: true, fieldCount: (s?.fields || []).length };
    },

    async add_field(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
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
        ...(input.requiredIf ? { requiredIf: input.requiredIf } : {}),
        ...(input.disabledIf ? { disabledIf: input.disabledIf } : {}),
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
      const guard = requireFormLoaded();
      if (guard) return guard;
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
      if (input.requiredIf !== undefined) field.requiredIf = input.requiredIf;
      if (input.disabledIf !== undefined) field.disabledIf = input.disabledIf;
      if (input.labelStyle !== undefined) field.labelStyle = input.labelStyle;
      if (input.itemStyle !== undefined) field.itemStyle = input.itemStyle;
      if (input.required !== undefined) {
        field.validators = input.required ? [{ type: 'required' }] : (field.validators || []).filter(v => v.type !== 'required');
      }

      emitUpdate();
      return { success: true, key: input.key };
    },

    async remove_field(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
      await ensureSchema();
      const removed = removeFieldFromArray(schema.fields || [], input.key);
      if (!removed) return { success: false, error: `Champ '${input.key}' introuvable` };
      emitUpdate();
      return { success: true };
    },

    async add_section(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
      await ensureSchema();
      const fields = schema.fields || [];

      if (findField(fields, input.key)) {
        return { success: false, error: `Un champ avec la clé '${input.key}' existe déjà` };
      }

      const section = {
        key: input.key,
        type: input.type || 'section',
        label: input.label,
        ...(input.description ? { description: input.description } : {}),
        fields: [],
      };

      fields.push(section);
      schema.fields = fields;
      emitUpdate();
      return { success: true, key: input.key, message: 'Section créée. Ajoute maintenant les champs avec add_field(sectionKey="' + input.key + '").' };
    },

    async update_section(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
      await ensureSchema();
      const section = findField(schema.fields || [], input.key);
      if (!section) return { success: false, error: `Section '${input.key}' introuvable` };
      if (section.type !== 'section' && section.type !== 'section_array') {
        return { success: false, error: `'${input.key}' n'est pas une section` };
      }

      if (input.label !== undefined) section.label = input.label;
      if (input.description !== undefined) section.description = input.description;
      if (input.titleStyle !== undefined) section.titleStyle = input.titleStyle;
      if (input.descriptionStyle !== undefined) section.descriptionStyle = input.descriptionStyle;
      if (input.itemStyle !== undefined) section.itemStyle = input.itemStyle;
      if (input.gridGutter !== undefined) {
        section.ui = section.ui || {};
        section.ui.gridGutter = input.gridGutter;
      }

      emitUpdate();
      return { success: true, key: input.key };
    },

    async update_form_settings(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
      await ensureSchema();

      if (input.title !== undefined) schema.title = input.title;
      if (input.description !== undefined) schema.description = input.description;
      if (input.displayTitle !== undefined) schema.displayTitle = input.displayTitle;
      if (input.displayDescription !== undefined) schema.displayDescription = input.displayDescription;
      if (input.centerTitle !== undefined) schema.centerTitle = input.centerTitle;
      if (input.centerDescription !== undefined) schema.centerDescription = input.centerDescription;
      if (input.layout !== undefined) {
        schema.ui = schema.ui || {};
        schema.ui.layout = input.layout;
      }
      if (input.labelsOnTop !== undefined) {
        schema.ui = schema.ui || {};
        schema.ui.labelsOnTop = input.labelsOnTop;
      }

      emitUpdate();
      return { success: true };
    },

    async reorder_fields(input) {
      const guard = requireFormLoaded();
      if (guard) return guard;
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
      // Block if already inside a form builder (formId exists)
      if (metadata.formId || formDoc) {
        return {
          success: false,
          error: 'Un formulaire est déjà ouvert dans le builder. Tu NE DOIS PAS créer un nouveau formulaire. Le formulaire est déjà chargé automatiquement. Utilise get_form_schema pour voir l\'état actuel et modifie directement avec add_section, add_field, update_field, etc.',
        };
      }
      const defaultSchema = {
        title: input.name || 'Formulaire',
        description: input.description || '',
        displayTitle: true,
        displayDescription: true,
        ui: { layout: 'vertical', labelsOnTop: true },
        fields: [],
      };
      const form = await Form.create({
        name: input.name, description: input.description || '',
        workspaceId: metadata.workspaceId, schema: defaultSchema,
      });
      formDoc = form;
      metadata.formId = form._id;
      schema = defaultSchema;
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
      form.markModified('schema');
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
    isFormLoaded() { return !!(formDoc || metadata.formId); },
    /** Auto-save unsaved changes when the session ends */
    async cleanup() {
      if (!changed || !schema) return;
      let form = formDoc;
      if (!form && metadata.formId) {
        const fid = String(metadata.formId);
        form = Types.ObjectId.isValid(fid) ? await Form.findById(fid) : await Form.findOne({ id: fid });
      }
      if (form) {
        form.schema = schema;
        form.markModified('schema');
        await form.save();
        changed = false;
      }
    },
  };
}

module.exports = { FORM_TOOL_DEFINITIONS, createFormExecutor };
